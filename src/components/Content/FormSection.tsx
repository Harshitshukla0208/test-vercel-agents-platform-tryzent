import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import axios from "axios";
import DynamicFormSkeleton from "./FormSkeletonLoader";
import { toast } from "@/hooks/use-toast";
import { useRating } from "./RatingContext";
import Cookies from "js-cookie";
import { useRouter } from 'next/navigation';
import { markErrorsAndScroll } from "@/utils/validationUX";

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
}

const DynamicAgentForm = forwardRef(({ agentData, onResponse }: DynamicAgentFormProps, ref) => {
    // Safely default agent inputs to an empty array
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
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const { setExecutionData } = useRating();

    // Initialize all boolean inputs to false, except structured_output which is true
    useEffect(() => {
        const initialData: { [key: string]: string | boolean | number } = {
            structured_output: true // Always true
        };

        // Set all other boolean inputs to false by default
        agentInputs.forEach(input => {
            if (input.datatype === "bool" && input.variable !== "structured_output") {
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
                structured_output: true // Always ensure this is true
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
                    if (datatype === "bool" && variable !== "structured_output") {
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
            // Reset to initial state with all booleans false except structured_output
            const resetData: { [key: string]: string | boolean | number } = {
                structured_output: true
            };

            // Set all other boolean inputs to false
            agentInputs.forEach(input => {
                if (input.datatype === "bool" && input.variable !== "structured_output") {
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

        createNew: () => {
            // Reset to initial state with all booleans false except structured_output
            const resetData: { [key: string]: string | boolean | number } = {
                structured_output: true
            };

            // Set all other boolean inputs to false
            agentInputs.forEach(input => {
                if (input.datatype === "bool" && input.variable !== "structured_output") {
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
        // Add method to update the last API response data
        updateLastApiResponse: (updatedData: any) => {
            setLastApiResponse(updatedData);
        },
        // Add method to get the last API response data
        getLastApiResponse: () => {
            return lastApiResponse;
        }
    }));

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

    const handleFileChange = (variable: string, file: File | null) => {
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
        // Reset to initial state with all booleans false except structured_output
        const resetData: { [key: string]: string | boolean | number } = {
            structured_output: true
        };

        // Set all other boolean inputs to false
        agentData.agent_Inputs.forEach(input => {
            if (input.datatype === "bool" && input.variable !== "structured_output") {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const requiredInputs = agentInputs.filter(
            (input) => input.Required && input.variable !== "structured_output"
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

            // Prepare api_params - ensure structured_output is always true
            const apiParams = {
                ...formData,
                structured_output: true
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

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {historyLoading ? (
                <DynamicFormSkeleton />
            ) : (
                <>
                    {/* Separate switches and other inputs */}
                    <div className="space-y-4">
                        {/* Regular inputs in a grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {agentInputs
                                .filter(input => input.datatype !== "bool" && input.datatype !== "file" && input.variable !== "structured_output")
                                .map((input, index) => {
                                    const formattedLabel = input.variable
                                        .split("_")
                                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                        .join(" ");
                                    return (
                                        <div key={`input-${input.variable}-${index}`} className="space-y-1">
                                            <Label htmlFor={`input-${input.variable}`} className="block text-[10px] font-medium text-gray-600">
                                                {formattedLabel} {input.Required && <span className="text-red-500">*</span>}
                                            </Label>
                                            <Input
                                                id={`input-${input.variable}`}
                                                type={input.datatype === "int" ? "number" : "text"}
                                                placeholder={input.variable_description}
                                                required={input.Required}
                                                className="h-8 text-[10px] border-gray-300 focus:border-[#7c3aed] focus:ring-[#7c3aed]"
                                                value={
                                                    formData[input.variable] === undefined || formData[input.variable] === null
                                                        ? ""
                                                        : String(formData[input.variable])
                                                }
                                                onChange={(e) =>
                                                    handleInputChange(
                                                        input.variable,
                                                        input.datatype === "int"
                                                            ? e.target.value === ""
                                                                ? ""
                                                                : parseInt(e.target.value)
                                                            : e.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                    );
                                })}
                        </div>

                        {/* File inputs */}
                        {agentInputs.filter(input => input.datatype === "file").length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-gray-700">File Uploads</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                            const hasHistoricalFile = Boolean(s3Url);

                                            return (
                                                <div key={`file-${input.variable}-${index}`} className="space-y-2">
                                                    <Label htmlFor={`file-${input.variable}`} className="block text-[10px] font-medium text-gray-600">
                                                        {formattedLabel} {input.Required && <span className="text-red-500">*</span>}
                                                    </Label>
                                                    <div className="border border-gray-300 rounded-md p-2 bg-gray-50">
                                                        {/* Show file input only if no historical S3 file exists */}
                                                        {!hasHistoricalFile && (
                                                            <>
                                                                <Input
                                                                    id={`file-${input.variable}`}
                                                                    type="file"
                                                                    accept={getAcceptedFileTypes(input.variable)}
                                                                    required={input.Required && !s3Url}
                                                                    className="h-8 text-[10px] border-0 bg-transparent p-0 file:mr-2 file:h-6 file:rounded file:border-0 file:bg-[#7c3aed] file:px-2 file:text-[10px] file:text-white hover:file:bg-[#6d28d9]"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0] || null;
                                                                        handleFileChange(input.variable, file);
                                                                    }}
                                                                />
                                                                {selectedFile && (
                                                                    <div className="mt-1 text-[9px] text-gray-500">
                                                                        <span className="font-medium">{selectedFile.name}</span>
                                                                        <span className="ml-2">({formatFileSize(selectedFile.size)})</span>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* Audio player for uploaded files */}
                                                        {selectedFile && previewUrl && isAudioFile(selectedFile.name) && (
                                                            <div className="mt-2 p-2 bg-green-50 rounded border">
                                                                <div className="text-[9px] text-green-600 mb-1 font-medium">Uploaded audio file:</div>
                                                                <div className="text-[8px] text-gray-500 mb-2">{selectedFile.name}</div>
                                                                <audio
                                                                    controls
                                                                    preload="metadata"
                                                                    className="w-full h-8 rounded"
                                                                    style={{ maxWidth: '100%' }}
                                                                >
                                                                    <source src={previewUrl} type={selectedFile.type} />
                                                                    Your browser does not support the audio element.
                                                                </audio>
                                                            </div>
                                                        )}

                                                        {/* Video player for uploaded files */}
                                                        {selectedFile && previewUrl && isVideoFile(selectedFile.name) && (
                                                            <div className="mt-2 p-2 bg-green-50 rounded border">
                                                                <div className="text-[9px] text-green-600 mb-1 font-medium">Uploaded video file:</div>
                                                                <div className="text-[8px] text-gray-500 mb-2">{selectedFile.name}</div>
                                                                <video
                                                                    controls
                                                                    preload="metadata"
                                                                    className="w-full max-h-32 rounded"
                                                                    style={{ maxWidth: '100%' }}
                                                                >
                                                                    <source src={previewUrl} type={selectedFile.type} />
                                                                    Your browser does not support the video element.
                                                                </video>
                                                            </div>
                                                        )}

                                                        {/* Image preview for uploaded files */}
                                                        {selectedFile && previewUrl && isImageFile(selectedFile.name) && (
                                                            <div className="mt-2 p-2 bg-green-50 rounded border">
                                                                <div className="text-[9px] text-green-600 mb-1 font-medium">Uploaded image file:</div>
                                                                <div className="text-[8px] text-gray-500 mb-2">{selectedFile.name}</div>
                                                                <img
                                                                    src={previewUrl}
                                                                    alt="Uploaded file preview"
                                                                    className="w-full max-h-32 object-contain rounded border"
                                                                    style={{ maxWidth: '100%' }}
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Historical S3 File Display */}
                                                        {s3Url && (
                                                            <div className="mt-2 p-2 bg-blue-50 rounded border">
                                                                <div className="text-[9px] text-blue-600 mb-1 font-medium">Previous file:</div>
                                                                {/* <div className="text-[8px] text-gray-500 mb-2">{getFileNameFromUrl(s3Url)}</div> */}

                                                                {isAudioFile(s3Url) && (
                                                                    <div className="space-y-1">
                                                                        <audio
                                                                            controls
                                                                            preload="metadata"
                                                                            className="w-full h-8 rounded"
                                                                            style={{ maxWidth: '100%' }}
                                                                        >
                                                                            <source src={s3Url} type="audio/mpeg" />
                                                                            <source src={s3Url} type="audio/wav" />
                                                                            <source src={s3Url} type="audio/mp4" />
                                                                            Your browser does not support the audio element.
                                                                        </audio>
                                                                    </div>
                                                                )}

                                                                {isVideoFile(s3Url) && (
                                                                    <div className="space-y-1">
                                                                        <video
                                                                            controls
                                                                            preload="metadata"
                                                                            className="w-full max-h-32 rounded"
                                                                            style={{ maxWidth: '100%' }}
                                                                        >
                                                                            <source src={s3Url} type="video/mp4" />
                                                                            <source src={s3Url} type="video/webm" />
                                                                            <source src={s3Url} type="video/ogg" />
                                                                            Your browser does not support the video element.
                                                                        </video>
                                                                    </div>
                                                                )}

                                                                {isImageFile(s3Url) && (
                                                                    <div className="space-y-1">
                                                                        <img
                                                                            src={s3Url}
                                                                            alt="Historical file"
                                                                            className="w-full max-h-32 object-contain rounded border"
                                                                            style={{ maxWidth: '100%' }}
                                                                        />
                                                                    </div>
                                                                )}

                                                                {!isAudioFile(s3Url) && !isVideoFile(s3Url) && !isImageFile(s3Url) && (
                                                                    <a
                                                                        href={s3Url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-block text-[9px] text-blue-600 hover:underline bg-blue-100 px-2 py-1 rounded"
                                                                    >
                                                                        📎 View/Download File
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="mt-1 text-[9px] text-gray-400">
                                                            {input.variable_description}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        {/* Switches */}
                        <div className="flex flex-wrap gap-4">
                            {agentInputs
                                .filter(input => input.datatype === "bool" && input.variable !== "structured_output")
                                .map((input, index) => {
                                    const formattedLabel = input.variable
                                        .split("_")
                                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                        .join(" ");
                                    return (
                                        <div key={`switch-${input.variable}-${index}`} className="flex items-center gap-2">
                                            <Switch
                                                id={`switch-${input.variable}`}
                                                checked={Boolean(formData[input.variable])}
                                                onCheckedChange={(checked) => handleInputChange(input.variable, checked)}
                                                className="scale-90"
                                            />
                                            <Label
                                                htmlFor={`switch-${input.variable}`}
                                                className="text-[10px] font-medium text-gray-600"
                                            >
                                                {formattedLabel} {input.Required && <span className="text-red-500">*</span>}
                                            </Label>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                    <div className="flex justify-between">
                        <Button
                            type="submit"
                            className="h-8 px-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs"
                            disabled={loading}
                        >
                            {loading ? "Executing..." : "Execute Agent"}
                        </Button>
                        <Button
                            type="button"
                            className="h-8 px-2 bg-gray-400 hover:bg-gray-500 text-white text-xs"
                            onClick={handleClearAll}
                        >
                            Clear all fields
                        </Button>
                    </div>
                </>
            )}
        </form>
    );
});

DynamicAgentForm.displayName = "DynamicAgentForm";

export default DynamicAgentForm