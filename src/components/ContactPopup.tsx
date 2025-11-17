"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X, MessageCircle, Mail, Zap, CreditCard, Users, Building } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface ContactPopupProps {
    isOpen: boolean
    onClose: () => void
    trigger?: "credits" | "support" | "general"
}

export default function ContactPopup({ isOpen, onClose, trigger = "general" }: ContactPopupProps) {
    const [userEmail, setUserEmail] = useState<string>("")
    const [mounted, setMounted] = useState(false)

    // Get cookie value helper
    const getCookie = (name: string): string | null => {
        if (typeof document === "undefined") return null
        const value = `; ${document.cookie}`
        const parts = value.split(`; ${name}=`)
        if (parts.length === 2) {
            const cookieValue = parts.pop()?.split(";").shift()
            return cookieValue ? decodeURIComponent(cookieValue) : null
        }
        return null
    }

    useEffect(() => {
        setMounted(true)
        const emailFromCookie = getCookie("userEmail")
        if (emailFromCookie) {
            setUserEmail(emailFromCookie)
        }
    }, [])

    // Enhanced body scroll prevention
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow
            const originalPosition = document.body.style.position
            const originalTop = document.body.style.top
            const scrollY = window.scrollY

            document.body.style.overflow = "hidden"
            document.body.style.position = "fixed"
            document.body.style.top = `-${scrollY}px`
            document.body.style.width = "100%"
            document.body.style.height = "100%"

            const preventTouchMove = (e: TouchEvent) => {
                e.preventDefault()
            }

            document.body.addEventListener("touchmove", preventTouchMove, { passive: false })

            return () => {
                document.body.style.overflow = originalOverflow
                document.body.style.position = originalPosition
                document.body.style.top = originalTop
                document.body.style.width = ""
                document.body.style.height = ""

                window.scrollTo(0, scrollY)
                document.body.removeEventListener("touchmove", preventTouchMove)
            }
        }
    }, [isOpen])

    const handleBackdropClick = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    const getMessageContent = () => {
        const baseMessage = userEmail
            ? `Hi Team, I need assistance with AgentHub. User: ${userEmail}`
            : "Hi Team, I need assistance with AgentHub."

        switch (trigger) {
            case "credits":
                return `${baseMessage}\n\nI've run out of credits and would like to know about getting more credits or upgrading my plan.`
            case "support":
                return `${baseMessage}\n\nI need technical support with the platform.`
            default:
                return `${baseMessage}\n\nI'm interested in learning more about your services.`
        }
    }

    const handleWhatsAppClick = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const message = getMessageContent()
        const encodedMessage = encodeURIComponent(message)
        window.open(`https://wa.me/919105910566?text=${encodedMessage}`, "_blank")
    }

    const handleEmailClick = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const subject = trigger === "credits" ? "Credits & Billing Support - AgentHub" : "Support Request - AgentHub"
        const body = getMessageContent()

        const encodedSubject = encodeURIComponent(subject)
        const encodedBody = encodeURIComponent(body)
        window.open(`mailto:contact@tryzent.com?subject=${encodedSubject}&body=${encodedBody}`, "_blank")
    }

    const handleCloseClick = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onClose()
    }

    if (!mounted) return null

    const getHeaderContent = () => {
        switch (trigger) {
            case "credits":
                return {
                    title: "Need More Credits?",
                    subtitle: "Contact us to learn about our credit packages and subscription plans.",
                    icon: <CreditCard className="w-5 h-5 text-blue-600" />,
                    bgGradient: "from-blue-50 to-blue-100",
                }
            case "support":
                return {
                    title: "Technical Support",
                    subtitle: "Get help with any technical issues",
                    icon: <Users className="w-5 h-5 text-blue-600" />,
                    bgGradient: "from-blue-50 to-blue-100",
                }
            default:
                return {
                    title: "Contact Support",
                    subtitle: "We're here to help you succeed",
                    icon: <Building className="w-5 h-5 text-blue-600" />,
                    bgGradient: "from-blue-50 to-blue-100",
                }
        }
    }

    const headerContent = getHeaderContent()

    const PopupContent = (
        <AnimatePresence mode="wait">
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
                    style={{
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                    }}
                    onClick={handleBackdropClick}
                    onTouchStart={handleBackdropClick}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 50 }}
                        transition={{
                            type: "spring",
                            damping: 25,
                            stiffness: 300,
                            duration: 0.3,
                        }}
                        className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden relative"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                        }}
                        onTouchStart={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                        }}
                        style={{
                            maxHeight: "85vh",
                            overflowY: "auto",
                            touchAction: "manipulation",
                        }}
                    >
                        {/* Header */}
                        <div className={`relative bg-gradient-to-r ${headerContent.bgGradient} px-5 py-4`}>
                            <button
                                onClick={handleCloseClick}
                                onTouchStart={handleCloseClick}
                                className="absolute top-3 right-3 p-1.5 hover:bg-white/50 active:bg-white/70 rounded-full transition-colors z-10 flex items-center justify-center"
                                style={{
                                    minHeight: "32px",
                                    minWidth: "32px",
                                    touchAction: "manipulation",
                                }}
                                type="button"
                            >
                                <X className="w-4 h-4 text-gray-600" />
                            </button>

                            <div className="text-center">
                                <div className="flex justify-center mb-2">
                                    <div className="p-2 bg-white rounded-full shadow-sm">{headerContent.icon}</div>
                                </div>
                                <h2 className="text-lg font-bold text-gray-900 mb-1">{headerContent.title}</h2>
                                <p className="text-gray-700 text-xs font-medium">{headerContent.subtitle}</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-5 py-4">
                            {/* {trigger === "credits" && (
                                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Zap className="w-4 h-4 text-blue-600" />
                                        <span className="font-semibold text-blue-900 text-sm">Out of Credits?</span>
                                    </div>
                                    <p className="text-xs text-blue-800">
                                        Contact us to learn about our credit packages and subscription plans.
                                    </p>
                                </div>
                            )} */}

                            <div className="text-center mb-4">
                                <p className="text-gray-600 text-xs mb-2">
                                    {trigger === "credits"
                                        ? "Get in touch to discuss credit options"
                                        : "Reach out to us for immediate assistance"}
                                </p>
                                <p className="text-gray-700 font-medium text-xs">Choose your preferred contact method</p>
                            </div>

                            {/* Contact Options */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {/* WhatsApp */}
                                <Card
                                    className="border-2 border-green-100 hover:border-green-200 transition-colors cursor-pointer group"
                                    onClick={handleWhatsAppClick}
                                >
                                    <CardContent className="p-3 text-center">
                                        <div className="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center mx-auto mb-2 group-hover:scale-105">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                                            </svg>
                                        </div>
                                        <span className="text-xs font-semibold text-gray-700 group-hover:text-green-700">WhatsApp</span>
                                    </CardContent>
                                </Card>

                                {/* Email */}
                                <Card
                                    className="border-2 border-blue-100 hover:border-blue-200 transition-colors cursor-pointer group"
                                    onClick={handleEmailClick}
                                >
                                    <CardContent className="p-3 text-center">
                                        <div className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center mx-auto mb-2 group-hover:scale-105">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-semibold text-gray-700 group-hover:text-blue-700">Email</span>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Additional Info */}
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    <MessageCircle className="w-4 h-4 text-gray-600" />
                                    <span className="text-xs font-medium text-gray-800">Quick Response</span>
                                </div>
                                <p className="text-xs text-gray-600">
                                    We typically respond within 2-4 hours during business hours (9 AM - 6 PM IST).
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )

    return createPortal(PopupContent, document.body)
}
