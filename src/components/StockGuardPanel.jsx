import { useMemo, useState } from 'react'

export default function StockGuardPanel({ onSendToChat }) {
  const [form, setForm] = useState({
    stockName: '카카오',
    averagePrice: '',
    currentPrice: '',
    quantity: '',
    tradeQuantity: '',
    action: '추가매수 고민',
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

  const toNumber = (value) => {
    const n = Number(String(value || '').replace(/,/g, ''))
    return Number.isFinite(n) ? n : 0
  }

  const formatWon = (value) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return '-'
    return `${Math.round(n).toLocaleString()}원`
  }

  const formatPercent = (value) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return '-'
    return `${n.toFixed(2)}%`
  }

  const analysis = useMemo(() => {
    const avg = toNumber(form.averagePrice)
    const current = toNumber(form.currentPrice)
    const quantity = toNumber(form.quantity)
    const tradeQuantity = toNumber(form.tradeQuantity)
    const stopLossRate = toNumber(form.stopLossRate)
    const targetRate = toNumber(form.targetRate)

    const hasPrice = avg > 0 && current > 0
    const hasQuantity = quantity > 0

    const profitRate = hasPrice ? ((current - avg) / avg) * 100 : null
    const holdingValue = hasQuantity && current > 0 ? current * quantity : null
    const investedAmount = hasQuantity && avg > 0 ? avg * quantity : null
    const profitAmount =
      holdingValue !== null && investedAmount !== null ? holdingValue - investedAmount : null

    const stopLossPrice = avg > 0 ? avg * (1 + stopLossRate / 100) : null
    const targetPrice = avg > 0 ? avg * (1 + targetRate / 100) : null

    const stopLossReached = profitRate !== null ? profitRate <= stopLossRate : false
    const targetReached = profitRate !== null ? profitRate >= targetRate : false

    const canCalcAddBuy = avg > 0 && current > 0 && quantity > 0 && tradeQuantity > 0
    const newAverageAfterBuy = canCalcAddBuy
      ? (avg * quantity + current * tradeQuantity) / (quantity + tradeQuantity)
      : null

    const addedBuyAmount = current > 0 && tradeQuantity > 0 ? current * tradeQuantity : null
    const sellAmount = current > 0 && tradeQuantity > 0 ? current * tradeQuantity : null
    const remainingQuantity =
      quantity > 0 && tradeQuantity > 0 ? Math.max(quantity - tradeQuantity, 0) : null

    let decisionHint = '기준 점검 필요'

    if (form.action.includes('추가매수') && stockData?.summary?.change20d <= -10) {
      decisionHint = '하락 구간 추가매수 점검 필요'
    } else if (form.action.includes('매도') && stopLossReached) {
      decisionHint = '손절 기준 도달 가능성'
    } else if (
      form.action.includes('매도') &&
      !stopLossReached &&
      ['불안', '공포', '분노', '멘붕'].includes(form.emotion)
    ) {
      decisionHint = '감정 매도 가능성'
    } else if (form.action.includes('매수') && stockData?.summary?.change5d >= 8) {
      decisionHint = '추격매수 가능성'
    } else if (targetReached && form.action.includes('매도')) {
      decisionHint = '목표 수익 도달 가능성'
    }

    return {
      avg,
      current,
      quantity,
      tradeQuantity,
      profitRate,
      holdingValue,
      investedAmount,
      profitAmount,
      stopLossPrice,
      targetPrice,
      stopLossReached,
      targetReached,
      newAverageAfterBuy,
      addedBuyAmount,
      sellAmount,
      remainingQuantity,
      decisionHint
    }
  }, [form, stockData])

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

  const buildAnalysisSummary = () => {
    return `
[앱 계산 결과]
- 현재 손익률: ${
      analysis.profitRate !== null ? `${analysis.profitRate.toFixed(2)}%` : '계산 불가'
    }
- 현재 평가금액: ${
      analysis.holdingValue !== null ? `${Math.round(analysis.holdingValue)}원` : '계산 불가'
    }
- 현재 평가손익: ${
      analysis.profitAmount !== null ? `${Math.round(analysis.profitAmount)}원` : '계산 불가'
    }
- 손절 기준 가격: ${
      analysis.stopLossPrice !== null ? `${Math.round(analysis.stopLossPrice)}원` : '계산 불가'
    }
- 손절 기준 도달 여부: ${analysis.stopLossReached ? '도달' : '미도달 또는 계산 불가'}
- 목표 가격: ${
      analysis.targetPrice !== null ? `${Math.round(analysis.targetPrice)}원` : '계산 불가'
    }
- 목표 수익률 도달 여부: ${analysis.targetReached ? '도달' : '미도달 또는 계산 불가'}
- 추가매수 후 예상 평단: ${
      analysis.newAverageAfterBuy !== null
        ? `${Math.round(analysis.newAverageAfterBuy)}원`
        : '계산 불가'
    }
- 추가매수 예상 금액: ${
      analysis.addedBuyAmount !== null ? `${Math.round(analysis.addedBuyAmount)}원` : '계산 불가'
    }
- 일부 매도 예상 금액: ${
      analysis.sellAmount !== null ? `${Math.round(analysis.sellAmount)}원` : '계산 불가'
    }
- 일부 매도 후 남는 수량: ${
      analysis.remainingQuantity !== null ? `${analysis.remainingQuantity}주` : '계산 불가'
    }
- 판단 힌트: ${analysis.decisionHint}
`.trim()
  }

  const handleSubmit = () => {
    const displayText = `숨돌이, ${form.stockName || '이 종목'} ${form.action}을 점검해줘.`

    const message = `
너는 Mind-Guard의 금융 심리 케어 챗봇 '숨돌이'야.
아래 사용자의 투자 상황, 주가 데이터, 앱 계산 결과를 바탕으로 지금 행동이 원칙 매매인지 감정 매매인지 점검해줘.

[사용자 입력]
- 종목명: ${form.stockName || '미입력'}
- 평균 매수가: ${form.averagePrice || '미입력'}
- 현재가: ${form.currentPrice || '미입력'}
- 보유 수량: ${form.quantity || '미입력'}주
- 하려는 행동: ${form.action}
- 매매 희망 수량: ${form.tradeQuantity || '미입력'}주
- 투자 스타일: ${form.style}
- 손절 기준: ${form.stopLossRate}%
- 목표 수익률: ${form.targetRate}%
- 현재 감정: ${form.emotion}
- 지금 고민: ${form.memo || '없음'}

${buildDataSummary()}

${buildAnalysisSummary()}

[답변 규칙]
- 350자 이내로 답변해.
- 3문장 이하로 답변해.
- 매수/매도하라고 직접 지시하지 마.
- "지금 사세요", "지금 파세요", "무조건 보유하세요" 같은 표현 금지.
- 현재 손익률, 손절 기준 도달 여부, 최근 20거래일 흐름, 추가매수 후 평단을 반드시 고려해.
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
      <div style={topRowStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px' }}>🌬️ 숨돌이 투자 점검</h2>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
            종목 데이터와 내 투자 기준을 함께 확인해요.
          </p>
        </div>
      </div>

      <div style={gridStyle}>
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
              ...secondaryButtonStyle,
              background: loadingStock ? '#cbd5e1' : '#334155',
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
          보유 수량(주)
          <input
            type="number"
            value={form.quantity}
            onChange={(e) => updateForm('quantity', e.target.value)}
            placeholder="예: 100"
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
          매매 희망 수량(주)
          <input
            type="number"
            value={form.tradeQuantity}
            onChange={(e) => updateForm('tradeQuantity', e.target.value)}
            placeholder="예: 50"
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

      {stockError && <p style={errorStyle}>{stockError}</p>}

      {stockData?.summary && (
        <>
          <div style={cardGridStyle}>
            <InfoCard label="현재가" value={formatWon(stockData.summary.currentPrice)} />
            <InfoCard label="5거래일" value={`${stockData.summary.change5d}%`} />
            <InfoCard label="20거래일" value={`${stockData.summary.change20d}%`} />
            <InfoCard label="고점 대비" value={`${stockData.summary.drawdownFromHigh}%`} />
          </div>

          <MiniPriceChart prices={stockData.prices || []} />
        </>
      )}

      <div style={cardGridStyle}>
        <InfoCard
          label="현재 손익률"
          value={analysis.profitRate !== null ? formatPercent(analysis.profitRate) : '-'}
          emphasize={analysis.profitRate < 0 ? 'bad' : 'good'}
        />
        <InfoCard
          label="평가손익"
          value={analysis.profitAmount !== null ? formatWon(analysis.profitAmount) : '-'}
          emphasize={analysis.profitAmount < 0 ? 'bad' : 'good'}
        />
        <InfoCard
          label="손절 기준"
          value={analysis.stopLossReached ? '도달' : '미도달'}
          emphasize={analysis.stopLossReached ? 'bad' : 'neutral'}
        />
        <InfoCard
          label="추가매수 후 평단"
          value={analysis.newAverageAfterBuy !== null ? formatWon(analysis.newAverageAfterBuy) : '-'}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'end',
          marginTop: '10px'
        }}
      >
        <label style={{ ...labelStyle, flex: 1 }}>
          지금 고민 한 줄
          <input
            value={form.memo}
            onChange={(e) => updateForm('memo', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="예: 5년 들고 있었는데 결과가 이거라 불안해요."
            style={inputStyle}
          />
        </label>

        <button
          type="button"
          onClick={handleSubmit}
          style={{
            ...primaryButtonStyle,
            height: '38px',
            padding: '0 16px'
          }}
        >
          점검받기
        </button>
      </div>
    </section>
  )
}

function InfoCard({ label, value, emphasize = 'neutral' }) {
  const color =
    emphasize === 'bad' ? '#dc2626' : emphasize === 'good' ? '#047857' : '#0f172a'

  return (
    <div style={infoCardStyle}>
      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: '4px', fontSize: '15px', color, fontWeight: 800 }}>
        {value}
      </div>
    </div>
  )
}

function MiniPriceChart({ prices }) {
  const chartPrices = prices.slice(-60)

  if (!chartPrices.length) return null

  const width = 520
  const height = 120
  const padding = 12
  const closes = chartPrices.map((p) => p.close)
  const min = Math.min(...closes)
  const max = Math.max(...closes)
  const range = max - min || 1

  const points = chartPrices
    .map((p, index) => {
      const x =
        padding +
        (index / Math.max(chartPrices.length - 1, 1)) * (width - padding * 2)
      const y =
        padding +
        ((max - p.close) / range) * (height - padding * 2)

      return `${x},${y}`
    })
    .join(' ')

  const first = chartPrices[0]
  const last = chartPrices[chartPrices.length - 1]

  return (
    <div style={chartBoxStyle}>
      <div style={chartHeaderStyle}>
        <strong>최근 60거래일 종가 흐름</strong>
        <span>
          {first?.date} → {last?.date}
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '120px' }}>
        <polyline
          points={points}
          fill="none"
          stroke="#0f172a"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      <div style={chartFooterStyle}>
        <span>저점 {min.toLocaleString()}원</span>
        <span>고점 {max.toLocaleString()}원</span>
      </div>
    </div>
  )
}

const topRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  alignItems: 'center'
}

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '10px',
  marginTop: '14px'
}

const cardGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
  gap: '8px',
  marginTop: '10px'
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

const primaryButtonStyle = {
  border: 0,
  borderRadius: '999px',
  padding: '10px 14px',
  background: '#0f172a',
  color: 'white',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  fontWeight: 700
}

const secondaryButtonStyle = {
  width: '100%',
  border: 0,
  borderRadius: '12px',
  padding: '10px 12px',
  color: 'white',
  fontWeight: 700
}

const infoCardStyle = {
  borderRadius: '12px',
  padding: '10px 12px',
  background: '#f8fafc',
  border: '1px solid rgba(148, 163, 184, 0.25)'
}

const chartBoxStyle = {
  marginTop: '10px',
  borderRadius: '14px',
  padding: '12px',
  background: '#f8fafc',
  border: '1px solid rgba(148, 163, 184, 0.25)'
}

const chartHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '8px',
  fontSize: '12px',
  color: '#475569'
}

const chartFooterStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '8px',
  fontSize: '12px',
  color: '#64748b'
}

const errorStyle = {
  margin: '10px 0 0',
  padding: '10px 12px',
  borderRadius: '12px',
  background: '#fef2f2',
  color: '#b91c1c',
  fontSize: '13px',
  fontWeight: 700
}
