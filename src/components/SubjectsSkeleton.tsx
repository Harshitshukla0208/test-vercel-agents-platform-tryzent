export function SubjectsSkeleton() {
    return (
        <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
                <div
                    key={i}
                    className="w-full flex items-center gap-3 rounded-2xl px-3 py-2 animate-pulse"
                >
                    {/* Subject Icon Skeleton */}
                    <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-transparent bg-gradient-to-br from-gray-200 to-gray-100 flex-shrink-0" />

                    {/* Subject Name Skeleton */}
                    <div className="flex-1 min-w-0">
                        <div
                            className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded"
                            style={{ width: `${60 + Math.random() * 30}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}