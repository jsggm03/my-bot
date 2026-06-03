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

  return (
    <>
      <style>{`
        .chatPanelRoot {
          width: 100%;
          height: 100%;
          min-height: 0;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto auto;
          background: #fffdf8;
          overflow: hidden;
        }

        .chatPanelHeader {
          min-height: 58px;
          padding: 0 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(120, 83, 45, 0.12);
          background: #fffdf8;
          flex: 0 0 auto;
        }

        .chatPanelTitle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #3b2a1c;
          font-size: 15px;
          font-weight: 900;
          white-space: nowrap;
        }

        .chatPanelActions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          min-width: 0;
          overflow-x: auto;
        }

        .chatPanelSmallButton,
        .chatPanelUserButton {
          border: 1px solid rgba(160, 128, 96, 0.28);
          border-radius: 9px;
          background: #fffaf3;
          color: #5b3d25;
          padding: 7px 10px;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
        }

        .chatPanelUserButton {
          border-color: transparent;
          background: transparent;
          font-weight: 800;
        }

        .chatPanelBody {
          min-height: 0;
          height: 100%;
          overflow-y: auto;
          padding: 20px 18px;
          background: #fffdf8;
        }

        .chatPanelEmpty {
          height: 100%;
          min-height: 180px;
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          color: #b8a38e;
          font-size: 14px;
          line-height: 1.6;
          padding-top: 8px;
        }

        .chatPanelMessage {
          max-width: 88%;
          padding: 12px 14px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.65;
          margin-bottom: 12px;
          white-space: pre-wrap;
          word-break: keep-all;
          overflow-wrap: anywhere;
        }

        .chatPanelMessage.user {
          margin-left: auto;
          background: #3b2a1c;
          color: #ffffff;
          border-bottom-right-radius: 6px;
        }

        .chatPanelMessage.assistant {
          margin-right: auto;
          background: #fff7ed;
          color: #3b2a1c;
          border: 1px solid rgba(120, 83, 45, 0.12);
          border-bottom-left-radius: 6px;
        }

        .chatPanelMessage.loading {
          opacity: 0.75;
        }

        .chatPanelInputArea {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) 36px;
          gap: 10px;
          align-items: center;
          padding: 14px 18px 8px;
          border-top: 1px solid rgba(120, 83, 45, 0.12);
          background: #fffdf8;
          flex: 0 0 auto;
        }

        .chatPanelMicButton {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid #9a6b45;
          box-shadow: inset 0 0 0 4px #fffdf8;
          background: #0f172a;
          cursor: pointer;
          justify-self: center;
        }

        .chatPanelMicButton.on {
          background: #ef4444;
          border-color: #ef4444;
          box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.14);
        }

        .chatPanelMicButton:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .chatPanelInput {
          width: 100%;
          min-height: 46px;
          max-height: 120px;
          resize: vertical;
          border: 1px solid rgba(160, 128, 96, 0.2);
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 14px;
          line-height: 1.5;
          outline: none;
          color: #3b2a1c;
          background: #fffaf3;
          box-sizing: border-box;
          font-family: inherit;
        }

        .chatPanelInput::placeholder {
          color: #b8a38e;
        }

        .chatPanelSendButton {
          border: 0;
          background: transparent;
          color: #3b2a1c;
          font-size: 24px;
          cursor: pointer;
          line-height: 1;
        }

        .chatPanelSendButton:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .chatPanelHelpText {
          text-align: center;
          color: #8a6a4a;
          font-size: 12px;
          padding: 0 12px 12px;
          background: #fffdf8;
          flex: 0 0 auto;
        }

        @media (max-width: 900px) {
          .chatPanelRoot {
            height: 100dvh;
            min-height: 640px;
          }

          .chatPanelBody {
            min-height: 0;
            overflow-y: auto;
          }
        }

        @media (max-width: 640px) {
          .chatPanelRoot {
            height: 100dvh;
            min-height: 640px;
          }

          .chatPanelHeader {
            min-height: 58px;
            padding: 0 12px;
          }

          .chatPanelActions {
            gap: 6px;
          }

          .chatPanelSmallButton,
          .chatPanelUserButton {
            padding: 6px 8px;
            font-size: 11px;
          }

          .chatPanelBody {
            padding: 16px;
          }

          .chatPanelEmpty {
            min-height: 260px;
            align-items: flex-start;
          }

          .chatPanelMessage {
            max-width: 94%;
            font-size: 13px;
            line-height: 1.55;
          }

          .chatPanelInputArea {
            grid-template-columns: 36px minmax(0, 1fr) 34px;
            padding: 14px 16px 8px;
          }

          .chatPanelInput {
            font-size: 14px;
            min-height: 46px;
          }

          .chatPanelHelpText {
            font-size: 11px;
            padding-bottom: 14px;
          }
        }
      `}</style>

      <section className="chatPanelRoot">
        <header className="chatPanelHeader">
          <div className="chatPanelTitle">
            <span>💬</span>
            <span>대화</span>
          </div>

          <div className="chatPanelActions">
            <button type="button" className="chatPanelSmallButton" onClick={onToggleTheme}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <button type="button" className="chatPanelSmallButton" onClick={onOpenSurvey}>
              설문
            </button>

            {user ? (
              <>
                <button type="button" className="chatPanelUserButton">
                  {user.name || user.nickname || '김정민님'}
                </button>

                <button type="button" className="chatPanelSmallButton" onClick={onLogout}>
                  로그아웃
                </button>
              </>
            ) : (
              <button type="button" className="chatPanelSmallButton" onClick={onLoginClick}>
                로그인
              </button>
            )}
          </div>
        </header>

        <main ref={bodyRef} className="chatPanelBody">
          {messages.length === 0 ? (
            <div className="chatPanelEmpty">
              {connected
                ? '궁금한 점을 입력하거나 마이크 버튼을 눌러 말해보세요.'
                : '먼저 왼쪽의 [대화 시작] 버튼을 눌러주세요'}
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`chatPanelMessage ${message.role === 'user' ? 'user' : 'assistant'}`}
              >
                {message.text || message.content || ''}
              </div>
            ))
          )}

          {isProcessing && (
            <div className="chatPanelMessage assistant loading">
              답변을 준비하고 있어요...
            </div>
          )}
        </main>

        <div className="chatPanelInputArea">
          <button
            type="button"
            className={`chatPanelMicButton ${micEnabled || isListening ? 'on' : ''}`}
            onClick={onToggleMic}
            disabled={!micAvailable}
            aria-label="마이크"
            title={micAvailable ? '마이크' : '텍스트 모드에서는 마이크를 사용할 수 없습니다.'}
          />

          <textarea
            className="chatPanelInput"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={!connected || isProcessing}
          />

          <button
            type="button"
            className="chatPanelSendButton"
            onClick={handleSend}
            disabled={!connected || isProcessing || !input.trim()}
            aria-label="전송"
          >
            ↑
          </button>
        </div>

        <div className="chatPanelHelpText">
          Enter로 전송 · Shift+Enter 줄바꿈 · ● 누르면 듣기 시작
        </div>
      </section>
    </>
  )
}
