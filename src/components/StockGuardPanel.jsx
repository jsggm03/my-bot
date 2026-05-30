
import { useState } from 'react'

export default function StockGuardPanel({ onSendToChat }) {
  const [form, setForm] = useState({
    stockName: '카카오',
    averagePrice: '',
    currentPrice: '',
    action: '매도 고민',
    style: '스윙',
    stopLossRate: '-10',
    targetRate: '15',
    emotion: '불안',
    memo: ''
  })

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = () => {
    const message = `
너는 Mind-Guard의 금융 심리 케어 챗봇 '숨돌이'야.
아래 사용자의 투자 상황을 바탕으로, 지금 행동이 원칙 매매인지 감정 매매인지 점검해줘.

[사용자 입력]
- 종목명: ${form.stockName}
- 평균 매수가: ${form.averagePrice || '미입력'}
- 현재가: ${form.currentPrice || '미입력'}
- 하려는 행동: ${form.action}
- 투자 스타일: ${form.style}
- 손절 기준: ${form.stopLossRate}%
- 목표 수익률: ${form.targetRate}%
- 현재 감정: ${form.emotion}
- 추가 메모: ${form.memo || '없음'}

[답변 규칙]
- 800자 이내로 답변해.
- 6문장 이하로 답변해.
- 매수/매도하라고 직접 지시하지 마.
- "지금 사세요", "지금 파세요", "무조건 보유하세요" 같은 표현 금지.
- 감정을 먼저 인정하고, 사용자의 기준과 현재 행동이 일치하는지 점검해.
- 마지막에는 짧은 확인 질문 1개만 해.
`.trim()

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
        background: 'rgba(255, 255, 255, 0.9)',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px' }}>🌬️ 숨돌이 투자 점검</h2>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
            매매 전, 내 기준과 감정 상태를 먼저 확인해요.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          style={{
            border: 0,
            borderRadius: '999px',
            padding: '10px 14px',
            background: '#0f172a',
            color: 'white',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontWeight: 700
          }}
        >
          숨돌이에게 점검받기
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '10px',
          marginTop: '14px'
        }}
      >
        <label style={labelStyle}>
          종목명
          <input
            value={form.stockName}
            onChange={(e) => updateForm('stockName', e.target.value)}
            placeholder="예: 카카오"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          평균 매수가
          <input
            type="number"
            value={form.averagePrice}
            onChange={(e) => updateForm('averagePrice', e.target.value)}
            placeholder="예: 50000"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          현재가
          <input
            type="number"
            value={form.currentPrice}
            onChange={(e) => updateForm('currentPrice', e.target.value)}
            placeholder="예: 46200"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          하려는 행동
          <select
            value={form.action}
            onChange={(e) => updateForm('action', e.target.value)}
            style={inputStyle}
          >
            <option>매도 고민</option>
            <option>추가매수 고민</option>
            <option>신규매수 고민</option>
            <option>관망 고민</option>
            <option>손절 고민</option>
            <option>익절 고민</option>
          </select>
        </label>

        <label style={labelStyle}>
          투자 스타일
          <select
            value={form.style}
            onChange={(e) => updateForm('style', e.target.value)}
            style={inputStyle}
          >
            <option>단타</option>
            <option>스윙</option>
            <option>중장기</option>
          </select>
        </label>

        <label style={labelStyle}>
          손절 기준(%)
          <input
            type="number"
            value={form.stopLossRate}
            onChange={(e) => updateForm('stopLossRate', e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          목표 수익률(%)
          <input
            type="number"
            value={form.targetRate}
            onChange={(e) => updateForm('targetRate', e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          현재 감정
          <select
            value={form.emotion}
            onChange={(e) => updateForm('emotion', e.target.value)}
            style={inputStyle}
          >
            <option>불안</option>
            <option>분노</option>
            <option>공포</option>
            <option>흥분</option>
            <option>차분</option>
            <option>멘붕</option>
          </select>
        </label>
      </div>

      <label style={{ ...labelStyle, marginTop: '10px' }}>
        지금 고민 한 줄
        <input
          value={form.memo}
          onChange={(e) => updateForm('memo', e.target.value)}
          placeholder="예: 더 떨어질까 봐 무서워서 지금 팔고 싶어요."
          style={inputStyle}
        />
      </label>
    </section>
  )
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
  fontSize: '12px',
  color: '#475569',
  fontWeight: 700
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid rgba(148, 163, 184, 0.45)',
  borderRadius: '12px',
  padding: '9px 10px',
  background: 'rgba(255, 255, 255, 0.95)',
  color: '#0f172a',
  fontSize: '13px',
  outline: 'none'
}
