'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCcw, Clock, FileText, Star, ChevronDown, Plus, Calendar, Users, DollarSign, Briefcase, Settings } from 'lucide-react';
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

interface HistorySidebarProps {
    onHistoryItemClick: (executionToken: string, agent_id: string) => void;
    containerRef?: React.RefObject<HTMLDivElement | null>;
    refreshTrigger?: number;
    onCreateNew?: () => void;
    selectedExecutionId?: string;
}

interface DisplayValue {
    variable: string;
    value: string;
}

interface DisplayField {
    icon: React.ComponentType<any>;
    value: string;
}

const ResumeHistory: React.FC<HistorySidebarProps> = ({
    onHistoryItemClick,
    containerRef,
    refreshTrigger,
    onCreateNew,
    selectedExecutionId,
}) => {
    const [history, setHistory] = useState<ThreadGroup>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [internalSelectedItem, setInternalSelectedItem] = useState<string | null>(null);
    const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
    const [maxHeight, setMaxHeight] = useState<string>('116vh');
    const sidebarRef = useRef<HTMLDivElement>(null);
    const shouldAutoSelectRef = useRef<boolean>(false);
    const [showHistoryLoader, setShowHistoryLoader] = useState(false);

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
                    const normalizedItems = items.map(item => ({
                        ...item,
                        user_inputs: normalizeUserInputs(item.user_inputs)
                    }));

                    processedData[threadId] = normalizedItems.sort((a, b) => {
                        const getTimestamp = (entry: HistoryItem) => {
                            const timestamp = entry.updatedAt || entry.createdAt;
                            return timestamp ? new Date(timestamp).getTime() : 0;
                        };
                        return getTimestamp(a) - getTimestamp(b);
                    });
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

            Object.entries(history).forEach(([threadId, items]) => {
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
                setInternalSelectedItem((mostRecentItem as any).execution_id);
            }
            // Reset the flag
            shouldAutoSelectRef.current = false;
        }
    }, [history]);

    // Dynamic height calculation effect
    useEffect(() => {
        const updateHeight = () => {
            if (containerRef?.current) {
                const containerHeight = containerRef.current.offsetHeight;
                if (containerHeight > 0) {
                    // Calculate 80vh in pixels
                    const viewportHeight = window.innerHeight;
                    const additionalHeight = viewportHeight * 0.8; // 80vh

                    // Add the container height + 80vh for dynamic sizing
                    const totalHeight = containerHeight + additionalHeight;
                    setMaxHeight(`${totalHeight}px`);
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

    useEffect(() => {
        if (selectedExecutionId === undefined) return;
        if (selectedExecutionId === "") {
            setInternalSelectedItem(null);
            return;
        }
        setInternalSelectedItem(selectedExecutionId);
    }, [selectedExecutionId]);

    const resolvedSelectedId = selectedExecutionId ?? internalSelectedItem ?? null;

    const loadHistoryItem = (execution_id: string, agentId: string) => {
        if (!agentId || !execution_id) return;

        setShowHistoryLoader(true);
        Promise.resolve(onHistoryItemClick(execution_id, agentId))
            .catch(error => {
                console.error('Error loading history item:', error);
            })
            .finally(() => setShowHistoryLoader(false));
    };

    const handleHistoryClick = (execution_id: string) => {
        if (!agent_id || !execution_id) return;

        setInternalSelectedItem(execution_id);
        loadHistoryItem(execution_id, agent_id);
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

    const parseUTCDate = (dateString: string): Date | null => {
        if (!dateString || dateString.trim() === '') {
            return null;
        }

        try {
            const trimmed = dateString.trim();
            const hasTimezone = /(Z|[+-]\d{2}:?\d{2})$/.test(trimmed);
            let parsed: Date;

            if (hasTimezone) {
                parsed = new Date(trimmed);
            } else if (trimmed.includes('T')) {
                parsed = new Date(`${trimmed}Z`);
            } else {
                parsed = new Date(`${trimmed} UTC`);
            }

            return isNaN(parsed.getTime()) ? null : parsed;
        } catch (error) {
            console.error('Error parsing date:', error, dateString);
            return null;
        }
    };

    const formatDate = (dateString: string) => {
        const date = parseUTCDate(dateString);
        if (!date) {
            return 'Unknown date';
        }

        const now = new Date();
        let diffMs = now.getTime() - date.getTime();
        if (diffMs < 0) diffMs = 0;

        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
        return new Intl.DateTimeFormat('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        }

        if (diffHours > 0) {
            const remainingMinutes = diffMinutes - diffHours * 60;
            return `${diffHours}h ${remainingMinutes}m ago`;
        }

        if (diffMinutes > 0) {
            return `${diffMinutes}m ago`;
        }

        return 'Just now';
    };

    const formatTime = (dateString: string) => {
        const date = parseUTCDate(dateString);
        if (!date) {
            return 'Unknown time';
        }

        try {
        return new Intl.DateTimeFormat('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(date);
        } catch (error) {
            console.error('Error formatting time:', error, dateString);
            return 'Invalid time';
        }
    };

    const getJobRole = (userInputs: VariableInput[]) => {
        const jobRoleInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('job_role') ||
            input.variable.toLowerCase().includes('role') ||
            input.variable.toLowerCase().includes('position') ||
            input.variable === 'Job_Role' // Handle exact API format
        );
        return jobRoleInput?.variable_value || 'Unknown Position';
    };

    const getJobDescription = (userInputs: VariableInput[]) => {
        const jobDescInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('job_description') ||
            input.variable.toLowerCase().includes('description') ||
            input.variable.toLowerCase().includes('jd')
        );
        return jobDescInput?.variable_value || '';
    };

    const getSpecialInstructions = (userInputs: VariableInput[]) => {
        const specialInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('special_instructions') ||
            input.variable.toLowerCase().includes('instructions') ||
            input.variable.toLowerCase().includes('skills')
        );
        return specialInput?.variable_value || '';
    };

    const getResumeDetails = (userInputs: VariableInput[], filename?: string) => {
        const details = [];

        if (filename) {
            const fileCount = filename.split(',').length;
            details.push(`${fileCount} file${fileCount > 1 ? 's' : ''}`);
        }

        return details.join(' • ');
    };

    const getThreadSummary = (userInputs: VariableInput[], filename?: string) => {
        const jobRole = getJobRole(userInputs);
        const details = getResumeDetails(userInputs, filename);

        return `${jobRole}${details ? ` • ${details}` : ''}`;
    };

    const getDisplayValue = (variable: string, value: string): DisplayValue => {
        const cleanVariable = variable.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return {
            variable: cleanVariable,
            value: value
        };
    };

    const getPrimaryDisplayField = (userInputs: VariableInput[]): DisplayField | null => {
        const jobRoleInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('job_role') ||
            input.variable.toLowerCase().includes('role') ||
            input.variable.toLowerCase().includes('position') ||
            input.variable === 'Job_Role' // Handle exact API format
        );
        
        if (jobRoleInput) {
            return {
                icon: Briefcase,
                value: jobRoleInput.variable_value
            };
        }
        
        return null;
    };

    const getPrimaryFields = (userInputs: VariableInput[]): VariableInput[] => {
        // Only show job role, no other fields
        return [];
    };

    const getSecondaryFields = (userInputs: VariableInput[]): VariableInput[] => {
        const primaryFieldNames = ['job_role', 'role', 'position', 'job_description', 'description', 'special_instructions', 'instructions', 'skills'];
        return userInputs.filter(input =>
            !primaryFieldNames.some(field => input.variable.toLowerCase().includes(field)) &&
            input.variable !== 'Job_Role' // Exclude exact API format
        );
    };

    const sortedThreadEntries = useMemo<[string, HistoryItem[]][]>(() => {
        return Object.entries(history).sort(([, itemsA], [, itemsB]) => {
            const getLatestTimestamp = (items: HistoryItem[]) => {
                if (!Array.isArray(items) || items.length === 0) return 0;
                const latestItem = items[items.length - 1];
                const timestamp = latestItem?.updatedAt || latestItem?.createdAt;
                return timestamp ? new Date(timestamp).getTime() : 0;
            };
            return getLatestTimestamp(itemsB) - getLatestTimestamp(itemsA);
        });
    }, [history]);

    return (
        <>
            <div
                ref={sidebarRef}
                className="w-72 bg-white border-l rounded-md border-gray-200 shadow-sm flex flex-col"
                style={{
                    height: maxHeight,
                    maxHeight: maxHeight,
                    minHeight: '400px'
                }}
            >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-indigo-50 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Resume History</h2>
                        <p className="text-xs text-gray-600">Previous scoring sessions</p>
                    </div>
                </div>
            </div>

            {/* Create New Button */}
            {onCreateNew && (
                <div className="p-3 border-b border-gray-100 bg-white flex-shrink-0">
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
            <div className="flex-1 overflow-y-auto p-4 pb-6 min-h-0">
                {isLoading && <HistorySkeletonLoader />}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                        <div className="text-red-600 text-sm font-medium">{error}</div>
                    </div>
                )}

                {!agent_id && !isLoading && (
                    <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <div className="text-gray-500 text-sm">No agent ID found in URL</div>
                    </div>
                )}

                {!isLoading && !error && agent_id && (
                    <div className="space-y-3">
                        {Object.keys(history).length === 0 ? (
                            <div className="text-center py-8">
                                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <div className="text-gray-500 text-sm">No resume history found</div>
                                <div className="text-gray-400 text-xs mt-1">Score your first resume to get started</div>
                            </div>
                        ) : (
                            sortedThreadEntries.map(([threadId, items]) => {
                                if (!Array.isArray(items) || items.length === 0) return null;

                                const latestItem = items[items.length - 1]; // Last item is the latest
                                const isExpanded = expandedThreads.has(threadId);
                                const hasMultipleVersions = items.length > 1;
                                const jobRole = getJobRole(latestItem.user_inputs);
                                const details = getResumeDetails(latestItem.user_inputs, latestItem.filename);
                                const isSelected = resolvedSelectedId === latestItem.execution_id;
                                const primaryDisplayField = getPrimaryDisplayField(latestItem.user_inputs);
                                const primaryFields = getPrimaryFields(latestItem.user_inputs);
                                const secondaryFields = getSecondaryFields(latestItem.user_inputs);

                                return (
                                    <div key={threadId} className="space-y-2">
                                        {/* Main Thread Card */}
                                        <div
                                            className={`group relative bg-white rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${isSelected
                                                    ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                                                    : 'border-gray-100 hover:border-gray-200'
                                                }`}
                                            onClick={() => handleHistoryClick(latestItem.execution_id)}
                                        >
                                            <div className="p-4">
                                                {/* Resume Header */}
                                                {primaryDisplayField && (
                                                    <div className="flex items-start gap-2 mb-2.5">
                                                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                                            <primaryDisplayField.icon className="w-4 h-4 text-white" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">
                                                                {primaryDisplayField.value}
                                                            </h3>
                                                            <p className="text-xs text-gray-500 mt-0.5">Resume Scoring</p>
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
                                                                    className={`w-4 h-4 text-indigo-600 transition-transform ${isExpanded ? 'rotate-180' : ''
                                                                        }`}
                                                                />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Fallback if no primary display field */}
                                                {!primaryDisplayField && (
                                                    <div className="flex items-center gap-2 mb-2.5">
                                                        <div className="w-5 h-5 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            <FileText className="w-3 h-3 text-indigo-600" />
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900">{jobRole}</span>
                                                        {hasMultipleVersions && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleThreadExpansion(threadId);
                                                                }}
                                                                className="p-1 hover:bg-indigo-100 rounded transition-colors ml-auto"
                                                            >
                                                                <ChevronDown
                                                                    className={`w-4 h-4 text-indigo-600 transition-transform ${isExpanded ? 'rotate-180' : ''
                                                                        }`}
                                                                />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}


                                                {/* File Information - Simplified */}
                                                {latestItem.filename && (
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <FileText className="w-3 h-3 text-gray-400" />
                                                        <span className="text-xs text-gray-600">
                                                            {latestItem.filename.split(',').length} file{latestItem.filename.split(',').length > 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Version Badge - Simplified */}
                                                {hasMultipleVersions && (
                                                    <div className="mb-2">
                                                        <span className="bg-indigo-100 px-2 py-0.5 rounded text-xs text-indigo-700">
                                                            {items.length} version{items.length > 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Footer */}
                                                <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-100">
                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                    <span className="text-xs text-gray-500">{formatDate(latestItem.updatedAt || latestItem.createdAt || '')}</span>
                                                    <span className="text-xs text-gray-400">•</span>
                                                    <span className="text-xs text-gray-500">{formatTime(latestItem.updatedAt || latestItem.createdAt || '')}</span>
                                                </div>
                                            </div>

                                            {/* Hover Effect */}
                                            <div className={`absolute inset-0 rounded-xl transition-opacity duration-200 pointer-events-none ${isSelected
                                                ? 'bg-[#3b82f6]/5'
                                                : 'bg-indigo-500/0 group-hover:bg-indigo-500/5'
                                                }`} />
                                        </div>

                                        {/* Version Dropdown */}
                                        {isExpanded && hasMultipleVersions && (
                                            <div className="ml-4 space-y-2 border-l-2 border-indigo-200 pl-3">
                                                {items.slice(0, -1).reverse().map((item, index) => {
                                                    const itemJobRole = getJobRole(item.user_inputs);
                                                    const itemDetails = getResumeDetails(item.user_inputs, item.filename);
                                                    const itemIsSelected = resolvedSelectedId === item.execution_id;
                                                    const versionNumber = index + 1; // Version 1 is most recent previous, Version 2 is next, etc.

                                                    return (
                                                        <div
                                                            key={item.execution_id}
                                                            className={`group relative bg-white rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${itemIsSelected
                                                                    ? 'border-indigo-300 bg-indigo-25 shadow-md'
                                                                    : 'border-gray-100 hover:border-gray-200'
                                                                }`}
                                                            onClick={() => handleHistoryClick(item.execution_id)}
                                                        >
                                                            <div className="p-3">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                                                        <Briefcase className="w-3 h-3" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-xs font-semibold text-gray-800">
                                                                            Version {versionNumber}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                                                                            <Briefcase className="w-3 h-3" />
                                                                            {itemJobRole}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-xs text-gray-400">
                                                                            {formatDate(item.updatedAt || item.createdAt || '')}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 font-medium">
                                                                            {formatTime(item.updatedAt || item.createdAt || '')}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1.5 pl-8">
                                                                    {item.filename && (
                                                                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                                            <FileText className="w-3 h-3 text-indigo-500" />
                                                                            <span>{item.filename.split(',').length} file{item.filename.split(',').length > 1 ? 's' : ''}</span>
                                                                        </div>
                                                                    )}
                                                                    {itemDetails && (
                                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                                            <Settings className="w-3 h-3 text-green-500" />
                                                                            <span className="truncate">{itemDetails}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
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
            <PopupLoader open={showHistoryLoader} label="Loading history…" />
        </>
    );
};

export default ResumeHistory;