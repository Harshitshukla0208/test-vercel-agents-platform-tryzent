import React from 'react';
import { useTokenExpirationRedirect } from '../../hooks/useTokenExpirationRedirect';

export const TokenExpiryHandler: React.FC = () => {
    // This hook handles redirection when token expires
    useTokenExpirationRedirect();

    // This component doesn't render anything
    return null;
};
