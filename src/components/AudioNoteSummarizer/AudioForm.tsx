import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import ContactPopup from "@/components/ContactPopup"
import { useCreditsCheck } from "@/hooks/use-credits-checks"
import { markErrorsAndScroll } from "@/utils/validationUX"
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import axios from "axios";
import DynamicFormSkeleton from "../Content/FormSkeletonLoader";
import { toast } from "@/hooks/use-toast";
import { useRating } from "../Content/RatingContext";
import Cookies from "js-cookie";
import { useRouter } from 'next/navigation';
import { CheckSquare, FileAudio, FileText, Hash, Heart, MessageSquare, Play, Settings, Tag, Target, Upload, Users, Volume2, X } from "lucide-react";

interface AgentInput {
    variable: string;
    datatype: string;
    variable_description: string;
    Required: boolean;
}

interface Agent {
    agent_Inputs: AgentInput[];
    agent_endpoint?: string;
    execution_credit?: string;
}

interface DynamicAgentFormProps {
    agentData: Agent;
    onResponse: (response: any) => void;
    Detailed_description?: string
}

const AudioForm = forwardRef(({ agentData, onResponse, Detailed_description }: DynamicAgentFormProps, ref) => {
    const agentInputs = Array.isArray(agentData?.agent_Inputs) ? agentData.agent_Inputs : [];
    const [formData, setFormData] = useState<{
        [key: string]: string | boolean | number;
    }>({});
    const [fileData, setFileData] = useState<{
        [key: string]: File | null;
    }>({});
    const [s3FileUrls, setS3FileUrls] = useState<{
        [key: string]: string | null;
    }>({});
    const [filePreviewUrls, setFilePreviewUrls] = useState<{
        [key: string]: string | null;
    }>({});
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [agent_id, setagent_id] = useState<string>("");
    const [lastApiResponse, setLastApiResponse] = useState<any>(null);
    const { setExecutionData } = useRating();
    const [showContactPopup, setShowContactPopup] = useState(false)
    const { checkCreditsBeforeExecution } = useCreditsCheck()
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);

    // Initialize all boolean inputs to false, except Structured_Output which is true
    useEffect(() => {
        const initialData: { [key: string]: string | boolean | number } = {
            Structured_Output: true // Always true
        };

        // Set all other boolean inputs to false by default
        agentInputs.forEach(input => {
            if (input.datatype === "bool" && input.variable !== "Structured_Output") {
                initialData[input.variable] = false;
            }
        });

        setFormData(initialData);
    }, [agentInputs]);

    const router = useRouter();

    // Helper function to determine if URL is audio
    const isAudioFile = (url: string) => {
        const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg'];
        return audioExtensions.some(ext => url.toLowerCase().includes(ext));
    };

    // Helper function to determine if URL is video
    const isVideoFile = (url: string) => {
        const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
        return videoExtensions.some(ext => url.toLowerCase().includes(ext));
    };

    // Helper function to determine if URL is image
    const isImageFile = (url: string) => {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'];
        return imageExtensions.some(ext => url.toLowerCase().includes(ext));
    };

    // Helper function to extract filename from S3 URL
    const getFileNameFromUrl = (url: string) => {
        try {
            const urlParts = url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            return decodeURIComponent(fileName);
        } catch (error) {
            return 'Unknown file';
        }
    };

    // Create preview URL for uploaded files
    const createFilePreviewUrl = (file: File) => {
        return URL.createObjectURL(file);
    };

    // Cleanup preview URLs to prevent memory leaks
    useEffect(() => {
        return () => {
            Object.values(filePreviewUrls).forEach(url => {
                if (url) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [filePreviewUrls]);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        loadHistoryData: (historyInputs: any, fileData?: any) => {
            if (!historyInputs) {
                return;
            }

            // Convert array format to object format if needed
            let inputsObject: { [key: string]: any } = {};

            if (Array.isArray(historyInputs)) {
                historyInputs.forEach(item => {
                    if (item.variable && item.variable_value !== undefined) {
                        inputsObject[item.variable] = item.variable_value;
                    }
                });
            } else if (typeof historyInputs === 'object') {
                inputsObject = historyInputs;
            } else {
                return;
            }

            // Extract thread_id if available
            if (inputsObject.thread_id) {
                setCurrentThreadId(inputsObject.thread_id);
            }

            // Handle signed URLs from file_data (updated structure)
            if (fileData && Array.isArray(fileData)) {
                const s3Urls: { [key: string]: string } = {};
                fileData.forEach((file: any) => {
                    if (file.signed_url || file.file_url) {
                        const fileUrl = file.signed_url || file.file_url;

                        // Extract filename from file_key
                        let fileName = '';
                        if (file.file_key) {
                            const parts = file.file_key.split('_');
                            if (parts.length >= 3) {
                                fileName = parts.slice(2).join('_');
                            }
                        } else if (file.file_name) {
                            fileName = file.file_name;
                        } else if (file.S3file_name) {
                            fileName = file.S3file_name;
                        }

                        // Try to match file to form variables
                        let matchedVariable = null;

                        // First try to find exact match
                        if (fileName) {
                            matchedVariable = agentInputs.find(input =>
                                input.datatype === "file" && input.variable === fileName.split('.')[0]
                            );
                        }

                        // If no exact match, try partial matching
                        if (!matchedVariable && fileName) {
                            matchedVariable = agentInputs.find(input =>
                                input.datatype === "file" && (
                                    fileName.toLowerCase().includes(input.variable.toLowerCase()) ||
                                    input.variable.toLowerCase().includes('file') ||
                                    input.variable.toLowerCase().includes('audio') ||
                                    input.variable.toLowerCase().includes('video') ||
                                    input.variable.toLowerCase().includes('image')
                                )
                            );
                        }

                        // If still no match, use the first file input
                        if (!matchedVariable) {
                            matchedVariable = agentInputs.find(input => input.datatype === "file");
                        }

                        if (matchedVariable) {
                            s3Urls[matchedVariable.variable] = fileUrl;
                        }
                    }
                });
                setS3FileUrls(s3Urls);
            } else {
                setS3FileUrls({});
            }

            // Create a new form data object starting fresh
            const newFormData: { [key: string]: string | boolean | number } = {
                Structured_Output: true // Always ensure this is true
            };

            // Process each agent input and try to find corresponding historical value
            agentInputs.forEach(input => {
                const { variable, datatype } = input;
                let historicalValue = inputsObject[variable];
                if (historicalValue !== undefined && historicalValue !== null) {
                    try {
                        switch (datatype) {
                            case "bool":
                                // Handle various boolean representations
                                if (typeof historicalValue === 'boolean') {
                                    newFormData[variable] = historicalValue;
                                } else if (typeof historicalValue === 'string') {
                                    newFormData[variable] = historicalValue.toLowerCase() === 'true';
                                } else {
                                    newFormData[variable] = Boolean(historicalValue);
                                }
                                break;

                            case "int":
                                // Handle integer conversion
                                if (typeof historicalValue === 'number') {
                                    newFormData[variable] = Math.floor(historicalValue);
                                } else {
                                    const parsed = parseInt(String(historicalValue));
                                    newFormData[variable] = isNaN(parsed) ? 0 : parsed;
                                }
                                break;

                            case "file":
                                // Skip file inputs as they can't be restored from history
                                break;

                            default:
                                // Handle string and other types
                                newFormData[variable] = String(historicalValue);
                                break;
                        }
                    } catch (error) {
                        // Set default value based on datatype
                        if (datatype === "bool") {
                            newFormData[variable] = false;
                        } else if (datatype === "int") {
                            newFormData[variable] = 0;
                        } else if (datatype !== "file") {
                            newFormData[variable] = "";
                        }
                    }
                } else {
                    // Set default values for missing historical data
                    if (datatype === "bool" && variable !== "Structured_Output") {
                        newFormData[variable] = false;
                    } else if (datatype === "int") {
                        newFormData[variable] = 0;
                    } else if (datatype !== "file") {
                        newFormData[variable] = "";
                    }
                }
            });
            // Update the form data state
            setFormData(newFormData);

            // Clear file data and preview URLs as files can't be restored
            setFileData({});
            // Clean up existing preview URLs
            Object.values(filePreviewUrls).forEach(url => {
                if (url) {
                    URL.revokeObjectURL(url);
                }
            });
            setFilePreviewUrls({});
        },

        forceUpdate: () => {
            setFormData(prev => ({ ...prev }));
        },

        clearForm: () => {
            // Reset to initial state with all booleans false except Structured_Output
            const resetData: { [key: string]: string | boolean | number } = {
                Structured_Output: true
            };

            // Set all other boolean inputs to false
            agentInputs.forEach(input => {
                if (input.datatype === "bool" && input.variable !== "Structured_Output") {
                    resetData[input.variable] = false;
                }
            });

            setFormData(resetData);
            setFileData({});
            setS3FileUrls({});
            // Clean up preview URLs
            Object.values(filePreviewUrls).forEach(url => {
                if (url) {
                    URL.revokeObjectURL(url);
                }
            });
            setFilePreviewUrls({});
            setCurrentThreadId(null);
        },
        // Add method to update the last API response data
        updateLastApiResponse: (updatedData: any) => {
            setLastApiResponse(updatedData);
        },
        // Add method to get the last API response data
        getLastApiResponse: () => {
            return lastApiResponse;
        },

        createNew: () => {
            // Reset form data to initial state
            const resetData: { [key: string]: string | boolean | number } = {
                Structured_Output: true
            };

            // Set all other boolean inputs to false
            agentInputs.forEach(input => {
                if (input.datatype === "bool" && input.variable !== "Structured_Output") {
                    resetData[input.variable] = false;
                }
            });

            setFormData(resetData);
            setFileData({});
            setS3FileUrls({});
            // Clean up preview URLs
            Object.values(filePreviewUrls).forEach(url => {
                if (url) {
                    URL.revokeObjectURL(url);
                }
            });
            setFilePreviewUrls({});
            setCurrentThreadId(null);
            
            // Reset the parent component's response state
            onResponse(null);
        },
    }))

    // Extract agent token from URL path
    useEffect(() => {
        const path = window.location.pathname;
        const token = path.split('/').pop() || "";
        setagent_id(token);
    }, []);

    const handleInputChange = (variable: string, value: string | boolean | number) => {
        setFormData((prev) => ({
            ...prev,
            [variable]: typeof value === "number" ? Math.max(0, value) : value,
        }));
    };

    const removeHistoricalFile = (variable: string) => {
        setS3FileUrls((prev) => {
            if (!prev[variable]) return prev;
            const updated = { ...prev };
            delete updated[variable];
            return updated;
        });
    };

    const handleFileChange = (variable: string, file: File | null) => {
        if (file) {
            removeHistoricalFile(variable);
        }

        setFileData((prev) => ({
            ...prev,
            [variable]: file
        }));

        // Create preview URL for the file
        if (file) {
            const previewUrl = createFilePreviewUrl(file);
            setFilePreviewUrls(prev => {
                // Clean up previous URL if it exists
                if (prev[variable]) {
                    URL.revokeObjectURL(prev[variable]!);
                }
                return {
                    ...prev,
                    [variable]: previewUrl
                };
            });
        } else {
            // Clean up preview URL if file is removed
            setFilePreviewUrls(prev => {
                if (prev[variable]) {
                    URL.revokeObjectURL(prev[variable]!);
                }
                const newState = { ...prev };
                delete newState[variable];
                return newState;
            });
        }
    };

    const handleClearAll = () => {
        // Reset to initial state with all booleans false except Structured_Output
        const resetData: { [key: string]: string | boolean | number } = {
            Structured_Output: true
        };

        // Set all other boolean inputs to false
        agentInputs.forEach(input => {
            if (input.datatype === "bool" && input.variable !== "Structured_Output") {
                resetData[input.variable] = false;
            }
        });

        setFormData(resetData);
        setFileData({});
        setS3FileUrls({});
        // Clean up preview URLs
        Object.values(filePreviewUrls).forEach(url => {
            if (url) {
                URL.revokeObjectURL(url);
            }
        });
        setFilePreviewUrls({});
        setCurrentThreadId(null);
    };

    const getAcceptedFileTypes = (variable: string) => {
        // Define accepted file types based on common use cases
        const fileTypeMap: { [key: string]: string } = {
            'audio': 'audio/*,.mp3,.wav,.m4a,.aac,.ogg',
            'video': 'video/*,.mp4,.avi,.mov,.wmv,.flv',
            'image': 'image/*,.jpg,.jpeg,.png,.gif,.bmp,.svg',
            'document': '.pdf,.doc,.docx,.txt,.rtf',
            'spreadsheet': '.xls,.xlsx,.csv',
            'archive': '.zip,.rar,.7z,.tar,.gz'
        };

        // Check if variable name contains hints about file type
        const varLower = variable.toLowerCase();
        if (varLower.includes('audio') || varLower.includes('sound')) {
            return fileTypeMap.audio;
        } else if (varLower.includes('video')) {
            return fileTypeMap.video;
        } else if (varLower.includes('image') || varLower.includes('photo')) {
            return fileTypeMap.image;
        } else if (varLower.includes('document') || varLower.includes('doc')) {
            return fileTypeMap.document;
        } else if (varLower.includes('csv') || varLower.includes('excel')) {
            return fileTypeMap.spreadsheet;
        }

        // Default to all common file types
        return '*';
    };

    const handleCreateNew = () => {
        // Reset form data to initial state
        const resetData: { [key: string]: string | boolean | number } = {
            Structured_Output: true
        };

        // Set all other boolean inputs to false
        agentData.agent_Inputs.forEach(input => {
            if (input.datatype === "bool" && input.variable !== "Structured_Output") {
                resetData[input.variable] = false;
            }
        });

        setFormData(resetData);
        setFileData({});
        setS3FileUrls({});
        // Clean up preview URLs
        Object.values(filePreviewUrls).forEach(url => {
            if (url) {
                URL.revokeObjectURL(url);
            }
        });
        setFilePreviewUrls({});
        setCurrentThreadId(null);
        
        // Reset the parent component's response state
        onResponse(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const hasCredits = await checkCreditsBeforeExecution()
        if (!hasCredits) {
            setShowContactPopup(true)
            return
        }
        
        const requiredInputs = agentInputs.filter(
            (input) => input.Required && input.variable !== "Structured_Output"
        );

        const missingRequiredFields = requiredInputs.filter((input) => {
            if (input.datatype === "file") {
                return !fileData[input.variable] && !s3FileUrls[input.variable];
            }

            const value = formData[input.variable];
            return (
                value === undefined ||
                value === "" ||
                (input.datatype === "int" && typeof value !== "number")
            );
        });

        if (missingRequiredFields.length > 0) {
            const keys = missingRequiredFields.map((f) => f.variable as string)
            markErrorsAndScroll(keys)
            toast({
                title: "Validation Error",
                description: `Please fill in all required fields: ${missingRequiredFields.map((f) => f.variable).join(", ")}`,
                variant: "destructive",
                duration: 3000
            });
            return;
        }

        try {
            setLoading(true);
            onResponse({ loading: true });

            // Get access token from cookies
            const accessToken = Cookies.get('access_token');
            if (!accessToken) {
                toast({
                    title: "Authentication Error",
                    description: "Access token not found. Please log in again.",
                    variant: "destructive",
                    duration: 3000
                });
                handleTokenExpiration();
                setLoading(false);
                return;
            }

            // Prepare form data for the server-side API
            const formDataToSend = new FormData();

            // Add agent_id (extracted from URL)
            formDataToSend.append('agent_id', agent_id);
            formDataToSend.append('access_token', accessToken);

            // Add thread_id if we have one from history
            if (currentThreadId) {
                formDataToSend.append('thread_id', currentThreadId);
            }

            // Prepare api_params - ensure Structured_Output is always true
            const apiParams = {
                ...formData,
                Structured_Output: true
            };

            // Convert api_params to array format exactly like in the curl example
            const apiParamsArray = [apiParams];
            formDataToSend.append('api_params', JSON.stringify(apiParamsArray));

            // Add files to form data
            Object.entries(fileData).forEach(([variable, file]) => {
                if (file) {
                    formDataToSend.append(variable, file);
                }
            });

            try {
                // Make the API call to our server-side endpoint
                const { data } = await axios.post('/api/execute-agent', formDataToSend, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    timeout: 300000, // 5 minutes timeout
                });

                // Check if the response is successful
                if (data.status) {
                    // Store the API response for future reference
                    setLastApiResponse(data.data);

                    // Update thread_id if returned from API
                    if (data.thread_id) {
                        setCurrentThreadId(data.thread_id);
                    }

                    // Set execution data in context
                    setExecutionData({
                        agent_id,
                        executionToken: data.execution_id,
                        response: data.data
                    });

                    // Send response to parent component
                    onResponse({
                        data: data.data,
                        execution_id: data.execution_id,
                        agent_id: agent_id,
                        message: data.message,
                        status: data.status
                    });

                    toast({
                        title: "Success",
                        description: data.message || "Agent executed successfully!",
                        duration: 3000
                    });
                } else {
                    throw new Error(data.error || "Failed to execute agent");
                }

            } catch (axiosError) {
                if (axios.isAxiosError(axiosError)) {
                    // Check if this is a token expiration error (401 Unauthorized)
                    if (axiosError.response?.status === 401) {
                        handleTokenExpiration();
                        return;
                    }

                    // Handle other axios errors
                    const errorMessage = axiosError.response?.data?.error ||
                        axiosError.response?.data?.message ||
                        axiosError.message;

                    toast({
                        title: "Request Error",
                        description: errorMessage,
                        variant: "destructive",
                        duration: 3000
                    });

                    onResponse({
                        error: errorMessage,
                        status: axiosError.response?.status
                    });
                } else {
                    throw axiosError;
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";

            onResponse({
                error: errorMessage
            });

            toast({
                title: "Error",
                description: "Failed to execute agent. Please try again.",
                variant: "destructive",
                duration: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    // Token expiration handler using next/navigation
    const handleTokenExpiration = () => {
        // Clear the token from cookies
        Cookies.remove('access_token', { path: '/' });

        // Show toast message
        toast({
            title: "Session Expired",
            description: "Your session has expired. Please login again to continue.",
            variant: "destructive",
            duration: 5000
        });

        // Use the App Router's navigation
        router.push('/auth');
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getAnalysisIcon = (variable: string) => {
        const iconMap: Record<string, React.ComponentType<any>> = {
            Summary: FileText,
            Speaker_Identification: Users,
            Entity_Detection: Tag,
            Decisions: Target,
            Keyword_Frequency: Hash,
            Sentiment_Analysis: Heart,
            Key_Topics: MessageSquare,
            Action_Items: CheckSquare,
            Structured_Output: Settings
        };

        return iconMap[variable] || Settings;
    };

    return (
        <div className="w-full mx-auto p-4 sm:p-4 bg-white max-w-4xl">
            <div className="space-y-6 sm:space-y-8">
                {historyLoading ? (
                    <DynamicFormSkeleton />
                ) : (
                    <>
                        {/* File Upload Section */}
                        {agentInputs.filter(input => input.datatype === "file").length > 0 && (
                            <div className="space-y-4 sm:space-y-6">
                                <div className="flex items-start sm:items-center justify-between mb-4">
                                    <div className="flex gap-2 sm:gap-3">
                                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <Play className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="max-w-4xl">
                                                <h2 className="text-base sm:text-base font-bold text-gray-900">Audio Note Summarizer</h2>
                                                <div className="text-xs sm:text-xs text-gray-600 leading-relaxed">
                                                    <p className="transition-all duration-200">
                                                        {Detailed_description || "Quickly summarize your audio notes with AI assistance"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                </div>

                                {agentInputs
                                    .filter(input => input.datatype === "file")
                                    .map((input, index) => {
                                        const formattedLabel = input.variable
                                            .split("_")
                                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                            .join(" ");
                                        const selectedFile = fileData[input.variable];
                                        const s3Url = s3FileUrls[input.variable];
                                        const previewUrl = filePreviewUrls[input.variable];

                                        return (
                                            <div key={`file-${input.variable}-${index}`} className="space-y-3 sm:space-y-4">
                                                <Label htmlFor={`file-${input.variable}`} className="text-sm font-medium text-gray-700 block">
                                                    {formattedLabel} {input.Required && <span className="text-red-500">*</span>}
                                                </Label>

                                                {/* Enhanced Upload Area - Only show if no new file is selected */}
                                                {!selectedFile && (
                                                    <div className="relative">
                                                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-5 text-center hover:border-blue-400 transition-colors duration-200 bg-gray-50 hover:bg-blue-50">
                                                            <input
                                                                id={`file-${input.variable}`}
                                                                type="file"
                                                                accept={getAcceptedFileTypes(input.variable)}
                                                                required={input.Required && !s3Url}
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0] || null;
                                                                    handleFileChange(input.variable, file);
                                                                }}
                                                            />
                                                            <div className="space-y-3 sm:space-y-4">
                                                                <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                                                    <FileAudio className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                                                                </div>
                                                                <div className="px-2">
                                                                    <p className="text-sm sm:text-base font-medium text-gray-900 leading-tight">Drop your audio file here or click to browse</p>
                                                                    <p className="text-xs text-gray-500 mt-1 sm:mt-2">Supports MP3, WAV, M4A, FLAC and other audio formats up to 100MB</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Show uploaded file info with option to change */}
                                                {selectedFile && (
                                                    <div className="space-y-3 sm:space-y-4">
                                                        <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                                                    <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                                                                        <FileAudio className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                                                                        <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                                    <div className="text-green-600">
                                                                        <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setFileData(prev => ({ ...prev, [input.variable]: null }));
                                                                            setFilePreviewUrls(prev => ({ ...prev, [input.variable]: null }));
                                                                            // Reset file input
                                                                            const fileInput = document.getElementById(`file-${input.variable}`) as HTMLInputElement;
                                                                            if (fileInput) fileInput.value = '';
                                                                        }}
                                                                        className="text-xs text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200 px-2 py-1 rounded transition-colors duration-200 whitespace-nowrap"
                                                                    >
                                                                        Change
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Audio/Video/Image Previews */}
                                                {selectedFile && previewUrl && isAudioFile(selectedFile.name) && (
                                                    <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                                                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                                                            <Volume2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                                            <span className="text-xs sm:text-sm font-medium text-green-800">Audio Preview</span>
                                                        </div>
                                                        <audio
                                                            controls
                                                            preload="metadata"
                                                            className="w-full h-8 sm:h-10 rounded-lg"
                                                        >
                                                            <source src={previewUrl} type={selectedFile.type} />
                                                            Your browser does not support the audio element.
                                                        </audio>
                                                    </div>
                                                )}

                                                {selectedFile && previewUrl && isVideoFile(selectedFile.name) && (
                                                    <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                                                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                                                            <Play className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                                            <span className="text-xs sm:text-sm font-medium text-green-800">Video Preview</span>
                                                        </div>
                                                        <video
                                                            controls
                                                            preload="metadata"
                                                            className="w-full max-h-40 sm:max-h-48 rounded-lg"
                                                        >
                                                            <source src={previewUrl} type={selectedFile.type} />
                                                            Your browser does not support the video element.
                                                        </video>
                                                    </div>
                                                )}

                                                {selectedFile && previewUrl && isImageFile(selectedFile.name) && (
                                                    <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                                                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                                                            <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                                            <span className="text-xs sm:text-sm font-medium text-green-800">Image Preview</span>
                                                        </div>
                                                        <img
                                                            src={previewUrl}
                                                            alt="Uploaded file preview"
                                                            className="w-full max-h-40 sm:max-h-48 object-contain rounded-lg border"
                                                        />
                                                    </div>
                                                )}

                                                {/* Historical S3 File Display */}
                                                {s3Url && (
                                                    <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                                                        <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <FileAudio className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                                                                <span className="text-xs sm:text-sm font-medium text-blue-800">Previous File</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="text-gray-500 hover:text-red-600 transition-colors duration-200"
                                                                onClick={() => {
                                                                    removeHistoricalFile(input.variable);
                                                                    const fileInput = document.getElementById(`file-${input.variable}`) as HTMLInputElement;
                                                                    if (fileInput) {
                                                                        fileInput.value = '';
                                                                    }
                                                                }}
                                                                aria-label="Remove previous file"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>

                                                        {isAudioFile(s3Url) && (
                                                            <audio controls preload="metadata" className="w-full h-8 sm:h-10 rounded-lg">
                                                                <source src={s3Url} type="audio/mpeg" />
                                                                <source src={s3Url} type="audio/wav" />
                                                                <source src={s3Url} type="audio/mp4" />
                                                                Your browser does not support the audio element.
                                                            </audio>
                                                        )}

                                                        {isVideoFile(s3Url) && (
                                                            <video controls preload="metadata" className="w-full max-h-40 sm:max-h-48 rounded-lg">
                                                                <source src={s3Url} type="video/mp4" />
                                                                <source src={s3Url} type="video/webm" />
                                                                <source src={s3Url} type="video/ogg" />
                                                                Your browser does not support the video element.
                                                            </video>
                                                        )}

                                                        {isImageFile(s3Url) && (
                                                            <img
                                                                src={s3Url}
                                                                alt="Historical file"
                                                                className="w-full max-h-40 sm:max-h-48 object-contain rounded-lg border"
                                                            />
                                                        )}

                                                        {!isAudioFile(s3Url) && !isVideoFile(s3Url) && !isImageFile(s3Url) && (
                                                            <a
                                                                href={s3Url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-2 text-xs sm:text-sm text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors duration-200"
                                                            >
                                                                <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                                                                View/Download File
                                                            </a>
                                                        )}
                                                    </div>
                                                )}

                                                <p className="text-xs text-gray-500 leading-relaxed">{input.variable_description}</p>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}

                        {/* Personalized Inputs Section */}
                        <div className="space-y-4 sm:space-y-6">
                            <div className="flex items-start sm:items-center gap-3 mb-4 sm:mb-6">
                                <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                                    <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">Personalized Inputs</h3>
                                    <p className="text-xs sm:text-xs text-gray-600 mt-1">Select the insights you want to extract from your audio</p>
                                </div>
                            </div>

                            {/* Analysis Options Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                {agentInputs
                                    .filter(input => input.datatype === "bool" && input.variable !== "Structured_Output")
                                    .map((input, index) => {
                                        const formattedLabel = input.variable
                                            .split("_")
                                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                            .join(" ");

                                        const IconComponent = getAnalysisIcon(input.variable);
                                        const isEnabled = Boolean(formData[input.variable]);

                                        return (
                                            <div
                                                key={`switch-${input.variable}-${index}`}
                                                className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${isEnabled
                                                    ? 'border-blue-200 bg-blue-50 shadow-sm'
                                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                onClick={() => handleInputChange(input.variable, !isEnabled)}
                                            >
                                                <div className="flex items-start gap-2 sm:gap-3">
                                                    <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${isEnabled ? 'bg-blue-100' : 'bg-gray-100'
                                                        }`}>
                                                        <IconComponent className={`w-3 h-3 sm:w-4 sm:h-4 ${isEnabled ? 'text-blue-600' : 'text-gray-500'
                                                            }`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1 sm:mb-2 gap-2">
                                                            <Label
                                                                htmlFor={`switch-${input.variable}`}
                                                                className={`text-xs sm:text-sm font-semibold cursor-pointer leading-tight ${isEnabled ? 'text-gray-800' : 'text-gray-800'
                                                                    }`}
                                                            >
                                                                {formattedLabel}
                                                                {input.Required && <span className="text-red-500 ml-1">*</span>}
                                                            </Label>
                                                            <Switch
                                                                id={`switch-${input.variable}`}
                                                                checked={isEnabled}
                                                                onCheckedChange={(checked) => handleInputChange(input.variable, checked)}
                                                                className="flex-shrink-0 data-[state=checked]:bg-blue-600 scale-75 sm:scale-100"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                        <p className={`text-xs leading-relaxed ${isEnabled ? 'text-gray-500' : 'text-gray-500'
                                                            }`}>
                                                            {input.variable_description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200">
                            <Button
                                onClick={handleSubmit}
                                className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 sm:px-6 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-sm sm:text-base">Processing...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        <Play className="w-4 h-4" />
                                        <span className="text-sm sm:text-base">Execute Analysis</span>
                                    </div>
                                )}
                            </Button>
                            <Button
                                onClick={handleClearAll}
                                className="w-full sm:w-auto bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 sm:px-6 rounded-lg font-medium transition-colors duration-200"
                            >
                                <span className="text-sm sm:text-base">Clear All Fields</span>
                            </Button>
                        </div>
                    </>
                )}
            </div>
            <ContactPopup isOpen={showContactPopup} onClose={() => setShowContactPopup(false)} trigger="credits" />
        </div>
    );
});

AudioForm.displayName = "DynamicAgentForm";

export default AudioForm
