let cachedToken = null
let cachedTokenExpiresAt = 0

const STOCKS = [
  { name: '삼성전자', code: '005930', market: 'KOSPI', aliases: ['삼전', '삼성'] },
  { name: '삼성전자우', code: '005935', market: 'KOSPI', aliases: ['삼성전자우선주', '삼전우'] },
  { name: 'SK하이닉스', code: '000660', market: 'KOSPI', aliases: ['하이닉스', 'sk하이닉스'] },
  { name: 'LG에너지솔루션', code: '373220', market: 'KOSPI', aliases: ['엘지에너지솔루션', 'LG엔솔', '엘지엔솔'] },
  { name: '삼성바이오로직스', code: '207940', market: 'KOSPI', aliases: ['삼바', '삼성바이오'] },
  { name: '현대차', code: '005380', market: 'KOSPI', aliases: ['현대자동차'] },
  { name: '기아', code: '000270', market: 'KOSPI', aliases: ['기아차'] },
  { name: '셀트리온', code: '068270', market: 'KOSPI', aliases: [] },
  { name: 'NAVER', code: '035420', market: 'KOSPI', aliases: ['네이버', 'naver'] },
  { name: '카카오', code: '035720', market: 'KOSPI', aliases: [] },
  { name: '한미반도체', code: '042700', market: 'KOSPI', aliases: ['한미'] },
  { name: '삼성물산', code: '028260', market: 'KOSPI', aliases: [] },
  { name: '삼성SDI', code: '006400', market: 'KOSPI', aliases: ['삼성sdi'] },
  { name: '삼성생명', code: '032830', market: 'KOSPI', aliases: [] },
  { name: '삼성화재', code: '000810', market: 'KOSPI', aliases: [] },
  { name: '삼성에스디에스', code: '018260', market: 'KOSPI', aliases: ['삼성SDS', '삼성sds'] },
  { name: '삼성중공업', code: '010140', market: 'KOSPI', aliases: ['삼중'] },
  { name: 'POSCO홀딩스', code: '005490', market: 'KOSPI', aliases: ['포스코홀딩스', '포스코'] },
  { name: '포스코퓨처엠', code: '003670', market: 'KOSPI', aliases: ['포퓨엠'] },
  { name: 'KB금융', code: '105560', market: 'KOSPI', aliases: ['kb금융'] },
  { name: '신한지주', code: '055550', market: 'KOSPI', aliases: [] },
  { name: '하나금융지주', code: '086790', market: 'KOSPI', aliases: ['하나금융'] },
  { name: '우리금융지주', code: '316140', market: 'KOSPI', aliases: ['우리금융'] },
  { name: 'LG화학', code: '051910', market: 'KOSPI', aliases: ['엘지화학'] },
  { name: 'LG전자', code: '066570', market: 'KOSPI', aliases: ['엘지전자'] },
  { name: '현대모비스', code: '012330', market: 'KOSPI', aliases: [] },
  { name: '카카오뱅크', code: '323410', market: 'KOSPI', aliases: ['카뱅'] },
  { name: '카카오페이', code: '377300', market: 'KOSPI', aliases: [] },
  { name: '크래프톤', code: '259960', market: 'KOSPI', aliases: [] },
  { name: '두산에너빌리티', code: '034020', market: 'KOSPI', aliases: ['두산중공업'] },
  { name: '에코프로', code: '086520', market: 'KOSDAQ', aliases: [] },
  { name: '에코프로비엠', code: '247540', market: 'KOSDAQ', aliases: ['에코비엠'] },
  { name: 'HLB', code: '028300', market: 'KOSDAQ', aliases: ['에이치엘비'] },
  { name: '알테오젠', code: '196170', market: 'KOSDAQ', aliases: [] },
  { name: '리노공업', code: '058470', market: 'KOSDAQ', aliases: [] },
  { name: 'JYP Ent.', code: '035900', market: 'KOSDAQ', aliases: ['JYP', '제이와이피'] },
  { name: '에스엠', code: '041510', market: 'KOSDAQ', aliases: ['SM', 'sm'] },
  { name: '와이지엔터테인먼트', code: '122870', market: 'KOSDAQ', aliases: ['YG', '와이지'] }
]

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

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[().·]/g, '')
}

