export default function StockGuardPanel({ onSendToChat }) {
  const handleClick = () => {
    const message =
      '숨돌이, 카카오 매도 고민 중이야. 평단가와 손절 기준을 기준으로 원칙 매매인지 감정 매매인지 점검해줘.'

    if (typeof onSendToChat === 'function') {
      onSendToChat(message)
    }
  }

  return (
    <section
      style={{
        border: '1px solid rgba(148, 163, 184, 0.35)',
        borderRadius: '20px',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.82)',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          alignItems: 'center'
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '18px' }}>🌬️ 숨돌이 투자 점검</h2>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
            주가 데이터 기반 분석 기능을 연결하기 전 임시 패널입니다.
          </p>
        </div>

        <button
          type="button"
          onClick={handleClick}
          style={{
            border: 0,
            borderRadius: '999px',
            padding: '10px 14px',
            background: '#0f172a',
            color: 'white',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          채팅으로 테스트
        </button>
      </div>
    </section>
  )
}
