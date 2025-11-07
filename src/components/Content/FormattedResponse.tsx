import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { cloneDeep } from 'lodash';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import LessonPlanLoader from '@/components/Content/Loader';
import { toast } from '@/hooks/use-toast';
import RatingFeedback from './RatingFeedback';
import HistoricalRatingFeedback from './HistoricalRatingFeedback';
import { ClipboardPenLine, Pen } from 'lucide-react';
import Cookies from "js-cookie";

interface FormattedResponseProps {
    response: {
        loading?: boolean;
        error?: string;
        data?: any;
    };
    onSave?: (data: any) => void;
    agent_id?: string;
    executionToken?: string;
    accessToken?: string;
    formRef?: React.RefObject<any>;
    historicalRating?: number | null;
    historicalFeedback?: string | null;
    isHistoricalView?: boolean;
}

const FormattedResponse: React.FC<FormattedResponseProps> = ({
    response,
    onSave,
    agent_id,
    executionToken,
    formRef,
    historicalRating = null,
    historicalFeedback = null,
    isHistoricalView = false
}) => {
    const [editableData, setEditableData] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [rating, setRating] = useState<number>(0);
    const [feedback, setFeedback] = useState<string>("");
    const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);

    const accessToken = Cookies.get('access_token');

    // Initialize historical data if provided
    useEffect(() => {
        if (historicalRating !== null) {
            setRating(historicalRating);
        }

        if (historicalFeedback !== null) {
            setFeedback(historicalFeedback);
        }
    }, [historicalRating, historicalFeedback]);

    // Sync editableData with response.data
    useEffect(() => {
        if (!isEditing) {
            // Handle nested data structure - if response.data has a 'data' property, use that
            const dataToSet = response.data?.data || response.data;
            setEditableData(dataToSet);
            setHasUnsavedEdits(false);
        }
    }, [response.data, isEditing]);

    const renderMarkdown = (content: string) => (
        <ReactMarkdown
            className="prose prose-sm max-w-none"
            components={{
                h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-2">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-4 text-sm">{children}</ul>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                p: ({ children }) => <p className="text-sm leading-relaxed mb-3">{children}</p>,
            }}
        >
            {content}
        </ReactMarkdown>
    );

    const renderEditableValue = (value: any, path: string[] = [], level: number = 0): React.ReactNode => {
        const updateNestedValue = (newValue: any) => {
            setEditableData((prevData: any) => {
                const newData = cloneDeep(prevData);
                let current = newData;
                for (let i = 0; i < path.length - 1; i++) {
                    current = current[path[i]];
                }
                current[path[path.length - 1]] = newValue;
                return newData;
            });
            setHasUnsavedEdits(true);
        };

        if (value === null) return <span className="text-sm text-gray-400">null</span>;

        if (typeof value === 'boolean') {
            return (
                <select
                    value={value.toString()}
                    onChange={(e) => updateNestedValue(e.target.value === 'true')}
                    className="text-sm text-purple-600 font-medium w-full p-1 border rounded"
                >
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>
            );
        }

        if (typeof value === 'number') {
            return (
                <Input
                    type="number"
                    value={value}
                    onChange={(e) => updateNestedValue(Number(e.target.value))}
                    className="text-sm text-blue-600 font-medium"
                />
            );
        }

        if (typeof value === 'string') {
            if (value.includes('###') || value.includes('**') || value.includes('\n')) {
                return isEditing ? (
                    <Textarea
                        value={value}
                        onChange={(e) => updateNestedValue(e.target.value)}
                        className="w-full p-2 border rounded text-sm"
                        rows={4}
                    />
                ) : (
                    <div className="bg-gray-50 rounded p-3 my-1">{renderMarkdown(value)}</div>
                );
            }
            return isEditing ? (
                <Input
                    value={value}
                    onChange={(e) => updateNestedValue(e.target.value)}
                    className="text-sm w-full p-1 border rounded"
                />
            ) : (
                <div className="text-sm break-words whitespace-pre-wrap">{value}</div>
            );
        }

        if (Array.isArray(value)) {
            return (
                <div className="space-y-3 mt-1">
                    {value.map((item, index) => (
                        <div key={index} className="bg-white">
                            {renderEditableValue(item, [...path, index.toString()], level + 1)}
                        </div>
                    ))}
                </div>
            );
        }

        if (typeof value === 'object') {
            return (
                <div className="space-y-3 mt-1">
                    {Object.entries(value).map(([key, val]) => {
                        if (val === undefined || val === null) return null;

                        // Format key for display
                        const formattedKey = key.replace(/_/g, ' ');

                        // Determine if this is a top-level section
                        const isTopLevel = level === 0;

                        return (
                            <div key={key} className={`overflow-hidden ${isTopLevel ? 'border-b pb-2' : ''}`}>
                                <div className={`px-3 py-2 ${isTopLevel ? 'bg-gray-100 rounded-t' : 'bg-gray-50'}`}>
                                    <h3 className={`${isTopLevel ? 'text-base font-semibold' : 'text-sm font-medium'} text-gray-700`}>
                                        {formattedKey}
                                    </h3>
                                </div>
                                <div className="px-3 py-2">
                                    {renderEditableValue(val, [...path, key], level + 1)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        return <span className="text-sm">{String(value)}</span>;
    };

    const handleEdit = async () => {
        try {
            if (!isEditing) {
                // Handle nested data structure for editing
                const dataToEdit = response.data?.data || response.data;
                setEditableData(cloneDeep(dataToEdit));
                setIsEditing(true);
            } else {
                // Validation check
                if (!agent_id || !executionToken || !accessToken) {
                    const missingParams = [];
                    if (!agent_id) missingParams.push('agent_id');
                    if (!executionToken) missingParams.push('executionToken');
                    if (!accessToken) missingParams.push('accessToken');
                    
                    toast({
                        title: "Error",
                        description: `Missing required parameters: ${missingParams.join(', ')}`,
                        variant: "destructive",
                        duration: 5000
                    });
                    return;
                }

                if (!editableData) {
                    toast({
                        title: "Error",
                        description: "No data available to save.",
                        variant: "destructive",
                        duration: 3000
                    });
                    return;
                }

                setIsSaving(true);

                try {
                    // Prepare the request body - wrap editableData in an array
                    const requestBody = {
                        agent_id: agent_id,
                        execution_id: executionToken,
                        response: Array.isArray(editableData) ? editableData : [editableData]
                    };

                    console.log('Sending request body:', JSON.stringify(requestBody, null, 2));

                    // Use the Next.js API route instead of direct external API call
                    const apiResponse = await fetch('/api/update-response', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    });

                    if (!apiResponse.ok) {
                        const errorData = await apiResponse.json();
                        throw new Error(errorData.error || `HTTP error! status: ${apiResponse.status}`);
                    }

                    const result = await apiResponse.json();

                    // Update form reference if available
                    if (formRef?.current?.updateLastApiResponse) {
                        try {
                            formRef.current.updateLastApiResponse(editableData);
                        } catch (formError) {
                            console.warn('Error updating form reference:', formError);
                        }
                    }

                    // Call onSave callback if provided
                    if (onSave) {
                        try {
                            onSave(editableData);
                        } catch (saveError) {
                            console.warn('Error in onSave callback:', saveError);
                        }
                    }

                    setIsEditing(false);
                    setHasUnsavedEdits(false);

                    toast({
                        title: "Success",
                        description: "Agent response updated successfully.",
                        duration: 3000
                    });
                } catch (apiError) {
                    console.error('API Error in save operation:', apiError);
                    toast({
                        title: "Error",
                        description: apiError instanceof Error ? apiError.message : "Failed to save changes. Please try again.",
                        variant: "destructive",
                        duration: 3000
                    });
                } finally {
                    setIsSaving(false);
                }
            }
        } catch (error) {
            console.error('Unexpected error in handleEdit:', error);
            setIsSaving(false);
            toast({
                title: "Error",
                description: "An unexpected error occurred. Please try again.",
                variant: "destructive",
                duration: 3000
            });
        }
    };

    const handleCancel = () => {
        // Handle nested data structure for cancel
        const dataToReset = response.data?.data || response.data;
        setEditableData(dataToReset);
        setIsEditing(false);
        setHasUnsavedEdits(false);
    };

    if (response.loading) {
        return <LessonPlanLoader />;
    }

    if (response.error) {
        return <div className="w-full p-4 text-red-600 bg-red-50 rounded-lg">{response.error}</div>;
    }

    return (
        <div className="w-full max-w-7xl">
            <div className="bg-white border rounded-lg shadow-md overflow-hidden">
                <div className="p-4 flex justify-between items-center border-b bg-white">
                    <div className="flex items-center gap-2">
                        <ClipboardPenLine className="text-gray-600" size={18} />
                        <h2 className="text-lg font-semibold text-gray-800">Response</h2>
                    </div>
                    <div className="flex gap-2">
                        {isEditing && (
                            <Button
                                onClick={handleCancel}
                                variant="outline"
                                disabled={isSaving}
                                className="flex items-center gap-1"
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            onClick={handleEdit}
                            variant={isEditing ? "default" : "outline"}
                            disabled={isSaving}
                            className="flex items-center gap-1"
                        >
                            <Pen className={isEditing ? "text-white" : "text-gray-600"} size={14} />
                            {isSaving ? 'Saving...' : isEditing ? 'Save' : 'Edit'}
                        </Button>
                    </div>
                </div>
                <div className="p-4 bg-white">
                    {/* Handle nested data structure for display */}
                    {renderEditableValue(isEditing ? editableData : (response.data?.data || response.data))}
                </div>
            </div>

            {/* Ratings and Feedback Section with spacing */}
            <div className="mt-4 shadow-md rounded-lg">
                {isHistoricalView ? (
                    <HistoricalRatingFeedback
                        key={`historical-feedback-${executionToken}`}
                        agent_id={agent_id || ''}
                        executionToken={executionToken || ''}
                        initialRating={rating}
                        initialFeedback={feedback}
                        agentOutputs={response.data?.data || response.data}
                        onUpdate={(updatedRating, updatedFeedback) => {
                            setRating(updatedRating);
                            setFeedback(updatedFeedback);
                        }}
                        isDisabled={isEditing || hasUnsavedEdits}
                    />
                ) : (
                    <RatingFeedback
                        key={`feedback-${executionToken}`}
                        agent_id={agent_id || ''}
                        executionToken={executionToken || ''}
                        response={editableData}
                        onUpdate={(updatedRating, updatedFeedback) => {
                            setRating(updatedRating);
                            setFeedback(updatedFeedback);
                        }}
                        isDisabled={isEditing || hasUnsavedEdits}
                    />
                )}
            </div>
        </div>
    );
};

export default FormattedResponse;
