'use client';

import React, { useEffect, useState, useRef } from 'react';
import { RefreshCcw, Clock, Shield, Heart, ChevronDown, Plus, User, DollarSign, Users, Building2 } from 'lucide-react';
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

interface HistorySidebarProps {
    onHistoryItemClick: (executionToken: string, agent_id: string) => void;
    containerRef?: React.RefObject<HTMLDivElement | null>;
    formSectionRef?: React.RefObject<HTMLDivElement | null>;
    refreshTrigger?: number;
    onCreateNew?: () => void;
}

interface DisplayValue {
    variable: string;
    value: string;
}

interface DisplayField {
    icon: React.ComponentType<any>;
    value: string;
}

const HealthInsuranceHistory: React.FC<HistorySidebarProps> = ({
    onHistoryItemClick,
    containerRef,
    formSectionRef,
    refreshTrigger,
    onCreateNew,
}) => {
    const [history, setHistory] = useState<ThreadGroup>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
    const [maxHeight, setMaxHeight] = useState<string>('110vh');
    const sidebarRef = useRef<HTMLDivElement>(null);
    const shouldAutoSelectRef = useRef<boolean>(false);
    const expandedContentRef = useRef<HTMLDivElement>(null);

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
                setSelectedItem((mostRecentItem as any).execution_id);
            }
            // Reset the flag
            shouldAutoSelectRef.current = false;
        }
    }, [history]);

    // Dynamic height calculation effect
    useEffect(() => {
        const updateHeight = () => {
            let totalHeight = 0;
            let hasContent = false;

            // Get form section height
            if (formSectionRef?.current) {
                const formHeight = formSectionRef.current.offsetHeight;
                if (formHeight > 0) {
                    totalHeight += formHeight;
                    hasContent = true;
                }
            }

            // Get response section height (if visible)
            if (containerRef?.current) {
                const responseHeight = containerRef.current.offsetHeight;
                if (responseHeight > 0) {
                    totalHeight += responseHeight;
                    hasContent = true;
                }
            }

            if (hasContent) {
                // Add more padding to ensure content isn't cut off and ensure minimum height
                const viewportHeight = window.innerHeight;
                const minHeight = viewportHeight * 0.6; // 60vh minimum
                const finalHeight = Math.max(totalHeight + 150, minHeight); // Add 150px padding for better spacing
                setMaxHeight(`${finalHeight}px`);
            } else {
                // Fallback to viewport-based height
                const viewportHeight = window.innerHeight;
                const defaultHeight = viewportHeight * 0.8; // 80vh as fallback
                setMaxHeight(`${defaultHeight}px`);
            }
        };

        updateHeight();

        const handleResize = () => updateHeight();
        window.addEventListener('resize', handleResize);

        // Create observers for both form and response sections
        let formObserver: MutationObserver | null = null;
        let responseObserver: MutationObserver | null = null;

        if (formSectionRef?.current) {
            formObserver = new MutationObserver(updateHeight);
            formObserver.observe(formSectionRef.current, {
                attributes: true,
                childList: true,
                subtree: true
            });
        }

        if (containerRef?.current) {
            responseObserver = new MutationObserver(updateHeight);
            responseObserver.observe(containerRef.current, {
                attributes: true,
                childList: true,
                subtree: true
            });
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            formObserver?.disconnect();
            responseObserver?.disconnect();
        };
    }, [containerRef, formSectionRef]);

    const handleHistoryClick = (execution_id: string) => {
        if (!agent_id || !execution_id) return;

        setSelectedItem(execution_id);
        onHistoryItemClick(execution_id, agent_id);
    };

    const toggleThreadExpansion = (threadId: string) => {
        const newExpanded = new Set(expandedThreads);
        const wasExpanded = newExpanded.has(threadId);
        
        if (wasExpanded) {
            newExpanded.delete(threadId);
        } else {
            newExpanded.add(threadId);
        }
        setExpandedThreads(newExpanded);

        // Auto-scroll to expanded content after a short delay to allow DOM update
        if (!wasExpanded) {
            setTimeout(() => {
                if (expandedContentRef.current) {
                    expandedContentRef.current.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest'
                    });
                }
            }, 100);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    const formatTime = (dateString: string) => {
        try {
            if (!dateString || dateString.trim() === '') {
                return 'Unknown time';
            }
            const date = new Date(dateString);
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return 'Invalid time';
        }
    };

    const getLocationName = (userInputs: VariableInput[]) => {
        const countryInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('country')
        );
        const cityInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('city')
        );
        
        if (cityInput && countryInput) {
            return `${cityInput.variable_value}, ${countryInput.variable_value}`;
        } else if (cityInput) {
            return cityInput.variable_value;
        } else if (countryInput) {
            return countryInput.variable_value;
        }
        return 'Unknown Location';
    };

    const getProfileDetails = (userInputs: VariableInput[]) => {
        const details = [];

        const ageInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('age')
        );
        const genderInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('gender')
        );
        
        if (ageInput && genderInput) {
            details.push(`${ageInput.variable_value}yr ${genderInput.variable_value}`);
        } else if (ageInput) {
            details.push(`${ageInput.variable_value} years old`);
        }

        const familySizeInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('family_size')
        );
        if (familySizeInput && familySizeInput.variable_value !== '1') {
            details.push(`Family of ${familySizeInput.variable_value}`);
        }

        return details.join(' • ');
    };

    const getCoverageDetails = (userInputs: VariableInput[]) => {
        const details = [];

        const coverageTypeInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('coverage_type')
        );
        if (coverageTypeInput) {
            details.push(`${coverageTypeInput.variable_value} plan`);
        }

        const budgetInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('budget_monthly')
        );
        if (budgetInput) {
            details.push(`$${budgetInput.variable_value}/month`);
        }

        const networkInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('network_type')
        );
        if (networkInput) {
            details.push(networkInput.variable_value);
        }

        return details.join(' • ');
    };

    const getDisplayValue = (variable: string, value: string): DisplayValue => {
        const cleanVariable = variable.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return {
            variable: cleanVariable,
            value: value
        };
    };

    const getPrimaryDisplayField = (userInputs: VariableInput[]): DisplayField | null => {
        const coverageTypeInput = userInputs.find(input =>
            input.variable.toLowerCase().includes('coverage_type')
        );
        
        if (coverageTypeInput) {
            return {
                icon: Shield,
                value: `${coverageTypeInput.variable_value.charAt(0).toUpperCase() + coverageTypeInput.variable_value.slice(1)} Health Plan`
            };
        }
        
        // Fallback to location
        const location = getLocationName(userInputs);
        return {
            icon: Building2,
            value: `Health Insurance - ${location}`
        };
    };

    const getPrimaryFields = (userInputs: VariableInput[]): VariableInput[] => {
        const primaryFieldNames = ['age', 'gender', 'family_size', 'budget_monthly', 'coverage_amount', 'employment_status'];
        return userInputs.filter(input =>
            primaryFieldNames.some(field => input.variable.toLowerCase().includes(field))
        ).slice(0, 3); // Limit to 3 primary fields
    };

    const getSecondaryFields = (userInputs: VariableInput[]): VariableInput[] => {
        const primaryFieldNames = ['coverage_type', 'age', 'gender', 'family_size', 'budget_monthly', 'coverage_amount', 'employment_status'];
        return userInputs.filter(input =>
            !primaryFieldNames.some(field => input.variable.toLowerCase().includes(field))
        );
    };

    return (
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
            <div className="pt-6 px-4 pb-4 border-b border-gray-100 bg-white-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Insurance History</h2>
                        <p className="text-xs text-gray-600">Previous quotes & applications</p>
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
            <div className="flex-1 overflow-y-auto p-4 pb-6" style={{ height: 'calc(100% - 120px)' }}>
                {isLoading && <HistorySkeletonLoader />}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                        <div className="text-red-600 text-sm font-medium">{error}</div>
                    </div>
                )}

                {!agent_id && !isLoading && (
                    <div className="text-center py-8">
                        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <div className="text-gray-500 text-sm">No agent ID found in URL</div>
                    </div>
                )}

                {!isLoading && !error && agent_id && (
                    <div className="space-y-3">
                        {Object.keys(history).length === 0 ? (
                            <div className="text-center py-8">
                                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <div className="text-gray-500 text-sm">No insurance history found</div>
                                <div className="text-gray-400 text-xs mt-1">Get your first quote to get started</div>
                            </div>
                        ) : (
                            Object.entries(history).map(([threadId, items]) => {
                                if (!Array.isArray(items) || items.length === 0) return null;

                                const latestItem = items[items.length - 1]; // Last item is the latest
                                const isExpanded = expandedThreads.has(threadId);
                                const hasMultipleVersions = items.length > 1;
                                const location = getLocationName(latestItem.user_inputs);
                                const profileDetails = getProfileDetails(latestItem.user_inputs);
                                const coverageDetails = getCoverageDetails(latestItem.user_inputs);
                                const isSelected = selectedItem === latestItem.execution_id;
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
                                                {/* Insurance Header */}
                                                {primaryDisplayField && (
                                                    <div className="flex items-start gap-2 mb-2.5">
                                                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                                            <primaryDisplayField.icon className="w-4 h-4 text-white" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">
                                                                {primaryDisplayField.value}
                                                            </h3>
                                                            <p className="text-xs text-gray-500 mt-0.5">{location}</p>
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

                                                {/* Primary Fields (Profile Details) */}
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

                                                {/* Profile & Coverage Details */}
                                                <div className="space-y-2 mb-2.5">
                                                    {profileDetails && (
                                                        <div className="text-xs text-gray-600 flex items-center gap-1">
                                                            <User className="w-3 h-3 text-indigo-500" />
                                                            {profileDetails}
                                                        </div>
                                                    )}
                                                    {coverageDetails && (
                                                        <div className="text-xs text-gray-600 flex items-center gap-1">
                                                            <Shield className="w-3 h-3 text-green-500" />
                                                            {coverageDetails}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Version Badge */}
                                                {hasMultipleVersions && (
                                                    <div className="mb-2.5">
                                                        <span className="bg-indigo-100 px-2 py-1 rounded text-xs text-indigo-700">
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
                                            <div ref={expandedContentRef} className="ml-4 space-y-2 border-l-2 border-indigo-200 pl-3 mb-4">
                                                {items.slice(0, -1).reverse().map((item, index) => {
                                                    const itemLocation = getLocationName(item.user_inputs);
                                                    const itemProfile = getProfileDetails(item.user_inputs);
                                                    const itemCoverage = getCoverageDetails(item.user_inputs);
                                                    const itemIsSelected = selectedItem === item.execution_id;
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
                                                            <div className="p-3 pb-4">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                                                        <Shield className="w-3 h-3" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-xs font-semibold text-gray-800">
                                                                            Version {versionNumber}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                                                                            <Building2 className="w-3 h-3" />
                                                                            {itemLocation}
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
                                                                    {itemProfile && (
                                                                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                                            <User className="w-3 h-3 text-indigo-500" />
                                                                            <span>{itemProfile}</span>
                                                                        </div>
                                                                    )}
                                                                    {itemCoverage && (
                                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                                            <DollarSign className="w-3 h-3 text-green-500" />
                                                                            <span>{itemCoverage}</span>
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
    );
};

export default HealthInsuranceHistory;