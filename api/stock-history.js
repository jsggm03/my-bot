let cachedToken = null
let cachedTokenExpiresAt = 0

function toNumber(value) {
  const n = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function percentChange(from, to) {
  const a = Number(from)
  const b = Number(to)

  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return null

  return Number((((b - a) / a) * 100).toFixed(2))
}

function avg(values) {
  const nums = values.filter((v) => Number.isFinite(v))

  if (!nums.length) return null

  return Number((nums.reduce((sum, v) => sum + v, 0) / nums.length).toFixed(2))
}

async function getKisToken({ baseUrl, appkey, appsecret }) {
  const now = Date.now()

  if (cachedToken && cachedTokenExpiresAt > now + 60_000) {
    return cachedToken
  }

  const response = await fetch(`${baseUrl}/oauth2/tokenP`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey,
      appsecret
    })
  })

  const text = await response.text()
  let data = null

  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`토큰 응답 파싱 실패: ${text}`)
  }

  if (!response.ok || !data.access_token) {
    throw new Error(data.msg1 || data.error_description || `토큰 발급 실패: ${text}`)
  }

  cachedToken = data.access_token
  cachedTokenExpiresAt = now + Number(data.expires_in || 86400) * 1000

  return cachedToken
}

async function fetchLongDailyPrices({ baseUrl, token, appkey, appsecret, stockCode }) {
  const today = new Date()
  const allPrices = []
  const chunkCount = 12

  for (let i = 0; i < chunkCount; i += 1) {
    const end = new Date(today)
    end.setDate(today.getDate() - i * 100)

    const start = new Date(end)
    start.setDate(end.getDate() - 100)

    const params = new URLSearchParams({
      FID_COND_MRKT_DIV_CODE: 'J',
      FID_INPUT_ISCD: stockCode,
      FID_INPUT_DATE_1: formatDate(start),
      FID_INPUT_DATE_2: formatDate(end),
      FID_PERIOD_DIV_CODE: 'D',
      FID_ORG_ADJ_PRC: '0'
    })

    const response = await fetch(
      `${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?${params}`,
      {
        method: 'GET',
        headers: {
          'content-type': 'application/json; charset=utf-8',
          authorization: `Bearer ${token}`,
          appkey,
          appsecret,
          tr_id: 'FHKST03010100',
          custtype: 'P'
        }
      }
    )

    const text = await response.text()
    let data = null

    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`장기 일봉 응답 파싱 실패: ${text}`)
    }

    if (!response.ok || data.rt_cd !== '0') {
      throw new Error(data.msg1 || `장기 일봉 조회 실패: ${text}`)
    }

    const rows = Array.isArray(data.output2) ? data.output2 : []

    const prices = rows
      .map((row) => ({
        date: row.stck_bsop_date,
        open: toNumber(row.stck_oprc),
        high: toNumber(row.stck_hgpr),
        low: toNumber(row.stck_lwpr),
        close: toNumber(row.stck_clpr),
        volume: toNumber(row.acml_vol)
      }))
      .filter((row) => row.date && row.close > 0)

    allPrices.push(...prices)

    await new Promise((resolve) => setTimeout(resolve, 80))
  }

  const uniqueMap = new Map()

  allPrices.forEach((row) => {
    uniqueMap.set(row.date, row)
  })

  return Array.from(uniqueMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function makeSummary(prices, currentPrice) {
  const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date))
  const latest = sorted[sorted.length - 1]
  const close = Number(currentPrice || latest?.close || 0)

  const recent5 = sorted.slice(-5)
  const recent20 = sorted.slice(-20)
  const recent90 = sorted.slice(-90)

  const high90d = Math.max(...recent90.map((row) => row.high || row.close))
  const low90d = Math.min(...recent90.map((row) => row.low || row.close))

  return {
    currentPrice: close,
    change5d: recent5.length >= 2 ? percentChange(recent5[0].close, close) : null,
    change20d: recent20.length >= 2 ? percentChange(recent20[0].close, close) : null,
    high90d,
    low90d,
    drawdownFromHigh: percentChange(high90d, close),
    reboundFromLow: percentChange(low90d, close)
  }
}

