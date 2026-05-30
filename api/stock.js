export default async function handler(req, res) {
  return res.status(200).json({
    success: true,
    message: 'stock api 준비 중'
  })
}
