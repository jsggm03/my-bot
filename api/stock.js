const STOCK_LIST = [
  // ─────────────────────────────
  // KOSPI 대형주 / 대표주
  // ─────────────────────────────
  { name: '삼성전자', code: '005930', market: 'KOSPI', aliases: ['삼전'] },
  { name: '삼성전자우', code: '005935', market: 'KOSPI', aliases: ['삼전우'] },
  { name: 'SK하이닉스', code: '000660', market: 'KOSPI', aliases: ['하이닉스', 'sk하이닉스'] },
  { name: 'LG에너지솔루션', code: '373220', market: 'KOSPI', aliases: ['LG엔솔', '엘지에너지솔루션'] },
  { name: '삼성바이오로직스', code: '207940', market: 'KOSPI', aliases: ['삼바'] },
  { name: '현대차', code: '005380', market: 'KOSPI', aliases: ['현대자동차'] },
  { name: '기아', code: '000270', market: 'KOSPI', aliases: ['기아차'] },
  { name: '셀트리온', code: '068270', market: 'KOSPI' },
  { name: 'KB금융', code: '105560', market: 'KOSPI', aliases: ['KB금융지주'] },
  { name: '신한지주', code: '055550', market: 'KOSPI' },
  { name: '하나금융지주', code: '086790', market: 'KOSPI', aliases: ['하나금융'] },
  { name: '우리금융지주', code: '316140', market: 'KOSPI', aliases: ['우리금융'] },
  { name: '카카오', code: '035720', market: 'KOSPI' },
  { name: 'NAVER', code: '035420', market: 'KOSPI', aliases: ['네이버'] },
  { name: '삼성물산', code: '028260', market: 'KOSPI' },
  { name: 'POSCO홀딩스', code: '005490', market: 'KOSPI', aliases: ['포스코홀딩스', '포스코'] },
  { name: 'LG화학', code: '051910', market: 'KOSPI' },
  { name: '삼성SDI', code: '006400', market: 'KOSPI' },
  { name: '현대모비스', code: '012330', market: 'KOSPI' },
  { name: 'LG전자', code: '066570', market: 'KOSPI' },
  { name: '삼성생명', code: '032830', market: 'KOSPI' },
  { name: '삼성화재', code: '000810', market: 'KOSPI' },
  { name: '기업은행', code: '024110', market: 'KOSPI', aliases: ['IBK기업은행'] },
  { name: 'KT&G', code: '033780', market: 'KOSPI', aliases: ['케이티앤지'] },
  { name: 'KT', code: '030200', market: 'KOSPI', aliases: ['케이티'] },
  { name: 'SK텔레콤', code: '017670', market: 'KOSPI', aliases: ['SKT', '에스케이텔레콤'] },
  { name: 'LG유플러스', code: '032640', market: 'KOSPI', aliases: ['엘지유플러스'] },
  { name: '한국전력', code: '015760', market: 'KOSPI', aliases: ['한전'] },
  { name: '현대글로비스', code: '086280', market: 'KOSPI' },
  { name: '삼성에스디에스', code: '018260', market: 'KOSPI', aliases: ['삼성SDS'] },
  { name: '포스코퓨처엠', code: '003670', market: 'KOSPI' },
  { name: '카카오뱅크', code: '323410', market: 'KOSPI' },
  { name: '카카오페이', code: '377300', market: 'KOSPI' },
  { name: '크래프톤', code: '259960', market: 'KOSPI' },
  { name: '하이브', code: '352820', market: 'KOSPI', aliases: ['HYBE'] },
  { name: '넷마블', code: '251270', market: 'KOSPI' },
  { name: '엔씨소프트', code: '036570', market: 'KOSPI', aliases: ['NC소프트'] },
  { name: '두산에너빌리티', code: '034020', market: 'KOSPI', aliases: ['두산중공업'] },
  { name: 'HD현대일렉트릭', code: '267260', market: 'KOSPI', aliases: ['현대일렉트릭'] },
  { name: 'HD현대', code: '267250', market: 'KOSPI' },
  { name: 'HD한국조선해양', code: '009540', market: 'KOSPI', aliases: ['한국조선해양'] },
  { name: 'HD현대중공업', code: '329180', market: 'KOSPI', aliases: ['현대중공업'] },
  { name: '삼성중공업', code: '010140', market: 'KOSPI' },
  { name: '한화오션', code: '042660', market: 'KOSPI', aliases: ['대우조선해양'] },
  { name: '한화에어로스페이스', code: '012450', market: 'KOSPI', aliases: ['한화에어로'] },
  { name: 'LIG넥스원', code: '079550', market: 'KOSPI', aliases: ['엘아이지넥스원'] },
  { name: '현대로템', code: '064350', market: 'KOSPI' },
  { name: '한국항공우주', code: '047810', market: 'KOSPI', aliases: ['KAI'] },
  { name: '한미반도체', code: '042700', market: 'KOSPI' },
  { name: 'LS ELECTRIC', code: '010120', market: 'KOSPI', aliases: ['LS일렉트릭', '엘에스일렉트릭'] },
  { name: 'LS', code: '006260', market: 'KOSPI' },
  { name: '대한전선', code: '001440', market: 'KOSPI' },
  { name: '효성중공업', code: '298040', market: 'KOSPI' },
  { name: '두산로보틱스', code: '454910', market: 'KOSPI' },
  { name: '두산밥캣', code: '241560', market: 'KOSPI' },
  { name: '두산', code: '000150', market: 'KOSPI' },
  { name: 'SK스퀘어', code: '402340', market: 'KOSPI' },
  { name: 'SK이노베이션', code: '096770', market: 'KOSPI' },
  { name: 'SK', code: '034730', market: 'KOSPI' },
  { name: 'SK바이오팜', code: '326030', market: 'KOSPI' },
  { name: 'SK바이오사이언스', code: '302440', market: 'KOSPI' },
  { name: 'LG', code: '003550', market: 'KOSPI' },
  { name: 'LG이노텍', code: '011070', market: 'KOSPI' },
  { name: '롯데케미칼', code: '011170', market: 'KOSPI' },
  { name: 'S-Oil', code: '010950', market: 'KOSPI', aliases: ['에쓰오일', '에스오일'] },
  { name: 'GS', code: '078930', market: 'KOSPI' },
  { name: 'GS건설', code: '006360', market: 'KOSPI' },
  { name: '현대건설', code: '000720', market: 'KOSPI' },
  { name: '대우건설', code: '047040', market: 'KOSPI' },
  { name: 'HMM', code: '011200', market: 'KOSPI' },
  { name: '대한항공', code: '003490', market: 'KOSPI' },
  { name: '아시아나항공', code: '020560', market: 'KOSPI' },
  { name: 'CJ제일제당', code: '097950', market: 'KOSPI' },
  { name: 'CJ', code: '001040', market: 'KOSPI' },
  { name: '오리온', code: '271560', market: 'KOSPI' },
  { name: '농심', code: '004370', market: 'KOSPI' },
  { name: '삼양식품', code: '003230', market: 'KOSPI' },
  { name: 'BGF리테일', code: '282330', market: 'KOSPI' },
  { name: '이마트', code: '139480', market: 'KOSPI' },
  { name: '신세계', code: '004170', market: 'KOSPI' },
  { name: '호텔신라', code: '008770', market: 'KOSPI' },
  { name: '아모레퍼시픽', code: '090430', market: 'KOSPI' },
  { name: 'LG생활건강', code: '051900', market: 'KOSPI', aliases: ['엘지생활건강'] },
  { name: '유한양행', code: '000100', market: 'KOSPI' },
  { name: '한미약품', code: '128940', market: 'KOSPI' },
  { name: '녹십자', code: '006280', market: 'KOSPI', aliases: ['GC녹십자'] },
  { name: '종근당', code: '185750', market: 'KOSPI' },
  { name: '대웅제약', code: '069620', market: 'KOSPI' },
  { name: '보령', code: '003850', market: 'KOSPI', aliases: ['보령제약'] },
  { name: '한올바이오파마', code: '009420', market: 'KOSPI' },
  { name: '현대백화점', code: '069960', market: 'KOSPI' },
  { name: 'F&F', code: '383220', market: 'KOSPI', aliases: ['에프앤에프'] },
  { name: '영원무역', code: '111770', market: 'KOSPI' },
  { name: '코스맥스', code: '192820', market: 'KOSPI' },
  { name: '한국콜마', code: '161890', market: 'KOSPI' },

  // ─────────────────────────────
  // KOSDAQ / 성장주 / 2차전지 / 바이오 / 게임
  // ─────────────────────────────
  { name: '에코프로비엠', code: '247540', market: 'KOSDAQ' },
  { name: '에코프로', code: '086520', market: 'KOSDAQ' },
  { name: '엘앤에프', code: '066970', market: 'KOSDAQ' },
  { name: '천보', code: '278280', market: 'KOSDAQ' },
  { name: '엔켐', code: '348370', market: 'KOSDAQ' },
  { name: 'HLB', code: '028300', market: 'KOSDAQ' },
  { name: '알테오젠', code: '196170', market: 'KOSDAQ' },
  { name: '리가켐바이오', code: '141080', market: 'KOSDAQ', aliases: ['레고켐바이오'] },
  { name: '삼천당제약', code: '000250', market: 'KOSDAQ' },
  { name: '휴젤', code: '145020', market: 'KOSDAQ' },
  { name: '메디톡스', code: '086900', market: 'KOSDAQ' },
  { name: '오스코텍', code: '039200', market: 'KOSDAQ' },
  { name: '셀트리온제약', code: '068760', market: 'KOSDAQ' },
  { name: '셀트리온헬스케어', code: '091990', market: 'KOSDAQ' },
  { name: '펄어비스', code: '263750', market: 'KOSDAQ' },
  { name: '카카오게임즈', code: '293490', market: 'KOSDAQ' },
  { name: '위메이드', code: '112040', market: 'KOSDAQ' },
  { name: '컴투스', code: '078340', market: 'KOSDAQ' },
  { name: '디어유', code: '376300', market: 'KOSDAQ' },
  { name: 'JYP Ent.', code: '035900', market: 'KOSDAQ', aliases: ['JYP', '제이와이피', '제이와이피엔터'] },
  { name: '에스엠', code: '041510', market: 'KOSDAQ', aliases: ['SM', 'SM엔터', '에스엠엔터'] },
  { name: '와이지엔터테인먼트', code: '122870', market: 'KOSDAQ', aliases: ['YG', 'YG엔터'] },
  { name: '스튜디오드래곤', code: '253450', market: 'KOSDAQ' },
  { name: 'CJ ENM', code: '035760', market: 'KOSDAQ', aliases: ['씨제이이엔엠'] },
  { name: '리노공업', code: '058470', market: 'KOSDAQ' },
  { name: 'ISC', code: '095340', market: 'KOSDAQ' },
  { name: 'HPSP', code: '403870', market: 'KOSDAQ' },
  { name: '동진쎄미켐', code: '005290', market: 'KOSDAQ' },
  { name: '솔브레인', code: '357780', market: 'KOSDAQ' },
  { name: '주성엔지니어링', code: '036930', market: 'KOSDAQ' },
  { name: '원익IPS', code: '240810', market: 'KOSDAQ' },
  { name: '심텍', code: '222800', market: 'KOSDAQ' },
  { name: '대주전자재료', code: '078600', market: 'KOSDAQ' },
  { name: '나노신소재', code: '121600', market: 'KOSDAQ' },
  { name: '하나마이크론', code: '067310', market: 'KOSDAQ' },
  { name: '제주반도체', code: '080220', market: 'KOSDAQ' },
  { name: '가온칩스', code: '399720', market: 'KOSDAQ' },
  { name: '칩스앤미디어', code: '094360', market: 'KOSDAQ' },
  { name: '루닛', code: '328130', market: 'KOSDAQ' },
  { name: '뷰노', code: '338220', market: 'KOSDAQ' },
  { name: '레인보우로보틱스', code: '277810', market: 'KOSDAQ' },
  { name: '로보티즈', code: '108490', market: 'KOSDAQ' },
  { name: '에스피지', code: '058610', market: 'KOSDAQ' },
  { name: '클래시스', code: '214150', market: 'KOSDAQ' },
  { name: '파마리서치', code: '214450', market: 'KOSDAQ' },
  { name: '케어젠', code: '214370', market: 'KOSDAQ' },
  { name: '코어라인소프트', code: '384470', market: 'KOSDAQ' },
  { name: '신성델타테크', code: '065350', market: 'KOSDAQ' },
  { name: '서진시스템', code: '178320', market: 'KOSDAQ' }
]

let cachedToken = null
let tokenExpiresAt = 0

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[().·_\-]/g, '')
}

function findStockByName(name) {
  const keyword = normalizeText(name)
  if (!keyword) return null

  const exact = STOCK_LIST.find((stock) => {
    const names = [stock.name, stock.code, ...(stock.aliases || [])].map(normalizeText)
    return names.includes(keyword)
  })

  if (exact) return exact

  return STOCK_LIST.find((stock) => {
    const names = [stock.name, ...(stock.aliases || [])].map(normalizeText)
    return names.some((n) => n.includes(keyword) || keyword.includes(n))
  })
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
        message: '종목을 찾을 수 없습니다. 예: 카카오, 삼성전자, NAVER, 한미반도체'
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
      stock: {
        name: stock.name,
        code: stock.code,
        market: stock.market
      },
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
