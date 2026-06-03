import { useState, useRef, useCallback, useEffect } from 'react'
import AvatarPanel from './components/AvatarPanel'
import ChatPanel from './components/ChatPanel'
import AuthModal from './components/AuthModal'
import StockGuardPanel from './components/StockGuardPanel'
import styles from './App.module.css'
import { newSessionId, saveChat, getUser, clearAuth, verifyToken } from './lib/api'
import { MicRecorder, isMicRecorderSupported } from './lib/stt'

const ECHO_RESUME_DELAY_MS = 700
const GREETING_TEXT = '안녕하세요. 무엇을 도와드릴까요?'
const GREETING_TTS = '안녕하세요. 무엇을 도와드릴까요?'

function normalizeTranscript(text) {
  return (text || '').replace(/\s+/g, ' ').trim()
}

function normalizeTtsText(text) {
  if (!text) return ''

  return String(text)
    .replace(/✨|▶|■|◉/g, '')
    .replace(/\bAI\b/gi, '에이아이')
    .replace(/\bGPT\b/gi, '지피티')
    .replace(/\bAPI\b/gi, '에이피아이')
    .replace(/\bURL\b/gi, '유알엘')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function App() {
  const [status, setStatus] = useState('idle')
  const [messages, setMessages] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [autoListen, setAutoListen] = useState(false)
  const [conversationMode, setConversationMode] = useState('ftf')
  const [cameraStream, setCameraStream] = useState(null)
  const [user, setUser] = useState(getUser())
  const [authOpen, setAuthOpen] = useState(() => !getUser())
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
  })

  const vrmAvatarRef = useRef(null)
  const sessionRef = useRef(null)
  const userVideoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const historyRef = useRef([])
  const ttsQueueRef = useRef([])
  const ttsRunningRef = useRef(false)
  const ttsAbortRef = useRef(false)
  const sessionIdRef = useRef(null)
  const conversationModeRef = useRef('ftf')
  const micRecorderRef = useRef(null)
  const isSpeakingRef = useRef(false)
  const isProcessingRef = useRef(false)
  const autoListenRef = useRef(false)
  const isListeningRef = useRef(false)
  const echoResumeTimerRef = useRef(null)
  const lastSubmittedSpeechRef = useRef({ key: '', at: 0 })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    verifyToken().then((u) => {
      if (u) {
        setUser(u)
        setAuthOpen(false)
      }
    })
  }, [])

  useEffect(() => {
    isProcessingRef.current = isProcessing
  }, [isProcessing])

  useEffect(() => {
    autoListenRef.current = autoListen
  }, [autoListen])

  useEffect(() => {
    isListeningRef.current = isListening
  }, [isListening])

  useEffect(() => {
    isSpeakingRef.current = status === 'speaking'
  }, [status])

  useEffect(() => {
    conversationModeRef.current = conversationMode
  }, [conversationMode])

  useEffect(() => {
    if (userVideoRef.current) {
      userVideoRef.current.srcObject = cameraStream || null

      if (cameraStream) {
        userVideoRef.current.play?.().catch(() => {})
      }
    }
  }, [cameraStream])

  const handleLogout = () => {
    clearAuth()
    setUser(null)
    setAuthOpen(true)
  }

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  const handleAvatarReady = useCallback(() => {
    setVideoReady(true)
  }, [])

  const stopUserCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }

    setCameraStream(null)
  }, [])

  const captureCameraFrame = useCallback(() => {
    const video = userVideoRef.current

    if (!video || !cameraStreamRef.current) return null
    if (!video.videoWidth || !video.videoHeight) return null

    try {
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      canvas.getContext('2d').drawImage(video, 0, 0, 640, 480)

      return canvas.toDataURL('image/jpeg', 0.7)
    } catch (error) {
      console.warn('[captureCameraFrame] failed:', error)
      return null
    }
  }, [])

  const startUserCamera = useCallback(async () => {
    if (cameraStreamRef.current) return true

    if (!navigator.mediaDevices?.getUserMedia) {
      alert('이 브라우저는 카메라 연결을 지원하지 않아요.')
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      })

      cameraStreamRef.current = stream
      setCameraStream(stream)

      setTimeout(() => {
        if (userVideoRef.current && cameraStreamRef.current) {
          userVideoRef.current.srcObject = cameraStreamRef.current
          userVideoRef.current.play?.().catch(() => {})
        }
      }, 0)

      return true
    } catch {
      alert('카메라 권한이 필요해요.\n브라우저 주소창 왼쪽의 자물쇠 아이콘에서 카메라를 허용해주세요.')
      return false
    }
  }, [])

  useEffect(() => {
    return () => stopUserCamera()
  }, [stopUserCamera])

  const sanitizeForTTS = (text) => {
    if (!text) return ''

    return String(text)
      .replace(/https?:\/\/[^\s)\]]+/gi, '')
      .replace(/\bwww\.[^\s)\]]+/gi, '')
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  const processTTSQueue = useCallback(async () => {
    if (ttsRunningRef.current) return

    ttsRunningRef.current = true
    const avatar = vrmAvatarRef.current

    try {
      while (ttsQueueRef.current.length > 0 && !ttsAbortRef.current) {
        const bufPromise = ttsQueueRef.current.shift()
        if (!bufPromise) continue

        let buf

        try {
          buf = await bufPromise
        } catch (error) {
          console.warn('[tts queue] fetch fail:', error)
          continue
        }

        if (ttsAbortRef.current) break

        if (!isSpeakingRef.current) {
          isSpeakingRef.current = true
          setStatus('speaking')
        }

        if (avatar && avatar.speak) {
          await avatar.speak(buf)
        }
      }
    } finally {
      ttsRunningRef.current = false
      ttsAbortRef.current = false

      if (isSpeakingRef.current && ttsQueueRef.current.length === 0) {
        isSpeakingRef.current = false
        setStatus((prev) => (prev === 'speaking' ? 'connected' : prev))
      }
    }
  }, [])

  const enqueueTTS = useCallback(
    (sentence) => {
      const raw = String(sentence || '').trim()
      if (!raw) return
      if (conversationModeRef.current === 'ttt') return

      const clean = sanitizeForTTS(normalizeTtsText(raw))
      if (!clean) return

      const bufPromise = fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean })
      }).then((res) => {
        if (!res.ok) throw new Error(`tts http ${res.status}`)
        return res.arrayBuffer()
      })

      ttsQueueRef.current.push(bufPromise)
      processTTSQueue()
    },
    [processTTSQueue]
  )

  const clearTTSQueue = useCallback(() => {
    ttsAbortRef.current = true
    ttsQueueRef.current = []

    try {
      vrmAvatarRef.current?.stopSpeaking?.()
    } catch {}

    isSpeakingRef.current = false
    setStatus((prev) => (prev === 'speaking' ? 'connected' : prev))
  }, [])

  const sendMessage = useCallback(
    async (userText, displayText) => {
      const text = String(userText || '').trim()
      const visibleText = String(displayText || userText || '').trim()

      if (!text || isProcessingRef.current) return

      if (isSpeakingRef.current) {
        console.warn('[echo guard] sendMessage suppressed during avatar speaking:', text.slice(0, 30))
        return
      }

      isProcessingRef.current = true
      setIsProcessing(true)

      setMessages((prev) => [...prev, { role: 'user', text: visibleText || text }])
      historyRef.current = [...historyRef.current, { role: 'user', content: text }]

      if (sessionIdRef.current) {
        saveChat(sessionIdRef.current, 'user', visibleText || text)
      }

      setMessages((prev) => [...prev, { role: 'assistant', text: '' }])

      let accumulated = ''
      let pending = ''
      let isFirstFlush = true

      const flushPendingIfSentence = () => {
        const minLen = isFirstFlush ? 6 : 12
        let match = pending.match(/^([\s\S]*?[.!?…。\n])(.*)$/)

        if (match && match[1].trim().length >= minLen) {
          enqueueTTS(match[1])
          pending = match[2]
          isFirstFlush = false
          return true
        }

        if (isFirstFlush) {
          match = pending.match(/^([\s\S]*?[,，、])(.*)$/)

          if (match && match[1].trim().length >= 6) {
            enqueueTTS(match[1])
            pending = match[2]
            isFirstFlush = false
            return true
          }
        }

        return false
      }

      try {
        const VISION_INTENT =
          /보여|보이|보세요|뒤에|뒷.{0,2}배경|배경에|여기.{0,2}어|주변|화면|카메라|캠|영상|모습|어떻게.{0,3}보|뭐가.{0,3}보/

        const wantsVision = VISION_INTENT.test(text)
        const frame = wantsVision ? captureCameraFrame() : null
        const images = frame ? [frame] : []

        const res = await fetch('/api/chat-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history: historyRef.current.slice(-8),
            images
          })
        })

        if (!res.ok || !res.body) {
          throw new Error(`chat-stream http ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          let index

          while ((index = buffer.indexOf('\n\n')) !== -1) {
            const event = buffer.slice(0, index).trim()
            buffer = buffer.slice(index + 2)

            if (!event.startsWith('data: ')) continue

            const payload = event.slice(6).trim()

            if (payload === '[DONE]') {
              buffer = ''
              break
            }

            let obj

            try {
              obj = JSON.parse(payload)
            } catch {
              continue
            }

            if (obj.token) {
              accumulated += obj.token
              pending += obj.token

              setMessages((prev) => {
                const next = [...prev]
                const last = next[next.length - 1]

                if (last && last.role === 'assistant') {
                  next[next.length - 1] = { ...last, text: accumulated }
                }

                return next
              })

              while (flushPendingIfSentence()) {}
            }

            if (obj.done && pending.trim()) {
              enqueueTTS(pending)
              pending = ''
            }

            if (obj.error) {
              console.warn('[chat-stream] server error:', obj.error)
            }
          }
        }

        if (pending.trim()) {
          enqueueTTS(pending)
          pending = ''
        }

        const finalReply = accumulated || '죄송해요, 답변을 생성하지 못했어요.'
        historyRef.current = [...historyRef.current, { role: 'assistant', content: finalReply }]

        if (sessionIdRef.current) {
          saveChat(sessionIdRef.current, 'assistant', finalReply)
        }
      } catch (error) {
        console.warn('[chat-stream] error:', error)

        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]

          if (last && last.role === 'assistant' && !last.text) {
            next[next.length - 1] = {
              role: 'assistant',
              text: '오류가 발생했어요. 다시 시도해 주세요.'
            }
          }

          return next
        })
      } finally {
        isProcessingRef.current = false
        setIsProcessing(false)
      }
    },
    [captureCameraFrame, enqueueTTS]
  )

  const submitSpeechText = useCallback(
    (rawText) => {
      const text = normalizeTranscript(rawText)

      if (!text || text.length < 2) return

      if (isSpeakingRef.current || isProcessingRef.current) {
        console.warn('[echo guard] transcript dropped:', text.slice(0, 30))
        return
      }

      const key = text.replace(/\s+/g, '')
      const now = Date.now()
      const last = lastSubmittedSpeechRef.current

      if (key === last.key && now - last.at < 8000) return

      lastSubmittedSpeechRef.current = { key, at: now }
      sendMessage(text)
    },
    [sendMessage]
  )

  const ensureMicRecorder = useCallback(() => {
    if (micRecorderRef.current) return micRecorderRef.current

    if (!isMicRecorderSupported()) {
      alert('이 브라우저는 음성 인식을 지원하지 않아요.\n텍스트 모드를 이용하시거나 최신 Chrome/Safari에서 시도해주세요.')
      return null
    }

    const recorder = new MicRecorder({
      sttEndpoint: '/api/stt',
      onTranscript: (text) => submitSpeechText(text),
      onError: (error) => console.warn('[STT] MicRecorder error:', error),
      onStateChange: (state) => {
        const listening = state === 'listening' || state === 'recording'

        isListeningRef.current = listening
        setIsListening(listening)
      }
    })

    micRecorderRef.current = recorder

    return recorder
  }, [submitSpeechText])

  const startListening = useCallback(async () => {
    const recorder = ensureMicRecorder()

    if (!recorder) {
      autoListenRef.current = false
      setAutoListen(false)
      return
    }

    try {
      if (!recorder.isRunning) {
        await recorder.start()
      } else {
        recorder.resume()
      }
    } catch (error) {
      console.warn('[STT] start failed:', error)

      const denied =
        error?.name === 'NotAllowedError' || /denied|permission|allowed/i.test(error?.message || '')

      if (denied) {
        alert('마이크 권한이 필요해요.\n브라우저 주소창 왼쪽의 자물쇠 아이콘을 클릭하여 마이크를 허용해주세요.')
      } else {
        alert('마이크를 시작하지 못했어요.\n다른 앱이 마이크를 쓰고 있지 않은지 확인해주세요.')
      }

      autoListenRef.current = false
      setAutoListen(false)
    }
  }, [ensureMicRecorder])

  const stopListening = useCallback(() => {
    const recorder = micRecorderRef.current

    if (recorder) {
      try {
        recorder.stop()
      } catch {}

      micRecorderRef.current = null
    }

    isListeningRef.current = false
    setIsListening(false)
  }, [])

  const interruptAvatar = useCallback(() => {
    try {
      clearTTSQueue()
    } catch (error) {
      console.error('interrupt error:', error)
    }
  }, [clearTTSQueue])

  useEffect(() => {
    const recorder = micRecorderRef.current

    clearTimeout(echoResumeTimerRef.current)

    if (!recorder || !recorder.isRunning) return

    if (status === 'speaking') {
      recorder.pause()
    } else if (status === 'connected' && autoListenRef.current) {
      echoResumeTimerRef.current = setTimeout(() => {
        const currentRecorder = micRecorderRef.current

        if (
          currentRecorder &&
          currentRecorder.isRunning &&
          autoListenRef.current &&
          !isSpeakingRef.current &&
          !isProcessingRef.current
        ) {
          currentRecorder.resume()
        }
      }, ECHO_RESUME_DELAY_MS)
    }

    return () => clearTimeout(echoResumeTimerRef.current)
  }, [status])

  useEffect(() => {
    const recorder = micRecorderRef.current

    if (!isProcessing && autoListen && recorder && recorder.isRunning && !isSpeakingRef.current) {
      recorder.resume()
    }
  }, [isProcessing, autoListen])

  const toggleMic = useCallback(() => {
    if (conversationModeRef.current === 'ttt') return

    if (!sessionRef.current) {
      alert('먼저 [시작] 버튼을 눌러주세요.')
      return
    }

    if (autoListenRef.current || isListeningRef.current) {
      autoListenRef.current = false
      setAutoListen(false)
      stopListening()
    } else {
      autoListenRef.current = true
      setAutoListen(true)
      startListening()
    }
  }, [startListening, stopListening])

  useEffect(() => {
    const handleGlobalKeydown = (event) => {
      if (event.key !== 'Escape' && event.code !== 'Escape') return
      if (!sessionRef.current) return

      event.preventDefault()
      event.stopPropagation()

      const target = event.target

      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
        target.blur()
      }

      interruptAvatar()
    }

    window.addEventListener('keydown', handleGlobalKeydown, true)
    document.addEventListener('keydown', handleGlobalKeydown, true)

    return () => {
      window.removeEventListener('keydown', handleGlobalKeydown, true)
      document.removeEventListener('keydown', handleGlobalKeydown, true)
    }
  }, [interruptAvatar])

  const stopAvatar = useCallback(async () => {
    clearTimeout(echoResumeTimerRef.current)

    lastSubmittedSpeechRef.current = { key: '', at: 0 }
    autoListenRef.current = false
    setAutoListen(false)

    stopListening()
    setIsListening(false)
    stopUserCamera()

    isSpeakingRef.current = false

    try {
      clearTTSQueue()
    } catch {}

    sessionRef.current = null
    sessionIdRef.current = null
    historyRef.current = []

    setStatus('idle')
    setMessages([])
  }, [stopListening, stopUserCamera, clearTTSQueue])

  const startTextMode = useCallback(() => {
    clearTimeout(echoResumeTimerRef.current)

    lastSubmittedSpeechRef.current = { key: '', at: 0 }
    autoListenRef.current = false
    setAutoListen(false)

    stopListening()
    setIsListening(false)
    stopUserCamera()

    isSpeakingRef.current = false
    sessionRef.current = null
    sessionIdRef.current = newSessionId()
    historyRef.current = []

    setStatus('connected')
    setMessages([{ role: 'assistant', text: GREETING_TEXT }])
    saveChat(sessionIdRef.current, 'assistant', GREETING_TEXT)
  }, [stopListening, stopUserCamera])

  const startAvatar = useCallback(async () => {
    setStatus('connecting')
    sessionIdRef.current = newSessionId()
    lastSubmittedSpeechRef.current = { key: '', at: 0 }

    if (conversationModeRef.current === 'ftf') {
      await startUserCamera()
    } else {
      stopUserCamera()
    }

    for (let i = 0; i < 50 && !vrmAvatarRef.current?.isReady?.(); i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    sessionRef.current = true
    historyRef.current = []

    setStatus('connected')
    setMessages([{ role: 'assistant', text: GREETING_TEXT }])
    saveChat(sessionIdRef.current, 'assistant', GREETING_TEXT)

    enqueueTTS(normalizeTtsText(GREETING_TTS))

    autoListenRef.current = true
    setAutoListen(true)
    startListening()
  }, [startListening, startUserCamera, stopUserCamera, enqueueTTS])

  const startConversation = useCallback(() => {
    if (conversationModeRef.current === 'ttt') {
      startTextMode()
      return
    }

    startAvatar()
  }, [startAvatar, startTextMode])

  const changeConversationMode = useCallback(
    (nextMode) => {
      if (nextMode === conversationModeRef.current) return

      const hasAvatarSession = Boolean(sessionRef.current)
      const isTextOnlySession = status !== 'idle' && !hasAvatarSession

      if (isTextOnlySession && nextMode !== 'ttt') {
        alert('텍스트 대화에서 음성/화상으로 바꾸려면 대화를 종료한 뒤 다시 시작해주세요.')
        return
      }

      conversationModeRef.current = nextMode
      setConversationMode(nextMode)

      if (nextMode === 'ftf') {
        if (hasAvatarSession) startUserCamera()
      } else {
        stopUserCamera()
      }

      if (nextMode === 'ttt') {
        autoListenRef.current = false
        setAutoListen(false)
        stopListening()
        return
      }

      if (hasAvatarSession) {
        autoListenRef.current = true
        setAutoListen(true)
        startListening()
      }
    },
    [startListening, startUserCamera, status, stopListening, stopUserCamera]
  )

  const toggleCamera = useCallback(() => {
    if (conversationModeRef.current !== 'ftf') {
      changeConversationMode('ftf')
      return
    }

    if (cameraStreamRef.current) {
      stopUserCamera()
    } else {
      startUserCamera()
    }
  }, [changeConversationMode, startUserCamera, stopUserCamera])

  const handleStockGuardSend = useCallback(
    ({ message, displayText }) => {
      const prompt = String(message || '').trim()
      const visible = String(displayText || message || '').trim()

      if (!prompt) return

      if (status === 'idle') {
        conversationModeRef.current = 'ttt'
        setConversationMode('ttt')
        startTextMode()

        setTimeout(() => {
          sendMessage(prompt, visible)
        }, 120)

        return
      }

      sendMessage(prompt, visible)
    },
    [sendMessage, startTextMode, status]
  )

  useEffect(() => {
    return () => {
      clearTimeout(echoResumeTimerRef.current)

      if (micRecorderRef.current) {
        try {
          micRecorderRef.current.stop()
        } catch {}

        micRecorderRef.current = null
      }
    }
  }, [])

  const isChatConnected = status !== 'idle' && status !== 'connecting'
  const cameraActive = Boolean(cameraStream)
  const micActive = autoListen || isListening

  return (
    <div className={styles.appShell}>
      <section className={styles.leftPane}>
        <StockGuardPanel onSendToChat={handleStockGuardSend} />
      </section>

      <section className={styles.rightPane}>
        <div className={styles.avatarSlot}>
          <AvatarPanel
            status={status}
            mode={conversationMode}
            onModeChange={changeConversationMode}
            vrmAvatarRef={vrmAvatarRef}
            onAvatarReady={handleAvatarReady}
            userVideoRef={userVideoRef}
            videoReady={videoReady}
            cameraActive={cameraActive}
            micActive={micActive}
            onCameraToggle={toggleCamera}
            onMicToggle={toggleMic}
            isListening={isListening}
            onStart={startConversation}
            onStop={stopAvatar}
            onInterrupt={interruptAvatar}
          />
        </div>

        <div className={styles.chatSlot}>
          <ChatPanel
            messages={messages}
            isProcessing={isProcessing}
            onSend={sendMessage}
            connected={isChatConnected}
            isListening={isListening}
            onToggleMic={toggleMic}
            micEnabled={micActive}
            micAvailable={conversationMode !== 'ttt'}
            mode={conversationMode}
            user={user}
            onLoginClick={() => setAuthOpen(true)}
            onLogout={handleLogout}
            onOpenSurvey={() => alert('설문 기능은 추후 연결 예정입니다.')}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        </div>
      </section>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(u) => {
          setUser(u)
          setAuthOpen(false)
        }}
      />
    </div>
  )
}
