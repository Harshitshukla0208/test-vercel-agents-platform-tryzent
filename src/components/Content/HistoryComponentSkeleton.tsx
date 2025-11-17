import React from 'react';

const HistorySkeletonLoader = () => {
    return (
        <div className="w-56">
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>

                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-3 pb-3 border-b border-gray-100"></div>

                <div className="space-y-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((item) => (
                        <div
                            key={item}
                            className="p-2.5 rounded-lg border border-gray-100 space-y-2"
                        >
                            <div className="space-y-1.5">
                                <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                                <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                            <div className="border-t border-gray-50 pt-1.5">
                                <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HistorySkeletonLoader;
