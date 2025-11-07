import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Type for the API error response structure
type ErrorDetail = {
    detail?: string;
    [key: string]: any;
};

type ErrorMessage = {
    message: string;
    code?: string;
    details?: ErrorDetail | string[] | string;
};

interface ErrorAlertProps {
    error: string | ErrorMessage | null;
    onDismiss?: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onDismiss }) => {
    if (!error) return null;

    // Parse the error if it's a string or convert to our error format
    const errorData: ErrorMessage = typeof error === 'string'
        ? { message: error }
        : error;

    // Function to extract user-friendly message from AWS error
    const parseAWSError = (detail: string) => {
        const usernameExistsMatch = detail.match(/UsernameExistsException.*User already exists/);
        if (usernameExistsMatch) {
            return "An account with this email already exists";
        }
        return detail;
    };

    // Function to process error details into displayable format
    const getErrorDetails = (details: ErrorDetail | string[] | string | undefined) => {
        if (!details) return [];

        if (typeof details === 'string') {
            return [details];
        }

        if (Array.isArray(details)) {
            return details;
        }

        if (details.detail) {
            return [parseAWSError(details.detail)];
        }

        return Object.values(details).filter(Boolean);
    };

    const getErrorTitle = (message: string) => {
        if (message.toLowerCase().includes('signup')) return 'Signup Failed';
        if (message.toLowerCase().includes('login')) return 'Login Failed';
        if (message.toLowerCase().includes('password')) return 'Password Reset Failed';
        return 'Error';
    };

    const errorDetails = getErrorDetails(errorData.details);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="mb-4"
            >
                <Alert variant="destructive" className="relative border-red-500">
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="absolute right-2 top-2 text-red-800 hover:text-red-900"
                        >
                            <XCircle className="h-5 w-5" />
                        </button>
                    )}
                    <AlertCircle className="h-4 w-4" />
                    {/* <AlertTitle className="ml-2 font-semibold">
                        {getErrorTitle(errorData.message)}
                    </AlertTitle> */}
                    <AlertDescription className="ml-2 mt-2">
                        <div className="text-sm text-red-700">
                            {errorData.message}
                            {errorDetails.length > 0 && (
                                <ul className="mt-2 space-y-1 list-disc list-inside">
                                    {errorDetails.map((detail, index) => (
                                        <li key={index} className="text-sm">
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </AlertDescription>
                </Alert>
            </motion.div>
        </AnimatePresence>
    );
};

export default ErrorAlert;
