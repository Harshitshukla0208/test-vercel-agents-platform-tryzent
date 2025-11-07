"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Copy, Check, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface ShareButtonProps {
    agentId: string
    executionToken: string
    className?: string
    agentName?:string
}

const ShareButton: React.FC<ShareButtonProps> = ({ agentId, agentName, executionToken, className = "" }) => {
    const [isGenerating, setIsGenerating] = useState(false)
    const [shareUrl, setShareUrl] = useState<string | null>(null)
    const [isCopied, setIsCopied] = useState(false)

    // Clipboard helper that works in Safari and insecure contexts
    const writeTextSafe = async (text: string) => {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text)
            return
        }
        const textArea = document.createElement("textarea")
        textArea.value = text
        textArea.style.position = "fixed"
        textArea.style.top = "0"
        textArea.style.left = "0"
        textArea.style.opacity = "0"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const successful = document.execCommand("copy")
        document.body.removeChild(textArea)
        if (!successful) {
            throw new Error("Clipboard copy not permitted")
        }
    }

    // Reset internal state whenever the executionToken changes
    useEffect(() => {
        setShareUrl(null)
        setIsCopied(false)
        setIsGenerating(false)
    }, [executionToken])


    const generateShareableLink = async () => {
        // Windows-like behavior: always generate then copy, in one click
        if (!agentId || !executionToken) {
            toast({
                title: "Error",
                description: "Missing required information to generate share link",
                variant: "destructive",
                duration: 3000,
            })
            return
        }

        setIsGenerating(true)

        try {
            const response = await fetch(`/api/generate-shareable-link?agent_id=${agentId}&execution_id=${executionToken}`)
            const data = await response.json()

            if (data.status && data.data?.uuid) {
                // Get current domain dynamically
                const currentDomain = window.location.origin
                const generatedShareUrl = `${currentDomain}/share/${agentName}/${data.data.uuid}`

                setShareUrl(generatedShareUrl)

                // Immediately try to copy; may be blocked on some Safari setups if not prefetched
                try {
                    await writeTextSafe(generatedShareUrl)
                    setIsCopied(true)
                    toast({
                        title: "Share Link Generated!",
                        description: "Link copied to clipboard. Share it with anyone!",
                        duration: 4000,
                    })
                    setTimeout(() => setIsCopied(false), 3000)
                } catch {
                    // Silent fallback: show Copy Link UI without warning toast
                }
            } else {
                throw new Error(data.message || "Failed to generate share link")
            }
        } catch (error) {
            console.error("Error generating share link:", error)
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to generate share link",
                variant: "destructive",
                duration: 3000,
            })
        } finally {
            setIsGenerating(false)
        }
    }

    const copyToClipboard = async () => {
        if (!shareUrl) return

        try {
            await writeTextSafe(shareUrl)
            setIsCopied(true)

            toast({
                title: "Copied!",
                description: "Share link copied to clipboard",
                duration: 2000,
            })

            setTimeout(() => setIsCopied(false), 2000)
        } catch (error) {
            // Silent failure: avoid warning toast on Safari; user can try again
        }
    }

    if (shareUrl) {
        return (
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={copyToClipboard}
                    className={`${isCopied ? 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-300' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'} text-xs ${className}`}
                >
                    {isCopied ? (
                        <>
                            <Check className="w-3 h-3 mr-1" />
                            Copied!
                        </>
                    ) : (
                        <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy Link
                        </>
                    )}
                </Button>
            </div>
        )
    }

    return (
        <Button
            size="sm"
            variant="outline"
            onClick={generateShareableLink}
            disabled={isGenerating}
            className={`bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 text-xs ${className}`}
        >
            {isGenerating ? (
                <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Generating...
                </>
            ) : (
                <>
                    <Share2 className="w-3 h-3 mr-1" />
                    Share
                </>
            )}
        </Button>
    )
}

export default ShareButton
