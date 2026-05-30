export function analyzeInvestment({
  currentPrice,
  averagePrice,
  stopLossRate,
  targetRate,
  style,
  emotion,
  action,
  stockSummary
}) {
  const avg = Number(averagePrice)
  const current = Number(currentPrice)
  const stop = Number(stopLossRate)
  const target = Number(targetRate)

  const profitRate =
    avg > 0 && current > 0 ? Number((((current - avg) / avg) * 100).toFixed(2)) : 0

  const stopLossPrice = avg > 0 ? Math.round(avg * (1 + stop / 100)) : 0
  const targetPrice = avg > 0 ? Math.round(avg * (1 + target / 100)) : 0

  const stopLossReached = profitRate <= stop
  const targetReached = profitRate >= target

  const highRiskEmotions = ['공포', '분노', '멘붕', '불안']
  const mediumRiskEmotions = ['흥분', '조급']
  const emotionRisk = highRiskEmotions.includes(emotion)
    ? '높음'
    : mediumRiskEmotions.includes(emotion)
      ? '중간'
      : '낮음'

  let decisionType = '기준 점검 필요'
  let cooldown = '5분 쿨다운 후 재확인'

  if (style === '단타') cooldown = '1~3분 쿨다운 후 재확인'
  if (style === '스윙') cooldown = '10~30분 후 재확인'
  if (style === '중장기') cooldown = '장 마감 후 또는 24시간 후 재확인'

  if (action?.includes('매도') && stopLossReached) {
    decisionType = '원칙 매도 가능성 있음'
  } else if (action?.includes('매도') && !stopLossReached && emotionRisk === '높음') {
    decisionType = '패닉셀 가능성 있음'
  } else if (action?.includes('매수') && stockSummary?.change5d >= 10 && emotionRisk !== '낮음') {
    decisionType = '추격매수 가능성 있음'
  } else if (targetReached && action?.includes('매도')) {
    decisionType = '원칙 익절 가능성 있음'
  }

  return {
    profitRate,
    stopLossPrice,
    targetPrice,
    stopLossReached,
    targetReached,
    emotionRisk,
    decisionType,
    cooldown
  }
}

export function buildSumdoriMessage({ stockName, form, summary, analysis }) {
  const actionText = form.action || '매매'

  if (analysis.decisionType === '패닉셀 가능성 있음') {
    return `지금 ${actionText}을 고민하는 건 이해돼. 다만 현재 손익률은 ${analysis.profitRate}%이고, 네가 설정한 손절 기준 ${form.stopLossRate}%에는 아직 도달하지 않았어. 감정 상태가 ${form.emotion}라면 지금 결정은 원칙 매도보다 감정 반응에 가까울 수 있어. ${form.style} 투자자 기준으로는 ${analysis.cooldown}을 해보고, 매도 이유가 기준 때문인지 감정 때문인지 한 줄로 다시 확인해보자.`
  }

  if (analysis.decisionType === '추격매수 가능성 있음') {
    return `${stockName}의 최근 5거래일 흐름이 ${summary.change5d}%로 단기 변동성이 큰 구간이야. 지금 감정 상태가 ${form.emotion}라면 FOMO성 추격매수 가능성도 있어 보여. 바로 판단하기보다 매수 이유, 손절 기준, 목표 수익률을 먼저 한 줄로 정리해보자.`
  }

  if (analysis.decisionType === '원칙 매도 가능성 있음') {
    return `현재 손익률은 ${analysis.profitRate}%로, 네가 정한 손절 기준 ${form.stopLossRate}%에 도달했어. 이 경우 매도 고민은 감정 매도라기보다 원칙 매도에 가까울 수 있어. 다만 전량 매도와 일부 매도 중 어떤 방식이 네 투자 기준에 더 맞는지는 한 번 더 비교해보자.`
  }

  if (analysis.decisionType === '원칙 익절 가능성 있음') {
    return `현재 손익률은 ${analysis.profitRate}%로 목표 수익률 ${form.targetRate}%에 도달했어. 익절은 충분히 원칙 기반 선택일 수 있어. 다만 전량 익절, 일부 익절, 보유 유지 중 어떤 선택이 네 기준에 맞는지 비교해보자.`
  }

  return `현재 ${stockName}의 손익률은 ${analysis.profitRate}%이고, 최근 5거래일 흐름은 ${summary.change5d}%야. 지금은 바로 결론을 내리기보다 네가 정한 손절 기준, 목표 수익률, 감정 상태를 나눠서 확인하는 게 좋아. 이 답변은 매수·매도 추천이 아니라 의사결정 점검을 위한 참고 정보야.`
}
