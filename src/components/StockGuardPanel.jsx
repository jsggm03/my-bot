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
  const [activeDetail, setActiveDetail] = useState('why')

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

  const formatNumber = (value) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return '-'
    return n.toLocaleString()
  }

  const formatSignedNumber = (value, suffix = '') => {
    const n = Number(value)
    if (!Number.isFinite(n)) return '-'
    const sign = n > 0 ? '+' : ''
    return `${sign}${n.toLocaleString()}${suffix}`
  }

  const formatAmountShort = (value) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return '-'

    if (n >= 1000000000000) return `${(n / 1000000000000).toFixed(1)}조`
    if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
    if (n >= 10000) return `${(n / 10000).toFixed(1)}만`

    return n.toLocaleString()
  }

  const formatSignedAmountShort = (value) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return '-'
    const sign = n > 0 ? '+' : ''
    return `${sign}${formatAmountShort(Math.abs(n))}`
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
    if (form.horizon === '오늘 안에 결정하고 싶어요') return '단기 대응'
    if (form.horizon === '며칠~몇 주 보고 있어요') return '스윙 관점'
    if (form.horizon === '몇 달 이상 들고 갈 생각이에요') return '중장기 관점'
    return '미입력'
  }

  const marketDiagnostics = useMemo(() => {
    if (!stockData?.summary) {
      return {
        latestVolume: null,
        avgVolume20: null,
        volumeRatio: null,
        flags: [],
        reasonSummary: [],
        flowSignal: '',
        riskLabels: [
          {
            type: 'neutral',
            title: '데이터 대기',
            desc: '종목 데이터를 불러오면 위험 라벨이 표시됩니다.'
          }
        ]
      }
    }

    const prices = stockData.prices || []
    const summary = stockData.summary
    const current = stockData.current || {}

    const latest = prices[prices.length - 1]
    const recent20 = prices.slice(-20)
    const recent5 = prices.slice(-5)

    const avgVolume20 =
      recent20.length > 0
        ? recent20.reduce((sum, row) => sum + Number(row.volume || 0), 0) / recent20.length
        : 0

    const avgVolume5 =
      recent5.length > 0
        ? recent5.reduce((sum, row) => sum + Number(row.volume || 0), 0) / recent5.length
        : 0

    const latestVolume = Number(current.accumulatedVolume || latest?.volume || 0)
    const volumeRatio = avgVolume20 > 0 ? latestVolume / avgVolume20 : null

    const flowSummary = stockData.flow?.summary
    const individualNet =
      flowSummary?.latest?.individual?.netQty ?? flowSummary?.individual?.netQty ?? null
    const foreignNet =
      flowSummary?.latest?.foreign?.netQty ?? flowSummary?.foreign?.netQty ?? null
    const institutionNet =
      flowSummary?.latest?.institution?.netQty ?? flowSummary?.institution?.netQty ?? null
    const flowSignal = flowSummary?.signal || ''

    const flags = []
    const reasonSummary = []

    if (summary.change5d >= 10) {
      flags.push('최근 5거래일 급등')
      reasonSummary.push('단기 가격 상승폭이 커서 추격매수 여부를 점검해야 합니다.')
    }

    if (summary.change5d <= -8) {
      flags.push('최근 5거래일 급락')
      reasonSummary.push('단기 하락폭이 커서 공포 매도인지 기준 손절인지 구분해야 합니다.')
    }

    if (summary.change20d >= 20) {
      flags.push('최근 20거래일 강한 상승')
      reasonSummary.push('중기 흐름이 강하게 오른 상태라 이미 가격에 기대가 반영되었을 수 있습니다.')
    }

    if (summary.change20d <= -15) {
      flags.push('최근 20거래일 약세')
      reasonSummary.push('중기 흐름이 약한 상태라 단순 반등만 보고 판단하기 어렵습니다.')
    }

    if (summary.drawdownFromHigh > -5) {
      flags.push('90일 고점 근처')
      reasonSummary.push('90일 고점과 가까워 고점권 매수인지 확인이 필요합니다.')
    }

    if (summary.drawdownFromHigh <= -20) {
      flags.push('고점 대비 큰 하락')
      reasonSummary.push('고점 대비 하락폭이 커서 손실 회피 감정이 강해질 수 있습니다.')
    }

    if (summary.reboundFromLow >= 30) {
      flags.push('저점 대비 큰 반등')
      reasonSummary.push('저점 대비 이미 많이 반등했다면 늦은 진입인지 확인해야 합니다.')
    }

    if (volumeRatio !== null && volumeRatio >= 1.8) {
      flags.push('거래량 증가')
      reasonSummary.push('거래량이 평소보다 늘어 관심이 몰린 구간일 수 있습니다.')
    }

    if (volumeRatio !== null && volumeRatio < 0.7) {
      flags.push('거래량 둔화')
      reasonSummary.push('거래량이 약하면 가격 움직임의 신뢰도를 더 조심해서 봐야 합니다.')
    }

    if (flowSignal) {
      flags.push(flowSignal)
      reasonSummary.push(`수급 기준으로는 '${flowSignal}' 상태입니다.`)
    }

    const avgPrice = Number(form.averagePrice)
    const currentPrice = Number(form.currentPrice || summary.currentPrice)
    const userIsLosing = avgPrice > 0 && currentPrice > 0 && currentPrice < avgPrice
    const emotionHighRisk = ['불안', '공포', '멘붕', '분노'].includes(form.emotion)
    const emotionFomo = ['흥분', '불안', '멘붕'].includes(form.emotion)

    const riskLabels = []

    if (
      form.action === '더 살까?' &&
      (summary.change5d >= 10 || summary.change20d >= 20 || summary.drawdownFromHigh > -5) &&
      emotionFomo
    ) {
      riskLabels.push({
        type: 'warning',
        title: '추격매수 주의',
        desc: '최근 상승폭이나 고점 근접 상태에서 “놓칠까 봐” 들어가는 판단인지 확인해야 합니다.'
      })
    }

    if (
      form.action === '팔까?' &&
      (summary.change5d <= -8 || summary.change20d <= -15) &&
      emotionHighRisk
    ) {
      riskLabels.push({
        type: 'danger',
        title: '패닉셀 주의',
        desc: '하락 자체보다 먼저, 원래 정한 손절 기준에 도달한 매도인지 구분해야 합니다.'
      })
    }

    if (form.action === '더 살까?' && userIsLosing) {
      riskLabels.push({
        type: 'danger',
        title: '손실만회 매수 주의',
        desc: '평단을 낮추는 효과는 있지만 같은 종목에 묶이는 금액도 함께 커집니다.'
      })
    }

    if (summary.drawdownFromHigh > -5 && summary.reboundFromLow >= 30) {
      riskLabels.push({
        type: 'warning',
        title: '고점권 판단 주의',
        desc: '90일 고점 근처이면서 저점 대비 많이 오른 상태라 진입 가격을 더 엄격히 봐야 합니다.'
      })
    }

    if (
      summary.drawdownFromHigh <= -20 &&
      summary.change5d > 0 &&
      summary.change20d < 0
    ) {
      riskLabels.push({
        type: 'warning',
        title: '급락 후 반등 주의',
        desc: '단기 반등은 있지만 중기 흐름은 아직 약할 수 있어 반등과 추세 전환을 구분해야 합니다.'
      })
    }

    if (volumeRatio !== null && volumeRatio >= 1.8 && Math.abs(summary.change5d) >= 8) {
      riskLabels.push({
        type: 'warning',
        title: '거래량 동반 변동',
        desc: '거래량 증가와 가격 변동이 함께 나타나 공시·뉴스·수급 확인이 필요합니다.'
      })
    }

    if (
      form.action === '더 살까?' &&
      individualNet > 0 &&
      foreignNet < 0 &&
      institutionNet < 0
    ) {
      riskLabels.push({
        type: 'warning',
        title: '개인 매수 쏠림 주의',
        desc: '개인은 사고 외국인·기관은 파는 흐름일 수 있어 추격매수 판단을 더 조심해야 합니다.'
      })
    }

    if (
      form.action === '팔까?' &&
      individualNet < 0 &&
      (foreignNet > 0 || institutionNet > 0)
    ) {
      riskLabels.push({
        type: 'neutral',
        title: '공포 매도 점검',
        desc: '개인은 팔고 일부 큰 수급은 들어오는 흐름일 수 있어 감정 매도인지 확인이 필요합니다.'
      })
    }

    if (riskLabels.length === 0) {
      riskLabels.push({
        type: 'neutral',
        title: '기준 재확인',
        desc: '뚜렷한 과열·공포 신호는 약하지만, 매매 이유와 기준은 먼저 확인해야 합니다.'
      })
    }

    return {
      latestVolume,
      avgVolume20,
      avgVolume5,
      volumeRatio,
      flags,
      reasonSummary,
      flowSignal,
      riskLabels
    }
  }, [stockData, form.action, form.emotion, form.averagePrice, form.currentPrice])

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
      investedAmount,
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

      if (data.stock?.name) updateForm('stockName', data.stock.name)
      if (data.summary?.currentPrice) updateForm('currentPrice', String(data.summary.currentPrice))
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
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [form.stockName])

  const handleCandidateClick = (candidate) => {
    setCandidates([])
    updateForm('stockName', candidate.name)
    loadStock(candidate.code)
  }

  const buildDataSummary = () => {
    if (!stockData?.summary) return '주가 데이터: 아직 불러오지 않음'

    const { stock, current, summary, flow } = stockData
    const flowSummary = flow?.summary

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
- 누적 거래량: ${current?.accumulatedVolume ?? '정보 없음'}
- 누적 거래대금: ${current?.accumulatedAmount ?? '정보 없음'}
- 20거래일 평균 대비 거래량: ${
      marketDiagnostics.volumeRatio
        ? `${marketDiagnostics.volumeRatio.toFixed(2)}배`
        : '계산 불가'
    }
- 감지 신호: ${
      marketDiagnostics.flags.length > 0 ? marketDiagnostics.flags.join(', ') : '뚜렷한 신호 없음'
    }

[수급 데이터]
- 수급 기준일: ${flowSummary?.latestDate || '정보 없음'}
- 개인 순매수: ${
      flowSummary?.individual?.netQty !== undefined
        ? `${flowSummary.individual.netQty}주`
        : '정보 없음'
    }
- 외국인 순매수: ${
      flowSummary?.foreign?.netQty !== undefined
        ? `${flowSummary.foreign.netQty}주`
        : '정보 없음'
    }
- 기관 순매수: ${
      flowSummary?.institution?.netQty !== undefined
        ? `${flowSummary.institution.netQty}주`
        : '정보 없음'
    }
- 수급 해석: ${flowSummary?.signal || '정보 없음'}
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
- 위험 라벨: ${marketDiagnostics.riskLabels.map((label) => label.title).join(', ')}
- 원인 후보: ${
      marketDiagnostics.reasonSummary.length > 0
        ? marketDiagnostics.reasonSummary.join(' / ')
        : '추가 확인 필요'
    }
`.trim()
  }

  const handleSubmit = () => {
    const actionMeaning = getActionMeaning()
    const investmentStyle = getInvestmentStyle()
    const displayText = `숨돌이, ${form.stockName || '이 종목'} ${actionMeaning}을 점검해줘.`

    const message = `
너는 Mind-Guard의 금융 심리 케어 챗봇 '숨돌이'야.
아래 사용자의 투자 상황, 주가 데이터, 수급 데이터, 앱 계산 결과, 위험 라벨, 원인 후보를 바탕으로 지금 행동이 원칙 매매인지 감정 매매인지 점검해줘.

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
- 600~900자 이내로 답변해.
- 6~8문장 이하로 답변해.
- 첫 문장은 사용자의 감정을 인정하는 문장으로 시작해.
- 현재 손익률, 손절 기준 도달 여부, 최근 20거래일 흐름, 고점 대비 하락률, 추가매수 후 평단, 위험 라벨, 수급 해석을 반드시 고려해.
- 매수/매도하라고 직접 지시하지 마.
- 특정 결과를 예측하지 말고, 현재 데이터가 보여주는 위험과 점검 포인트를 설명해.
- 상승/하락의 원인을 단정하지 말고, 확인해야 할 원인 후보로 표현해.
- 수급 데이터도 확정 원인이 아니라 보조지표라고 설명해.
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
          grid-template-columns: 380px minmax(0, 1fr);
          background: #fffaf3;
          border-right: 1px solid rgba(120, 83, 45, 0.12);
        }

        .mindGuardInputColumn {
          min-height: 0;
          overflow-y: auto;
          padding: 24px 22px;
          border-right: 1px solid rgba(120, 83, 45, 0.12);
          background: #fff9ef;
        }

        .mindGuardMainColumn {
          min-height: 0;
          overflow-y: auto;
          padding: 30px;
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
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 10px;
        }

        .riskGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px;
        }

        .detailButtonRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .detailPanel {
          margin-top: 12px;
          padding: 14px;
          border-radius: 16px;
          background: #f8fafc;
          border: 1px solid rgba(148, 163, 184, 0.25);
        }

        .detailPanelTitle {
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 950;
          color: #0f172a;
        }

        .detailList {
          margin: 0;
          padding-left: 18px;
          color: #475569;
          font-size: 13px;
          line-height: 1.7;
        }

        .miniGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 10px;
          margin-top: 10px;
        }

        @media (max-width: 980px) {
          .mindGuardWorkspace {
            grid-template-columns: 1fr;
          }

          .mindGuardInputColumn {
            border-right: 0;
            border-bottom: 1px solid rgba(120, 83, 45, 0.12);
          }

          .mindGuardMainColumn {
            padding: 16px;
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
                핵심 지표만 먼저 보고, 필요한 근거는 상세 버튼에서 확인해요.
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
                <p className="dashboardSectionTitle">핵심 지표</p>

                <div className="metricGrid">
                  <InfoCard label="현재가" value={formatWon(stockData.summary.currentPrice)} />
                  <InfoCard
                    label="5거래일"
                    value={`${stockData.summary.change5d}%`}
                    emphasize={stockData.summary.change5d < 0 ? 'bad' : 'good'}
                  />
                  <InfoCard
                    label="20거래일"
                    value={`${stockData.summary.change20d}%`}
                    emphasize={stockData.summary.change20d < 0 ? 'bad' : 'good'}
                  />
                  <InfoCard
                    label="고점 대비"
                    value={`${stockData.summary.drawdownFromHigh}%`}
                    emphasize={stockData.summary.drawdownFromHigh < -20 ? 'bad' : 'neutral'}
                  />
                </div>
              </section>

              <section className="dashboardSection">
                <p className="dashboardSectionTitle">위험 라벨</p>

                <div className="riskGrid">
                  {marketDiagnostics.riskLabels.map((label) => (
                    <RiskCard key={label.title} {...label} />
                  ))}
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
            <p style={{ margin: '-4px 0 12px', fontSize: '13px', color: '#64748b' }}>
              평균 매수가와 보유 수량을 입력하면 내 손익률, 평가손익, 추가매수 후 평단이 계산됩니다.
            </p>

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
          </section>

          {stockData?.summary && (
            <section className="dashboardSection">
              <p className="dashboardSectionTitle">상세 확인</p>
              <div className="detailButtonRow">
                <DetailButton id="why" active={activeDetail} onClick={setActiveDetail}>
                  왜 움직였을까?
                </DetailButton>
                <DetailButton id="flow" active={activeDetail} onClick={setActiveDetail}>
                  수급 보기
                </DetailButton>
                <DetailButton id="news" active={activeDetail} onClick={setActiveDetail}>
                  공시·뉴스
                </DetailButton>
                <DetailButton id="history" active={activeDetail} onClick={setActiveDetail}>
                  과거 유사 구간
                </DetailButton>
                <DetailButton id="detail" active={activeDetail} onClick={setActiveDetail}>
                  상세 지표
                </DetailButton>
              </div>

              <DetailPanel
                activeDetail={activeDetail}
                stockData={stockData}
                marketDiagnostics={marketDiagnostics}
                formatWon={formatWon}
                formatNumber={formatNumber}
                formatSignedNumber={formatSignedNumber}
                formatAmountShort={formatAmountShort}
                formatSignedAmountShort={formatSignedAmountShort}
              />
            </section>
          )}
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

function RiskCard({ type, title, desc }) {
  const style =
    type === 'danger'
      ? riskDangerStyle
      : type === 'warning'
        ? riskWarningStyle
        : riskNeutralStyle

  return (
    <div style={{ ...riskCardBaseStyle, ...style }}>
      <strong>{title}</strong>
      <p style={{ margin: '6px 0 0', fontSize: '13px', lineHeight: 1.5 }}>{desc}</p>
    </div>
  )
}

function DetailButton({ id, active, onClick, children }) {
  const isActive = active === id

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      style={{
        border: '1px solid rgba(148, 163, 184, 0.35)',
        borderRadius: '999px',
        padding: '8px 12px',
        background: isActive ? '#0f172a' : 'white',
        color: isActive ? 'white' : '#334155',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 850
      }}
    >
      {children}
    </button>
  )
}

function DetailPanel({
  activeDetail,
  stockData,
  marketDiagnostics,
  formatWon,
  formatNumber,
  formatSignedNumber,
  formatAmountShort,
  formatSignedAmountShort
}) {
  const summary = stockData.summary
  const current = stockData.current || {}
  const flow = stockData.flow
  const flowError = stockData.flowError
  const flowSummary = flow?.summary

  if (activeDetail === 'why') {
    return (
      <div className="detailPanel">
        <p className="detailPanelTitle">왜 움직였을까? — 원인 후보 체크</p>

        <div className="miniGrid">
          <MiniInsightCard
            title="가격 위치"
            text={`90일 고점 대비 ${summary.drawdownFromHigh}%, 90일 저점 대비 ${summary.reboundFromLow}% 위치입니다.`}
          />
          <MiniInsightCard
            title="단기 흐름"
            text={`최근 5거래일 ${summary.change5d}%, 최근 20거래일 ${summary.change20d}% 흐름입니다.`}
          />
          <MiniInsightCard
            title="거래량 신호"
            text={
              marketDiagnostics.volumeRatio
                ? `최근 거래량은 20거래일 평균 대비 약 ${marketDiagnostics.volumeRatio.toFixed(2)}배입니다.`
                : '거래량 평균 대비 배율은 아직 계산되지 않았습니다.'
            }
          />
          <MiniInsightCard
            title="수급 신호"
            text={flowSummary?.signal || '수급 데이터 확인 대기 중입니다.'}
          />
        </div>

        <ul className="detailList" style={{ marginTop: '12px' }}>
          {marketDiagnostics.reasonSummary.length > 0 ? (
            marketDiagnostics.reasonSummary.map((text) => <li key={text}>{text}</li>)
          ) : (
            <li>현재 데이터만으로는 뚜렷한 급등·급락 원인 후보가 강하게 잡히지 않습니다.</li>
          )}
          <li>
            감지된 신호:{' '}
            {marketDiagnostics.flags.length > 0
              ? marketDiagnostics.flags.join(', ')
              : '뚜렷한 급등·급락 신호 없음'}
          </li>
        </ul>

        <p style={safeNoticeStyle}>
          상승·하락의 확정 원인이 아니라, 매매 전 확인해야 할 가격·거래량·수급 기반 원인 후보입니다.
        </p>
      </div>
    )
  }

  if (activeDetail === 'flow') {
    if (!flowSummary) {
      return (
        <div className="detailPanel">
          <p className="detailPanelTitle">수급 보기</p>
          <ul className="detailList">
            <li>수급 데이터를 아직 불러오지 못했습니다.</li>
            {flowError && <li>오류 메시지: {flowError}</li>}
            <li>현재 버전에서는 가격·거래량 중심으로 먼저 판단합니다.</li>
          </ul>
          <p style={safeNoticeStyle}>
            수급 데이터는 매수·매도 추천이 아니라, 개인·외국인·기관의 매매 쏠림을 확인하는 보조지표입니다.
          </p>
        </div>
      )
    }

    const latest = flowSummary.latest || {
      individual: flowSummary.individual,
      foreign: flowSummary.foreign,
      institution: flowSummary.institution
    }

    return (
      <div className="detailPanel">
        <p className="detailPanelTitle">
          수급 보기 — 개인·외국인·기관 흐름
          {flowSummary.latestDate ? ` (${flowSummary.latestDate})` : ''}
        </p>

        <div className="miniGrid">
          <MiniInsightCard
            title="개인 순매수"
            text={formatSignedNumber(latest.individual?.netQty, '주')}
          />
          <MiniInsightCard
            title="외국인 순매수"
            text={formatSignedNumber(latest.foreign?.netQty, '주')}
          />
          <MiniInsightCard
            title="기관 순매수"
            text={formatSignedNumber(latest.institution?.netQty, '주')}
          />
          <MiniInsightCard
            title="수급 해석"
            text={flowSummary.signal || '수급 데이터 확인 필요'}
          />
        </div>

        <div className="miniGrid">
          <MiniInsightCard
            title="최근 5일 개인"
            text={formatSignedNumber(flowSummary.recent5?.individual?.netQty, '주')}
          />
          <MiniInsightCard
            title="최근 5일 외국인"
            text={formatSignedNumber(flowSummary.recent5?.foreign?.netQty, '주')}
          />
          <MiniInsightCard
            title="최근 5일 기관"
            text={formatSignedNumber(flowSummary.recent5?.institution?.netQty, '주')}
          />
          <MiniInsightCard
            title="최근 20일 외국인"
            text={formatSignedNumber(flowSummary.recent20?.foreign?.netQty, '주')}
          />
        </div>

        <ul className="detailList" style={{ marginTop: '12px' }}>
          <li>
            개인 순매수가 강하고 외국인·기관이 함께 매도하면 개인 매수 쏠림 가능성을 확인합니다.
          </li>
          <li>
            외국인과 기관이 함께 매수하면 수급은 우호적으로 볼 수 있지만, 가격이 이미 고점권인지도 같이 봐야 합니다.
          </li>
          <li>
            수급이 혼조일 때는 가격 흐름만 보고 단정하기보다 공시·뉴스와 거래량을 함께 확인해야 합니다.
          </li>
        </ul>

        <p style={safeNoticeStyle}>
          수급은 상승·하락의 확정 원인이 아니라, 추격매수나 패닉셀을 막기 위한 확인 지표입니다.
        </p>
      </div>
    )
  }

  if (activeDetail === 'news') {
    return (
      <div className="detailPanel">
        <p className="detailPanelTitle">공시·뉴스 — 다음 고도화 예정</p>
        <div className="miniGrid">
          <MiniInsightCard title="실적" text="실적 발표 또는 실적 전망 변화 여부를 확인할 예정입니다." />
          <MiniInsightCard title="공시" text="계약, 증자, 전환사채, 최대주주 변경 등을 확인할 예정입니다." />
          <MiniInsightCard title="주의 이벤트" text="소송, 제재, 투자경고, 관리종목 관련 이슈를 확인할 예정입니다." />
        </div>
        <ul className="detailList" style={{ marginTop: '12px' }}>
          <li>가격 변동과 함께 확인할 이벤트 후보를 표시합니다.</li>
          <li>뉴스 제목만 보고 원인을 단정하지 않도록 요약·분류 형태로 제공하는 것이 목표입니다.</li>
          <li>“이 뉴스 때문에 올랐다”가 아니라 “함께 확인할 이벤트”로 표현합니다.</li>
        </ul>
        <p style={safeNoticeStyle}>
          공시·뉴스는 추후 API로 연결하고, 현재는 가격 변동의 원인을 단정하지 않습니다.
        </p>
      </div>
    )
  }

  if (activeDetail === 'history') {
    return (
      <div className="detailPanel">
        <p className="detailPanelTitle">과거 유사 구간 — 다음 고도화 예정</p>
        <div className="miniGrid">
          <MiniInsightCard title="반등 사례" text="유사 낙폭 이후 반등한 구간을 따로 표시할 예정입니다." />
          <MiniInsightCard title="횡보 사례" text="유사 구간 이후 방향 없이 머문 사례도 함께 표시할 예정입니다." />
          <MiniInsightCard title="추가 하락 사례" text="유사 구간 이후 더 하락한 사례를 반드시 함께 표시할 예정입니다." />
        </div>
        <ul className="detailList" style={{ marginTop: '12px' }}>
          <li>90일 고점 대비 -20% 이상 하락했던 과거 구간</li>
          <li>이후 20거래일·60거래일 흐름</li>
          <li>회복까지 걸린 기간</li>
          <li>추가 하락 최대폭</li>
        </ul>
        <p style={safeNoticeStyle}>
          반등 확률처럼 보이게 만들지 않고, 예측이 아닌 과거 참고 분포로만 제공하는 방향이 안전합니다.
        </p>
      </div>
    )
  }

  return (
    <div className="detailPanel">
      <p className="detailPanelTitle">상세 지표</p>
      <div className="miniGrid">
        <MiniInsightCard title="현재가" text={formatWon(summary.currentPrice)} />
        <MiniInsightCard title="전일 등락률" text={`${current.previousDayRate ?? '-'}%`} />
        <MiniInsightCard title="전일 대비" text={formatWon(current.previousDayDiff)} />
        <MiniInsightCard title="90일 고점" text={formatWon(summary.high90d)} />
        <MiniInsightCard title="90일 저점" text={formatWon(summary.low90d)} />
        <MiniInsightCard title="고점 대비" text={`${summary.drawdownFromHigh}%`} />
        <MiniInsightCard title="저점 대비" text={`${summary.reboundFromLow}%`} />
        <MiniInsightCard title="누적 거래량" text={formatNumber(current.accumulatedVolume)} />
        <MiniInsightCard title="누적 거래대금" text={formatAmountShort(current.accumulatedAmount)} />
        <MiniInsightCard
          title="20일 평균 대비 거래량"
          text={
            marketDiagnostics.volumeRatio
              ? `${marketDiagnostics.volumeRatio.toFixed(2)}배`
              : '-'
          }
        />
        <MiniInsightCard
          title="개인 순매수"
          text={formatSignedNumber(flowSummary?.individual?.netQty, '주')}
        />
        <MiniInsightCard
          title="외국인 순매수"
          text={formatSignedNumber(flowSummary?.foreign?.netQty, '주')}
        />
        <MiniInsightCard
          title="기관 순매수"
          text={formatSignedNumber(flowSummary?.institution?.netQty, '주')}
        />
      </div>
    </div>
  )
}

function MiniInsightCard({ title, text }) {
  return (
    <div style={miniInsightCardStyle}>
      <strong style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>{title}</strong>
      <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#0f172a', lineHeight: 1.5 }}>
        {text}
      </p>
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

const riskCardBaseStyle = {
  borderRadius: '16px',
  padding: '14px',
  fontSize: '13px',
  border: '1px solid transparent'
}

const riskDangerStyle = {
  background: '#fef2f2',
  color: '#991b1b',
  borderColor: 'rgba(220, 38, 38, 0.22)'
}

const riskWarningStyle = {
  background: '#fffbeb',
  color: '#92400e',
  borderColor: 'rgba(245, 158, 11, 0.28)'
}

const riskNeutralStyle = {
  background: '#f8fafc',
  color: '#334155',
  borderColor: 'rgba(148, 163, 184, 0.25)'
}

const miniInsightCardStyle = {
  borderRadius: '14px',
  padding: '12px',
  background: 'white',
  border: '1px solid rgba(148, 163, 184, 0.25)'
}

const safeNoticeStyle = {
  margin: '10px 0 0',
  padding: '10px 12px',
  borderRadius: '12px',
  background: '#fff7ed',
  color: '#9a3412',
  fontSize: '12px',
  lineHeight: 1.5
}
