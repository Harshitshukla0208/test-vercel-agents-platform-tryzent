import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import axios from 'axios';
import Image from 'next/image';
import { creditStore, useTokenExpirationStore } from '@/creditsStore';
import coinImg from '../../assets/coin.png';

interface CreditsResponse {
    'Remaining Tokens': number;
}

interface CreditsDisplayProps {
    className?: string;
    refreshInterval?: number;
}

const CreditsDisplay: React.FC<CreditsDisplayProps> = ({
    className = "fixed top-4 right-4",
    refreshInterval = 5 * 60 * 1000
}) => {
    const [credits, setCredits] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { handleTokenExpiration } = useTokenExpirationStore();

    const fetchCredits = async () => {
        try {
            setIsLoading(true);
            setError('');
            const { data } = await axios.get<CreditsResponse>('/api/credits');
            setCredits(data['Remaining Tokens']);
        } catch (error) {
            console.error('Error fetching credits:', error);
            if (axios.isAxiosError(error)) {
                // Check if this is a token expiration error
                if (error.response?.status === 401 ||
                    error.response?.data?.tokenExpired) {
                    handleTokenExpiration();
                    return;
                }
                setError(
                    error.response?.data?.error || error.message
                );
            } else {
                setError('Failed to fetch credits');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCredits();
        // Subscribe to credit updates using your existing store
        const unsubscribe = creditStore.subscribe(fetchCredits);
        // Set up regular refresh interval
        const interval = setInterval(fetchCredits, refreshInterval);
        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, [refreshInterval]);

    return (
        <div className={`z-50 ${className}`}>
            <div className="bg-white rounded-full shadow-lg px-2 sm:px-4 py-1 sm:py-2 flex items-center gap-1 sm:gap-2 transition-all duration-200 ease-in-out text-xs sm:text-sm">
                <Image src={coinImg} alt='coin-img' className="w-3 h-3 sm:w-4 sm:h-4 text-[#6F60FC] flex-shrink-0" />
                <div className="flex items-center gap-1">
                    {isLoading ? (
                        <div className="animate-pulse bg-gray-200 h-3 sm:h-4 w-12 sm:w-16 rounded" />
                    ) : error ? (
                        <div className="flex items-center gap-1 text-red-500">
                            <AlertCircle className="w-2 h-2 sm:w-3 sm:h-3" />
                            <span className="text-xs hidden xs:inline">{error}</span>
                        </div>
                    ) : (
                        <span className="font-medium">
                            <span className="hidden xs:inline">{credits?.toLocaleString()} Remaining </span>
                            <span>{credits?.toLocaleString()} Credits</span>
                        </span>
                    )}
                </div>
                {!isLoading && !error && (
                    <button
                        onClick={() => void fetchCredits()}
                        className="text-xs sm:text-sm text-[#6F60FC] hover:text-[#5A4DE6] transition-colors ml-1"
                        type="button"
                        aria-label="Refresh credits"
                    >
                        ↻
                    </button>
                )}
            </div>
        </div>
    );
};

export default CreditsDisplay;
