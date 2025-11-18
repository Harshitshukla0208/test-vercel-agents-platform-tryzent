// components/HistorySkeleton.tsx
import React from 'react';

export const HistorySkeleton = () => {
    return (
        <div className="space-y-2">
            {[...Array(5)].map((_, index) => (
                <div
                    key={index}
                    className="w-full pb-3 border-b border-gray-200 last:border-b-0 bg-white px-3 py-2.5 rounded-lg animate-pulse"
                >
                    <div className="flex items-start gap-2 mb-1.5">
                        {/* Icon skeleton */}
                        <div className="flex-shrink-0 mt-0.5">
                            <div className="w-4 h-4 bg-gray-200 rounded"></div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                            {/* Title skeleton */}
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>

                            {/* Tags skeleton */}
                            <div className="flex items-center gap-2">
                                <div className="h-5 bg-gray-200 rounded-full w-20"></div>
                                <div className="h-3 bg-gray-200 rounded w-16"></div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};