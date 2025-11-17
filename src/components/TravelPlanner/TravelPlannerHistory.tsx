'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshCcw, Clock, MapPin, Star, ChevronDown, Plus, Calendar, Users, DollarSign } from 'lucide-react';
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

const TravelPlannerHistory: React.FC<HistorySidebarProps> = ({
    onHistoryItemClick,
    containerRef,
    refreshTrigger,
    onCreateNew,
    selectedExecutionId,
}) => {
    const [history, setHistory] = useState<ThreadGroup>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
    const [maxHeight, setMaxHeight] = useState<string>('110vh');
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

    // Sync selectedExecutionId from parent to internal state
    useEffect(() => {
        if (selectedExecutionId === undefined) return;
        if (selectedExecutionId === "") {
            setSelectedItem(null);
            return;
        }
        setSelectedItem(selectedExecutionId);
    }, [selectedExecutionId]);

    const loadHistoryItem = useCallback((execution_id: string, agentId: string) => {
        if (!agentId || !execution_id) return;

        setShowHistoryLoader(true);
        Promise.resolve(onHistoryItemClick(execution_id, agentId))
            .catch(error => {
                console.error('Error loading history item:', error);
            })
            .finally(() => setShowHistoryLoader(false));
    }, [onHistoryItemClick]);

    // Auto-select latest item only when user triggered (refreshTrigger) and no selectedExecutionId is provided
    useEffect(() => {
        if (!shouldAutoSelectRef.current) return;
        if (selectedExecutionId) {
            // If selectedExecutionId is provided, use it instead of auto-selecting
            setSelectedItem(selectedExecutionId);
            shouldAutoSelectRef.current = false;
            return;
        }
        if (Object.keys(history).length > 0) {
            // Find the most recent item across all threads
            let mostRecentItem: HistoryItem | null = null;
            let mostRecentDate = new Date(0);

            Object.entries(history).forEach(([threadId, items]) => {
                if (Array.isArray(items) && items.length > 0) {
                    // Sort items by date (newest first)
                    const sortedItems = [...items].sort((a, b) => {
                        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                        return dateB - dateA; // Descending order (newest first)
                    });
                    const latestItem = sortedItems[0]; // First item is the latest
                    const itemDate = new Date(latestItem.updatedAt || latestItem.createdAt || new Date());
                    if (itemDate > mostRecentDate) {
                        mostRecentDate = itemDate;
                        mostRecentItem = latestItem;
                    }
                }
            });

            // Auto-select the most recent item only for user-triggered updates
            if (mostRecentItem && 'execution_id' in mostRecentItem) {
                const executionId = (mostRecentItem as any).execution_id;
                setSelectedItem(executionId);
                if (!selectedExecutionId) {
                    void loadHistoryItem(executionId, agent_id);
                }
            }
            // Reset the flag
            shouldAutoSelectRef.current = false;
        }
    }, [history, selectedExecutionId, agent_id, loadHistoryItem]);

    // Height calculation effect with 80vh addition
    useEffect(() => {
        const updateHeight = () => {
            if (containerRef?.current) {
                const containerHeight = containerRef.current.offsetHeight;
                if (containerHeight > 0) {
                    // Calculate 80vh in pixels
                    const viewportHeight = window.innerHeight;
                    const additionalHeight = viewportHeight * 0.69; // 80vh

                    // Add the container height + 330px + 80vh + extra padding for bottom cutoff
                    const totalHeight = containerHeight + 330 + additionalHeight + 40;
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

    const handleHistoryClick = (execution_id: string) => {
        if (!agent_id || !execution_id) return;

        setSelectedItem(execution_id);
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

    const formatDate = (dateString: string): string => {
        try {
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
            
            // Compare UTC timestamps (absolute time)
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
                // Display in IST timezone
                return date.toLocaleString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
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

    const formatTime = (dateString: string) => {
        try {
            if (!dateString || dateString.trim() === '') {
                return 'Unknown time';
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
            
            // Convert to IST (Indian Standard Time - Asia/Kolkata)
            return date.toLocaleTimeString('en-IN', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.error('Error formatting time:', error, 'Date string:', dateString);
            return 'Invalid time';
        }
    };

    const getDestinationName = (userInputs: VariableInput[]) => {
        const destinationInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('destination') ||
            input.variable.toLowerCase().includes('to') ||
            input.variable.toLowerCase().includes('city')
        );
        return destinationInput?.variable_value || 'Unknown Destination';
    };

    const getTravelDates = (userInputs: VariableInput[]) => {
        const startDateInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('start') ||
            input.variable.toLowerCase().includes('from') ||
            input.variable.toLowerCase().includes('begin')
        );
        const endDateInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('end') ||
            input.variable.toLowerCase().includes('to') ||
            input.variable.toLowerCase().includes('return')
        );

        if (startDateInput && endDateInput) {
            return `${startDateInput.variable_value} - ${endDateInput.variable_value}`;
        } else if (startDateInput) {
            return startDateInput.variable_value;
        } else if (endDateInput) {
            return endDateInput.variable_value;
        }
        return 'Dates not specified';
    };

    const getTravelDetails = (userInputs: VariableInput[]) => {
        const details = [];

        const adultsInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('adult') ||
            input.variable.toLowerCase().includes('people')
        );
        if (adultsInput) {
            details.push(`${adultsInput.variable_value} adult${parseInt(adultsInput.variable_value) > 1 ? 's' : ''}`);
        }

        const childrenInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('child')
        );
        if (childrenInput && childrenInput.variable_value !== '0') {
            details.push(`${childrenInput.variable_value} child${parseInt(childrenInput.variable_value) > 1 ? 'ren' : ''}`);
        }

        const budgetInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('budget')
        );
        if (budgetInput) {
            details.push(`${budgetInput.variable_value} budget`);
        }

        return details.join(' • ');
    };

    const getThreadSummary = (userInputs: VariableInput[]) => {
        const destination = getDestinationName(userInputs);
        const dates = getTravelDates(userInputs);
        const details = getTravelDetails(userInputs);

        return `${destination} • ${dates}${details ? ` • ${details}` : ''}`;
    };

    const getDisplayValue = (variable: string, value: string): DisplayValue => {
        const cleanVariable = variable.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return {
            variable: cleanVariable,
            value: value
        };
    };

    const getPrimaryDisplayField = (userInputs: VariableInput[]): DisplayField | null => {
        const destinationInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('destination') ||
            input.variable.toLowerCase().includes('to') ||
            input.variable.toLowerCase().includes('city')
        );
        
        if (destinationInput) {
            return {
                icon: MapPin,
                value: destinationInput.variable_value
            };
        }
        
        return null;
    };

    const getPrimaryFields = (userInputs: VariableInput[]): VariableInput[] => {
        const primaryFieldNames = ['from', 'start', 'begin', 'end', 'return', 'adults', 'budget'];
        return userInputs.filter(input =>
            primaryFieldNames.some(field => input.variable.toLowerCase().includes(field))
        ).slice(0, 3); // Limit to 3 primary fields
    };

    const getSecondaryFields = (userInputs: VariableInput[]): VariableInput[] => {
        const primaryFieldNames = ['destination', 'to', 'city', 'from', 'start', 'begin', 'end', 'return', 'adults', 'budget'];
        return userInputs.filter(input =>
            !primaryFieldNames.some(field => input.variable.toLowerCase().includes(field))
        );
    };

    return (
        <>
            <div
                ref={sidebarRef}
                className="w-72 bg-white border-l rounded-md border-gray-200 shadow-sm"
                style={{
                    height: maxHeight,
                    minHeight: '400px',
                    overflow: 'hidden'
                }}
            >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-indigo-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Travel History</h2>
                        <p className="text-xs text-gray-600">Previous itineraries & plans</p>
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
            <div className="flex-1 overflow-y-auto p-4 pb-6" style={{ height: 'calc(100% - 100px)', paddingBottom: '1.5rem' }}>
                {isLoading && <HistorySkeletonLoader />}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                        <div className="text-red-600 text-sm font-medium">{error}</div>
                    </div>
                )}

                {!agent_id && !isLoading && (
                    <div className="text-center py-8">
                        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <div className="text-gray-500 text-sm">No agent ID found in URL</div>
                    </div>
                )}

                {!isLoading && !error && agent_id && (
                    <div className="space-y-3">
                        {Object.keys(history).length === 0 ? (
                            <div className="text-center py-8">
                                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <div className="text-gray-500 text-sm">No travel history found</div>
                                <div className="text-gray-400 text-xs mt-1">Plan your first trip to get started</div>
                            </div>
                        ) : (
                            // Sort threads by their latest item's date (most recent first)
                            Object.entries(history)
                                .map(([threadId, items]) => {
                                    if (!Array.isArray(items) || items.length === 0) return null;

                                    // Sort items within thread by date (newest first)
                                    const sortedItems = [...items].sort((a, b) => {
                                        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                                        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                                        return dateB - dateA; // Descending order (newest first)
                                    });

                                    const latestItem = sortedItems[0]; // First item is the latest
                                    const latestDate = new Date(latestItem.updatedAt || latestItem.createdAt || 0).getTime();

                                    return {
                                        threadId,
                                        sortedItems,
                                        latestItem,
                                        latestDate
                                    };
                                })
                                .filter(item => item !== null)
                                .sort((a, b) => {
                                    // Sort threads by latest item date (most recent first)
                                    return (b?.latestDate || 0) - (a?.latestDate || 0);
                                })
                                .map(({ threadId, sortedItems, latestItem }) => {
                                const isExpanded = expandedThreads.has(threadId);
                                const hasMultipleVersions = sortedItems.length > 1;
                                const destination = getDestinationName(latestItem.user_inputs);
                                const dates = getTravelDates(latestItem.user_inputs);
                                const details = getTravelDetails(latestItem.user_inputs);
                                const resolvedSelectedId = selectedExecutionId ?? selectedItem ?? null;
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
                                                {/* Trip Header */}
                                                {primaryDisplayField && (
                                                    <div className="flex items-start gap-2 mb-2.5">
                                                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                                            <primaryDisplayField.icon className="w-4 h-4 text-white" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">
                                                                {primaryDisplayField.value}
                                                            </h3>
                                                            <p className="text-xs text-gray-500 mt-0.5">Travel Plan</p>
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
                                                            <MapPin className="w-3 h-3 text-indigo-600" />
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900">{destination}</span>
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

                                                {/* Primary Fields (From, Dates) */}
                                                <div className="space-y-1.5 mb-2.5">
                                                    {primaryFields.map((input, idx) => {
                                                        const { variable, value } = getDisplayValue(input.variable, input.variable_value)
                                                        return (
                                                            <div key={idx} className="flex justify-between items-center">
                                                                <span className="text-xs text-gray-500 font-medium">{variable}</span>
                                                                <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">
                                                                    {value || "N/A"}
                                                                </span>
                                                            </div>
                                                        )
                                                    })}

                                                    {/* Show +more if there are additional fields */}
                                                    {secondaryFields.length > 0 && (
                                                        <div className="text-xs text-gray-400">+{secondaryFields.length} more fields</div>
                                                    )}
                                                </div>

                                                {/* Trip Details */}
                                                <div className="space-y-2 mb-2.5">
                                                    <div className="text-xs text-gray-600">
                                                        {dates}
                                                    </div>
                                                    {details && (
                                                        <div className="text-xs text-gray-500">
                                                            {details}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Version Badge */}
                                                {hasMultipleVersions && (
                                                    <div className="mb-2.5">
                                                        <span className="bg-indigo-100 px-2 py-1 rounded text-xs text-indigo-700">
                                                            {sortedItems.length} version{sortedItems.length > 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Footer */}
                                                <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-100">
                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                    <span className="text-xs text-gray-500">{formatDate(latestItem.updatedAt || latestItem.createdAt || '')}</span>
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
                                                {sortedItems.slice(1).map((item, index) => {
                                                    const itemDestination = getDestinationName(item.user_inputs);
                                                    const itemDates = getTravelDates(item.user_inputs);
                                                    const itemDetails = getTravelDetails(item.user_inputs);
                                                    const resolvedSelectedId = selectedExecutionId ?? selectedItem ?? null;
                                                    const itemIsSelected = resolvedSelectedId === item.execution_id;
                                                    const versionNumber = index + 1; // Version 1 is the next most recent, Version 2 is next, etc.

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
                                                                        <MapPin className="w-3 h-3" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-xs font-semibold text-gray-800">
                                                                            Version {versionNumber}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                                                                            <MapPin className="w-3 h-3" />
                                                                            {itemDestination}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-xs text-gray-500 font-medium">
                                                                            {formatDate(item.updatedAt || item.createdAt || '')}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1.5 pl-8">
                                                                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                                        <Calendar className="w-3 h-3 text-indigo-500" />
                                                                        <span>{itemDates}</span>
                                                                    </div>
                                                                    {itemDetails && (
                                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                                            <Users className="w-3 h-3 text-green-500" />
                                                                            <span>{itemDetails}</span>
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

export default TravelPlannerHistory;