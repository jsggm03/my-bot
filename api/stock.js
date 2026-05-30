const STOCK_LIST = [
  { name: '삼성전자', code: '005930', market: 'KOSPI' },
  { name: '카카오', code: '035720', market: 'KOSPI' },
  { name: 'NAVER', code: '035420', market: 'KOSPI' },
  { name: '카카오뱅크', code: '323410', market: 'KOSPI' },
  { name: '카카오페이', code: '377300', market: 'KOSPI' },
  { name: '카카오게임즈', code: '293490', market: 'KOSDAQ' },
  { name: '에코프로비엠', code: '247540', market: 'KOSDAQ' },
  { name: 'SK하이닉스', code: '000660', market: 'KOSPI' },
  { name: '현대차', code: '005380', market: 'KOSPI' },
  { name: 'LG에너지솔루션', code: '373220', market: 'KOSPI' }
]

let cachedToken = null
let tokenExpiresAt = 0

function findStockByName(name) {
  const keyword = String(name || '').trim().toLowerCase()
  if (!keyword) return null

  const exact = STOCK_LIST.find(
    (stock) => stock.name.toLowerCase() === keyword || stock.code === keyword
  )

  if (exact) return exact

  return STOCK_LIST.find(
    (stock) =>
      stock.name.toLowerCase().includes(keyword) ||
      keyword.includes(stock.name.toLowerCase())
  )
}

function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function toNumber(value) {
  const n = Number(String(value || '').replaceAll(',', ''))
  return Number.isFinite(n) ? n : 0
}

async function getKisToken() {
  const now = Date.now()

  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken
  }

  const appkey = process.env.KIS_APP_KEY
  const appsecret = process.env.KIS_APP_SECRET
  const baseUrl = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443'

  if (!appkey || !appsecret) {
    throw new Error('KIS_APP_KEY 또는 KIS_APP_SECRET 환경변수가 없습니다.')
  }

  const response = await fetch(`${baseUrl}/oauth2/tokenP`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
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
    throw new Error(`한국투자증권 토큰 응답 파싱 실패: ${text}`)
  }

  if (!response.ok || !data.access_token) {
    throw new Error(`한국투자증권 토큰 발급 실패: ${text}`)
  }

  cachedToken = data.access_token

  const expiresInSec = Number(data.expires_in || 86400)
  tokenExpiresAt = now + Math.max(expiresInSec - 300, 60) * 1000

  return cachedToken
}

async function fetchCurrentPrice({ baseUrl, token, appkey, appsecret, stockCode }) {
  const params = new URLSearchParams({
    FID_COND_MRKT_DIV_CODE: 'J',
    FID_INPUT_ISCD: stockCode
  })

  const response = await fetch(
    `${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price?${params}`,
    {
      method: 'GET',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        authorization: `Bearer ${token}`,
        appkey,
        appsecret,
        tr_id: 'FHKST01010100',
        custtype: 'P'
      }
    }
  )

  const text = await response.text()
  let data = null

  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`현재가 응답 파싱 실패: ${text}`)
  }

  if (!response.ok || data.rt_cd !== '0') {
    throw new Error(data.msg1 || `현재가 조회 실패: ${text}`)
  }

  const output = data.output || {}

  return {
    currentPrice: toNumber(output.stck_prpr),
    previousDayRate: toNumber(output.prdy_ctrt),
    previousDayDiff: toNumber(output.prdy_vrss),
    accumulatedVolume: toNumber(output.acml_vol),
    accumulatedAmount: toNumber(output.acml_tr_pbmn)
  }
}

async function fetchDailyPrices({ baseUrl, token, appkey, appsecret, stockCode }) {
  const today = new Date()
  const start = new Date()
  start.setDate(today.getDate() - 90)

  const params = new URLSearchParams({
    FID_COND_MRKT_DIV_CODE: 'J',
    FID_INPUT_ISCD: stockCode,
    FID_INPUT_DATE_1: formatDate(start),
    FID_INPUT_DATE_2: formatDate(today),
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
    throw new Error(`기간별 시세 응답 파싱 실패: ${text}`)
  }

  if (!response.ok || data.rt_cd !== '0') {
    throw new Error(data.msg1 || `기간별 시세 조회 실패: ${text}`)
  }

  return (data.output2 || [])
    .map((row) => ({
      date: row.stck_bsop_date,
      open: toNumber(row.stck_oprc),
      high: toNumber(row.stck_hgpr),
      low: toNumber(row.stck_lwpr),
      close: toNumber(row.stck_clpr),
      volume: toNumber(row.acml_vol)
    }))
    .filter((row) => row.date && row.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
}

function calcChange(prices, days) {
  if (!prices || prices.length < 2) return 0

  const last = prices[prices.length - 1]
  const prevIndex = Math.max(0, prices.length - 1 - days)
  const prev = prices[prevIndex]

  if (!prev?.close) return 0

  return Number((((last.close - prev.close) / prev.close) * 100).toFixed(2))
}

function summarizePrices(prices, currentPrice) {
  const closes = prices.map((p) => p.close).filter(Boolean)
  const high = closes.length ? Math.max(...closes) : currentPrice
  const low = closes.length ? Math.min(...closes) : currentPrice

  return {
    currentPrice,
    change5d: calcChange(prices, 5),
    change20d: calcChange(prices, 20),
    high90d: high,
    low90d: low,
    drawdownFromHigh:
      high > 0 ? Number((((currentPrice - high) / high) * 100).toFixed(2)) : 0,
    reboundFromLow:
      low > 0 ? Number((((currentPrice - low) / low) * 100).toFixed(2)) : 0
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'method_not_allowed'
    })
  }

  try {
    const name = String(req.query?.name || '')
    const stock = findStockByName(name)

    if (!stock) {
      return res.status(404).json({
        success: false,
        error: 'stock_not_found',
        message: '종목을 찾을 수 없습니다. 예: 카카오, 삼성전자, NAVER'
      })
    }

    const appkey = process.env.KIS_APP_KEY
    const appsecret = process.env.KIS_APP_SECRET
    const baseUrl = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443'
    const token = await getKisToken()

    const current = await fetchCurrentPrice({
      baseUrl,
      token,
      appkey,
      appsecret,
      stockCode: stock.code
    })

    const prices = await fetchDailyPrices({
      baseUrl,
      token,
      appkey,
      appsecret,
      stockCode: stock.code
    })

    const summary = summarizePrices(prices, current.currentPrice)

    return res.status(200).json({
      success: true,
      stock,
      current,
      prices,
      summary
    })
  } catch (error) {
    console.error('stock api error:', error)

    return res.status(500).json({
      success: false,
      error: 'stock_api_error',
      message: error.message || '주가 데이터를 불러오는 중 오류가 발생했습니다.'
    })
  }
}
