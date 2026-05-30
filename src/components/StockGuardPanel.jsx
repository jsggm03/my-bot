import { useState } from 'react'

export default function StockGuardPanel({ onSendToChat }) {
  const [form, setForm] = useState({
    stockName: '카카오',
    averagePrice: '',
    currentPrice: '',
    quantity: '',
    tradePlan: '',
    action: '손절 고민',
    style: '스윙',
    stopLossRate: '-10',
    targetRate: '15',
    emotion: '불안',
    memo: ''
  })

  const [stockData, setStockData] = useState(null)
  const [loadingStock, setLoadingStock] = useState(false)
  const [stockError, setStockError] = useState('')

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const formatNumber = (value) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return '-'
    return n.toLocaleString()
  }

  const handleLoadStock = async () => {
    const name = form.stockName.trim()

    if (!name) {
      setStockError('종목명을 먼저 입력해 주세요.')
      return
    }

    setLoadingStock(true)
    setStockError('')

    try {
      const response = await fetch(`/api/stock?name=${encodeURIComponent(name)}`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.kisMessage || '주가 데이터를 불러오지 못했습니다.')
      }

      setStockData(data)

      if (data.summary?.currentPrice) {
        updateForm('currentPrice', String(data.summary.currentPrice))
      }
    } catch (error) {
      setStockData(null)
      setStockError(error.message || '주가 데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoadingStock(false)
    }
  }

  const buildDataSummary = () => {
    if (!stockData?.summary) {
      return '주가 데이터: 아직 불러오지 않음'
    }

    const { stock, current, summary } = stockData

    return `
[주가 데이터]
- 확인 종목: ${stock.name} (${stock.code}, ${stock.market})
- 현재가: ${summary.currentPrice}원
- 전일 등락률: ${current?.previousDayRate ?? '정보 없음'}%
- 최근 5거래일 수익률: ${summary.change5d}%
- 최근 20거래일 수익률: ${summary.change20d}%
- 90일 고점: ${summary.high90d}원
- 90일 저점: ${summary.low90d}원
- 90일 고점 대비 하락률: ${summary.drawdownFromHigh}%
- 90일 저점 대비 반등률: ${summary.reboundFromLow}%
`.trim()
  }

  const handleSubmit = () => {
    const displayText = `숨돌이, ${form.stockName || '이 종목'} ${form.action}을 점검해줘.`

    const message = `
너는 Mind-Guard의 금융 심리 케어 챗봇 '숨돌이'야.
아래 사용자의 투자 상황과 주가 데이터를 바탕으로, 지금 행동이 원칙 매매인지 감정 매매인지 점검해줘.

[사용자 입력]
- 종목명: ${form.stockName || '미입력'}
- 평균 매수가: ${form.averagePrice || '미입력'}
- 현재가: ${form.currentPrice || '미입력'}
- 보유 수량: ${form.quantity || '미입력'}
- 하려는 행동: ${form.action}
- 매매 희망 수량/금액: ${form.tradePlan || '미입력'}
- 투자 스타일: ${form.style}
- 손절 기준: ${form.stopLossRate}%
- 목표 수익률: ${form.targetRate}%
- 현재 감정: ${form.emotion}
- 지금 고민: ${form.memo || '없음'}

${buildDataSummary()}

[답변 규칙]
- 350자 이내로 답변해.
- 3문장 이하로 답변해.
- 매수/매도하라고 직접 지시하지 마.
- "지금 사세요", "지금 파세요", "무조건 보유하세요" 같은 표현 금지.
- 사용자의 평균 매수가, 현재가, 손절 기준, 최근 5일/20일 흐름을 반드시 함께 고려해.
- 감정을 먼저 인정하고, 원칙 매매인지 감정 매매인지 점검해.
- 마지막에는 짧은 확인 질문 1개만 해.
`.trim()

    if (typeof onSendToChat === 'function') {
      onSendToChat({
        message,
        displayText
      })
    }
  }

  return (
    <section
      style={{
        border: '1px solid rgba(148, 163, 184, 0.35)',
        borderRadius: '20px',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.92)',
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
            종목 데이터를 불러온 뒤, 내 기준과 감정 상태를 함께 확인해요.
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

        <div style={{ display: 'flex', alignItems: 'end' }}>
          <button
            type="button"
            onClick={handleLoadStock}
            disabled={loadingStock}
            style={{
              width: '100%',
              border: 0,
              borderRadius: '12px',
              padding: '10px 12px',
              background: loadingStock ? '#cbd5e1' : '#334155',
              color: 'white',
              fontWeight: 700,
              cursor: loadingStock ? 'not-allowed' : 'pointer'
            }}
          >
            {loadingStock ? '불러오는 중...' : '현재가 불러오기'}
          </button>
        </div>

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
            placeholder="API로 자동 입력"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          보유 수량
          <input
            value={form.quantity}
            onChange={(e) => updateForm('quantity', e.target.value)}
            placeholder="예: 100주"
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
            <option>전량 매도 고민</option>
            <option>일부 매도 고민</option>
            <option>손절 고민</option>
            <option>익절 고민</option>
            <option>추가매수 고민</option>
            <option>신규매수 고민</option>
            <option>관망 고민</option>
          </select>
        </label>

        <label style={labelStyle}>
          매매 희망 수량/금액
          <input
            value={form.tradePlan}
            onChange={(e) => updateForm('tradePlan', e.target.value)}
            placeholder="예: 전량 / 50주 / 30만원"
            style={inputStyle}
          />
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

        <label style={labelStyle}>
          손절 기준(%)
          <input
            type="number"
            value={form.stopLossRate}
            onChange={(e) => updateForm('stopLossRate', e.target.value)}
            placeholder="예: -10"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          목표 수익률(%)
          <input
            type="number"
            value={form.targetRate}
            onChange={(e) => updateForm('targetRate', e.target.value)}
            placeholder="예: 15"
            style={inputStyle}
          />
        </label>
      </div>

      {stockError && (
        <p
          style={{
            margin: '10px 0 0',
            padding: '10px 12px',
            borderRadius: '12px',
            background: '#fef2f2',
            color: '#b91c1c',
            fontSize: '13px',
            fontWeight: 700
          }}
        >
          {stockError}
        </p>
      )}

      {stockData?.summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '8px',
            marginTop: '10px'
          }}
        >
          <InfoCard label="현재가" value={`${formatNumber(stockData.summary.currentPrice)}원`} />
          <InfoCard label="5거래일" value={`${stockData.summary.change5d}%`} />
          <InfoCard label="20거래일" value={`${stockData.summary.change20d}%`} />
          <InfoCard label="고점 대비" value={`${stockData.summary.drawdownFromHigh}%`} />
        </div>
      )}

      <label style={{ ...labelStyle, marginTop: '10px' }}>
        지금 고민 한 줄
        <input
          value={form.memo}
          onChange={(e) => updateForm('memo', e.target.value)}
          placeholder="예: 5년 들고 있었는데 더는 못 보겠고 그냥 팔고 싶어요."
          style={inputStyle}
        />
      </label>
    </section>
  )
}

function InfoCard({ label, value }) {
  return (
    <div
      style={{
        borderRadius: '12px',
        padding: '10px 12px',
        background: '#f8fafc',
        border: '1px solid rgba(148, 163, 184, 0.25)'
      }}
    >
      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: '4px', fontSize: '15px', color: '#0f172a', fontWeight: 800 }}>
        {value}
      </div>
    </div>
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
