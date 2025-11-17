'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Calendar1, Clock, ChevronDown, Plus, FileAudio } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import HistorySkeletonLoader from '../Content/HistoryComponentSkeleton';

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

interface MobileAudioHistoryProps {
    onHistoryItemClick: (executionToken: string, agent_id: string) => void;
    containerRef?: React.RefObject<HTMLDivElement | null>;
    refreshTrigger?: number;
    onCreateNew?: () => void;
    className?: string;
    onItemSelect?: () => void;
    currentExecutionId?: string; // Add this prop to track what's currently displayed
}

const MobileAudioHistory: React.FC<MobileAudioHistoryProps> = ({
    onHistoryItemClick,
    containerRef,
    refreshTrigger,
    onCreateNew,
    className = "",
    onItemSelect,
    currentExecutionId, // Accept current execution ID from parent
}) => {
    const [history, setHistory] = useState<ThreadGroup>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
    const [maxHeight, setMaxHeight] = useState<string>('110vh');
    const sidebarRef = useRef<HTMLDivElement>(null);

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
            fetchHistory();
        }
    }, [refreshTrigger, agent_id]);

    // Sync selected item with currentExecutionId prop
    useEffect(() => {
        if (currentExecutionId) {
            setSelectedItem(currentExecutionId);

            // Auto-expand the thread containing the current execution
            Object.entries(history).forEach(([threadId, items]) => {
                const hasCurrentExecution = items.some(item => item.execution_id === currentExecutionId);
                if (hasCurrentExecution) {
                    setExpandedThreads(prev => new Set([...prev, threadId]));
                }
            });
        } else {
            // Clear selection when currentExecutionId is empty (e.g., when createNew is clicked)
            setSelectedItem(null);
        }
    }, [currentExecutionId, history]);

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

            let parsedDate: Date;

            if (
                dateString.endsWith('Z') ||
                dateString.includes('+') ||
                (dateString.includes('-') && dateString.lastIndexOf('-') > 10)
            ) {
                parsedDate = new Date(dateString);
            } else if (dateString.includes('T')) {
                parsedDate = new Date(dateString + 'Z');
            } else {
                parsedDate = new Date(`${dateString} UTC`);
            }

            if (Number.isNaN(parsedDate.getTime())) {
                return dateString;
            }

            const now = new Date();
            const diffMs = now.getTime() - parsedDate.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMs >= 0 && diffMins < 1) {
                return 'Just now';
            }

            if (diffMs >= 0 && diffHrs < 1) {
                return `${diffMins}m ago`;
            }

            if (diffMs >= 0 && diffDays < 1) {
                const remainingMins = diffMins % 60;
                return `${diffHrs}h${remainingMins ? ` ${remainingMins}m` : ''} ago`;
            }

            return parsedDate.toLocaleString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch (error) {
            console.error('Error formatting date:', error, 'Date string:', dateString);
            return dateString;
        }
    };

    const getFileName = (item: HistoryItem) => {
        if ('filename' in item && item.filename) {
            return item.filename;
        }

        const fileInput = item.user_inputs.find(input =>
            input.variable.toLowerCase().includes('file') ||
            input.variable.toLowerCase().includes('audio') ||
            input.variable.toLowerCase().includes('name')
        );
        return fileInput?.variable_value || 'audio-file';
    };

    const getEnabledFeatures = (userInputs: VariableInput[]) => {
        const features = [];

        const hasKeywords = userInputs.some(input =>
            input.variable.toLowerCase().includes('keyword') &&
            input.variable_value.toLowerCase() !== 'false'
        );

        const hasSummary = userInputs.some(input =>
            input.variable.toLowerCase().includes('summary') &&
            input.variable_value.toLowerCase() !== 'false'
        );

        const hasSpeakerID = userInputs.some(input =>
            input.variable.toLowerCase().includes('speaker') &&
            input.variable_value.toLowerCase() !== 'false'
        );

        const hasEntityDetection = userInputs.some(input =>
            input.variable.toLowerCase().includes('entity') &&
            input.variable_value.toLowerCase() !== 'false'
        );

        const hasDecisions = userInputs.some(input =>
            input.variable.toLowerCase().includes('decision') &&
            input.variable_value.toLowerCase() !== 'false'
        );

        const hasSentiment = userInputs.some(input =>
            input.variable.toLowerCase().includes('sentiment') &&
            input.variable_value.toLowerCase() !== 'false'
        );

        const hasKeyTopics = userInputs.some(input =>
            input.variable.toLowerCase().includes('key_topics') &&
            input.variable_value.toLowerCase() !== 'false'
        );

        const hasActionItems = userInputs.some(input =>
            input.variable.toLowerCase().includes('action_items') &&
            input.variable_value.toLowerCase() !== 'false'
        );

        if (hasSummary) features.push('Summary');
        if (hasSpeakerID) features.push('Speaker ID');
        if (hasEntityDetection) features.push('Entity Detection');
        if (hasDecisions) features.push('Decisions');
        if (hasKeywords) features.push('Keywords');
        if (hasSentiment) features.push('Sentiment');
        if (hasKeyTopics) features.push('Key Topics');
        if (hasActionItems) features.push('Action Items');

        return features;
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
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#7c3aed] rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Analysis History</h2>
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
                        className="w-full h-10 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium rounded-md transition-colors duration-200 shadow-sm flex items-center justify-center gap-2"
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
                        <FileAudio className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <div className="text-gray-500 text-sm">No agent ID found in URL</div>
                    </div>
                )}

                {!isLoading && !error && agent_id && (
                    <div className="space-y-3">
                        {Object.keys(history).length === 0 ? (
                            <div className="text-center py-8">
                                <FileAudio className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <div className="text-gray-500 text-sm">No history found</div>
                                <div className="text-gray-400 text-xs mt-1">Upload an audio file to start analyzing</div>
                            </div>
                        ) : (
                            // Sort threads by their latest item's date (newest first)
                            Object.entries(history)
                                .map(([threadId, items]) => {
                                    if (!Array.isArray(items) || items.length === 0) return null;

                                    // Sort items within thread by date (oldest to newest)
                                    const sortedItems = [...items].sort((a, b) => {
                                        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                                        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                                        return dateA - dateB; // Oldest first, newest last
                                    });

                                    const latestItem = sortedItems[sortedItems.length - 1];
                                    const latestDate = new Date(latestItem.updatedAt || latestItem.createdAt || 0).getTime();

                                    return {
                                        threadId,
                                        sortedItems,
                                        latestItem,
                                        latestDate
                                    };
                                })
                                .filter((item): item is NonNullable<typeof item> => item !== null)
                                .sort((a, b) => b.latestDate - a.latestDate) // Sort threads: newest first
                                .map(({ threadId, sortedItems, latestItem }) => {
                                    const isExpanded = expandedThreads.has(threadId);
                                    const hasMultipleVersions = sortedItems.length > 1;
                                    const fileName = getFileName(latestItem);
                                    const enabledFeatures = getEnabledFeatures(latestItem.user_inputs);
                                    const isSelected = latestItem.execution_id === currentExecutionId;

                                return (
                                    <div key={threadId} className="space-y-2">
                                        {/* Main Thread Card */}
                                        <div
                                            className={`group relative bg-white rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                                                isSelected
                                                    ? 'border-[#7c3aed] bg-violet-50 shadow-xl'
                                                    : 'border-gray-100 hover:border-gray-200'
                                            } ${isSelected ? 'after:absolute after:left-0 after:top-0 after:bottom-0 after:w-2 after:bg-[#7c3aed] after:rounded-l-xl after:content-[]' : ''}`}
                                            onClick={() => handleHistoryClick(latestItem.execution_id)}
                                        >
                                            {/* File Header */}
                                            <div className="p-4 pb-2 flex items-start justify-between">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#7c3aed]' : 'bg-[#7c3aed]'}`}>
                                                        <FileAudio className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium text-gray-900 text-sm truncate">
                                                            {fileName}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <Calendar1 className="w-3 h-3 text-gray-400" />
                                                            <span className="text-xs text-gray-500">
                                                                {formatDate(latestItem.updatedAt || latestItem.createdAt || '')}
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
                                                        className="p-1 hover:bg-violet-100 rounded transition-colors"
                                                    >
                                                        <ChevronDown
                                                            className={`w-4 h-4 text-violet-600 transition-transform ${isExpanded ? 'rotate-180' : ''
                                                                }`}
                                                        />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Features */}
                                            {enabledFeatures.length > 0 && (
                                                <div className="px-4 pb-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {enabledFeatures.slice(0, 3).map((feature, idx) => (
                                                            <span
                                                                key={idx}
                                                                className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${isSelected
                                                                    ? 'bg-violet-100 text-[#7c3aed]'
                                                                    : 'bg-gray-100 text-gray-600'
                                                                    }`}
                                                            >
                                                                {feature}
                                                            </span>
                                                        ))}
                                                        {enabledFeatures.length > 3 && (
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${isSelected
                                                                ? 'bg-violet-100 text-[#7c3aed]'
                                                                : 'bg-gray-100 text-gray-600'
                                                                }`}>
                                                                +{enabledFeatures.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Version Badge */}
                                            {hasMultipleVersions && (
                                                <div className="px-4 pb-3">
                                                    <span className="bg-violet-100 px-2 py-1 rounded text-xs text-violet-700">
                                                        {sortedItems.length} version{sortedItems.length > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Hover Effect */}
                                            <div className={`absolute inset-0 rounded-xl transition-opacity duration-200 pointer-events-none ${isSelected
                                                ? 'bg-[#7c3aed]/5'
                                                : 'bg-purple-500/0 group-hover:bg-purple-500/5'
                                                }`} />
                                        </div>

                                        {/* Version Dropdown */}
                                        {isExpanded && hasMultipleVersions && (
                                            <div className="ml-4 space-y-2 border-l-2 border-violet-200 pl-3">
                                                {sortedItems.slice(0, -1).reverse().map((item, index) => {
                                                    const itemFileName = getFileName(item);
                                                    const itemEnabledFeatures = getEnabledFeatures(item.user_inputs);
                                                    const itemIsSelected = item.execution_id === currentExecutionId;
                                                    const versionNumber = index + 1;

                                                    return (
                                                        <div
                                                            key={item.execution_id}
                                                            className={`group relative bg-white rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                                                                itemIsSelected
                                                                    ? 'border-[#7c3aed] bg-violet-50 shadow-xl'
                                                                    : 'border-gray-100 hover:border-gray-200'
                                                            }`}
                                                            onClick={() => handleHistoryClick(item.execution_id)}
                                                        >
                                                            <div className="p-3">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div className="w-5 h-5 bg-violet-100 rounded-lg flex items-center justify-center">
                                                                        <FileAudio className="w-3 h-3 text-violet-600" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-xs font-medium text-gray-700">
                                                                            Version {versionNumber}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 truncate">
                                                                            {itemFileName}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-xs text-gray-400">
                                                                        {formatDate(item.updatedAt || item.createdAt || '')}
                                                                    </div>
                                                                </div>

                                                                {itemEnabledFeatures.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {itemEnabledFeatures.slice(0, 2).map((feature, idx) => (
                                                                            <span
                                                                                key={idx}
                                                                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                                                                            >
                                                                                {feature}
                                                                            </span>
                                                                        ))}
                                                                        {itemEnabledFeatures.length > 2 && (
                                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                                                +{itemEnabledFeatures.length - 2}
                                                                            </span>
                                                                        )}
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

export default MobileAudioHistory;
