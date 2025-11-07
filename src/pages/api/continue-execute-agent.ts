import type { NextApiRequest, NextApiResponse } from "next"
import formidable from "formidable"
import fs from "fs"
import FormData from "form-data"
import axios from "axios"

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

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== "POST") {
    return res.status(405).json({ status: false, error: "Method not allowed" })
  }

  try {
    const form = formidable({
      maxFileSize: 100 * 1024 * 1024,
      keepExtensions: true,
    })

    const [fields, files] = await form.parse(req)

    const agentId = Array.isArray(fields.agent_id) ? fields.agent_id[0] : fields.agent_id
    const apiParams = Array.isArray(fields.api_params) ? fields.api_params[0] : fields.api_params
    const accessToken = Array.isArray(fields.access_token) ? fields.access_token[0] : fields.access_token
    const threadId = Array.isArray(fields.thread_id) ? fields.thread_id[0] : fields.thread_id
    const executionId = Array.isArray(fields.execution_id) ? fields.execution_id[0] : fields.execution_id

    if (!agentId || !apiParams || !accessToken || !threadId || !executionId) {
      return res.status(400).json({
        status: false,
        error: "Missing required fields: agent_id, api_params, access_token, thread_id, or execution_id",
      })
    }

    let parsedApiParams
    try {
      parsedApiParams = JSON.parse(apiParams as string)
    } catch (error) {
      return res.status(400).json({ status: false, error: "Invalid JSON in api_params" })
    }

    const formData = new FormData()
    formData.append("agent_id", agentId as string)
    formData.append("thread_id", threadId as string)
    formData.append("execution_id", executionId as string)
    formData.append("api_params", JSON.stringify(parsedApiParams))

    // Forward any files if ever needed (kept for parity; not expected here)
    for (const [, fileArray] of Object.entries(files)) {
      const file = Array.isArray(fileArray) ? fileArray[0] : fileArray
      if (file && file.filepath && file.originalFilename) {
        const fileStream = fs.createReadStream(file.filepath)
        formData.append("files", fileStream, {
          filename: file.originalFilename,
          contentType: file.mimetype || "application/octet-stream",
        })
      }
    }

    const response = await axios.post(`${process.env.API_BASE_URL2}/agents/continue-execute-agent`, formData, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...formData.getHeaders(),
      },
      timeout: 300000,
    })

    // Cleanup temp files
    for (const [, fileArray] of Object.entries(files)) {
      const file = Array.isArray(fileArray) ? fileArray[0] : fileArray
      if (file && file.filepath) {
        try {
          fs.unlinkSync(file.filepath)
        } catch (error) {
          // ignore
        }
      }
    }

    return res.status(200).json({
      status: response.data.status || true,
      message: response.data.message,
      data: response.data.data,
      execution_id: response.data.execution_id,
      thread_id: response.data.thread_id,
    })
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500
      const message = error.response?.data?.message || error.response?.data?.error || error.message
      return res.status(status).json({ status: false, error: message })
    }
    return res.status(500).json({ status: false, error: "Internal server error" })
  }
}


