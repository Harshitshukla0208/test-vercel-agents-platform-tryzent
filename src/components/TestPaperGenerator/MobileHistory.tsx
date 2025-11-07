'use client';

import React, { useEffect, useState, useRef } from 'react';
import { RefreshCcw, Clock, BookOpen, ChevronDown, Plus, Star, Calendar, Zap, ChevronRight, FileText } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import HistorySkeletonLoader from '../Content/HistoryComponentSkeleton';
import PopupLoader from '@/components/PopupLoader';

interface VariableInput {
    variable: string;
    variable_value: string;
}

interface HistoryItem {
    execution_id: string;
    thread_id: string;
    user_inputs: VariableInput[];
    createdAt?: string;
    updatedAt?: string;
    filename?: string;
    agent_rating?: number;
    agent_feedback?: string;
}

interface ThreadGroup {
    [thread_id: string]: HistoryItem[];
}

interface HistoryResponse {
    status: boolean;
    message: string;
    data: ThreadGroup;
}

interface ApiError {
    error: string;
}

interface MobileTestPaperHistoryProps {
    onHistoryItemClick: (executionToken: string, agent_id: string) => Promise<void>;
    containerRef?: React.RefObject<HTMLDivElement | null>;
    refreshTrigger?: number;
    onCreateNew?: () => void;
    className?: string;
    onItemSelect?: () => void;
    preventAutoSelect?: boolean;  // Prevent auto-select after fresh generation
}

