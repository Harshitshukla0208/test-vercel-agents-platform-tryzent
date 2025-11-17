import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

// Utility function to convert LaTeX notation
const convertLatexNotation = (content: string): string => {
  if (!content || typeof content !== 'string') return ''
  
  let result = content
  
  // Convert \( \) to $ $
  result = result.replace(/\\\(/g, '$').replace(/\\\)/g, '$')
  
  // Convert \[ \] to $$ $$
  result = result.replace(/\\\[/g, '$$').replace(/\\\]/g, '$$')
  
  // Normalize whitespace around delimiters
  result = result.replace(/\$\s+/g, '$').replace(/\s+\$/g, '$')
  
  return result
}

interface MathRendererProps {
  content: string
  className?: string
}

const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  let normalized: string
  let hasMatrix = false
  
  try {
    if (!content || typeof content !== 'string') {
      return <span className={className}>{String(content || '')}</span>
    }
    
    normalized = convertLatexNotation(content)
    // Check if content contains matrix/determinant structures
    hasMatrix = /\\begin\{[^}]+\}.*?\\end\{[^}]+\}/.test(content) || 
                /\\left\|.*?\\right\|/.test(content) ||
                /\\left\[.*?\\right\]/.test(content)
  } catch (error) {
    console.error('Error processing math content:', error, content)
    return <span className={className}>{String(content || '')}</span>
  }

  try {
    return (
      <div className={`${className} ${hasMatrix ? 'matrix-container' : ''}`}>
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
          components={{
            p: ({ children }) => <span>{children}</span>,
            div: ({ children }) => <span>{children}</span>,
            ol: ({ children }) => <ol className="list-decimal list-inside">{children}</ol>,
            li: ({ children }) => <li className="mb-1">{children}</li>,
            table: ({ children }) => (
              <table className="border-collapse border border-gray-300 my-4 min-w-[300px]">
                {children}
              </table>
            ),
            thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => <tr className="border border-gray-300">{children}</tr>,
            th: ({ children }) => (
              <th className="border border-gray-300 px-4 py-2 text-left font-semibold bg-gray-50">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-gray-300 px-4 py-2">{children}</td>
            ),
          }}
        >
          {normalized}
        </ReactMarkdown>

        {/* Enhanced KaTeX styling for matrices and display math */}
        <style jsx>{`
          /* Base font size for all math */
          :global(.katex) {
            font-size: 1.3em !important;
          }
          
          /* Display math ($$...$$) styling - CRITICAL FOR MATRICES */
          :global(.katex-display) {
            font-size: 1.3em !important;
            margin: 2rem auto !important; /* INCREASED vertical spacing */
            padding: 1rem 0 !important;
            text-align: center;
            overflow-x: auto;
            overflow-y: visible !important; /* Changed to visible */
            display: block !important;
            min-height: fit-content !important; /* Ensure full height */
          }
          
          /* Prevent overlap between consecutive display math blocks */
          :global(.katex-display + .katex-display) {
            margin-top: 2.5rem !important;
          }
          
          /* Matrix-specific styling - COMPACT HORIZONTAL, SPACIOUS VERTICAL */
          :global(.katex .arraycolsep) {
            width: 0.6em !important;
          }
          
          :global(.katex .arraystretch) {
            height: 1.5 !important;
          }
          
          /* Ensure matrices render with proper vertical space */
          :global(.katex .vlist-t) {
            display: inline-table !important;
            margin: 0.3em 0 !important;
            vertical-align: middle !important;
          }
          
          /* Matrix delimiters (|, [, etc.) */
          :global(.katex .delimsizing) {
            font-size: 1.3em !important;
            vertical-align: middle !important;
          }
          
          /* Matrix rows */
          :global(.katex .array .vlist-t) {
            margin: 0.3em 0 !important;
          }
          
          /* Matrix cells - COMPACT HORIZONTAL SPACING */
          :global(.katex .array .arraycol) {
            padding: 0 0.2em !important;
          }
          
          :global(.katex .array td) {
            padding: 0.5em 0.35em !important;
            vertical-align: middle !important;
          }
          
          /* Container for matrices - ensure proper spacing */
          :global(.matrix-container .katex) {
            margin: 0 0.4em !important;
            display: inline-block !important;
            vertical-align: middle !important;
          }
          
          /* Display matrices in matrix containers */
          :global(.matrix-container .katex-display) {
            margin: 2rem auto !important;
            display: block !important;
            overflow: visible !important; /* Prevent clipping */
          }
          
          /* Inline math spacing */
          :global(.katex:not(.katex-display)) {
            margin: 0 0.25em !important;
            vertical-align: middle !important;
          }
          
          /* Specific spacing for array environments */
          :global(.katex-display .array) {
            margin: 0.8em auto !important;
            display: inline-block !important;
          }
          
          /* Spacing between matrix rows */
          :global(.katex .array .vlist) {
            margin: 0.3em 0 !important;
          }
          
          /* Matrix delimiter spacing - HORIZONTAL ONLY */
          :global(.katex .delimsizing.size1),
          :global(.katex .delimsizing.size2),
          :global(.katex .delimsizing.size3),
          :global(.katex .delimsizing.size4) {
            margin: 0 0.25em !important;
          }
          
          /* Vertical alignment for matrix content */
          :global(.katex .array .vlist-r) {
            vertical-align: middle !important;
          }
          
          /* Row height in arrays */
          :global(.katex .arrayrow) {
            line-height: 1.8 !important; /* Increased for better visibility */
          }
          
          /* Special handling for fractions in display mode */
          :global(.katex-display .frac-line) {
            border-bottom-width: 0.06em !important;
          }
          
          /* Ensure proper spacing in option lists */
          :global(.space-y-3 .katex),
          :global(.space-y-3 .katex-display) {
            margin-top: 1.2rem !important;
            margin-bottom: 1.2rem !important;
          }
          
          :global(.space-y-4 .katex-display) {
            margin: 2rem auto !important;
          }
          
          /* Prevent tight spacing in containers */
          :global([class*="space-y"] .katex-display) {
            margin: 2rem auto !important;
          }
          
          /* Spacing in question text and options */
          :global(.font-medium .katex),
          :global(.leading-relaxed .katex) {
            margin: 0.6em 0.3em !important;
          }
          
          /* MCQ options with matrices */
          :global(.ml-6 .katex-display) {
            margin: 1.5rem auto !important;
          }
          
          /* Inline matrices should still be inline */
          :global(.inline .katex) {
            margin: 0 0.3em !important;
            display: inline !important;
          }
          
          /* Extra space between question and matrix */
          :global(.mb-2 .katex-display),
          :global(.mb-3 .katex-display) {
            margin: 2rem auto !important;
          }
          
          /* Matrix spacing in different contexts */
          :global(.leading-relaxed .katex-display) {
            margin: 1.8rem auto !important;
          }
          
          /* Flex containers with matrices */
          :global(.flex .katex),
          :global(.flex-1 .katex) {
            margin: 1em 0.4em !important;
          }
          
          /* CRITICAL: Ensure \left| \right| (determinants) render properly */
          :global(.katex .minner) {
            vertical-align: middle !important;
          }
          
          :global(.katex .mopen),
          :global(.katex .mclose) {
            vertical-align: middle !important;
          }
          
          /* Ensure absolute value bars and determinant bars are visible */
          :global(.katex .vlist-s) {
            display: inline-block !important;
          }
          
          /* Fix for nested arrays/matrices */
          :global(.katex .array .array) {
            margin: 0 !important;
          }
          
          /* Prevent math from being cut off */
          :global(.katex-html) {
            overflow: visible !important;
          }
          
          /* Base container should allow overflow */
          :global(.katex .base) {
            display: inline-block !important;
            overflow: visible !important;
          }
        `}</style>
      </div>
    )
  } catch (error) {
    console.error('Error rendering math content:', error, content)
    return <span className={className}>{String(content || '')}</span>
  }
}

export default MathRenderer