import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { serialize } from 'cookie';

interface CreditsResponse {
    'Remaining Tokens': number;
}

interface ErrorResponse {
    error: string;
    status?: number;
    details?: string;
    tokenExpired?: boolean;
}

const API_URL = `${process.env.API_BASE_URL}/auth/get-remaining-credits`;
const TIMEOUT_MS = 10000;
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

async function fetchWithRetry(
    url: string,
    config: any,
    retriesLeft: number = MAX_RETRIES
): Promise<CreditsResponse> {
    try {
        const { data } = await axios.get<CreditsResponse>(url, {
            ...config,
            timeout: TIMEOUT_MS / (MAX_RETRIES - retriesLeft + 1)
        });
        return data;
    } catch (error) {
        if (retriesLeft > 0 && axios.isAxiosError(error) && (
            error.code === 'ECONNABORTED' ||
            (error.response?.status !== undefined && (
                error.response.status === 429 ||
                error.response.status === 503 ||
                error.response.status >= 500
            ))
        )) {
            const delay = BASE_DELAY * Math.pow(2, MAX_RETRIES - retriesLeft) * (0.5 + Math.random());
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, config, retriesLeft - 1);
        }
        throw error;
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<CreditsResponse | ErrorResponse>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Method not allowed',
            status: 405
        });
    }
    
    try {
        const accessToken = req.cookies.access_token;
        
        if (!accessToken || typeof accessToken !== 'string') {
            // Clear the invalid token
            res.setHeader('Set-Cookie', [
                serialize('access_token', '', {
                    maxAge: -1,
                    path: '/',
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict'
                })
            ]);
            
            return res.status(401).json({
                error: 'Unauthorized',
                details: 'No access token found or invalid token format',
                status: 401,
                tokenExpired: true
            });
        }
        
        const config = {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
            },
        };
        
        const data = await fetchWithRetry(API_URL, config);
        
        if (typeof data['Remaining Tokens'] !== 'number') {
            throw new Error('Invalid response format from credits API');
        }
        
        return res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching credits:', error);
        
        if (axios.isAxiosError(error)) {
            const status = error.response?.status ?? 500;
            
            // Check for token expiration (usually 401 Unauthorized)
            if (error.response?.status === 401) {
                // Clear the expired token
                res.setHeader('Set-Cookie', [
                    serialize('access_token', '', {
                        maxAge: -1,
                        path: '/',
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'strict'
                    })
                ]);
                
                return res.status(status).json({
                    error: 'Session expired',
                    details: 'Your authentication token has expired. Please login again.',
                    status,
                    tokenExpired: true
                });
            }
            
            return res.status(status).json({
                error: error.response?.data?.error ?? error.message,
                details: error.code === 'ECONNABORTED'
                    ? `Request timed out after multiple retries`
                    : error.response?.data?.details ?? error.message,
                status
            });
        }
        
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to fetch credits',
            details: error instanceof Error ? error.stack : undefined,
            status: 500
        });
    }
}
