"use client"
import { motion } from "framer-motion"
import { Utensils } from "lucide-react"

export const DietPlannerLoader = () => {
  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Floating Utensils Icon */}
      <motion.div
        animate={{ y: [-8, 8, -8] }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        <Utensils className="w-12 h-12 text-blue-600" />
      </motion.div>

      {/* Progress Bar */}
      <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-600 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{
            duration: 1.7,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      </div>
    </div>
  )
}