function maxDrawdownAfter(prices, startIndex, days) {
  const base = prices[startIndex]?.close

  if (!base) return null

  const future = prices.slice(startIndex + 1, startIndex + 1 + days)

  if (!future.length) return null

  const minLow = Math.min(...future.map((row) => row.low || row.close))

  return Number((((minLow - base) / base) * 100).toFixed(2))
}

function calculateRollingSignal(prices, index) {
  const current = prices[index]

  if (!current || index < 90) return null

  const recent90 = prices.slice(index - 89, index + 1)
  const recent20 = prices.slice(index - 19, index + 1)
  const recent5 = prices.slice(index - 4, index + 1)

  if (recent90.length < 90 || recent20.length < 20 || recent5.length < 5) return null

  const high90 = Math.max(...recent90.map((row) => row.high || row.close))
  const low90 = Math.min(...recent90.map((row) => row.low || row.close))

  const change5d = percentChange(recent5[0].close, current.close)
  const change20d = percentChange(recent20[0].close, current.close)
  const drawdownFromHigh = percentChange(high90, current.close)
  const reboundFromLow = percentChange(low90, current.close)

  const avgVolume20 =
    recent20.reduce((sum, row) => sum + Number(row.volume || 0), 0) / recent20.length

  const volumeRatio = avgVolume20 > 0 ? Number((current.volume / avgVolume20).toFixed(2)) : null

  return {
    date: current.date,
    close: current.close,
    change5d,
    change20d,
    drawdownFromHigh,
    reboundFromLow,
    volumeRatio
  }
}