function findStock(query) {
  const raw = String(query || '').trim()
  const q = normalizeName(raw)

  if (!q) return { type: 'none' }

  const byCode = STOCKS.find((stock) => stock.code === raw)
  if (byCode) return { type: 'exact', stock: byCode }

  const exact = STOCKS.find((stock) => {
    const names = [stock.name, ...(stock.aliases || [])].map(normalizeName)
    return names.includes(q)
  })

  if (exact) return { type: 'exact', stock: exact }

  const candidates = STOCKS.filter((stock) => {
    const names = [stock.name, ...(stock.aliases || [])].map(normalizeName)
    return names.some((name) => name.includes(q) || q.includes(name))
  }).slice(0, 10)

  if (candidates.length === 1) {
    return { type: 'exact', stock: candidates[0] }
  }

  if (candidates.length > 1) {
    return { type: 'ambiguous', candidates }
  }

  return { type: 'none' }
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

async function fetchDailyPrices({ baseUrl, token, appkey, appsecret, stockCode, days = 110 }) {
  const today = new Date()
  const start = new Date()
  start.setDate(today.getDate() - days)

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
    throw new Error(`일봉 응답 파싱 실패: ${text}`)
  }

  if (!response.ok || data.rt_cd !== '0') {
    throw new Error(data.msg1 || `일봉 조회 실패: ${text}`)
  }

  const rows = Array.isArray(data.output2) ? data.output2 : []

  return rows
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

function makeSummary(prices, currentPrice) {
  const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date))
  const latest = sorted[sorted.length - 1]

  const close = Number(currentPrice || latest?.close || 0)
  const recent5 = sorted.slice(-5)
  const recent20 = sorted.slice(-20)
  const recent90 = sorted.slice(-90)

  const high90d =
    recent90.length > 0 ? Math.max(...recent90.map((row) => row.high || row.close)) : close

  const low90d =
    recent90.length > 0 ? Math.min(...recent90.map((row) => row.low || row.close)) : close

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

function normalizeFlowRow(row) {
  const individual = toNumber(
    row.prsn_ntby_qty ??
      row.indv_ntby_qty ??
      row.prsn_ntby_vol ??
      row.prsn_seln_qty ??
      0
  )

  const foreign = toNumber(
    row.frgn_ntby_qty ??
      row.frgn_ntby_vol ??
      row.frgn_seln_qty ??
      0
  )

  const institution = toNumber(
    row.orgn_ntby_qty ??
      row.inst_ntby_qty ??
      row.orgn_ntby_vol ??
      row.inst_seln_qty ??
      0
  )

  return {
    date: row.stck_bsop_date || row.bsop_date || row.date || '',
    individual: { netQty: individual },
    foreign: { netQty: foreign },
    institution: { netQty: institution }
  }
}

function sumFlow(rows) {
  return rows.reduce(
    (acc, row) => {
      acc.individual.netQty += Number(row.individual?.netQty || 0)
      acc.foreign.netQty += Number(row.foreign?.netQty || 0)
      acc.institution.netQty += Number(row.institution?.netQty || 0)
      return acc
    },
    {
      individual: { netQty: 0 },
      foreign: { netQty: 0 },
      institution: { netQty: 0 }
    }
  )
}

function buildFlowSignal(period) {
  const individual = Number(period?.individual?.netQty)
  const foreign = Number(period?.foreign?.netQty)
  const institution = Number(period?.institution?.netQty)

  if (!Number.isFinite(individual) || !Number.isFinite(foreign) || !Number.isFinite(institution)) {
    return '수급 데이터 확인 필요'
  }

  if (individual > 0 && foreign < 0 && institution < 0) {
    return '개인 순매수 우위, 외국인·기관 순매도'
  }

  if (individual < 0 && foreign > 0 && institution > 0) {
    return '외국인·기관 순매수 우위, 개인 순매도'
  }

  if (foreign > 0 && institution > 0) {
    return '외국인·기관 동반 매수 가능성'
  }

  if (foreign < 0 && institution < 0) {
    return '외국인·기관 동반 순매도 주의'
  }

  return '수급 혼조'
}

