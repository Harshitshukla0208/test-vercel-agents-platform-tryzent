import type { NextApiRequest, NextApiResponse } from 'next'

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { code } = req.body || {}
    const url = `${BASE}/api/user/google?code=${encodeURIComponent(code ?? '')}`
    const r = await fetch(url, { method: 'POST', headers: { accept: 'application/json' } })
    const data = await r.json()
    return res.status(r.status).json(data)
  } catch {
    return res.status(500).json({ message: 'Google authentication failed' })
  }
}
