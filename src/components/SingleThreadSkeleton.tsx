// components/SingleThreadSkeleton.tsx
import React from 'react';

export const SingleThreadSkeleton = () => {
    return (
        <div className="w-full pb-3 border-b border-gray-200 bg-white px-3 py-2.5 rounded-lg animate-pulse">
            <div className="flex items-start gap-2 mb-1.5">
                <div className="flex-shrink-0 mt-0.5">
                    <div className="w-4 h-4 bg-gray-300 rounded"></div>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-full"></div>
                    <div className="flex items-center gap-2">
                        <div className="h-5 bg-gray-300 rounded-full w-24"></div>
                        <div className="h-3 bg-gray-300 rounded w-20"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};