"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  Star,
  Users,
  Zap,
  Shield,
  Clock,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Award,
  Play,
  Download,
  Share2,
} from "lucide-react"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import type { Agent } from "@/lib/agentSlugs"

interface AgentLandingPageProps {
  agent: Agent
  metadata: {
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
  onGetStarted: () => void
}

export default function AgentLandingPage({ agent, metadata, onGetStarted }: AgentLandingPageProps) {
  const [activeTab, setActiveTab] = useState("features")
  const heroRef = useRef(null)
  const featuresRef = useRef(null)
  const statsRef = useRef(null)
  const ctaRef = useRef(null)

  const heroInView = useInView(heroRef, { once: true })
  const featuresInView = useInView(featuresRef, { once: true })
  const statsInView = useInView(statsRef, { once: true })
  const ctaInView = useInView(ctaRef, { once: true })

  const getAgentIcon = (category: string, name: string) => {
    const iconMap: Record<string, string> = {
      Education: "🎓",
      Fitness: "💪",
      Travel: "✈️",
      Audio: "🎵",
    }

    // Fallback to name-based icons
    if (name.toLowerCase().includes("lesson")) return "📚"
    if (name.toLowerCase().includes("travel")) return "🗺️"
    if (name.toLowerCase().includes("workout")) return "🏋️"
    if (name.toLowerCase().includes("diet")) return "🥗"
    if (name.toLowerCase().includes("test")) return "📝"
    if (name.toLowerCase().includes("audio")) return "🎧"

    return iconMap[category] || "🤖"
  }

  const getGradientClass = (category: string) => {
    const gradients: Record<string, string> = {
      Education: "from-blue-600 via-indigo-600 to-purple-600",
      Fitness: "from-green-600 via-emerald-600 to-teal-600",
      Travel: "from-orange-600 via-red-600 to-pink-600",
      Audio: "from-purple-600 via-violet-600 to-indigo-600",
    }
    return gradients[category] || "from-gray-600 via-gray-700 to-gray-800"
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  }

  const floatingVariants = {
    animate: {
      y: [-10, 10, -10],
      transition: {
        duration: 6,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      },
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              className="flex items-center space-x-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Image src="/assets/logo-modified.png" alt="TryZent" width={40} height={40} className="rounded-lg" />
              <div>
                <span className="text-xl font-bold text-gray-900">TryZent</span>
                <div className="text-xs text-gray-500">AI Agents</div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Button
                onClick={onGetStarted}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        ref={heroRef}
        className={`relative py-20 lg:py-32 bg-gradient-to-r ${getGradientClass(metadata.category)} text-white overflow-hidden`}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px), radial-gradient(circle at 75% 75%, white 2px, transparent 2px)`,
              backgroundSize: "50px 50px",
            }}
          ></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-5xl mx-auto text-center"
            variants={containerVariants}
            initial="hidden"
            animate={heroInView ? "visible" : "hidden"}
          >
            <motion.div className="text-8xl mb-8" variants={floatingVariants} animate="animate">
              {getAgentIcon(metadata.category, agent.agent_Name)}
            </motion.div>

            <motion.div variants={itemVariants} className="mb-6">
              <Badge
                variant="secondary"
                className="mb-4 bg-white/20 text-white border-white/30 px-4 py-2 text-sm font-medium"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                AI-Powered {metadata.category} Tool
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
            >
              {agent.agent_Name}
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-xl md:text-2xl mb-8 text-white/90 max-w-4xl mx-auto leading-relaxed"
            >
              {agent.agent_description}
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="bg-white text-gray-900 hover:bg-gray-100 text-lg px-8 py-4 shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
              >
                <Zap className="mr-2 h-5 w-5" />
                Start Creating Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-gray-900 text-lg px-8 py-4 bg-transparent backdrop-blur-sm transition-all duration-200"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap justify-center items-center gap-8 text-white/80"
            >
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium">{metadata.executionCount.toLocaleString()}+ Users</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-300" />
                <span className="text-sm font-medium">{metadata.rating.toFixed(1)} Rating</span>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span className="text-sm font-medium">Professional Quality</span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-20 fill-white">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"></path>
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
            variants={containerVariants}
            initial="hidden"
            animate={statsInView ? "visible" : "hidden"}
          >
            <motion.div variants={itemVariants}>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                {metadata.executionCount.toLocaleString()}+
              </div>
              <div className="text-gray-600 font-medium">Active Users</div>
            </motion.div>
            <motion.div variants={itemVariants}>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                <Zap className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                {(metadata.executionCount * 2.3).toFixed(0)}K+
              </div>
              <div className="text-gray-600 font-medium">Tasks Completed</div>
            </motion.div>
            <motion.div variants={itemVariants}>
              <div className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center">
                <Star className="h-8 w-8 mr-2 text-yellow-500" />
                {metadata.rating.toFixed(1)}
              </div>
              <div className="text-gray-600 font-medium">Average Rating</div>
            </motion.div>
            <motion.div variants={itemVariants}>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                <Clock className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                24/7
              </div>
              <div className="text-gray-600 font-medium">Available</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features & Benefits */}
      <section ref={featuresRef} className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-5xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate={featuresInView ? "visible" : "hidden"}
          >
            <motion.div variants={itemVariants} className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Everything You Need to Succeed</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Powerful features designed to make your work easier, faster, and more professional
              </p>
            </motion.div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-12 bg-white shadow-lg rounded-xl p-2">
                <TabsTrigger
                  value="features"
                  className="text-lg py-4 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Features
                </TabsTrigger>
                <TabsTrigger
                  value="benefits"
                  className="text-lg py-4 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Benefits
                </TabsTrigger>
              </TabsList>

              <TabsContent value="features" className="space-y-6">
                <motion.div
                  className="grid md:grid-cols-2 gap-8"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {metadata.features.map((feature, index) => (
                    <motion.div key={index} variants={itemVariants}>
                      <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-white">
                        <CardContent className="p-8">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 mb-3 text-lg">{feature}</h3>
                              <p className="text-gray-600 leading-relaxed">
                                Advanced AI technology ensures high-quality, professional results every time you use our
                                platform.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </TabsContent>

              <TabsContent value="benefits" className="space-y-6">
                <motion.div
                  className="grid md:grid-cols-2 gap-8"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {metadata.benefits.map((benefit, index) => (
                    <motion.div key={index} variants={itemVariants}>
                      <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-white">
                        <CardContent className="p-8">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-teal-600 rounded-xl flex items-center justify-center">
                                <Star className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 mb-3 text-lg">{benefit}</h3>
                              <p className="text-gray-600 leading-relaxed">
                                Experience the difference with our AI-powered solution designed for professionals and
                                enthusiasts alike.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">How It Works</h2>
              <p className="text-xl text-gray-600">Get started in just 3 simple steps</p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              {[
                {
                  step: "1",
                  title: "Sign Up & Choose",
                  description: "Create your free account and select the AI agent that fits your needs",
                  icon: Users,
                },
                {
                  step: "2",
                  title: "Input Your Requirements",
                  description: "Provide your specific requirements and let our AI understand your goals",
                  icon: Zap,
                },
                {
                  step: "3",
                  title: "Get Professional Results",
                  description: "Receive high-quality, customized output ready for immediate use",
                  icon: Download,
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                >
                  <div className="relative mb-8">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                      <item.icon className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-sm font-bold text-gray-900">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Trusted by Professionals Worldwide</h2>
            <div className="grid md:grid-cols-3 gap-12 text-center">
              <motion.div
                className="flex flex-col items-center"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Secure & Private</h3>
                <p className="text-gray-600 leading-relaxed">
                  Your data is protected with enterprise-grade security and privacy measures. We never store or share
                  your personal information.
                </p>
              </motion.div>
              <motion.div
                className="flex flex-col items-center"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-20 h-20 bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Zap className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Lightning Fast</h3>
                <p className="text-gray-600 leading-relaxed">
                  Get professional results in seconds, not hours. Our optimized AI processes your requests with
                  incredible speed and accuracy.
                </p>
              </motion.div>
              <motion.div
                className="flex flex-col items-center"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Users className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Expert Support</h3>
                <p className="text-gray-600 leading-relaxed">
                  24/7 customer support and a community of experts ready to help you succeed with our AI-powered tools.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        ref={ctaRef}
        className={`py-20 bg-gradient-to-r ${getGradientClass(metadata.category)} text-white relative overflow-hidden`}
      >
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 80%, white 2px, transparent 2px), radial-gradient(circle at 80% 20%, white 2px, transparent 2px), radial-gradient(circle at 40% 40%, white 2px, transparent 2px)`,
              backgroundSize: "60px 60px",
            }}
          ></div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            className="max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate={ctaInView ? "visible" : "hidden"}
          >
            <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Workflow?
            </motion.h2>
            <motion.p variants={itemVariants} className="text-xl mb-10 text-white/90 leading-relaxed">
              Join thousands of professionals who are already creating amazing results with {agent.agent_Name}. Start
              your journey today and experience the power of AI.
            </motion.p>
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  onClick={onGetStarted}
                  className="bg-white text-gray-900 hover:bg-gray-100 text-xl px-12 py-6 shadow-2xl hover:shadow-3xl transition-all duration-200 font-semibold"
                >
                  <Sparkles className="mr-3 h-6 w-6" />
                  Start Creating Now - It's Free!
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-gray-900 text-xl px-12 py-6 bg-transparent backdrop-blur-sm transition-all duration-200 font-semibold"
                >
                  <Share2 className="mr-3 h-6 w-6" />
                  Share with Team
                </Button>
              </motion.div>
            </motion.div>
            <motion.p variants={itemVariants} className="text-white/70 text-sm mt-6">
              No credit card required • {metadata.credits} credit{metadata.credits > 1 ? "s" : ""} per use • Cancel
              anytime
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <motion.div
                className="flex items-center space-x-4 mb-6"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Image src="/assets/logo-modified.png" alt="TryZent" width={40} height={40} className="rounded-lg" />
                <div>
                  <span className="text-xl font-bold">TryZent AI Agents</span>
                  <div className="text-gray-400 text-sm">Powered by Advanced AI</div>
                </div>
              </motion.div>
              <p className="text-gray-400 leading-relaxed max-w-md">
                Transform your productivity with our suite of AI-powered tools. From education to fitness, travel to
                audio processing - we've got you covered.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="/browse" className="hover:text-white transition-colors">
                    All Agents
                  </a>
                </li>
                <li>
                  <a href="/dashboard" className="hover:text-white transition-colors">
                    Dashboard
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Support
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="/privacy-policy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms-and-conditions" className="hover:text-white transition-colors">
                    Terms & Conditions
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <motion.div
                className="text-gray-400 text-sm text-center md:text-left mb-4 md:mb-0"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <div>© 2024 TryZent. All rights reserved.</div>
                <div className="mt-1">Transforming productivity with AI</div>
              </motion.div>
              <motion.div
                className="flex space-x-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
