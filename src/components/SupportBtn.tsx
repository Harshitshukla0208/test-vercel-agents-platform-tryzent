"use client"
import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"

interface SupportButtonProps {
    onClick: () => void
    className?: string
    variant?: "default" | "outline" | "ghost"
    size?: "sm" | "default" | "lg"
}

export default function SupportButton({
    onClick,
    className = "",
    variant = "outline",
    size = "sm",
}: SupportButtonProps) {
    return (
        <Button onClick={onClick} variant={variant} size={size} className={`flex items-center gap-2 ${className}`}>
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Support</span>
        </Button>
    )
}
