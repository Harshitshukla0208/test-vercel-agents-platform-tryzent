import { useCallback, useState, useMemo } from 'react';
import { decodeJwt } from 'jose';
import type { ConnectionDetails } from '@/pages/api/connection-details';
import { fetchWithAuth } from '@/lib/apiClient';

// --- BEGIN: Refactored to use Next.js API ---
const ONE_MINUTE_IN_MILLISECONDS = 60 * 1000;

// ExtendedConnectionDetails is no longer needed since ConnectionDetails now includes these fields

export interface AppConfig {
  grade?: string;
  subject?: string;
  chapter?: string;
  board?: string;
  participantIdentity?: string;
  thread?: string;
  username?: string; // <-- add this line
}

async function fetchConnectionDetailsFromAPI(config: AppConfig): Promise<ConnectionDetails> {
  console.log('Fetching connection details with config:', config);

  const response = await fetchWithAuth('/api/livekit/start-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    let errorBody: string | undefined;
    try {
      const errorData = await response.json();
      errorBody = errorData.error || response.statusText;
    } catch {
      errorBody = response.statusText;
    }

    console.error(
      'API responded with error:',
      response.status,
      response.statusText,
      errorBody
    );

    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();
  return data;
}

export default function useConnectionDetails(appConfigParam: AppConfig | undefined) {
  const appConfig = useMemo(() => appConfigParam || {}, [appConfigParam]);
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | null>(null);

  /**
   * Fetches new connection details using the hook's appConfig
   */
  const fetchConnectionDetails = useCallback(async () => {
    setConnectionDetails(null);

    try {
      const data = await fetchConnectionDetailsFromAPI(appConfig);
      setConnectionDetails(data);
      return data;
    } catch (error) {
      console.error('Error fetching connection details:', error);
      throw new Error('Error fetching connection details!');
    }
  }, [appConfig]);

  /**
   * Fetches new connection details using a provided config
   */
  const fetchConnectionDetailsWithConfig = useCallback(async (config: AppConfig) => {
    setConnectionDetails(null);

    try {
      const data = await fetchConnectionDetailsFromAPI(config);
      setConnectionDetails(data);
      return data;
    } catch (error) {
      console.error('Error fetching connection details:', error);
      throw new Error('Error fetching connection details!');
    }
  }, []);

  /**
   * Checks if the current connection details token has expired
   */
  const isConnectionDetailsExpired = useCallback(() => {
    const token = connectionDetails?.participantToken;
    if (!token) {
      return true;
    }

    const jwtPayload = decodeJwt(token);
    if (!jwtPayload.exp) {
      return true;
    }

    const expiresAt = new Date(jwtPayload.exp * 1000 - ONE_MINUTE_IN_MILLISECONDS);
    const now = new Date();
    
    return expiresAt <= now;
  }, [connectionDetails?.participantToken]);

  /**
   * Returns existing connection details if valid, otherwise fetches new ones
   */
  const existingOrRefreshConnectionDetails = useCallback(async () => {
    if (isConnectionDetailsExpired() || !connectionDetails) {
      return fetchConnectionDetails();
    }
    return connectionDetails;
  }, [connectionDetails, fetchConnectionDetails, isConnectionDetailsExpired]);

  // Add this function inside the hook
  const resetConnectionDetails = useCallback(() => {
    setConnectionDetails(null);
  }, []);

  return {
    connectionDetails,
    refreshConnectionDetails: fetchConnectionDetails,
    existingOrRefreshConnectionDetails,
    fetchConnectionDetailsWithConfig,
    resetConnectionDetails,
  };
}
// --- END: Refactored to use Next.js API ---


