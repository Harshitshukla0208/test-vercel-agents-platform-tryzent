"use client"
import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, Play, Pause, Volume2, VolumeX, CheckCircle } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [showControls, setShowControls] = useState(true)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        console.log("Video autoplay prevented:", error)
      })
      setIsPlaying(true)
    }
    const hideTimer = setTimeout(() => setShowControls(false), 2000)
    return () => clearTimeout(hideTimer)
  }, [])

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  return (
    <section className="w-full min-h-[92vh] flex items-center px-4 sm:px-6 py-12 sm:py-16 bg-white relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-10 sm:top-20 right-5 sm:right-10 w-40 h-40 sm:w-72 sm:h-72 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 sm:bottom-20 left-5 sm:left-10 w-48 h-48 sm:w-96 sm:h-96 bg-blue-500/5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
          {/* Left Column */}
          <div className="text-center lg:text-left space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 rounded-full mb-2">
              <svg className="text-primary w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-primary font-semibold text-xs sm:text-sm">India&apos;s Multilingual AI Voice Tutor</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              From Primary School to{" "}
              <span className="whitespace-nowrap bg-gradient-to-r from-primary to-primary bg-clip-text text-transparent">
                Global Readiness
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Voice-first, curriculum-aligned AI learning in 12+ Indian languages. Making quality education accessible for every student - regardless of location, language, or economic background.
            </p>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start pt-2 sm:pt-4">
              <Button
                onClick={() => router.push('/login?view=signup')}
                className="group bg-primary hover:bg-primary/90 text-white px-6 sm:px-8 py-5 sm:py-6 rounded-xl font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                Try it out
                <motion.span
                  initial={{ rotate: 0 }}
                  whileHover={{ rotate: -45 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="inline-block"
                >
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300" />
                </motion.span>
              </Button>
              <Link href="https://calendly.com/tryzent-tech/30min" target="_blank" className="w-full sm:w-auto">
                <Button
                  className="group bg-white/50 text-primary hover:bg-white/80 border border-primary px-6 sm:px-8 py-5 sm:py-6 rounded-xl font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  Schedule Demo
                  <motion.span
                    initial={{ rotate: 0 }}
                    whileHover={{ rotate: -45 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    className="inline-block"
                  >
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300" />
                  </motion.span>
                </Button>
              </Link>

            </div>

            <div className="flex items-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>100% Curriculum Aligned</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>24/7 Available</span>
              </div>
            </div>

            {/* <div className="flex items-center gap-8 pt-4">
              <div>
                <div className="text-2xl text-gray-900">12+</div>
                <div className="text-gray-600">Languages Supported</div>
              </div>
              <div className="h-12 w-px bg-gray-300" />
              <div>
                <div className="text-2xl text-gray-900">100%</div>
                <div className="text-gray-600">Curriculum Aligned</div>
              </div>
              <div className="h-12 w-px bg-gray-300" />
              <div>
                <div className="text-2xl text-gray-900">∞</div>
                <div className="text-gray-600">Unlimited Learning</div>
              </div>
            </div> */}
          </div>

          {/* Right Column - Video */}
          <div className="relative w-full flex justify-center lg:justify-end mt-6 lg:mt-0">
            <div className="relative w-full max-w-2xl">
              <div className="group relative aspect-video rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl ring-1 ring-gray-200 transform hover:scale-105 transition-transform duration-500">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="/video-poster.jpg"
                >
                  <source src="/output_HD720.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent pointer-events-none"></div>

                {/* Video Controls */}
                <div
                  className={
                    `absolute bottom-3 sm:bottom-4 right-3 sm:right-4 flex gap-1.5 sm:gap-2 transition-opacity duration-300 ` +
                    `${showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} ` +
                    `group-hover:opacity-100 group-hover:pointer-events-auto`
                  }
                >
                  <Button
                    onClick={togglePlayPause}
                    size="sm"
                    className="bg-black/70 hover:bg-black/80 text-white border-0 rounded-full w-8 h-8 sm:w-10 sm:h-10 p-0 flex items-center justify-center backdrop-blur-sm"
                  >
                    {isPlaying ? (
                      <Pause className="w-3 h-3 sm:w-4 sm:h-4" />
                    ) : (
                      <Play className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5" />
                    )}
                  </Button>
                  <Button
                    onClick={toggleMute}
                    size="sm"
                    className="bg-black/70 hover:bg-black/80 text-white border-0 rounded-full w-8 h-8 sm:w-10 sm:h-10 p-0 flex items-center justify-center backdrop-blur-sm"
                  >
                    {isMuted ? (
                      <VolumeX className="w-3 h-3 sm:w-4 sm:h-4" />
                    ) : (
                      <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}