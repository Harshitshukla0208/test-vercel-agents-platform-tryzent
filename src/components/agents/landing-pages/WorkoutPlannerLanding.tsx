"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { Agent } from "@/lib/agentSlugs"
import Image from "next/image"
import LogoImage from "@/assets/logo.jpeg"
import {
  Dumbbell,
  Activity,
  Star,
  ArrowRight,
  Shield,
  Menu,
  X,
  Timer,
  Target,
  Smartphone,
  FileText,
  Heart,
  TrendingUp,
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

interface WorkoutPlannerLandingProps {
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

const WorkoutPlannerLanding: React.FC<WorkoutPlannerLandingProps> = ({
  metadata = {
    title: "AI Workout Planner",
    description: "Create personalized workout plans with AI",
    features: [
      "Custom Routines",
      "Progress Tracking",
      "Exercise Library",
      "Goal Setting",
      "Recovery Plans",
      "Nutrition Tips",
    ],
    benefits: [],
    keywords: "workout, fitness, planning, AI",
    category: "fitness",
    rating: 4.8,
    executionCount: 35000,
    credits: 2,
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
      icon: Target,
      title: "Personal Configuration",
      description: "Customized plans based on age, weight, height, gender, and fitness level",
    },
    {
      icon: Timer,
      title: "Flexible Scheduling",
      description: "Choose workout frequency from 3-7 days per week with custom duration",
    },
    {
      icon: Dumbbell,
      title: "Equipment Selection",
      description: "Plans for gym equipment, home setup, or bodyweight-only workouts",
    },
    {
      icon: Heart,
      title: "Health Considerations",
      description: "Accommodates health conditions like diabetes, heart issues, and injuries",
    },
    {
      icon: TrendingUp,
      title: "Multiple Fitness Goals",
      description: "Target weight loss, muscle gain, strength, endurance, or rehabilitation",
    },
    {
      icon: Smartphone,
      title: "Detailed Exercise Plans",
      description: "Complete workout routines with sets, reps, rest periods, and instructions",
    },
    {
      icon: Shield,
      title: "Progressive Training",
      description: "8-week structured programs that evolve with your fitness progress",
    },
    {
      icon: FileText,
      title: "Weekly Breakdown",
      description: "Day-by-day workout schedules with exercise variations and tips",
    },
  ]

  const steps = [
    {
      number: "01",
      title: "Set Your Goals",
      description: "Tell us your fitness level, goals, available time, and equipment",
    },
    {
      number: "02",
      title: "AI Creates Plan",
      description: "Our AI generates your personalized workout routine",
    },
    {
      number: "03",
      title: "Start Training",
      description: "Follow your custom plan and track your progress",
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
                Start Training
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
            backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="eduGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:%23eff6ff;stop-opacity:1" /><stop offset="100%" style="stop-color:%23dbeafe;stop-opacity:1" /></linearGradient></defs><rect width="100%" height="100%" fill="url(%23eduGrad)"/><rect x="80" y="120" width="180" height="120" fill="%233b82f6" opacity="0.08" rx="8"/><rect x="320" y="180" width="200" height="140" fill="%236366f1" opacity="0.06" rx="8"/><rect x="580" y="100" width="160" height="100" fill="%238b5cf6" opacity="0.07" rx="8"/><rect x="800" y="200" width="220" height="160" fill="%233b82f6" opacity="0.05" rx="8"/><circle cx="150" cy="300" r="60" fill="%236366f1" opacity="0.04"/><circle cx="950" cy="150" r="80" fill="%238b5cf6" opacity="0.05"/><circle cx="1050" cy="400" r="70" fill="%233b82f6" opacity="0.06"/><path d="M0,500 Q300,450 600,480 Q900,510 1200,470 L1200,800 L0,800 Z" fill="%23ffffff" opacity="0.9"/></svg>')`,
          }}
        ></div>

        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-white/10"></div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="space-y-8">
            <div className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-indigo-700 text-sm font-medium border border-indigo-100 shadow-sm">
              ✨ AI-Powered Fitness Planning
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-gray-900 leading-tight drop-shadow-sm">
              Transform Your Body
              <span className="block text-indigo-600 mt-2">With AI Training</span>
            </h1>

            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed drop-shadow-sm">
              Create personalized workout plans with custom routines, progress tracking, exercise demonstrations, and
              goal-oriented training.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button
                onClick={onGetStarted}
                className="inline-flex items-center justify-center px-10 py-4 bg-indigo-600 text-white rounded-xl text-lg font-semibold hover:bg-indigo-700 transition-all duration-150 transform hover:scale-105 shadow-xl hover:shadow-2xl"
              >
                <Dumbbell className="mr-2 h-5 w-5" />
                Start Your Fitness Journey
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
              <div className="font-medium">{metadata.executionCount.toLocaleString()}+ workouts created</div>
              <div className="font-medium">{metadata.credits} credits per execution</div>
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
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Complete Fitness Planning Suite</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need for effective training, powered by AI
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
              <Activity className="mr-2 h-5 w-5" />
              Start Your Fitness Journey
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
            <p className="text-xl text-gray-600">From goals to gains in three simple steps</p>
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
            <h2 className="text-3xl lg:text-4xl font-bold text-white">Ready to Transform Your Body?</h2>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto">
              Join fitness enthusiasts who achieve their goals with AI-powered workout planning
            </p>
            <button
              onClick={onGetStarted}
              className="inline-flex items-center px-12 py-4 bg-white text-indigo-600 rounded-lg text-xl font-semibold hover:bg-gray-50 transition-all duration-150 transform hover:scale-105 shadow-lg"
            >
              <TrendingUp className="mr-2 h-6 w-6" />
              Start Your Fitness Journey
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

export default WorkoutPlannerLanding