function analyzeSimilarHistory(longPrices, currentSummary) {
  if (!Array.isArray(longPrices) || longPrices.length < 160 || !currentSummary) {
    return {
      available: false,
      reason: '장기 일봉 데이터가 부족해 과거 유사 구간을 계산할 수 없습니다.'
    }
  }

  const currentCondition = {
    drawdownFromHigh: Number(currentSummary.drawdownFromHigh),
    change20d: Number(currentSummary.change20d),
    change5d: Number(currentSummary.change5d)
  }

  if (
    !Number.isFinite(currentCondition.drawdownFromHigh) ||
    !Number.isFinite(currentCondition.change20d) ||
    !Number.isFinite(currentCondition.change5d)
  ) {
    return {
      available: false,
      reason: '현재 구간 조건이 부족해 과거 유사 구간을 계산할 수 없습니다.'
    }
  }

  const similarRows = []

  for (let i = 90; i < longPrices.length - 60; i += 1) {
    const signal = calculateRollingSignal(longPrices, i)

    if (!signal) continue

    const drawdownSimilar =
      signal.drawdownFromHigh <= currentCondition.drawdownFromHigh + 5 &&
      signal.drawdownFromHigh >= currentCondition.drawdownFromHigh - 8

    const trendSimilar =
      Math.sign(signal.change20d) === Math.sign(currentCondition.change20d) ||
      Math.abs(signal.change20d - currentCondition.change20d) <= 5

    const reboundSimilar =
      Math.sign(signal.change5d) === Math.sign(currentCondition.change5d) ||
      Math.abs(signal.change5d - currentCondition.change5d) <= 3

    if (!drawdownSimilar || !trendSimilar || !reboundSimilar) continue

    const base = longPrices[i]
    const after20 = longPrices[i + 20]
    const after60 = longPrices[i + 60]

    similarRows.push({
      date: signal.date,
      close: signal.close,
      condition: {
        change5d: signal.change5d,
        change20d: signal.change20d,
        drawdownFromHigh: signal.drawdownFromHigh,
        reboundFromLow: signal.reboundFromLow,
        volumeRatio: signal.volumeRatio
      },
      after: {
        return20d: after20 ? percentChange(base.close, after20.close) : null,
        return60d: after60 ? percentChange(base.close, after60.close) : null,
        extraDrawdown20d: maxDrawdownAfter(longPrices, i, 20),
        extraDrawdown60d: maxDrawdownAfter(longPrices, i, 60)
      }
    })
  }

  const deduped = []
  let lastDate = ''

  similarRows.forEach((row) => {
    if (!lastDate) {
      deduped.push(row)
      lastDate = row.date
      return
    }

    const prev = new Date(
      `${lastDate.slice(0, 4)}-${lastDate.slice(4, 6)}-${lastDate.slice(6, 8)}`
    )
    const cur = new Date(`${row.date.slice(0, 4)}-${row.date.slice(4, 6)}-${row.date.slice(6, 8)}`)
    const diffDays = Math.abs((cur - prev) / (1000 * 60 * 60 * 24))

    if (diffDays >= 10) {
      deduped.push(row)
      lastDate = row.date
    }
  })

  const cases = deduped.slice(-12)

  const returns20 = cases.map((row) => row.after.return20d).filter((v) => Number.isFinite(v))
  const returns60 = cases.map((row) => row.after.return60d).filter((v) => Number.isFinite(v))
  const drawdowns20 = cases
    .map((row) => row.after.extraDrawdown20d)
    .filter((v) => Number.isFinite(v))
  const drawdowns60 = cases
    .map((row) => row.after.extraDrawdown60d)
    .filter((v) => Number.isFinite(v))

  const up20 = returns20.filter((v) => v > 0).length
  const down20 = returns20.filter((v) => v < 0).length
  const up60 = returns60.filter((v) => v > 0).length
  const down60 = returns60.filter((v) => v < 0).length

  return {
    available: true,
    sampleCount: cases.length,
    conditionText: `고점 대비 ${currentSummary.drawdownFromHigh}% 수준, 최근 20거래일 ${currentSummary.change20d}%, 최근 5거래일 ${currentSummary.change5d}%와 유사한 구간`,
    summary: {
      up20,
      down20,
      flat20: Math.max(returns20.length - up20 - down20, 0),
      avgReturn20d: avg(returns20),
      maxExtraDrawdown20d: drawdowns20.length ? Math.min(...drawdowns20) : null,
      up60,
      down60,
      flat60: Math.max(returns60.length - up60 - down60, 0),
      avgReturn60d: avg(returns60),
      maxExtraDrawdown60d: drawdowns60.length ? Math.min(...drawdowns60) : null
    },
    cases
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, message: 'GET만 지원합니다.' })
    }

    const code = String(req.query.code || '').trim()
    const currentPrice = Number(req.query.currentPrice || 0)

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: '종목코드 6자리가 필요합니다.'
      })
    }

    const baseUrl =
      process.env.KIS_BASE_URL ||
      process.env.KOREA_INVESTMENT_BASE_URL ||
      'https://openapi.koreainvestment.com:9443'

    const appkey = process.env.KIS_APP_KEY || process.env.KOREA_INVESTMENT_APP_KEY
    const appsecret = process.env.KIS_APP_SECRET || process.env.KOREA_INVESTMENT_APP_SECRET

    if (!appkey || !appsecret) {
      return res.status(500).json({
        success: false,
        message: '한국투자 API 키가 설정되지 않았습니다.'
      })
    }

    const token = await getKisToken({ baseUrl, appkey, appsecret })

    const longPrices = await fetchLongDailyPrices({
      baseUrl,
      token,
      appkey,
      appsecret,
      stockCode: code
    })

    const summary = makeSummary(longPrices, currentPrice)
    const similarHistory = analyzeSimilarHistory(longPrices, summary)

    return res.status(200).json({
      success: true,
      code,
      longPriceCount: longPrices.length,
      summary,
      similarHistory
    })
  } catch (error) {
    console.error('[api/stock-history]', error)

    return res.status(500).json({
      success: false,
      message: error.message || '과거 유사 구간 데이터를 불러오는 중 오류가 발생했습니다.'
    })
  }
}
