import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useTokenExpirationStore } from '@/creditsStore';

export const useTokenExpirationRedirect = () => {
    const router = useRouter();
    const pathname = usePathname();
    const { isTokenExpired, setTokenExpired } = useTokenExpirationStore();

    useEffect(() => {
        if (isTokenExpired && pathname !== '/auth') {
            toast.error('Your session has expired. Please login again to continue.', {
                duration: 5000,
                position: 'top-center',
            });

            router.push('/auth');
            setTokenExpired(false); // Reset after handling
        }
    }, [isTokenExpired, pathname, router, setTokenExpired]);

    return null;
};
