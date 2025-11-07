"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Head from "next/head"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Home, FileText, Download, ExternalLink, AlertCircle } from "lucide-react"
import Link from "next/link"
import LogoImage from "@/assets/logo.jpeg"
import FormattedResumeScorerResponse from "@/components/ResumeScorer/ResumeScorerResponse"

interface FileData {
  file_key: string
  signed_url: string
  expires_at: number
}

interface SharedResumeScorerData {
  uuid: string
  createdAt: string
  userId: string
  agent_id: string
  execution_id: string
  user_inputs: Array<{
    variable: string
    variable_value: string
  }>
  file_data: FileData[]
  agent_outputs: any
  response_rating: number | null
  response_feedback: string | null
  filename: string | null
  updatedAt: string
}

interface SharedResumeScorerDataResponse {
  status: boolean
  message: string
  data?: SharedResumeScorerData
  error?: string
}

const SharedResumeScorer: React.FC = () => {
  const params = useParams()
  const uuid = params?.uuid as string
  const [sharedData, setSharedData] = useState<SharedResumeScorerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (uuid) {
      fetchSharedData(uuid)
    }
    // eslint-disable-next-line
  }, [uuid])

  const fetchSharedData = async (shareUuid: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/get-shared-data/${shareUuid}`)
      const data: SharedResumeScorerDataResponse = await response.json()
      if (data.status && data.data) {
        setSharedData(data.data)
      } else {
        setError(data.message || "Failed to load shared resume analysis")
      }
    } catch (err) {
      setError("Failed to load shared resume analysis. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatUserInputs = (inputs: Array<{ variable: string; variable_value: string }>) => {
    const formatted: { [key: string]: any } = {}
    inputs.forEach((input) => {
      let value: string | boolean | number = input.variable_value
      if (value === "True") value = true
      if (value === "False") value = false
      if (!isNaN(Number(value)) && value !== "") {
        value = Number(value)
      }
      formatted[input.variable] = value
    })
    return formatted
  }

  const getFileExtension = (fileKey: string): string => {
    const extension = fileKey.split('.').pop()?.toLowerCase()
    return extension || 'file'
  }

  const getFileIcon = (fileKey: string) => {
    const extension = getFileExtension(fileKey)
    switch (extension) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-blue-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  const getFileName = (fileKey: string): string => {
    const parts = fileKey.split('/')
    const filename = parts[parts.length - 1]
    const cleanName = filename.replace(/^_[a-f0-9]+_/, '')
    return cleanName || fileKey
  }

  const handleFileDownload = (fileData: FileData) => {
    try {
      const link = document.createElement('a')
      link.href = fileData.signed_url
      link.download = getFileName(fileData.file_key)
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      window.open(fileData.signed_url, '_blank')
    }
  }

  const isFileExpired = (expiresAt: number): boolean => {
    return Date.now() / 1000 > expiresAt
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading Shared Resume Analysis...</h2>
          <p className="text-sm text-gray-600">Please wait while we fetch the content</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Content Not Found</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Link href="/">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!sharedData) {
    return null
  }

  const userInputs = formatUserInputs(sharedData.user_inputs)

  return (
    <>
      <Head>
        <title>{`Shared Resume Analysis - AgentHub`}</title>
        <meta name="description" content={`View this resume analysis created with AgentHub`} />
        <meta property="og:title" content={`Shared Resume Analysis - AgentHub`} />
        <meta property="og:description" content={`View this resume analysis created with AgentHub`} />
        <meta property="og:type" content="website" />
      </Head>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src={LogoImage || "/placeholder.svg"} alt="logo" className="h-8 w-8 rounded-md" />
                <div className="flex flex-col">
                  <Link href='/'>
                    <span className="text-lg font-bold text-gray-900">AgentHub</span>
                  </Link>
                  <span className="text-xs text-gray-500">
                    by{" "}
                    <a
                      href="https://tryzent.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                    >
                      Tryzent
                    </a>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/?scrollTo=agents">
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4">
                    <Home className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Create Your Own</span>
                    <span className="sm:hidden">Create</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>
        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-4">
          {/* Uploaded Files */}
          {sharedData.file_data && sharedData.file_data.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" /> Uploaded Files ({sharedData.file_data.length})
              </h3>
              <div className="space-y-3">
                {sharedData.file_data.map((fileData, index) => {
                  const fileName = getFileName(fileData.file_key)
                  const extension = getFileExtension(fileData.file_key)
                  const isExpired = isFileExpired(fileData.expires_at)
                  const expiryDate = new Date(fileData.expires_at * 1000)
                  return (
                    <div
                      key={index}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-2 sm:gap-0 ${
                        isExpired ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">{getFileIcon(fileData.file_key)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate overflow-x-auto block max-w-full" style={{wordBreak: 'break-all'}}>
                            {fileName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="uppercase">{extension}</span>
                            <span>•</span>
                            {isExpired ? (
                              <span className="text-red-600 font-medium">Link expired</span>
                            ) : (
                              <span>Expires: {expiryDate.toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row flex-wrap gap-2 mt-2 sm:mt-0">
                        {!isExpired && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(fileData.signed_url, '_blank')}
                              className="h-8 w-auto px-3 text-xs"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" /> View
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleFileDownload(fileData)}
                              className="h-8 w-auto px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                            >
                              <Download className="w-4 h-4 mr-1" /> Download
                            </Button>
                          </>
                        )}
                        {isExpired && (
                          <span className="text-xs text-red-600 font-medium px-2 py-1 bg-red-100 rounded">Expired</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {sharedData.file_data.some(file => isFileExpired(file.expires_at)) && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-800">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Some file links have expired. Signed URLs are temporary and expire after a certain period for security reasons.
                  </p>
                </div>
              )}
            </div>
          )}
          {/* Resume Scorer Output */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4">
              <FormattedResumeScorerResponse
                response={{ data: sharedData.agent_outputs ? sharedData.agent_outputs : [], loading: false }}
                agent_id={sharedData.agent_id}
                executionToken={sharedData.execution_id}
                historicalRating={sharedData.response_rating}
                historicalFeedback={sharedData.response_feedback}
                fileData={sharedData.file_data}
                isHistoricalView={true}
                isSharePage={true}
              />
            </div>
          </div>
          {/* Footer CTA */}
          <div className="mt-6 sm:mt-8 text-center">
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                Want Your Own Resume Analysis?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Score and analyze resumes against job descriptions with AI-powered insights.
              </p>
              <Link href="/?scrollTo=agents">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <FileText className="w-4 h-4 mr-2" /> Score My Resume
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default SharedResumeScorer
