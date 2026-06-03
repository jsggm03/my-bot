import { useEffect, useRef, useState } from 'react'

export default function AvatarPanel({
  status = 'idle',
  mode = 'ftf',
  onModeChange,
  vrmAvatarRef,
  onAvatarReady,
  userVideoRef,
  videoReady = false,
  cameraActive = false,
  onStart,
  onStop,
  onInterrupt,
  isListening = false
}) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    if (!vrmAvatarRef) return

    vrmAvatarRef.current = {
      isReady: () => true,

      speak: async (arrayBuffer) => {
        if (!arrayBuffer) return

        try {
          const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
          const url = URL.createObjectURL(blob)
          const audio = new Audio(url)

          audioRef.current = audio
          setIsSpeaking(true)

          await new Promise((resolve) => {
            audio.onended = resolve
            audio.onerror = resolve
            audio.play().catch(resolve)
          })

          URL.revokeObjectURL(url)
        } finally {
          setIsSpeaking(false)
        }
      },

      stopSpeaking: () => {
        try {
          if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
          }
        } catch {}

        setIsSpeaking(false)
      }
    }

    onAvatarReady?.()

    return () => {
      try {
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }
      } catch {}

      if (vrmAvatarRef.current) {
        vrmAvatarRef.current = null
      }
    }
  }, [vrmAvatarRef, onAvatarReady])

  const isIdle = status === 'idle'
  const isConnecting = status === 'connecting'
  const isConnected = status === 'connected' || status === 'speaking'
  const isTextMode = mode === 'ttt'
  const isVoiceMode = mode === 'sts'
  const isAvatarMode = mode === 'ftf'

  const statusText =
    status === 'idle'
      ? '대기 중'
      : status === 'connecting'
        ? '연결 중'
        : status === 'speaking'
          ? '말하는 중'
          : '연결됨'

  const handleStartClick = () => {
    if (!isIdle) return
    onStart?.()
  }

  const handleStopClick = () => {
    onStop?.()
  }

  const handleInterruptClick = () => {
    onInterrupt?.()
  }

  return (
    <>
      <style>{`
        .avatarPanel {
          width: 100%;
          min-height: 100%;
          background: #fffaf3;
          color: #2f2418;
          display: flex;
          flex-direction: column;
        }

        .avatarTopBar {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          padding: 12px 14px 8px;
          border-bottom: 1px solid rgba(120, 83, 45, 0.1);
          background: #fffdf8;
          overflow-x: auto;
        }

        .avatarModeButton {
          border: 1px solid rgba(160, 128, 96, 0.28);
          border-radius: 10px;
          padding: 8px 13px;
          background: rgba(255,255,255,0.9);
          color: #6b4f34;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .avatarModeButton.active {
          background: #3b2a1c;
          color: #ffffff;
          border-color: #3b2a1c;
        }

        .avatarModeButton:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .avatarStage {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px 16px 24px;
          gap: 14px;
          background: #fffaf3;
        }

        .avatarCards {
          width: 100%;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 18px;
          align-items: stretch;
          justify-content: center;
          max-width: 560px;
        }

        .avatarCard {
          position: relative;
          height: 250px;
          border-radius: 24px;
          background: #d5b48d;
          overflow: hidden;
          box-shadow: 0 18px 46px rgba(120, 83, 45, 0.17);
          border: 1px solid rgba(120, 83, 45, 0.14);
        }

        .avatarCard::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 45%;
          background: linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0));
          pointer-events: none;
        }

        .simpleAvatar {
          position: absolute;
          left: 50%;
          top: 38%;
          width: 122px;
          height: 168px;
          transform: translate(-50%, -50%);
        }

        .simpleAvatarHead {
          position: absolute;
          left: 50%;
          top: 0;
          width: 66px;
          height: 66px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: #d1d5db;
          box-shadow: inset -8px -10px 0 rgba(0,0,0,0.04);
        }

        .simpleAvatarEye {
          position: absolute;
          top: 24px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #111827;
        }

        .simpleAvatarEye.left {
          left: 19px;
        }

        .simpleAvatarEye.right {
          right: 19px;
        }

        .simpleAvatarBrow {
          position: absolute;
          top: 14px;
          width: 13px;
          height: 4px;
          border-radius: 999px;
          background: #111827;
          opacity: 0.8;
        }

        .simpleAvatarBrow.left {
          left: 16px;
        }

        .simpleAvatarBrow.right {
          right: 16px;
        }

        .simpleAvatarMouth {
          position: absolute;
          left: 50%;
          bottom: 18px;
          width: 24px;
          height: 3px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: #111827;
          transition: all 0.12s ease;
        }

        .simpleAvatarMouth.speaking {
          height: 9px;
          width: 18px;
          bottom: 15px;
          border-radius: 0 0 999px 999px;
        }

        .simpleAvatarBody {
          position: absolute;
          left: 50%;
          bottom: 0;
          width: 118px;
          height: 118px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: #d1d5db;
          box-shadow: inset -12px -18px 0 rgba(0,0,0,0.04);
        }

        .avatarCardText {
          position: absolute;
          left: 22px;
          right: 22px;
          bottom: 22px;
          z-index: 2;
          color: #ffffff;
        }

        .avatarCardText strong {
          display: block;
          font-size: 17px;
          font-weight: 950;
          line-height: 1.2;
        }

        .avatarCardText span {
          display: block;
          margin-top: 6px;
          font-size: 12px;
          color: rgba(255,255,255,0.72);
        }

        .camCard {
          height: 250px;
          border-radius: 24px;
          background: #ecd5ad;
          border: 1px solid rgba(120, 83, 45, 0.16);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          overflow: hidden;
          color: #6b4f34;
        }

        .camCard video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }

        .camPlaceholder strong {
          display: block;
          font-size: 21px;
          font-weight: 950;
          color: #4b5563;
        }

        .camPlaceholder span {
          display: block;
          margin-top: 8px;
          font-size: 12px;
          font-weight: 800;
        }

        .avatarToggleRow {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .avatarToggleButton {
          min-width: 96px;
          height: 46px;
          border: 1px solid rgba(160, 128, 96, 0.22);
          border-radius: 14px;
          background: #f7e8d6;
          color: #3b2a1c;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 12px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(120, 83, 45, 0.1);
        }

        .avatarToggleButton:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .avatarToggleIcon {
          font-size: 18px;
          line-height: 1;
        }

        .avatarToggleKnob {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #d9b083;
          border: 1px solid rgba(120, 83, 45, 0.12);
          box-shadow: 0 2px 8px rgba(120, 83, 45, 0.16);
        }

        .avatarToggleButton.on .avatarToggleKnob {
          background: #b9824f;
        }

        .avatarStatus {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          color: #4b5563;
          font-weight: 800;
        }

        .avatarStatusDot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #64748b;
        }

        .avatarStatusDot.connected {
          background: #22c55e;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.12);
        }

        .avatarStatusDot.speaking {
          background: #f97316;
          box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.12);
        }

        .avatarStartButton {
          min-width: 172px;
          min-height: 54px;
          border: 1px solid rgba(120, 83, 45, 0.22);
          border-radius: 999px;
          padding: 0 28px;
          background: #b9824f;
          color: #ffffff;
          font-size: 18px;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 14px 32px rgba(120, 83, 45, 0.22);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          opacity: 1;
        }

        .avatarStartButton:disabled {
          opacity: 0.82;
          background: #c28a55;
          color: #ffffff;
          cursor: not-allowed;
          box-shadow: 0 10px 24px rgba(120, 83, 45, 0.18);
        }

        .avatarStartButton * {
          color: #ffffff;
          fill: #ffffff;
        }

        .avatarStopButton {
          min-width: 136px;
          min-height: 44px;
          border: 1px solid rgba(239, 68, 68, 0.22);
          border-radius: 999px;
          padding: 0 22px;
          background: #fee2e2;
          color: #ef4444;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .avatarInterruptButton {
          min-width: 118px;
          min-height: 36px;
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 999px;
          padding: 0 16px;
          background: #dbeafe;
          color: #2563eb;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .textModeCompact {
          width: 100%;
          min-height: 96px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 18px;
        }

        .textModeTitle {
          font-size: 15px;
          font-weight: 950;
          color: #3b2a1c;
        }

        .textModeSub {
          margin-top: 4px;
          font-size: 12px;
          color: #8a6a4a;
        }

        .voiceModeStage {
          width: 100%;
          min-height: 220px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 18px;
        }

        .voiceCircle {
          width: 112px;
          height: 112px;
          border-radius: 50%;
          background: #fffdf8;
          border: 3px solid #ead9c6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 42px;
          box-shadow: 0 18px 36px rgba(120, 83, 45, 0.12);
        }

        @media (max-width: 1100px) {
          .avatarPanel {
            min-height: auto;
          }

          .avatarTopBar {
            justify-content: center;
          }

          .avatarStage {
            min-height: 470px;
            padding: 22px 14px 28px;
          }

          .avatarCards {
            max-width: 640px;
            gap: 16px;
          }

          .avatarCard,
          .camCard {
            height: 240px;
          }
        }

        @media (max-width: 640px) {
          .avatarTopBar {
            padding: 10px 8px 8px;
            justify-content: flex-start;
          }

          .avatarModeButton {
            padding: 7px 11px;
            font-size: 12px;
          }

          .avatarStage {
            min-height: 430px;
            padding: 18px 10px 24px;
            gap: 12px;
          }

          .avatarCards {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .avatarCard,
          .camCard {
            height: 210px;
            border-radius: 20px;
          }

          .simpleAvatar {
            transform: translate(-50%, -50%) scale(0.86);
          }

          .avatarCardText {
            left: 16px;
            right: 16px;
            bottom: 16px;
          }

          .avatarCardText strong {
            font-size: 15px;
          }

          .camPlaceholder strong {
            font-size: 18px;
          }

          .avatarToggleButton {
            min-width: 88px;
            height: 42px;
            padding: 0 10px;
          }

          .avatarStartButton {
            min-width: 158px;
            min-height: 50px;
            font-size: 16px;
          }
        }

        @media (max-width: 420px) {
          .avatarCards {
            gap: 8px;
          }

          .avatarCard,
          .camCard {
            height: 190px;
          }

          .simpleAvatar {
            transform: translate(-50%, -50%) scale(0.76);
          }

          .avatarCardText strong {
            font-size: 14px;
          }

          .avatarCardText span {
            font-size: 11px;
          }

          .camPlaceholder strong {
            font-size: 17px;
          }

          .avatarStage {
            min-height: 400px;
          }
        }
      `}</style>

      <section className="avatarPanel">
        <div className="avatarTopBar">
          <button
            type="button"
            className={`avatarModeButton ${isTextMode ? 'active' : ''}`}
            onClick={() => onModeChange?.('ttt')}
          >
            💬 텍스트
          </button>

          <button
            type="button"
            className={`avatarModeButton ${isVoiceMode ? 'active' : ''}`}
            onClick={() => onModeChange?.('sts')}
          >
            🎙️ 음성
          </button>

          <button
            type="button"
            className={`avatarModeButton ${isAvatarMode ? 'active' : ''}`}
            onClick={() => onModeChange?.('ftf')}
          >
            🧍 아바타
          </button>
        </div>

        {isTextMode && (
          <div className="textModeCompact">
            <div>
              <div className="textModeTitle">AI 텍스트 상담</div>
              <div className="textModeSub">{statusText}</div>
            </div>

            {isIdle ? (
              <button type="button" className="avatarStartButton" onClick={handleStartClick}>
                <span>▶</span>
                <span>상담 시작</span>
              </button>
            ) : (
              <button type="button" className="avatarStopButton" onClick={handleStopClick}>
                <span>■</span>
                <span>종료</span>
              </button>
            )}
          </div>
        )}

        {isVoiceMode && (
          <div className="voiceModeStage">
            <div className="voiceCircle">{isListening ? '🎙️' : '🎤'}</div>

            <div className="avatarStatus">
              <span
                className={`avatarStatusDot ${
                  status === 'speaking' ? 'speaking' : isConnected ? 'connected' : ''
                }`}
              />
              <span>{isListening ? '듣는 중' : statusText}</span>
            </div>

            {isIdle ? (
              <button
                type="button"
                className="avatarStartButton"
                onClick={handleStartClick}
                disabled={isConnecting}
              >
                <span>▶</span>
                <span>시작</span>
              </button>
            ) : (
              <div className="avatarToggleRow">
                {status === 'speaking' && (
                  <button type="button" className="avatarInterruptButton" onClick={handleInterruptClick}>
                    말 멈추기
                  </button>
                )}

                <button type="button" className="avatarStopButton" onClick={handleStopClick}>
                  <span>■</span>
                  <span>종료</span>
                </button>
              </div>
            )}
          </div>
        )}

        {isAvatarMode && (
          <div className="avatarStage">
            <div className="avatarCards">
              <div className="avatarCard">
                <div className="simpleAvatar" aria-hidden="true">
                  <div className="simpleAvatarHead">
                    <div className="simpleAvatarBrow left" />
                    <div className="simpleAvatarBrow right" />
                    <div className="simpleAvatarEye left" />
                    <div className="simpleAvatarEye right" />
                    <div className={`simpleAvatarMouth ${isSpeaking || status === 'speaking' ? 'speaking' : ''}`} />
                  </div>
                  <div className="simpleAvatarBody" />
                </div>

                <div className="avatarCardText">
                  <strong>내 AI 아바타</strong>
                  <span>VRM + three-vrm</span>
                </div>
              </div>

              <div className="camCard">
                {cameraActive ? (
                  <video ref={userVideoRef} autoPlay playsInline muted />
                ) : (
                  <div className="camPlaceholder">
                    <strong>CAM</strong>
                    <span>사용자 캠</span>
                  </div>
                )}
              </div>
            </div>

            <div className="avatarToggleRow">
              <button
                type="button"
                className={`avatarToggleButton ${cameraActive ? 'on' : ''}`}
                onClick={() => onModeChange?.(cameraActive ? 'sts' : 'ftf')}
                title="카메라"
                aria-label="카메라"
              >
                <span className="avatarToggleIcon">📷</span>
                <span className="avatarToggleKnob" />
              </button>

              <button
                type="button"
                className={`avatarToggleButton ${isListening ? 'on' : ''}`}
                disabled
                title="마이크"
                aria-label="마이크"
              >
                <span className="avatarToggleIcon">🎙️</span>
                <span className="avatarToggleKnob" />
              </button>
            </div>

            <div className="avatarStatus">
              <span
                className={`avatarStatusDot ${
                  status === 'speaking' ? 'speaking' : isConnected ? 'connected' : ''
                }`}
              />
              <span>{isListening ? '듣는 중' : statusText}</span>
            </div>

            {isIdle || isConnecting ? (
              <button
                type="button"
                className="avatarStartButton"
                onClick={handleStartClick}
                disabled={!isIdle || isConnecting}
              >
                <span>▶</span>
                <span>대화 시작</span>
              </button>
            ) : (
              <div className="avatarToggleRow">
                {status === 'speaking' && (
                  <button type="button" className="avatarInterruptButton" onClick={handleInterruptClick}>
                    말 멈추기
                  </button>
                )}

                <button type="button" className="avatarStopButton" onClick={handleStopClick}>
                  <span>■</span>
                  <span>대화 종료</span>
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  )
}
