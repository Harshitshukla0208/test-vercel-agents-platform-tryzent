'use client';

import React, { useEffect, useState, useRef } from 'react';
import { RefreshCcw, Clock, BookOpen, ChevronDown, Plus } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import HistorySkeletonLoader from './HistoryComponentSkeleton';

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

interface MobileHistorySidebarProps {
    onHistoryItemClick: (executionToken: string, agent_id: string) => void;
    containerRef?: React.RefObject<HTMLDivElement | null>;
    refreshTrigger?: number;
    onCreateNew?: () => void;
    className?: string;
    onItemSelect?: () => void;
}

const MobileHistorySidebar: React.FC<MobileHistorySidebarProps> = ({
    onHistoryItemClick,
    containerRef,
    refreshTrigger,
    onCreateNew,
    className = "",
    onItemSelect,
}) => {
    const [history, setHistory] = useState<ThreadGroup>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
    const [maxHeight, setMaxHeight] = useState<string>('110vh');
    const sidebarRef = useRef<HTMLDivElement>(null);
    const shouldAutoSelectRef = useRef<boolean>(false);

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
                setSelectedItem((mostRecentItem as any).execution_id);
            }
            // Reset the flag
            shouldAutoSelectRef.current = false;
        }
    }, [history]);

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

    const handleHistoryClick = (execution_id: string) => {
        if (!agent_id || !execution_id) return;

        setSelectedItem(execution_id);
        onHistoryItemClick(execution_id, agent_id);
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

    const formatDate = (dateString: string) => {
        try {
            if (!dateString || dateString.trim() === '') {
                return 'Unknown date';
            }
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return 'Invalid date';
        }
    };

    const getPrimaryDisplayValue = (userInputs: VariableInput[]) => {
        // Try to find a meaningful primary display value
        const priorityFields = ['topic', 'subject', 'destination', 'diet_goal', 'user_type', 'filename'];
        
        for (const field of priorityFields) {
            const input = userInputs.find(input => 
                input.variable.toLowerCase().includes(field)
            );
            if (input && input.variable_value) {
                return input.variable_value;
            }
        }
        
        return 'Agent Execution';
    };

    const getThreadSummary = (userInputs: VariableInput[]) => {
        const summary: string[] = [];
        
        // Add key fields to summary
        const keyFields = ['subject', 'grade', 'topic', 'chapter'];
        keyFields.forEach(field => {
            const input = userInputs.find(input => 
                input.variable.toLowerCase().includes(field)
            );
            if (input && input.variable_value) {
                summary.push(`${input.variable.replace(/_/g, ' ')}: ${input.variable_value}`);
            }
        });

        return summary.slice(0, 2).join(' • ');
    };

    return (
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
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">History</h2>
                        <p className="text-xs text-gray-600">Previous results & feedback</p>
                    </div>
                </div>
            </div>

            {/* Create New Button */}
            {onCreateNew && (
                <div className="p-3 border-b border-gray-100 bg-white">
                    <button
                        type="button"
                        onClick={onCreateNew}
                        className="w-full h-10 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors duration-200 shadow-sm flex items-center justify-center gap-2"
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
                                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <div className="text-gray-500 text-sm">No history found</div>
                                <div className="text-gray-400 text-xs mt-1">Start using the agent to see history</div>
                            </div>
                        ) : (
                            Object.entries(history).map(([threadId, items]) => {
                                if (!Array.isArray(items) || items.length === 0) return null;
                                
                                const latestItem = items[items.length - 1]; // Last item is the latest
                                const isExpanded = expandedThreads.has(threadId);
                                const hasMultipleVersions = items.length > 1;
                                const primaryDisplayValue = getPrimaryDisplayValue(latestItem.user_inputs);
                                const threadSummary = getThreadSummary(latestItem.user_inputs);
                                const isSelected = selectedItem === latestItem.execution_id;

                                return (
                                    <div key={threadId} className="space-y-2">
                                        {/* Main Thread Card */}
                                        <div
                                            className={`group relative bg-white rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                                                isSelected
                                                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                                                    : 'border-gray-100 hover:border-gray-200'
                                            }`}
                                            onClick={() => handleHistoryClick(latestItem.execution_id)}
                                        >
                                            {/* Thread Header */}
                                            <div className="p-4 pb-2 flex items-start justify-between">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-500' : 'bg-blue-500'}`}>
                                                        <BookOpen className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium text-gray-900 text-sm truncate">
                                                            {primaryDisplayValue || 'Agent Execution'}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Clock className="w-3 h-3 text-gray-400" />
                                                            <span className="text-xs text-gray-500">
                                                                Latest: {formatDate(latestItem.updatedAt || latestItem.createdAt || '')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {hasMultipleVersions && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleThreadExpansion(threadId);
                                                        }}
                                                        className="p-1 hover:bg-blue-100 rounded transition-colors"
                                                    >
                                                        <ChevronDown 
                                                            className={`w-4 h-4 text-blue-600 transition-transform ${
                                                                isExpanded ? 'rotate-180' : ''
                                                            }`} 
                                                        />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Thread Summary */}
                                            {threadSummary && (
                                                <div className="px-4 pb-3">
                                                    <div className="text-xs text-gray-600">
                                                        {threadSummary}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Version Badge */}
                                            {hasMultipleVersions && (
                                                <div className="px-4 pb-3">
                                                    <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-700">
                                                        {items.length} version{items.length > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Hover Effect */}
                                            <div className={`absolute inset-0 rounded-xl transition-opacity duration-200 pointer-events-none ${isSelected
                                                ? 'bg-blue-500/5'
                                                : 'bg-blue-500/0 group-hover:bg-blue-500/5'
                                            }`} />
                                        </div>

                                        {/* Version Dropdown */}
                                        {isExpanded && hasMultipleVersions && (
                                            <div className="ml-4 space-y-2 border-l-2 border-blue-200 pl-3">
                                                {items.slice(0, -1).reverse().map((item, index) => {
                                                    const itemPrimaryDisplayValue = getPrimaryDisplayValue(item.user_inputs);
                                                    const itemThreadSummary = getThreadSummary(item.user_inputs);
                                                    const itemIsSelected = selectedItem === item.execution_id;
                                                    const versionNumber = index + 1; // Version 1 is most recent previous, Version 2 is next, etc.

                                                    return (
                                                        <div
                                                            key={item.execution_id}
                                                            className={`group relative bg-white rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                                                                itemIsSelected
                                                                    ? 'border-blue-300 bg-blue-25 shadow-md'
                                                                    : 'border-gray-100 hover:border-gray-200'
                                                            }`}
                                                            onClick={() => handleHistoryClick(item.execution_id)}
                                                        >
                                                            <div className="p-3">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div className="w-5 h-5 bg-blue-100 rounded-lg flex items-center justify-center">
                                                                        <BookOpen className="w-3 h-3 text-blue-600" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-xs font-medium text-gray-700">
                                                                            Version {versionNumber}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 truncate">
                                                                            {itemPrimaryDisplayValue || 'Agent Execution'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-xs text-gray-400">
                                                                        {formatDate(item.updatedAt || item.createdAt || '')}
                                                                    </div>
                                                                </div>
                                                                
                                                                {itemThreadSummary && (
                                                                    <div className="text-xs text-gray-600">
                                                                        {itemThreadSummary}
                                                                    </div>
                                                                )}
                                                            </div>
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
    );
};

export default MobileHistorySidebar;
