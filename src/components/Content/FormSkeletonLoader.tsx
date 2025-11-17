import React from 'react';

const DynamicFormSkeleton = () => {
    const skeletonInputs = Array(6).fill(null);

    return (
        <div className="space-y-2 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {skeletonInputs.map((_, index) => (
                    <div key={index} className="space-y-1">
                        {/* Label skeleton */}
                        <div className="h-3 w-20 bg-gray-200 rounded" />

                        {/* Input skeleton */}
                        <div className="h-8 w-full bg-gray-200 rounded" />
                    </div>
                ))}
            </div>

            {/* Button skeleton */}
            <div className="flex justify-between">
                <div className="h-8 w-16 bg-gray-200 rounded" />
                <div className="h-8 w-24 bg-gray-200 rounded" />
            </div>
        </div>
    );
};

export default DynamicFormSkeleton;
