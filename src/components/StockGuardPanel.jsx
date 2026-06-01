import { useEffect, useMemo, useRef, useState } from 'react'

export default function StockGuardPanel({ onSendToChat }) {
  const [form, setForm] = useState({
    stockName: '카카오',
    averagePrice: '',
    currentPrice: '',
    quantity: '',
    tradeQuantity: '',
    action: '더 살까?',
    horizon: '며칠~몇 주 보고 있어요',
    stopLossRate: '-10',
    targetRate: '15',
    emotion: '불안',
    memo: ''
  })

  const [stockData, setStockData] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [loadingStock, setLoadingStock] = useState(false)
  const [stockError, setStockError] = useState('')

  const debounceTimerRef = useRef(null)
  const lastLoadedNameRef = useRef('')

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

  const getActionMeaning = () => {
    if (form.action === '더 살까?') return '추가매수 고민'
    if (form.action === '팔까?') return '매도 고민'
    if (form.action === '기다릴까?') return '관망 고민'
    return form.action
  }

  const getInvestmentStyle = () => {
    if (form.horizon === '오늘 안에 결정하고 싶어요') return '단타'
    if (form.horizon === '며칠~몇 주 보고 있어요') return '스윙'
    if (form.horizon === '몇 달 이상 들고 갈 생각이에요') return '중장기'
    return '미입력'
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

    let decisionHint = '기준 점검 필요'
    const actionMeaning = getActionMeaning()
    const change5d = stockData?.summary?.change5d
    const change20d = stockData?.summary?.change20d

    if (actionMeaning.includes('추가매수') && change20d <= -10) {
      decisionHint = '하락 구간 추가매수 점검 필요'
    } else if (actionMeaning.includes('매도') && stopLossReached) {
      decisionHint = '손절 기준 도달 가능성'
    } else if (
      actionMeaning.includes('매도') &&
      !stopLossReached &&
      ['불안', '공포', '분노', '멘붕'].includes(form.emotion)
    ) {
      decisionHint = '감정 매도 가능성'
    } else if (actionMeaning.includes('매수') && change5d >= 8) {
      decisionHint = '추격매수 가능성'
    } else if (targetReached && actionMeaning.includes('매도')) {
      decisionHint = '목표 수익 도달 가능성'
    }

    return {
      profitRate,
      holdingValue,
      profitAmount,
      stopLossPrice,
      targetPrice,
      stopLossReached,
      targetReached,
      newAverageAfterBuy,
      addedBuyAmount,
      decisionHint
    }
  }, [form, stockData])

  const loadStock = async (query) => {
    const trimmed = String(query || '').trim()

    if (trimmed.length < 2) {
      setStockData(null)
      setCandidates([])
      setStockError('')
      updateForm('currentPrice', '')
      return
    }

    setLoadingStock(true)
    setStockError('')

    try {
      const response = await fetch(`/api/stock?name=${encodeURIComponent(trimmed)}`)
      const data = await response.json()

      if (data.error === 'ambiguous_stock') {
        setStockData(null)
        setCandidates(data.candidates || [])
        updateForm('currentPrice', '')
        setStockError('')
        return
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || '주가 데이터를 불러오지 못했습니다.')
      }

      setCandidates([])
      setStockData(data)
      lastLoadedNameRef.current = data.stock?.name || trimmed

      if (data.stock?.name) {
        updateForm('stockName', data.stock.name)
      }

      if (data.summary?.currentPrice) {
        updateForm('currentPrice', String(data.summary.currentPrice))
      }
    } catch (error) {
      setStockData(null)
      setCandidates([])
      updateForm('currentPrice', '')
      setStockError(error.message || '주가 데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoadingStock(false)
    }
  }

  useEffect(() => {
    const name = form.stockName.trim()

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      if (name && name !== lastLoadedNameRef.current) {
        loadStock(name)
      }
    }, 800)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [form.stockName])

  const handleCandidateClick = (candidate) => {
    setCandidates([])
    updateForm('stockName', candidate.name)
    loadStock(candidate.code)
  }

  const buildDataSummary = () => {
    if (!stockData?.summary) return '주가 데이터: 아직 불러오지 않음'

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
- 판단 힌트: ${analysis.decisionHint}
`.trim()
  }

  const handleSubmit = () => {
    const actionMeaning = getActionMeaning()
    const investmentStyle = getInvestmentStyle()
    const displayText = `숨돌이, ${form.stockName || '이 종목'} ${actionMeaning}을 점검해줘.`

    const message = `
너는 Mind-Guard의 금융 심리 케어 챗봇 '숨돌이'야.
아래 사용자의 투자 상황, 주가 데이터, 앱 계산 결과를 바탕으로 지금 행동이 원칙 매매인지 감정 매매인지 점검해줘.

[사용자 입력]
- 종목명: ${form.stockName || '미입력'}
- 평균 매수가: ${form.averagePrice || '미입력'}
- 현재가: ${form.currentPrice || '미입력'}
- 보유 수량: ${form.quantity || '미입력'}주
- 사용자가 고른 행동: ${form.action}
- 해석된 행동: ${actionMeaning}
- 매매 희망 수량: ${form.tradeQuantity || '미입력'}주
- 사용자가 고른 투자 기간: ${form.horizon}
- 해석된 투자 스타일: ${investmentStyle}
- 손절 기준: ${form.stopLossRate}%
- 목표 수익률: ${form.targetRate}%
- 현재 감정: ${form.emotion}
- 지금 고민: ${form.memo || '없음'}

${buildDataSummary()}

${buildAnalysisSummary()}

[답변 규칙]
- 600~800자 이내로 답변해.
- 5~7문장 이하로 답변해.
- 첫 문장은 사용자의 감정을 인정하는 문장으로 시작해.
- 현재 손익률, 손절 기준 도달 여부, 최근 20거래일 흐름, 고점 대비 하락률, 추가매수 후 평단을 반드시 고려해.
- 매수/매도하라고 직접 지시하지 마.
- 특정 결과를 예측하지 말고, 현재 데이터가 보여주는 위험과 점검 포인트를 설명해.
- 답변 마지막에는 사용자가 바로 생각할 수 있는 확인 질문 1개만 던져.
`.trim()

    if (typeof onSendToChat === 'function') {
      onSendToChat({ message, displayText })
    }
  }

  return (
    <>
      <style>{`
        .mindGuardWorkspace {
          height: 100%;
          min-height: 0;
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr);
          background: #fffaf3;
          border-right: 1px solid rgba(120, 83, 45, 0.12);
        }

        .mindGuardInputColumn {
          min-height: 0;
          overflow-y: auto;
          padding: 20px 16px;
          border-right: 1px solid rgba(120, 83, 45, 0.12);
          background: #fff9ef;
        }

        .mindGuardMainColumn {
          min-height: 0;
          overflow-y: auto;
          padding: 24px;
          background: #fffdf8;
        }

        .brandTitle {
          font-size: 22px;
          font-weight: 900;
          color: #3b2a1c;
          margin: 0;
        }

        .brandSubtitle {
          font-size: 13px;
          color: #8a6a4a;
          margin: 6px 0 18px;
        }

        .sideSection {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid rgba(120, 83, 45, 0.12);
        }

        .sideSectionTitle {
          margin: 0 0 10px;
          font-size: 13px;
          font-weight: 900;
          color: #5b3d25;
        }

        .inputStack {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .pillRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .candidateBox {
          margin-top: 12px;
          padding: 12px;
          border-radius: 14px;
          background: #fffbeb;
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #78350f;
          font-size: 13px;
        }

        .candidateTitle {
          font-weight: 900;
          margin-bottom: 8px;
        }

        .dashboardHeader {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 18px;
        }

        .dashboardTitle {
          margin: 0;
          font-size: 26px;
          font-weight: 950;
          color: #1f2937;
        }

        .dashboardSubtitle {
          margin: 6px 0 0;
          font-size: 14px;
          color: #64748b;
        }

        .statusBadge {
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 900;
          background: #fff7ed;
          color: #9a3412;
          border: 1px solid rgba(251, 146, 60, 0.25);
          white-space: nowrap;
        }

        .emptyState {
          height: 100%;
          min-height: 420px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #8a6a4a;
        }

        .emptyIcon {
          font-size: 42px;
          margin-bottom: 12px;
        }

        .stockIdentity {
          padding: 16px;
          border-radius: 18px;
          background: linear-gradient(135deg, #0f172a, #334155);
          color: white;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
        }

        .stockIdentityName {
          font-size: 24px;
          font-weight: 950;
          margin: 0;
        }

        .stockIdentityCode {
          margin-top: 6px;
          font-size: 13px;
          color: rgba(255,255,255,0.72);
        }

        .dashboardSection {
          margin-top: 16px;
          padding: 16px;
          border-radius: 18px;
          background: white;
          border: 1px solid rgba(148, 163, 184, 0.22);
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
        }

        .dashboardSectionTitle {
          margin: 0 0 12px;
          font-size: 15px;
          font-weight: 950;
          color: #0f172a;
        }

        .metricGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .decisionBox {
          margin-top: 16px;
          padding: 16px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid rgba(148, 163, 184, 0.25);
        }

        .bottomInputRow {
          display: flex;
          gap: 10px;
          align-items: end;
        }

        @media (max-width: 980px) {
          .mindGuardWorkspace {
            grid-template-columns: 1fr;
          }

          .mindGuardInputColumn {
            border-right: 0;
            border-bottom: 1px solid rgba(120, 83, 45, 0.12);
            max-height: none;
          }

          .mindGuardMainColumn {
            padding: 16px;
          }

          .metricGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dashboardHeader {
            display: block;
          }

          .statusBadge {
            display: inline-block;
            margin-top: 10px;
          }
        }

        @media (max-width: 560px) {
          .mindGuardInputColumn {
            padding: 14px;
          }

          .brandTitle {
            font-size: 19px;
          }

          .dashboardTitle {
            font-size: 21px;
          }

          .metricGrid {
            grid-template-columns: 1fr 1fr;
          }

          .bottomInputRow {
            display: block;
          }

          .bottomInputRow button {
            width: 100%;
            margin-top: 8px;
          }
        }
      `}</style>

      <div className="mindGuardWorkspace">
        <aside className="mindGuardInputColumn">
          <h1 className="brandTitle">마인드 가드</h1>
          <p className="brandSubtitle">주식창 앞에서 흔들릴 때, 먼저 기준을 확인해요</p>

          <div className="sideSection">
            <p className="sideSectionTitle">1. 종목 입력</p>

            <div className="inputStack">
              <label style={labelStyle}>
                종목명
                <input
                  value={form.stockName}
                  onChange={(e) => updateForm('stockName', e.target.value)}
                  placeholder="예: 카카오, 삼성전자"
                  style={inputStyle}
                />
              </label>
            </div>

            {candidates.length > 0 && (
              <div className="candidateBox">
                <div className="candidateTitle">어떤 종목을 말하나요?</div>
                <div className="pillRow">
                  {candidates.map((candidate) => (
                    <button
                      key={candidate.code}
                      type="button"
                      onClick={() => handleCandidateClick(candidate)}
                      style={candidateButtonStyle}
                    >
                      {candidate.name} <span>{candidate.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {stockError && <p style={errorStyle}>{stockError}</p>}
          </div>

          <div className="sideSection">
            <p className="sideSectionTitle">2. 내 투자 기준</p>

            <div className="inputStack">
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
                지금 고민
                <select
                  value={form.action}
                  onChange={(e) => updateForm('action', e.target.value)}
                  style={inputStyle}
                >
                  <option>더 살까?</option>
                  <option>팔까?</option>
                  <option>기다릴까?</option>
                </select>
              </label>

              <label style={labelStyle}>
                투자 기간
                <select
                  value={form.horizon}
                  onChange={(e) => updateForm('horizon', e.target.value)}
                  style={inputStyle}
                >
                  <option>오늘 안에 결정하고 싶어요</option>
                  <option>며칠~몇 주 보고 있어요</option>
                  <option>몇 달 이상 들고 갈 생각이에요</option>
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
          </div>

          <div className="sideSection">
            <p className="sideSectionTitle">3. 숨돌이에게 물어보기</p>

            <div className="inputStack">
              <label style={labelStyle}>
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
                  placeholder="예: 결과가 이래서 불안해요."
                  style={inputStyle}
                />
              </label>

              <button type="button" onClick={handleSubmit} style={primaryButtonStyle}>
                점검받기
              </button>
            </div>
          </div>
        </aside>

        <main className="mindGuardMainColumn">
          <div className="dashboardHeader">
            <div>
              <h2 className="dashboardTitle">종목 데이터 대시보드</h2>
              <p className="dashboardSubtitle">
                가격 흐름과 내 기준을 분리해서 보고, 마지막에 숨돌이가 점검합니다.
              </p>
            </div>

            <div className="statusBadge">
              {loadingStock
                ? '종목 조회 중...'
                : stockData
                  ? '데이터 연결됨'
                  : '종목명 입력 시 자동 조회'}
            </div>
          </div>

          {!stockData?.summary && (
            <div className="emptyState">
              <div>
                <div className="emptyIcon">📊</div>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#3b2a1c' }}>
                  종목을 입력해 주세요
                </h3>
                <p style={{ marginTop: '8px', fontSize: '14px' }}>
                  왼쪽에서 종목명을 입력하면 현재가와 최근 흐름이 자동으로 표시됩니다.
                </p>
              </div>
            </div>
          )}

          {stockData?.stock && (
            <div className="stockIdentity">
              <p className="stockIdentityName">{stockData.stock.name}</p>
              <div className="stockIdentityCode">
                종목코드 {stockData.stock.code} · {stockData.stock.market}
              </div>
            </div>
          )}

          {stockData?.summary && (
            <>
              <section className="dashboardSection">
                <p className="dashboardSectionTitle">시장 데이터</p>

                <div className="metricGrid">
                  <InfoCard label="현재가" value={formatWon(stockData.summary.currentPrice)} />
                  <InfoCard label="5거래일" value={`${stockData.summary.change5d}%`} />
                  <InfoCard label="20거래일" value={`${stockData.summary.change20d}%`} />
                  <InfoCard label="고점 대비" value={`${stockData.summary.drawdownFromHigh}%`} />
                </div>
              </section>

              <section className="dashboardSection">
                <p className="dashboardSectionTitle">최근 흐름</p>
                <MiniPriceChart prices={stockData.prices || []} stock={stockData.stock} />
              </section>
            </>
          )}

          <section className="dashboardSection">
            <p className="dashboardSectionTitle">내 손익 계산</p>

            <div className="metricGrid">
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
                value={
                  analysis.newAverageAfterBuy !== null
                    ? formatWon(analysis.newAverageAfterBuy)
                    : '-'
                }
              />
            </div>

            <div className="decisionBox">
              <strong>현재 판단 힌트</strong>
              <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '14px' }}>
                {analysis.decisionHint}
              </p>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}

function InfoCard({ label, value, emphasize = 'neutral' }) {
  const color =
    emphasize === 'bad' ? '#dc2626' : emphasize === 'good' ? '#047857' : '#0f172a'

  return (
    <div style={infoCardStyle}>
      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: '6px', fontSize: '18px', color, fontWeight: 950 }}>
        {value}
      </div>
    </div>
  )
}

function MiniPriceChart({ prices, stock }) {
  const chartPrices = prices.slice(-60)

  if (!chartPrices.length) return null

  const width = 720
  const height = 180
  const padding = 18
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
        <strong>
          {stock?.name} {stock?.code} · 최근 60거래일 종가
        </strong>
        <span>
          {first?.date} → {last?.date}
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '180px' }}>
        <polyline
          points={points}
          fill="none"
          stroke="#0f172a"
          strokeWidth="4"
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

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
  fontSize: '12px',
  color: '#6b4f34',
  fontWeight: 800
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid rgba(160, 128, 96, 0.35)',
  borderRadius: '12px',
  padding: '10px 11px',
  background: 'rgba(255, 255, 255, 0.98)',
  color: '#2f2418',
  fontSize: '13px',
  outline: 'none'
}

const primaryButtonStyle = {
  width: '100%',
  border: 0,
  borderRadius: '14px',
  padding: '12px 16px',
  background: '#3b2a1c',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 900
}

const infoCardStyle = {
  borderRadius: '16px',
  padding: '14px',
  background: '#f8fafc',
  border: '1px solid rgba(148, 163, 184, 0.25)'
}

const chartBoxStyle = {
  borderRadius: '16px',
  padding: '12px',
  background: '#f8fafc',
  border: '1px solid rgba(148, 163, 184, 0.25)'
}

const chartHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '8px',
  fontSize: '13px',
  color: '#475569',
  flexWrap: 'wrap'
}

const chartFooterStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '8px',
  fontSize: '12px',
  color: '#64748b'
}

const candidateButtonStyle = {
  border: '1px solid rgba(245, 158, 11, 0.4)',
  borderRadius: '999px',
  padding: '7px 10px',
  background: 'white',
  color: '#78350f',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 800
}

const errorStyle = {
  margin: '10px 0 0',
  padding: '10px 12px',
  borderRadius: '12px',
  background: '#fef2f2',
  color: '#b91c1c',
  fontSize: '13px',
  fontWeight: 800
}
