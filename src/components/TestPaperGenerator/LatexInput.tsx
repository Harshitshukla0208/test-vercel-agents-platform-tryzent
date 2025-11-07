import React, { useState, useRef, useEffect } from 'react'
import MathRenderer from './MathRenderer'

interface LatexInputProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    multiline?: boolean
}

const LatexInput: React.FC<LatexInputProps> = ({
    value,
    onChange,
    placeholder = "Enter text with LaTeX...",
    className = "",
    multiline = false
}) => {
    const [isFocused, setIsFocused] = useState(false)
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

    // Auto-resize textarea
    useEffect(() => {
        if (multiline && inputRef.current) {
            const textarea = inputRef.current as HTMLTextAreaElement
            textarea.style.height = 'auto'
            textarea.style.height = textarea.scrollHeight + 'px'
        }
    }, [value, multiline])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        onChange(e.target.value)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // No special key handling needed
    }

    const InputComponent = multiline ? 'textarea' : 'input'

    return (
        <div className="relative">
            {/* Input Field */}
            <div className="relative">
                <InputComponent
                    ref={inputRef as any}
                    value={value}
                    onChange={handleInputChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={`w-full ${className} ${isFocused ? 'ring-2 ring-blue-500' : ''}`}
                    style={multiline ? { minHeight: '2.5rem', resize: 'vertical' } : {}}
                />
            </div>

            {/* Inline LaTeX Preview (when focused) */}
            {value && isFocused && (
                <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                    <div className="font-medium mb-1">Live Preview:</div>
                    <MathRenderer content={value} className="text-sm" />
                </div>
            )}
        </div>
    )
}

export default LatexInput
