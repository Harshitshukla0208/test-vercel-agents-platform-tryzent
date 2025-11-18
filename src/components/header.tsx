"use client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import Image from "next/image"
import LeoquiIcon from "@/assets/create-profile/LeoQuiIconBall.png"
import { isAuthenticated, logout, checkUserProfile } from "@/utils/auth"

export function Header() {
  const router = useRouter()
  const [userState, setUserState] = useState({
    isLoggedIn: false,
    profileExists: false,
    loading: true
  })

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = isAuthenticated()
      if (!authenticated) {
        setUserState({
          isLoggedIn: false,
          profileExists: false,
          loading: false
        })
        return
      }
      const { exists } = await checkUserProfile()
      setUserState({
        isLoggedIn: true,
        profileExists: exists,
        loading: false
      })
    }
    checkAuth()
  }, [])

  const handleGetStarted = () => {
    router.push("login?view=signup")
  }

  const handleLogout = () => {
    logout()
  }

  const handleDashboard = async () => {
    if (!userState.profileExists) {
      router.push("/profile/create")
    } else {
      router.push("/dashboard")
    }
  }

  const handleLogin = () => {
    router.push('/login?view=login')
  }

  return (
    <header className="w-full px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-white">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg overflow-hidden flex items-center justify-center">
            <Image
              src={LeoquiIcon}
              alt="LeoQui Logo"
              width={36}
              height={36}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <span className="text-lg sm:text-xl md:text-2xl font-semibold text-[#714B90] tracking-wide">
            LeoQui
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
          {userState.loading ? (
            <div className="w-20 sm:w-24 md:w-28 h-9 sm:h-10 md:h-11 bg-gray-200 animate-pulse rounded-lg"></div>
          ) : !userState.isLoggedIn ? (
            <>
              <Button
                onClick={handleLogin}
                className="bg-white border border-primary text-primary hover:bg-primary/10 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 text-xs sm:text-sm md:text-[15px] rounded-lg font-medium"
                variant="outline"
              >
                Sign In
              </Button>
              <Button
                onClick={handleGetStarted}
                className="bg-primary hover:bg-primary/90 text-white px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 text-xs sm:text-sm md:text-[15px] rounded-lg font-medium"
              >
                Get Started
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleDashboard}
                className="bg-primary hover:bg-primary/90 text-white px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 text-xs sm:text-sm md:text-[15px] rounded-lg font-medium whitespace-nowrap"
              >
                {userState.profileExists ? "Dashboard" : "Create Profile"}
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="bg-white border border-primary text-primary hover:bg-primary/10 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 text-xs sm:text-sm md:text-[15px] rounded-lg font-medium"
              >
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}