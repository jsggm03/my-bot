import { useEffect, useRef, useState } from 'react'

export default function ChatPanel({
  messages = [],
  isProcessing = false,
  onSend,
  connected = false,
  isListening = false,
  onToggleMic,
  micEnabled = false,
  micAvailable = true,
  mode = 'ftf',
  user,
  onLoginClick,
  onLogout,
  onOpenSurvey,
  theme,
  onToggleTheme
}) {
  const [input, setInput] = useState('')
  const bodyRef = useRef(null)

  useEffect(() => {
    if (!bodyRef.current) return
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, isProcessing])

  const handleSend = () => {
    const text = input.trim()
    if (!text) return

    onSend?.(text)
    setInput('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      handleSend()
    }
  }

  const placeholder = connected
    ? mode === 'ttt'
      ? '텍스트로 질문을 입력하세요...'
      : '궁금한 점을 입력하세요...'
    : '먼저 왼쪽의 [대화 시작] 버튼을 눌러주세요'

  const userName = user?.name || user?.nickname || '김정민님'

  return (
    <section style={styles.root}>
      <header style={styles.header}>
        <div style={styles.title}>
          <span>💬</span>
          <span>대화</span>
        </div>

        <div style={styles.actions}>
          <button type="button" style={styles.smallButton} onClick={onToggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <button type="button" style={styles.smallButton} onClick={onOpenSurvey}>
            설문
          </button>

          {user ? (
            <>
              <button type="button" style={styles.userButton}>
                {userName}
              </button>

              <button type="button" style={styles.smallButton} onClick={onLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <button type="button" style={styles.smallButton} onClick={onLoginClick}>
              로그인
            </button>
          )}
        </div>
      </header>

      <main ref={bodyRef} style={styles.body}>
        {messages.length === 0 ? (
          <div style={styles.empty}>
            {connected
              ? '궁금한 점을 입력하거나 마이크 버튼을 눌러 말해보세요.'
              : '먼저 왼쪽의 [대화 시작] 버튼을 눌러주세요'}
          </div>
        ) : (
          messages.map((message, index) => {
            const isUser = message.role === 'user'
            const text = message.text || message.content || ''

            return (
              <div
                key={`${message.role}-${index}`}
                style={{
                  ...styles.message,
                  ...(isUser ? styles.userMessage : styles.assistantMessage)
                }}
              >
                {text}
              </div>
            )
          })
        )}

        {isProcessing && (
          <div style={{ ...styles.message, ...styles.assistantMessage, opacity: 0.75 }}>
            답변을 준비하고 있어요...
          </div>
        )}
      </main>

      <div style={styles.inputArea}>
        <button
          type="button"
          onClick={onToggleMic}
          disabled={!micAvailable}
          aria-label="마이크"
          title={micAvailable ? '마이크' : '텍스트 모드에서는 마이크를 사용할 수 없습니다.'}
          style={{
            ...styles.micButton,
            ...((micEnabled || isListening) ? styles.micButtonOn : {}),
            ...(!micAvailable ? styles.disabledButton : {})
          }}
        />

        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={!connected || isProcessing}
          style={{
            ...styles.input,
            ...(!connected || isProcessing ? styles.disabledInput : {})
          }}
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!connected || isProcessing || !input.trim()}
          aria-label="전송"
          style={{
            ...styles.sendButton,
            ...(!connected || isProcessing || !input.trim() ? styles.disabledSendButton : {})
          }}
        >
          ↑
        </button>
      </div>

      <div style={styles.helpText}>
        Enter로 전송 · Shift+Enter 줄바꿈 · ● 누르면 듣기 시작
      </div>
    </section>
  )
}

const styles = {
  root: {
    width: '100%',
    height: '100%',
    minHeight: 0,
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr) auto auto',
    background: '#fffdf8',
    overflow: 'hidden'
  },

  header: {
    minHeight: 58,
    padding: '0 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottom: '1px solid rgba(120, 83, 45, 0.12)',
    background: '#fffdf8'
  },

  title: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    color: '#3b2a1c',
    fontSize: 15,
    fontWeight: 900,
    whiteSpace: 'nowrap'
  },

  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    minWidth: 0,
    overflowX: 'auto'
  },

  smallButton: {
    border: '1px solid rgba(160, 128, 96, 0.28)',
    borderRadius: 9,
    background: '#fffaf3',
    color: '#5b3d25',
    padding: '7px 10px',
    fontSize: 12,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },

  userButton: {
    border: '1px solid transparent',
    borderRadius: 9,
    background: 'transparent',
    color: '#5b3d25',
    padding: '7px 10px',
    fontSize: 12,
    cursor: 'default',
    whiteSpace: 'nowrap',
    fontWeight: 800
  },

  body: {
    minHeight: 0,
    height: '100%',
    overflowY: 'auto',
    padding: '20px 18px',
    background: '#fffdf8'
  },

  empty: {
    height: '100%',
    minHeight: 180,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    color: '#b8a38e',
    fontSize: 14,
    lineHeight: 1.6,
    paddingTop: 8
  },

  message: {
    maxWidth: '88%',
    padding: '12px 14px',
    borderRadius: 16,
    fontSize: 14,
    lineHeight: 1.65,
    marginBottom: 12,
    whiteSpace: 'pre-wrap',
    wordBreak: 'keep-all',
    overflowWrap: 'anywhere'
  },

  userMessage: {
    marginLeft: 'auto',
    background: '#3b2a1c',
    color: '#ffffff',
    borderBottomRightRadius: 6
  },

  assistantMessage: {
    marginRight: 'auto',
    background: '#fff7ed',
    color: '#3b2a1c',
    border: '1px solid rgba(120, 83, 45, 0.12)',
    borderBottomLeftRadius: 6
  },

  inputArea: {
    display: 'grid',
    gridTemplateColumns: '34px minmax(0, 1fr) 36px',
    gap: 10,
    alignItems: 'center',
    padding: '14px 18px 8px',
    borderTop: '1px solid rgba(120, 83, 45, 0.12)',
    background: '#fffdf8'
  },

  micButton: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: '2px solid #9a6b45',
    boxShadow: 'inset 0 0 0 4px #fffdf8',
    background: '#0f172a',
    cursor: 'pointer',
    justifySelf: 'center'
  },

  micButtonOn: {
    background: '#ef4444',
    borderColor: '#ef4444',
    boxShadow: '0 0 0 6px rgba(239, 68, 68, 0.14)'
  },

  disabledButton: {
    cursor: 'not-allowed',
    opacity: 0.45
  },

  input: {
    width: '100%',
    minHeight: 46,
    maxHeight: 120,
    resize: 'vertical',
    border: '1px solid rgba(160, 128, 96, 0.2)',
    borderRadius: 14,
    padding: '12px 14px',
    fontSize: 14,
    lineHeight: 1.5,
    outline: 'none',
    color: '#3b2a1c',
    background: '#fffaf3',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
  },

  disabledInput: {
    opacity: 0.8
  },

  sendButton: {
    border: 0,
    background: 'transparent',
    color: '#3b2a1c',
    fontSize: 24,
    cursor: 'pointer',
    lineHeight: 1
  },

  disabledSendButton: {
    opacity: 0.35,
    cursor: 'not-allowed'
  },

  helpText: {
    textAlign: 'center',
    color: '#8a6a4a',
    fontSize: 12,
    padding: '0 12px 12px',
    background: '#fffdf8'
  }
}
