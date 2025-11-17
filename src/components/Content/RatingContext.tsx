import React, { createContext, useContext, useState } from 'react';

interface ExecutionData {
    agent_id: string;
    executionToken: string;
    response: any;
}

interface RatingContextType {
    executionData: ExecutionData | null;
    setExecutionData: (data: ExecutionData | null) => void;
}

const RatingContext = createContext<RatingContextType | undefined>(undefined);

export const RatingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [executionData, setExecutionData] = useState<ExecutionData | null>(null);

    return (
        <RatingContext.Provider value={{ executionData, setExecutionData }}>
            {children}
        </RatingContext.Provider>
    );
};

export const useRating = () => {
    const context = useContext(RatingContext);
    if (context === undefined) {
        throw new Error('useRating must be used within a RatingProvider');
    }
    return context;
};