const MobileTestPaperHistory: React.FC<MobileTestPaperHistoryProps> = ({
    onHistoryItemClick,
    containerRef,
    refreshTrigger,
    onCreateNew,
    className = "",
    onItemSelect,
    preventAutoSelect = false,
}) => {
    const [history, setHistory] = useState<ThreadGroup>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
    const [maxHeight, setMaxHeight] = useState<string>('110vh');
    const sidebarRef = useRef<HTMLDivElement>(null);
    const shouldAutoSelectRef = useRef<boolean>(false);
    const [showHistoryLoader, setShowHistoryLoader] = useState<boolean>(false);

    // Safe navigation hooks usage
    const searchParams = useSearchParams();
    const pathname = usePathname();

    // Safe parameter extraction
    const agentType = searchParams ? (searchParams.get('agentType') ?? 'Other') : 'Other';

    // Safe pathname parsing
    const pathArray = pathname?.split('/').filter(Boolean) || [];
    const agent_id = pathArray.length > 0 ? pathArray[pathArray.length - 1] : '';

    // Helper function to normalize user inputs
    const normalizeUserInputs = (userInputs: any[]): VariableInput[] => {
        if (!Array.isArray(userInputs)) return [];

        return userInputs.filter(input => {
            // Filter out entries that don't have the expected structure
            return input &&
                typeof input.variable === 'string' &&
                typeof input.variable_value === 'string' &&
                input.variable !== 'agent_id' && // Exclude agent_id entries
                input.variable !== 'Agent_inputs' && // Exclude Agent_inputs entries
                input.variable !== 'structured_output'; // Exclude structured_output entries
        });
    };

    const fetchHistory = async () => {
        if (!agent_id) {
            setError('Agent ID not found in URL');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/get-history/${agent_id}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch history: ${response.status} ${response.statusText}`);
            }

            const result = await response.json() as HistoryResponse | ApiError;

            if ('error' in result) {
                throw new Error(result.error);
            }

            if (!result.data || typeof result.data !== 'object') {
                throw new Error('Invalid response format');
            }

            // Process the data to handle the new thread-based structure
            const processedData: ThreadGroup = {};
            Object.entries(result.data).forEach(([threadId, items]) => {
                if (Array.isArray(items)) {
                    processedData[threadId] = items.map(item => ({
                        ...item,
                        user_inputs: normalizeUserInputs(item.user_inputs)
                    }));
                }
            });

            setHistory(processedData);
        } catch (err) {
            console.error('History fetch error:', err);
            setError(err instanceof Error ? err.message : 'An error occurred while fetching history');
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch - only when agent_id is available
    useEffect(() => {
        if (agent_id) {
            fetchHistory();
        }
    }, [agent_id]);

    // Refresh trigger effect
    useEffect(() => {
        if (refreshTrigger && agent_id) {
            // Mark that this fetch is user-triggered (new version/modification)
            shouldAutoSelectRef.current = true;
            fetchHistory();
        }
    }, [refreshTrigger, agent_id]);

    // Auto-select latest item only when user triggered (refreshTrigger)
    useEffect(() => {
        // SKIP auto-select if prevented (after fresh generation)
        if (preventAutoSelect) {
            console.log('🚫 MobileHistory: Auto-select PREVENTED (fresh generation)');
            shouldAutoSelectRef.current = false;  // Reset flag
            return;
        }
        
        if (!shouldAutoSelectRef.current) return;
        if (Object.keys(history).length > 0) {
            // Find the most recent item across all threads
            let mostRecentItem: HistoryItem | null = null;
            let mostRecentDate = new Date(0);

            Object.entries(history).forEach(([threadId, items]: [string, HistoryItem[]]) => {
                if (Array.isArray(items) && items.length > 0) {
                    const latestItem = items[items.length - 1]; // Last item is the latest
                    const itemDate = new Date(latestItem.updatedAt || latestItem.createdAt || new Date());
                    if (itemDate > mostRecentDate) {
                        mostRecentDate = itemDate;
                        mostRecentItem = latestItem;
                    }
                }
            });

            // Auto-select the most recent item only for user-triggered updates
            if (mostRecentItem && 'execution_id' in mostRecentItem) {
                console.log('✅ MobileHistory: Auto-selecting history item');
                setShowHistoryLoader(true);
                Promise.resolve(onHistoryItemClick((mostRecentItem as HistoryItem).execution_id, agent_id))
                    .catch(() => {})
                    .finally(() => setShowHistoryLoader(false));
            }
            // Reset the flag
            shouldAutoSelectRef.current = false;
        }
    }, [history, agent_id, onHistoryItemClick, preventAutoSelect]);

    // Height calculation effect
    useEffect(() => {
        const updateHeight = () => {
            if (containerRef?.current) {
                const containerHeight = containerRef.current.offsetHeight;
                if (containerHeight > 0) {
                    setMaxHeight(`${containerHeight + 330}px`);
                }
            }
        };

        updateHeight();

        const handleResize = () => updateHeight();
        window.addEventListener('resize', handleResize);

        let observer: MutationObserver | null = null;
        if (containerRef?.current) {
            observer = new MutationObserver(updateHeight);
            observer.observe(containerRef.current, {
                attributes: true,
                childList: true,
                subtree: true
            });
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            observer?.disconnect();
        };
    }, [containerRef]);

    const handleHistoryClick = async (execution_id: string) => {
        if (!agent_id || !execution_id) return;

        setSelectedItem(execution_id);
        try {
            setShowHistoryLoader(true);
            await onHistoryItemClick(execution_id, agent_id);
        } finally {
            setShowHistoryLoader(false);
        }
        
        // Call onItemSelect if provided (for mobile drawer close)
        if (onItemSelect) {
            onItemSelect();
        }
    };

    const toggleThreadExpansion = (threadId: string) => {
        const newExpanded = new Set(expandedThreads);
        if (newExpanded.has(threadId)) {
            newExpanded.delete(threadId);
        } else {
            newExpanded.add(threadId);
        }
        setExpandedThreads(newExpanded);
    };

    const formatDate = (dateString: string): string => {
        try {
            if (!dateString || dateString.trim() === '') {
                return 'Unknown date';
            }
            
            // Ensure the date string is treated as UTC
            let date: Date;
            
            // Check if it already has timezone indicator (Z or +/-)
            if (dateString.endsWith('Z') || dateString.includes('+') || (dateString.includes('-') && dateString.lastIndexOf('-') > 10)) {
                // Already has timezone info
                date = new Date(dateString);
            } else if (dateString.includes('T')) {
                // ISO format but no timezone - treat as UTC by adding Z
                date = new Date(dateString + 'Z');
            } else {
                // Other format without timezone - assume UTC
                date = new Date(dateString + ' UTC');
            }
            
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
                // Display in local timezone
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
            } else if (diffHrs > 0) {
                return `${diffHrs}h ${diffMins}m ago`;
            } else if (diffMins > 0) {
                return `${diffMins}m ago`;
            } else {
                return 'Just now';
            }
        } catch (error) {
            console.error('Error formatting date:', error, 'Date string:', dateString);
            return dateString;
        }
    };

    const getInputValue = (inputs: VariableInput[], variable: string): string => {
        const input = inputs.find((item) => item.variable === variable);
        return input?.variable_value || '';
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`w-3 h-3 ${
                            star <= rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                        }`}
                    />
                ))}
                <span className="ml-1 text-xs text-gray-600">({rating}/5)</span>
            </div>
        );
    };

    const Badge = ({ children, variant = 'secondary', className = '' }: { children: React.ReactNode, variant?: string, className?: string }) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${className}`}>
            {children}
        </span>
    );

    const getChapterOrTopicName = (inputs: VariableInput[]) => {
        const topicInput = inputs.find((input) => input.variable.toLowerCase() === "topic")
        if (topicInput) {
            return topicInput.variable_value.charAt(0).toUpperCase() + topicInput.variable_value.slice(1)
        }
        const chapterNameInput = inputs.find((input) => input.variable.toLowerCase() === "chapter_name")
        if (chapterNameInput) {
            return chapterNameInput.variable_value.charAt(0).toUpperCase() + chapterNameInput.variable_value.slice(1)
        }
        return null
    };

    const getSubjectName = (inputs: VariableInput[]) => {
        const subjectInput = inputs.find((input) => input.variable.toLowerCase() === "subject")
        if (subjectInput) {
            return subjectInput.variable_value.charAt(0).toUpperCase() + subjectInput.variable_value.slice(1)
        }
        return null
    };

    return (
        <>
            <div
                ref={sidebarRef}
                className={`w-full bg-white border rounded-md border-gray-200 shadow-sm ${className}`}
                style={{
                    height: maxHeight,
                    minHeight: '400px',
                    overflow: 'hidden'
                }}
            >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-indigo-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Test History</h2>
                        <p className="text-xs text-gray-600">Previous test papers & feedback</p>
                    </div>
                </div>
            </div>

            {/* Create New Button */}
            {onCreateNew && (
                <div className="p-3 border-b border-gray-100 bg-white">
                    <button
                        type="button"
                        onClick={onCreateNew}
                        className="w-full h-10 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-md transition-colors duration-200 shadow-sm flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create New
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4" style={{ height: 'calc(100% - 100px)' }}>
                {isLoading && <HistorySkeletonLoader />}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                        <div className="text-red-600 text-sm font-medium">{error}</div>
                    </div>
                )}

                {!agent_id && !isLoading && (
                    <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <div className="text-gray-500 text-sm">No agent ID found in URL</div>
                    </div>
                )}

                {!isLoading && !error && agent_id && (
                    <div className="space-y-3">
                        {Object.keys(history).length === 0 ? (
                            <div className="text-center py-8">
                                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <div className="text-gray-500 text-sm font-medium">No History Found</div>
                                <div className="text-gray-400 text-xs mt-1">Generate your first test paper to see it appear here.</div>
                            </div>
                        ) : (
                            Object.entries(history).map(([threadId, items]) => {
                                if (!Array.isArray(items) || items.length === 0) return null;
                                
                                // Sort items by date to ensure latest is last (chronological order: oldest to newest)
                                const sortedItems = [...items].sort((a, b) => {
                                    const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                                    const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                                    return dateA - dateB; // Oldest first, newest last
                                });
                                
                                const latestItem = sortedItems[sortedItems.length - 1]; // Last item is the latest
                                const isExpanded = expandedThreads.has(threadId);
                                const hasMultipleVersions = sortedItems.length > 1;
                                const subjectName = getInputValue(latestItem.user_inputs, "subject");
                                const boardName = getInputValue(latestItem.user_inputs, "board");
                                const gradeName = getInputValue(latestItem.user_inputs, "grade");
                                const duration = getInputValue(latestItem.user_inputs, "duration");
                                const totalMarks = getInputValue(latestItem.user_inputs, "total_marks");
                                const isSelected = selectedItem === latestItem.execution_id;

                                return (
                                    <div key={threadId} className="space-y-2">
                                        {/* Main Thread Card */}
                                        <div
                                            className={`group relative bg-white rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                                                isSelected
                                                    ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                                                    : 'border-gray-100 hover:border-gray-200'
                                            }`}
                                            onClick={() => handleHistoryClick(latestItem.execution_id)}
                                        >
                                            <div className="p-4">
                                                {/* Header */}
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                                            <FileText className="w-3 h-3 text-indigo-600" />
                                                        </div>
                                                        <div>
                                                            <span className="text-sm font-semibold text-gray-900">
                                                                {subjectName ? subjectName.charAt(0).toUpperCase() + subjectName.slice(1) : 'Test Paper'}
                                                            </span>
                                                            <p className="text-xs text-gray-500">
                                                                {boardName ? boardName.toUpperCase() : ''} {gradeName ? `• Grade ${gradeName}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {hasMultipleVersions && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleThreadExpansion(threadId);
                                                            }}
                                                            className="p-1 hover:bg-indigo-100 rounded transition-colors"
                                                        >
                                                            <ChevronDown
                                                                className={`w-4 h-4 text-indigo-600 transition-transform ${
                                                                    isExpanded ? 'rotate-180' : ''
                                                                }`}
                                                            />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Metadata Badges */}
                                                <div className="flex flex-wrap gap-1.5 mb-3">
                                                    {boardName && (
                                                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                                            {boardName.toUpperCase()}
                                                        </Badge>
                                                    )}
                                                    {gradeName && (
                                                        <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                                                            Grade {gradeName}
                                                        </Badge>
                                                    )}
                                                    {subjectName && (
                                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                                            {subjectName}
                                                        </Badge>
                                                    )}
                                                    {hasMultipleVersions && (
                                                        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                                                            {sortedItems.length} version{sortedItems.length > 1 ? 's' : ''}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Rating and Feedback Display */}
                                                {(latestItem.agent_rating || latestItem.agent_feedback) && (
                                                    <div className="space-y-2 mb-3 p-3 bg-gray-50 rounded-lg border">
                                                        {latestItem.agent_rating && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-medium text-gray-600">Rating</span>
                                                                {renderStars(latestItem.agent_rating)}
                                                            </div>
                                                        )}
                                                        {latestItem.agent_feedback && (
                                                            <div className="space-y-1">
                                                                <span className="text-xs font-medium text-gray-600">Feedback</span>
                                                                <p className="text-xs text-gray-700 bg-white p-2 rounded border text-left line-clamp-3">
                                                                    {latestItem.agent_feedback}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Stats Footer */}
                                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                                    <div className="flex items-center gap-3 text-xs text-gray-600">
                                                        {duration && (
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                <span>{duration}m</span>
                                                            </div>
                                                        )}
                                                        {totalMarks && (
                                                            <div className="flex items-center gap-1">
                                                                <Zap className="w-3 h-3" />
                                                                <span>{totalMarks} marks</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                                            <Calendar className="w-3 h-3" />
                                                            {formatDate(latestItem.updatedAt || latestItem.createdAt || '')}
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Hover Effect */}
                                            <div
                                                className={`absolute inset-0 rounded-xl transition-opacity duration-200 pointer-events-none ${
                                                    isSelected
                                                        ? 'bg-indigo-500/5'
                                                        : 'bg-indigo-500/0 group-hover:bg-indigo-500/5'
                                                }`}
                                            />
                                        </div>

                                        {/* Version Dropdown */}
                                        {isExpanded && hasMultipleVersions && (
                                            <div className="ml-4 space-y-2 border-l-2 border-indigo-200 pl-4">
                                                {sortedItems.slice(0, -1).reverse().map((item, index) => {
                                                    const itemSubjectName = getInputValue(item.user_inputs, "subject");
                                                    const itemBoardName = getInputValue(item.user_inputs, "board");
                                                    const itemGradeName = getInputValue(item.user_inputs, "grade");
                                                    const itemDuration = getInputValue(item.user_inputs, "duration");
                                                    const itemTotalMarks = getInputValue(item.user_inputs, "total_marks");
                                                    const itemIsSelected = selectedItem === item.execution_id;
                                                    // Version 1 is the most recent previous (second newest), Version 2 is next oldest, etc.
                                                    const versionNumber = index + 1;

                                                    return (
                                                        <div
                                                            key={item.execution_id}
                                                            className={`group relative bg-white rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                                                                itemIsSelected
                                                                    ? 'border-indigo-600 bg-indigo-100 shadow-xl ring-2 ring-indigo-400'
                                                                    : 'border-gray-100 hover:border-gray-200'
                                                            }`}
                                                            onClick={() => handleHistoryClick(item.execution_id)}
                                                        >
                                                            <div className="p-3">
                                                                {/* Version Header */}
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div className="w-5 h-5 bg-indigo-100 rounded-md flex items-center justify-center">
                                                                        <FileText className="w-2.5 h-2.5 text-indigo-600" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs font-medium text-indigo-800">
                                                                                Version {versionNumber}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 truncate">
                                                                            {itemSubjectName || 'Test Paper'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-xs text-gray-400">
                                                                        {formatDate(item.updatedAt || item.createdAt || '')}
                                                                    </div>
                                                                </div>

                                                                {/* Version Badges */}
                                                                <div className="flex flex-wrap gap-1 mb-2">
                                                                    {itemBoardName && (
                                                                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border-indigo-200">
                                                                            {itemBoardName.toUpperCase()}
                                                                        </Badge>
                                                                    )}
                                                                    {itemGradeName && (
                                                                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 border-purple-200">
                                                                            Grade {itemGradeName}
                                                                        </Badge>
                                                                    )}
                                                                </div>

                                                                {/* Version Rating */}
                                                                {(item.agent_rating || item.agent_feedback) && (
                                                                    <div className="space-y-1 p-2 bg-gray-50 rounded border mb-2">
                                                                        {item.agent_rating && (
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-xs text-gray-600">Rating</span>
                                                                                {renderStars(item.agent_rating)}
                                                                            </div>
                                                                        )}
                                                                        {item.agent_feedback && (
                                                                            <div className="space-y-1">
                                                                                <span className="text-xs text-gray-600">Feedback</span>
                                                                                <p className="text-xs text-gray-700 bg-white p-1.5 rounded text-left line-clamp-2">
                                                                                    {item.agent_feedback}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Version Stats */}
                                                                <div className="flex items-center justify-between text-xs text-gray-500">
                                                                    <div className="flex items-center gap-3">
                                                                        {itemDuration && (
                                                                            <div className="flex items-center gap-1">
                                                                                <Clock className="w-2.5 h-2.5" />
                                                                                <span>{itemDuration}m</span>
                                                                            </div>
                                                                        )}
                                                                        {itemTotalMarks && (
                                                                            <div className="flex items-center gap-1">
                                                                                <Zap className="w-2.5 h-2.5" />
                                                                                <span>{itemTotalMarks} marks</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                                                </div>
                                                            </div>

                                                            {/* Version Hover Effect */}
                                                            <div
                                                                className={`absolute inset-0 rounded-lg transition-opacity duration-200 pointer-events-none ${
                                                                    itemIsSelected
                                                                        ? 'bg-indigo-500/5'
                                                                        : 'bg-indigo-500/0 group-hover:bg-indigo-500/5'
                                                                }`}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
            </div>
            {/* Global loader for history item selection (mobile) */}
            <PopupLoader open={showHistoryLoader} label="Loading history…" />
        </>
    );
};

export default MobileTestPaperHistory;