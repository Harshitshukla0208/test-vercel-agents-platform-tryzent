import React from 'react';
import { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Dynamically import the component with no SSR to avoid router issues
const TokenExpiryHandler = dynamic(
    () => import('./TokenExpiryHandler').then(mod => mod.TokenExpiryHandler),
    { ssr: false }
);

interface TokenExpiryProviderProps {
    children: React.ReactNode;
}

const TokenExpiryProvider: React.FC<TokenExpiryProviderProps> = ({ children }) => {
    return (
        <>
            {children}
            <TokenExpiryHandler />
            <Toaster />
        </>
    );
};

export default TokenExpiryProvider;
