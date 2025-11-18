import React, { useState, useCallback, useRef } from 'react'
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, Send, Image as ImageIcon, X } from 'lucide-react'
import Image from 'next/image'

interface MobileControlBarProps {
    onMicToggle: (value?: boolean) => void | Promise<void>
    onVideoToggle: () => void | Promise<void>
    onScreenShareToggle: () => void | Promise<void>
    onDisconnect: () => void
    isMicEnabled: boolean
    isVideoEnabled: boolean
    isScreenSharing: boolean
    micMode: 'ptt' | 'alwaysOn'
    onMicModeChange: (mode: 'ptt' | 'alwaysOn') => void
    micPending?: boolean
    videoPending?: boolean
    screenSharePending?: boolean
    isVKeyPressed?: boolean
    isMicButtonHeld?: boolean
    setIsMicButtonHeld?: (held: boolean) => void
    message?: string
    setMessage?: (msg: string) => void
    onSendMessage?: () => void
    canSend?: boolean
    videoPreview?: React.ReactNode
    onImageUpload?: () => void
    isUploadingImage?: boolean
    selectedImage?: { file: File; dataUrl: string } | null
    onRemoveImage?: () => void
}

export const MobileControlBar: React.FC<MobileControlBarProps> = ({
    onMicToggle,
    onVideoToggle,
    onScreenShareToggle,
    onDisconnect,
    isMicEnabled,
    isVideoEnabled,
    isScreenSharing,
    micMode,
    onMicModeChange,
    micPending = false,
    videoPending = false,
    screenSharePending = false,
    isVKeyPressed = false,
    isMicButtonHeld = false,
    setIsMicButtonHeld,
    message = '',
    setMessage,
    onSendMessage,
    canSend = true,
    // videoPreview is reserved for future use
    onImageUpload,
    isUploadingImage = false,
    selectedImage = null,
    onRemoveImage,
}) => {
    // Local pending states to prevent multiple rapid clicks
    const [localMicPending, setLocalMicPending] = useState(false)
    const [localVideoPending, setLocalVideoPending] = useState(false)
    const [localScreenPending, setLocalScreenPending] = useState(false)

    // Refs to track touch state
    const micTouchTimerRef = useRef<NodeJS.Timeout | null>(null)
    const isTouchingMicRef = useRef(false)

    // Cleanup function for mic touch
    const cleanupMicTouch = useCallback(() => {
        if (micTouchTimerRef.current) {
            clearTimeout(micTouchTimerRef.current)
            micTouchTimerRef.current = null
        }
        isTouchingMicRef.current = false
    }, [])

    // Handle microphone toggle with proper mobile support
    const handleMicClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        e.stopPropagation()

        console.log("Mic button clicked, mode:", micMode)

        if (localMicPending || micPending) {
            console.log("Mic toggle already pending, ignoring")
            return
        }

        if (micMode === 'alwaysOn') {
            setLocalMicPending(true)
            // Call handler immediately to maintain user gesture context
            Promise.resolve(onMicToggle()).finally(() => {
                setLocalMicPending(false)
            })
        }
    }, [micMode, onMicToggle, localMicPending, micPending])

    // Handle PTT pointer/touch start
    const handleMicTouchStart = useCallback((e: React.PointerEvent | React.TouchEvent) => {
        if (micMode !== 'ptt' || !setIsMicButtonHeld) return

        e.preventDefault()
        e.stopPropagation()

        if (isTouchingMicRef.current || localMicPending || micPending) return

        console.log("PTT: Mic button pressed")

        isTouchingMicRef.current = true
        setIsMicButtonHeld(true)
        setLocalMicPending(true)

        // Call handler immediately to maintain user gesture context
        Promise.resolve(onMicToggle(true)).finally(() => {
            setLocalMicPending(false)
        })
    }, [micMode, setIsMicButtonHeld, onMicToggle, localMicPending, micPending])

    // Handle PTT pointer/touch end
    const handleMicTouchEnd = useCallback((e: React.PointerEvent | React.TouchEvent) => {
        if (micMode !== 'ptt' || !setIsMicButtonHeld) return

        e.preventDefault()
        e.stopPropagation()

        if (!isTouchingMicRef.current) return

        console.log("PTT: Mic button released")

        setIsMicButtonHeld(false)
        setLocalMicPending(true)

        // Call handler immediately
        Promise.resolve(onMicToggle(false)).finally(() => {
            setLocalMicPending(false)
            cleanupMicTouch()
        })
    }, [micMode, setIsMicButtonHeld, onMicToggle, cleanupMicTouch])

    // Handle video toggle with proper mobile support
    const handleVideoClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        e.stopPropagation()

        console.log("Video button clicked")

        if (localVideoPending || videoPending) {
            console.log("Video toggle already pending, ignoring")
            return
        }

        setLocalVideoPending(true)
        // Call handler immediately to maintain user gesture context
        Promise.resolve(onVideoToggle()).finally(() => {
            // Small delay to prevent rapid re-clicking
            setTimeout(() => setLocalVideoPending(false), 300)
        })
    }, [onVideoToggle, localVideoPending, videoPending])

    // Handle screen share toggle with proper mobile support
    const handleScreenShareClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        e.stopPropagation()

        console.log("Screen share button clicked")

        if (localScreenPending || screenSharePending) {
            console.log("Screen share toggle already pending, ignoring")
            return
        }

        setLocalScreenPending(true)
        // Call handler immediately to maintain user gesture context
        Promise.resolve(onScreenShareToggle()).finally(() => {
            // Small delay to prevent rapid re-clicking
            setTimeout(() => setLocalScreenPending(false), 300)
        })
    }, [onScreenShareToggle, localScreenPending, screenSharePending])

    // Handle disconnect
    const handleDisconnectClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onDisconnect()
    }, [onDisconnect])

    // Determine if controls are disabled
    const isMicDisabled = localMicPending || micPending
    const isVideoDisabled = localVideoPending || videoPending
    const isScreenShareDisabled = localScreenPending || screenSharePending

    return (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden z-[70] bg-white border-t border-gray-200 shadow-lg">
            <div className="px-3 py-2.5 space-y-2.5 relative" style={{ minHeight: 0, height: 'auto' }}>
                {/* Image Preview - Positioned absolutely outside normal flow */}
                {selectedImage && (
                    <div 
                        className="absolute z-10 pointer-events-auto" 
                        style={{ 
                            bottom: '100%',
                            left: '0.75rem',
                            marginBottom: '0.5rem',
                            transform: 'translateY(0)'
                        }}
                    >
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200 bg-white shadow-lg">
                            <Image
                                src={selectedImage.dataUrl}
                                alt="Selected image"
                                width={96}
                                height={96}
                                className="w-full h-full object-cover"
                                unoptimized
                            />
                            {onRemoveImage && (
                                <button
                                    onClick={onRemoveImage}
                                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-all z-20"
                                    title="Remove image"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
                {/* Chat Input Area */}
                {setMessage && onSendMessage && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2" style={{ position: 'relative', zIndex: 1 }}>
                        <div className="flex items-center gap-2">
                            {/* Image upload button */}
                            {onImageUpload && (
                                <button
                                    onClick={onImageUpload}
                                    disabled={!canSend || isUploadingImage}
                                    className="inline-flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 px-2 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                                    title="Upload image"
                                >
                                    {isUploadingImage ? (
                                        <div className="w-4 h-4 border-2 border-[#714B90] border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <ImageIcon className="w-4 h-4" />
                                    )}
                                </button>
                            )}
                            <input
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault()
                                        onSendMessage()
                                    }
                                }}
                                placeholder="Type your message..."
                                className="flex-1 rounded-md text-gray-700 border-0 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#714B90] transition-all"
                                disabled={!canSend || isUploadingImage}
                            />
                            <button
                                onClick={onSendMessage}
                                disabled={!canSend || !message.trim() || isUploadingImage}
                                className="inline-flex items-center justify-center rounded-md bg-[#714B90] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#5a3a73] disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Single Row Control Layout */}
                <div className="flex items-center justify-between gap-2">
                    {/* Mic Mode Toggle - Compact */}
                    <select
                        value={micMode}
                        onChange={(e) => onMicModeChange(e.target.value as 'ptt' | 'alwaysOn')}
                        className="text-[10px] font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#714B90]"
                    >
                        <option value="ptt">PTT</option>
                        <option value="alwaysOn">Always On</option>
                    </select>

                    {/* Control Buttons - Minimal Icons */}
                    <div className="flex items-center gap-1.5">
                        {/* Microphone Button */}
                        <button
                            onPointerDown={micMode === 'ptt' ? handleMicTouchStart : undefined}
                            onPointerUp={micMode === 'ptt' ? handleMicTouchEnd : undefined}
                            onPointerCancel={micMode === 'ptt' ? handleMicTouchEnd : undefined}
                            onClick={micMode === 'alwaysOn' ? handleMicClick : undefined}
                            disabled={isMicDisabled}
                            className={`flex gap-1 p-2 rounded-lg transition-all touch-manipulation active:scale-95 ${isMicEnabled || isVKeyPressed || isMicButtonHeld
                                    ? 'bg-[#714B90] text-white'
                                    : 'bg-gray-200 text-gray-600'
                                } ${isMicDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={isMicEnabled ? 'Mute' : 'Unmute'}
                            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}
                        >
                            {isMicDisabled ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (isMicEnabled || isVKeyPressed || isMicButtonHeld) ? (
                                <Mic className="w-4 h-4" />
                            ) : (
                                <MicOff className="w-4 h-4" />
                            )}
                            <span className="text-[10px] font-medium ml-1">
                                {micMode === 'ptt'
                                    ? (isVKeyPressed || isMicButtonHeld ? 'Speaking' : 'Push to Talk')
                                    : (isMicEnabled ? "Mic On" : "Mic Off")
                                }
                            </span>
                        </button>

                        {/* Video Button */}
                        <button
                            onClick={handleVideoClick}
                            disabled={isVideoDisabled}
                            className={`p-2 rounded-lg transition-all touch-manipulation active:scale-95 ${isVideoEnabled
                                    ? 'bg-[#714B90] text-white'
                                    : 'bg-gray-200 text-gray-600'
                                } ${isVideoDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                        >
                            {isVideoDisabled ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : isVideoEnabled ? (
                                <Video className="w-4 h-4" />
                            ) : (
                                <VideoOff className="w-4 h-4" />
                            )}
                        </button>

                        {/* Screen Share Button */}
                        <button
                            onClick={handleScreenShareClick}
                            disabled={isScreenShareDisabled}
                            className={`p-2 rounded-lg transition-all touch-manipulation active:scale-95 ${isScreenSharing
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-600'
                                } ${isScreenShareDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
                            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                        >
                            {isScreenShareDisabled ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <MonitorUp className="w-4 h-4" />
                            )}
                        </button>

                        {/* End Call Button */}
                        <button
                            onClick={handleDisconnectClick}
                            className="flex gap-1 p-2 rounded-lg bg-[#714B90] text-white hover:bg-red-600 transition-all touch-manipulation active:scale-95"
                            title="End session"
                            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                        >
                            <PhoneOff className="w-4 h-4" />
                            <span className="text-xs font-medium ml-1">End</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
