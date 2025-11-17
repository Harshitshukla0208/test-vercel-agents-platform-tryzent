import { create } from 'zustand';

type Listener = () => void;

class CreditUpdateStore {
    private listeners: Set<Listener> = new Set();
    
    subscribe(listener: Listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    
    notify() {
        this.listeners.forEach(listener => listener());
    }
}

// Maintain your existing credit store instance
export const creditStore = new CreditUpdateStore();

// Add a new Zustand store for token expiration state
interface TokenExpirationStore {
    isTokenExpired: boolean;
    setTokenExpired: (expired: boolean) => void;
    handleTokenExpiration: () => void;
}

export const useTokenExpirationStore = create<TokenExpirationStore>((set) => ({
    isTokenExpired: false,
    
    setTokenExpired: (expired: boolean) => set({ isTokenExpired: expired }),
    
    handleTokenExpiration: () => {
        set({ isTokenExpired: true });
    }
}));