async function fetchInvestorFlow({ baseUrl, token, appkey, appsecret, stockCode }) {
  const params = new URLSearchParams({
    FID_COND_MRKT_DIV_CODE: 'J',
    FID_INPUT_ISCD: stockCode
  })

  const response = await fetch(
    `${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-investor?${params}`,
    {
      method: 'GET',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        authorization: `Bearer ${token}`,
        appkey,
        appsecret,
        tr_id: 'FHKST01010900',
        custtype: 'P'
      }
    }
  )

  const text = await response.text()
  let data = null

  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`수급 응답 파싱 실패: ${text}`)
  }

  if (!response.ok || data.rt_cd !== '0') {
    throw new Error(data.msg1 || `수급 조회 실패: ${text}`)
  }

  const rawRows = Array.isArray(data.output)
    ? data.output
    : Array.isArray(data.output2)
      ? data.output2
      : []

  const rows = rawRows.map(normalizeFlowRow).filter((row) => row.date)
  const latest = rows[0] || rows[rows.length - 1] || null
  const recentAsc = [...rows].sort((a, b) => a.date.localeCompare(b.date))

  const recent5 = sumFlow(recentAsc.slice(-5))
  const recent20 = sumFlow(recentAsc.slice(-20))

  const baseLatest =
    latest || {
      individual: { netQty: 0 },
      foreign: { netQty: 0 },
      institution: { netQty: 0 }
    }

  return {
    rows,
    summary: {
      latestDate: latest?.date || '',
      latest: baseLatest,
      individual: baseLatest.individual,
      foreign: baseLatest.foreign,
      institution: baseLatest.institution,
      recent5,
      recent20,
      signal: buildFlowSignal(baseLatest)
    }
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, message: 'GET만 지원합니다.' })
    }

    const name = String(req.query.name || '').trim()
    const resolved = findStock(name)

    if (resolved.type === 'ambiguous') {
      return res.status(200).json({
        success: false,
        error: 'ambiguous_stock',
        message: '종목을 하나로 특정할 수 없습니다.',
        candidates: resolved.candidates
      })
    }

    if (resolved.type !== 'exact') {
      return res.status(404).json({
        success: false,
        message: '종목을 찾을 수 없습니다. 예: 카카오, 삼성전자, NAVER'
      })
    }

    const stock = resolved.stock

    const baseUrl =
      process.env.KIS_BASE_URL ||
      process.env.KOREA_INVESTMENT_BASE_URL ||
      'https://openapi.koreainvestment.com:9443'

    const appkey = process.env.KIS_APP_KEY || process.env.KOREA_INVESTMENT_APP_KEY
    const appsecret = process.env.KIS_APP_SECRET || process.env.KOREA_INVESTMENT_APP_SECRET

    if (!appkey || !appsecret) {
      return res.status(500).json({
        success: false,
        message: '한국투자 API 키가 설정되지 않았습니다. KIS_APP_KEY, KIS_APP_SECRET 환경변수를 확인하세요.'
      })
    }

    const token = await getKisToken({ baseUrl, appkey, appsecret })

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
      stockCode: stock.code,
      days: 110
    })

    const summary = makeSummary(prices, current.currentPrice)

    let flow = null
    let flowError = null

    try {
      flow = await fetchInvestorFlow({
        baseUrl,
        token,
        appkey,
        appsecret,
        stockCode: stock.code
      })
    } catch (error) {
      flowError = error.message || '수급 데이터 조회 실패'
    }

    return res.status(200).json({
      success: true,
      stock,
      current,
      prices,
      summary,
      flow,
      flowError
    })
  } catch (error) {
    console.error('[api/stock]', error)

    return res.status(500).json({
      success: false,
      message: error.message || '주가 데이터를 불러오는 중 오류가 발생했습니다.'
    })
  }
}
