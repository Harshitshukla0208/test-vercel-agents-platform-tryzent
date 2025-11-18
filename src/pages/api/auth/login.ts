import type { NextApiRequest, NextApiResponse } from 'next'

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const r = await fetch(`${BASE}/api/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(req.body),
    })
    const data = await r.json()
    return res.status(r.status).json(data)
  } catch {
    return res.status(500).json({ message: 'Something went wrong' })
  }
}
