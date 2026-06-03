import { useRef, useState } from 'react'
import StockGuardPanel from './components/StockGuardPanel'
import AvatarPanel from './components/AvatarPanel'
import styles from './App.module.css'

export default function App() {
  const [mode, setMode] = useState('ftf')
  const [status, setStatus] = useState('idle')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [micActive, setMicActive] = useState(false)

  const userVideoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const vrmAvatarRef = useRef(null)

  const stopCamera = () => {
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      cameraStreamRef.current = null

      if (userVideoRef.current) {
        userVideoRef.current.srcObject = null
      }

      setCameraActive(false)
    } catch (error) {
      console.error('[camera stop]', error)
      setCameraActive(false)
    }
  }

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert('이 브라우저에서는 카메라 기능을 사용할 수 없습니다.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      })

      cameraStreamRef.current = stream

      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream
      }

      setCameraActive(true)
    } catch (error) {
      console.error('[camera start]', error)
      alert('카메라 권한을 확인해 주세요.')
      setCameraActive(false)
    }
  }

  const handleCameraToggle = async () => {
    if (cameraActive) {
      stopCamera()
      return
    }

    await startCamera()
  }

  const handleMicToggle = async () => {
    setMicActive((prev) => !prev)
  }

  const handleModeChange = (nextMode) => {
    setMode(nextMode)

    if (nextMode !== 'ftf') {
      stopCamera()
    }
  }

  const handleStart = () => {
    setStatus('connected')

    if (mode === 'sts' || mode === 'ftf') {
      setMicActive(true)
    }
  }

  const handleStop = () => {
    setStatus('idle')
    setMicActive(false)
  }

  const handleInterrupt = () => {
    setStatus('connected')
  }

  const handleAvatarReady = () => {
    console.log('[avatar] ready')
  }

  const handleSendToChat = ({ message, displayText }) => {
    const userText = displayText || message

    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: userText
      },
      {
        role: 'assistant',
        content:
          '입력한 투자 기준과 종목 데이터를 바탕으로 감정 매매 위험을 점검해볼게요. 현재 화면의 가격 흐름, 수급, 과거 유사 구간을 함께 보면서 판단 기준을 먼저 확인하는 것이 좋습니다.'
      }
    ])

    setStatus('connected')
  }

  const handleSendText = () => {
    const text = input.trim()
    if (!text) return

    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: text
      },
      {
        role: 'assistant',
        content:
          '지금 고민을 바로 매수/매도로 결정하기보다, 먼저 원래 정한 기준에 맞는 행동인지 확인해보면 좋겠습니다. 현재 감정이 판단에 영향을 주고 있는지도 함께 점검해보세요.'
      }
    ])

    setInput('')
    setStatus('connected')
  }

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      handleSendText()
    }
  }

  return (
    <div className={styles.appShell}>
      <section className={styles.leftPane}>
        <StockGuardPanel onSendToChat={handleSendToChat} />
      </section>

      <section className={styles.rightPane}>
        <div className={styles.avatarSlot}>
          <AvatarPanel
            status={status}
            mode={mode}
            onModeChange={handleModeChange}
            vrmAvatarRef={vrmAvatarRef}
            onAvatarReady={handleAvatarReady}
            userVideoRef={userVideoRef}
            cameraActive={cameraActive}
            micActive={micActive}
            isListening={micActive}
            onCameraToggle={handleCameraToggle}
            onMicToggle={handleMicToggle}
            onStart={handleStart}
            onStop={handleStop}
            onInterrupt={handleInterrupt}
          />
        </div>

        <div className={styles.chatSlot}>
          <div className={styles.chatHeader}>
            <div className={styles.chatTitle}>
              <span>💬</span>
              <strong>대화</strong>
            </div>

            <div className={styles.chatActions}>
              <button type="button" className={styles.smallButton}>
                🌙
              </button>
              <button type="button" className={styles.smallButton}>
                설문
              </button>
              <button type="button" className={styles.userButton}>
                김정민님
              </button>
              <button type="button" className={styles.smallButton}>
                로그아웃
              </button>
            </div>
          </div>

          <div className={styles.chatBody}>
            {messages.length === 0 ? (
              <div className={styles.emptyChat}>
                먼저 왼쪽의 [점검받기] 버튼을 누르거나, 아래 입력창에 질문을 입력하세요.
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role === 'user'
                      ? `${styles.messageBubble} ${styles.userMessage}`
                      : `${styles.messageBubble} ${styles.assistantMessage}`
                  }
                >
                  {message.content}
                </div>
              ))
            )}
          </div>

          <div className={styles.chatInputArea}>
            <div className={styles.listenDot} />

            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={
                status === 'idle'
                  ? '먼저 위쪽의 [대화 시작] 버튼을 눌러주세요'
                  : '궁금한 점을 입력하세요...'
              }
              className={styles.chatInput}
            />

            <button type="button" onClick={handleSendText} className={styles.sendButton}>
              ↑
            </button>
          </div>

          <div className={styles.chatHelpText}>
            Enter로 전송 · Shift+Enter 줄바꿈 · ● 누르면 듣기 시작
          </div>
        </div>
      </section>
    </div>
  )
}
