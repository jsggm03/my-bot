export const STOCK_LIST = [
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

export function findStockByName(name) {
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
