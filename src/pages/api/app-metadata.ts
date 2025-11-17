import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { appId } = req.query
        
    if (!appId || typeof appId !== 'string') {
        console.log("No appId provided or invalid type")
        return res.status(400).json({ error: "App ID is required" })
    }

    // Validate appId is numeric
    if (!/^\d+$/.test(appId)) {
        console.log("Invalid appId format:", appId)
        return res.status(400).json({ error: "App ID must be numeric" })
    }

    try {
        const itunesUrl = `https://itunes.apple.com/lookup?id=${appId}`
        console.log("Fetching from iTunes API:", itunesUrl)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
        
        const response = await fetch(itunesUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; TravelPlanner/1.0)",
                "Accept": "application/json",
            },
            signal: controller.signal
        })

        clearTimeout(timeoutId)
        
        if (!response.ok) {
            const errorText = await response.text()
            console.error("iTunes API error response:", errorText)
            throw new Error(`iTunes API returned ${response.status}: ${errorText}`)
        }

        const data = await response.json()

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        return res.status(200).json(data)
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
        return res.status(500).json({ 
            error: "Failed to fetch app metadata", 
            details: errorMessage,
            appId: appId 
        })
    }
}
