"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { Agent } from "@/lib/agentSlugs"
import Image from "next/image"
import LogoImage from "@/assets/logo.jpeg"
import {
    Mic,
    FileText,
    Star,
    ArrowRight,
    Shield,
    Menu,
    X,
    Headphones,
    Clock,
    Search,
    Download,
    Volume2,
    BookOpen,
    Zap,
} from "lucide-react"
import Link from "next/link"
import Footer from "@/components/Home/Footer"
import SupportButton from "@/components/ShareSupportBtn"
import ContactPopup from "@/components/ContactPopup"

interface Metadata {
    title: string
    description: string
    features: string[]
    benefits: string[]
    keywords: string
    category: string
    rating: number
    executionCount: number
    credits: number
}

interface AudioNoteSummarizerLandingProps {
    agent: Agent
    metadata?: Metadata
    onGetStarted?: () => void
}

interface VisibilityState {
    [key: string]: boolean
}

interface Feature {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
    title: string
    description: string
}

const AudioNoteSummarizerLanding: React.FC<AudioNoteSummarizerLandingProps> = ({
    metadata = {
        title: "AI Audio Note Summarizer",
        description: "Transform audio recordings into structured summaries with AI",
        features: [
            "Audio Transcription",
            "Smart Summaries",
            "Key Insights",
            "Multiple Formats",
            "Fast Processing",
            "Searchable Content",
        ],
        benefits: [],
        keywords: "audio, transcription, AI, summarization",
        category: "audio",
        rating: 4.7,
        executionCount: 18000,
        credits: 3,
    },
    onGetStarted = () => console.log("Get started clicked"),
}) => {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isVisible, setIsVisible] = useState<VisibilityState>({})
    const [showContactPopup, setShowContactPopup] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const section = entry.target.getAttribute("data-section")
                        if (section) {
                            setIsVisible((prev) => ({
                                ...prev,
                                [section]: true,
                            }))
                        }
                    }
                })
            },
            { threshold: 0.2, rootMargin: "0px 0px -100px 0px" },
        )

        const sections = document.querySelectorAll("[data-section]")
        sections.forEach((section) => observer.observe(section))

        window.addEventListener("scroll", handleScroll)
        return () => {
            window.removeEventListener("scroll", handleScroll)
            observer.disconnect()
        }
    }, [])

    const features: Feature[] = [
        {
            icon: Volume2,
            title: "Complete Transcription",
            description: "Full audio-to-text conversion with accurate speech recognition",
        },
        {
            icon: FileText,
            title: "Comprehensive Summary",
            description: "AI-generated summaries highlighting key points and main topics",
        },
        {
            icon: Search,
            title: "Speaker Identification",
            description: "Automatic detection and labeling of different speakers in conversations",
        },
        {
            icon: Clock,
            title: "Entity Detection",
            description: "Identify and extract important names, places, dates, and concepts",
        },
        {
            icon: BookOpen,
            title: "Decision Tracking",
            description: "Capture and highlight key decisions made during meetings or discussions",
        },
        {
            icon: Download,
            title: "Keyword Frequency",
            description: "Analysis of most frequently mentioned terms and topics",
        },
        {
            icon: Shield,
            title: "Sentiment Analysis",
            description: "Understand the emotional tone and sentiment throughout the audio",
        },
        {
            icon: Zap,
            title: "Action Items",
            description: "Automatically extract and list actionable tasks and next steps",
        },
    ]

    const steps = [
        {
            number: "01",
            title: "Upload Audio",
            description: "Upload your audio files or recordings in any common format",
        },
        {
            number: "02",
            title: "AI Processing",
            description: "Our AI transcribes and analyzes your audio for key insights",
        },
        {
            number: "03",
            title: "Get Summary",
            description: "Receive structured summaries with timestamps and key points",
        },
    ]

    return (
        <div className="min-h-screen bg-white overflow-x-hidden">
            {/* Header */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${isScrolled ? "bg-white/95 backdrop-blur-md shadow-sm" : "bg-transparent"}`}
            >
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-2">
                            <Image
                                src={LogoImage || "/placeholder.svg"}
                                alt="logo"
                                className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 rounded-md"
                            />
                            <div className="flex flex-col">
                                <Link href="/">
                                    <span className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">AgentHub</span>
                                </Link>
                                <span className="text-xs sm:text-xs text-gray-500 leading-none">
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

                        <div className="flex items-center space-x-4">
                            <SupportButton
                                onClick={() => setShowContactPopup(true)}
                                className="text-indigo-600 hover:text-indigo-900 border-indigo-200 hover:border-indigo-300 duration-150 transform hover:scale-105"
                            />
                            <button
                                onClick={onGetStarted}
                                className="hidden md:inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-all duration-150 transform hover:scale-105"
                            >
                                Start Summarizing
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 sm:pt-28">
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="audioGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:%23eef2ff;stop-opacity:1" /><stop offset="100%" style="stop-color:%23e0e7ff;stop-opacity:1" /></linearGradient></defs><rect width="100%" height="100%" fill="url(%23audioGrad)"/><ellipse cx="200" cy="200" rx="120" ry="60" fill="%234336d6" opacity="0.08"/><ellipse cx="500" cy="300" rx="150" ry="80" fill="%234f46e5" opacity="0.06"/><ellipse cx="800" cy="150" rx="100" ry="50" fill="%235a56eb" opacity="0.07"/><ellipse cx="1000" cy="350" rx="140" ry="70" fill="%234336d6" opacity="0.05"/><ellipse cx="350" cy="500" rx="110" ry="55" fill="%23606cf3" opacity="0.06"/><path d="M0,20 Q100,10 200,20 Q300,30 400,20 Q500,10 600,20 Q700,30 800,20 Q900,10 1000,20 Q1100,30 1200,20" stroke="%234f46e5" strokeWidth="2" fill="none" opacity="0.1"/><path d="M0,60 Q150,45 300,60 Q450,75 600,60 Q750,45 900,60 Q1050,75 1200,60" stroke="%235a56eb" strokeWidth="1.5" fill="none" opacity="0.08"/><path d="M0,500 Q200,460 400,480 Q600,500 800,470 Q1000,450 1200,470 L1200,800 L0,800 Z" fill="%23ffffff" opacity="0.9"/></svg>')`,
                    }}
                ></div>

                {/* Overlay for better text readability */}
                <div className="absolute inset-0 bg-white/10"></div>

                <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
                    <div className="space-y-8">
                        <div className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-indigo-700 text-sm font-medium border border-indigo-100 shadow-sm">
                            ✨ AI-Powered Audio Processing
                        </div>

                        <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-gray-900 leading-tight drop-shadow-sm">
                            Transform Audio
                            <span className="block text-indigo-600 mt-2">Into Insights</span>
                        </h1>

                        <p className="text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed drop-shadow-sm">
                            Convert your audio recordings, meetings, and lectures into structured summaries with key insights,
                            timestamps, and searchable content.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                            <button
                                onClick={onGetStarted}
                                className="inline-flex items-center justify-center px-10 py-4 bg-indigo-600 text-white rounded-xl text-lg font-semibold hover:bg-indigo-700 transition-all duration-150 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                            >
                                <Mic className="mr-2 h-5 w-5" />
                                Process Your Audio
                            </button>
                            <button
                                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                                className="inline-flex items-center justify-center px-10 py-4 bg-white/90 backdrop-blur-sm text-indigo-600 border border-indigo-200 rounded-xl text-lg font-semibold hover:bg-white transition-all duration-150 shadow-lg hover:shadow-xl"
                            >
                                Explore Features
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600 bg-white/80 backdrop-blur-sm rounded-2xl py-4 px-8 mx-auto max-w-2xl shadow-lg">
                            <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 text-indigo-500 fill-current" />
                                <span className="font-medium">{metadata.rating.toFixed(1)}/5 rating</span>
                            </div>
                            <div className="font-medium">{metadata.executionCount.toLocaleString()}+ files processed</div>
                            <div className="font-medium">{metadata.credits} credits per file</div>
                        </div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                    <div className="w-6 h-10 border-2 border-gray-200 rounded-full flex justify-center">
                        <div className="w-1 h-3 bg-gray-200 rounded-full mt-2 animate-pulse"></div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section
                id="features"
                data-section="features"
                className={`py-16 bg-gray-50 transition-all duration-400 ${isVisible?.features ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Complete Audio Processing Suite</h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Everything you need to extract value from your audio content
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-1"
                            >
                                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 transition-colors">
                                    <feature.icon className="h-6 w-6 text-indigo-600" />
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2 text-lg">{feature.title}</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="pb-8 bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <div className="space-y-8">
                        <button
                            onClick={onGetStarted}
                            className="inline-flex border border-indigo-300 items-center px-12 py-4 bg-white text-indigo-600 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-all duration-150 transform hover:scale-105 shadow-lg"
                        >
                            <Headphones className="mr-2 h-5 w-5" />
                            Process Your Audio
                        </button>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section
                id="how-it-works"
                data-section="process"
                className={`py-20 bg-white transition-all duration-400 ${isVisible?.process ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
                        <p className="text-xl text-gray-600">From audio file to structured summary in three simple steps</p>
                    </div>

                    <div className="relative">
                        {/* Desktop connecting line */}
                        <div className="hidden md:block absolute top-8 left-0 right-0 h-0.5 bg-indigo-100">
                            <div className="absolute inset-0 flex">
                                <div className="flex-1"></div>
                                <div className="w-16 bg-white"></div>
                                <div className="flex-1 bg-indigo-100"></div>
                                <div className="w-16 bg-white"></div>
                                <div className="flex-1"></div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-12 relative">
                            {steps.map((step, index) => (
                                <div key={index} className="text-center relative">
                                    <div className="relative mb-8">
                                        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg transition-transform duration-150 hover:scale-110 relative z-10">
                                            <span className="text-white font-bold text-xl">{step.number}</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                                    <p className="text-gray-600 leading-relaxed">{step.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-indigo-600">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <div className="space-y-8">
                        <h2 className="text-3xl lg:text-4xl font-bold text-white">Ready to Transform Your Audio?</h2>
                        <p className="text-xl text-indigo-100 max-w-2xl mx-auto">
                            Join professionals who extract maximum value from their audio content with AI-powered summarization
                        </p>
                        <button
                            onClick={onGetStarted}
                            className="inline-flex items-center px-12 py-4 bg-white text-indigo-600 rounded-lg text-xl font-semibold hover:bg-gray-50 transition-all duration-150 transform hover:scale-105 shadow-lg"
                        >
                            <Mic className="mr-2 h-6 w-6" />
                            Process Your Audio
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <Footer />

            <ContactPopup isOpen={showContactPopup} onClose={() => setShowContactPopup(false)} trigger="credits" />
        </div>
    )
}

export default AudioNoteSummarizerLanding
