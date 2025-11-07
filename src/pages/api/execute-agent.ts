import type { NextApiRequest, NextApiResponse } from "next"
import formidable from "formidable"
import fs from "fs"
import FormData from "form-data"
import axios from "axios"
import path from "path"

// Disable body parser for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
}

interface ApiResponse {
    status: boolean
    message?: string
    data?: any
    execution_id?: string
    error?: string
    thread_id?: string
}

// Helper function to extract filename without extension
const getFileNameWithoutExtension = (filename: string): string => {
    return path.parse(filename).name
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
    if (req.method !== "POST") {
        return res.status(405).json({
            status: false,
            error: "Method not allowed",
        })
    }

    try {
        // Parse the multipart form data
        const form = formidable({
            maxFileSize: 100 * 1024 * 1024, // 100MB
            keepExtensions: true,
        })

        const [fields, files] = await form.parse(req)

        // Debug logging
        console.log("=== BACKEND FILE PROCESSING DEBUG ===")
        console.log("Fields received:", Object.keys(fields))
        console.log("Files received:", Object.keys(files))
        
        // Log file details
        for (const [fieldName, fileArray] of Object.entries(files)) {
            const filesInField = Array.isArray(fileArray) ? fileArray : [fileArray]
            console.log(`Field "${fieldName}" contains ${filesInField.length} file(s):`)
            filesInField.forEach((file, index) => {
                if (file) {
                    console.log(`  File ${index + 1}:`, {
                        filename: file.originalFilename,
                        size: file.size,
                        mimetype: file.mimetype
                    })
                }
            })
        }

        // Extract required fields
        const agentId = Array.isArray(fields.agent_id) ? fields.agent_id[0] : fields.agent_id
        const apiParams = Array.isArray(fields.api_params) ? fields.api_params[0] : fields.api_params
        const accessToken = Array.isArray(fields.access_token) ? fields.access_token[0] : fields.access_token
        const threadId = Array.isArray(fields.thread_id) ? fields.thread_id[0] : fields.thread_id

        if (!agentId || !apiParams || !accessToken) {
            return res.status(400).json({
                status: false,
                error: "Missing required fields: agent_id, api_params, or access_token",
            })
        }

        // Parse API params
        let parsedApiParams
        try {
            parsedApiParams = JSON.parse(apiParams)
        } catch (error) {
            return res.status(400).json({
                status: false,
                error: "Invalid JSON in api_params",
            })
        }

        // Create FormData for the external API call
        const formData = new FormData()
        formData.append("agent_id", agentId)

        // Add thread_id if provided to maintain conversation thread
        if (threadId) {
            formData.append("thread_id", threadId)
        }

        // FIXED: Process ALL files, not just the first one from each field
        let totalFilesProcessed = 0
        for (const [fieldName, fileArray] of Object.entries(files)) {
            // Handle both single files and arrays of files
            const filesInField = Array.isArray(fileArray) ? fileArray : [fileArray]
            
            console.log(`Processing ${filesInField.length} file(s) from field "${fieldName}"`)
            
            for (const file of filesInField) {
                if (file && file.filepath && file.originalFilename) {
                    console.log(`Adding file to FormData: ${file.originalFilename} (${file.size} bytes)`)
                    
                    // Add file to form data
                    const fileStream = fs.createReadStream(file.filepath)
                    formData.append("files", fileStream, {
                        filename: file.originalFilename,
                        contentType: file.mimetype || "application/octet-stream",
                    })
                    
                    totalFilesProcessed++
                } else {
                    console.warn("Invalid file object:", file)
                }
            }
        }

        console.log(`Total files processed and added to FormData: ${totalFilesProcessed}`)

        // Add API params
        formData.append("api_params", JSON.stringify(parsedApiParams))

        console.log("Making API call to external service...")
        console.log("API URL:", `${process.env.API_BASE_URL2}/agents/execute-agent`)

        // Make the API call to the external service
        const response = await axios.post(`${process.env.API_BASE_URL2}/agents/execute-agent`, formData, {
            headers: {
                accept: "application/json",
                Authorization: `Bearer ${accessToken}`,
                ...formData.getHeaders(),
            },
            timeout: 300000, // 5 minutes timeout
        })

        console.log("External API response status:", response.status)
        console.log("External API response data:", response.data)

        // Clean up temporary files
        let cleanedUpFiles = 0
        for (const [, fileArray] of Object.entries(files)) {
            const filesInField = Array.isArray(fileArray) ? fileArray : [fileArray]
            for (const file of filesInField) {
                if (file && file.filepath) {
                    try {
                        fs.unlinkSync(file.filepath)
                        cleanedUpFiles++
                    } catch (error) {
                        console.error("Error cleaning up file:", error)
                    }
                }
            }
        }
        console.log(`Cleaned up ${cleanedUpFiles} temporary files`)

        // Return the response from the external API
        return res.status(200).json({
            status: response.data.status || true,
            message: response.data.message,
            data: response.data.data,
            execution_id: response.data.execution_id,
            thread_id: response.data.thread_id,
        })
    } catch (error) {
        console.error("=== API HANDLER ERROR ===")
        console.error("Error details:", error)

        // Clean up any temporary files in case of error
        try {
            const form = formidable()
            const [, files] = await form.parse(req)
            for (const [, fileArray] of Object.entries(files)) {
                const filesInField = Array.isArray(fileArray) ? fileArray : [fileArray]
                for (const file of filesInField) {
                    if (file && file.filepath) {
                        fs.unlinkSync(file.filepath)
                    }
                }
            }
        } catch (cleanupError) {
            console.error("Error during cleanup:", cleanupError)
        }

        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500
            const message =
                error.response?.data?.message || error.response?.data?.error || error.message || "External API error"

            console.error("Axios error details:", {
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
                requestConfig: {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers,
                }
            })

            return res.status(status).json({
                status: false,
                error: message,
            })
        }

        return res.status(500).json({
            status: false,
            error: "Internal server error",
        })
    }
}