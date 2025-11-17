// Convert KaTeX slash-style delimiters to dollar delimiters for remark-math
// Matches the logic used in the leoqui project to keep sizing consistent
export function convertLatexNotation(text: string): string {
  if (!text || typeof text !== 'string') return text || ''
  
  try {
    // First, convert \( ... \) to $ ... $
    text = text.replace(/\\\((.+?)\\\)/g, '$$$1$$')
    // Convert \[ ... \] to $$ ... $$
    text = text.replace(/\\\[(.+?)\\\]/g, '$$$$$$1$$$$$$')
    
    // CRITICAL: Detect and wrap \begin{...}...\end{...} blocks that aren't already wrapped
    // This handles matrices, determinants, arrays, etc.
    // We need to handle nested blocks carefully
    const beginEndRegex = /\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g
    
    // First pass: find all begin/end blocks
    let match
    const matches: Array<{ full: string; start: number; end: number }> = []
    
    // Reset regex
    beginEndRegex.lastIndex = 0
    while ((match = beginEndRegex.exec(text)) !== null) {
      try {
        const fullMatch = match[0]
        const startPos = match.index
        const endPos = startPos + fullMatch.length
        
        // Validate the match is within bounds
        if (startPos < 0 || endPos > text.length) {
          continue
        }
        
        // Check if this block is already wrapped in delimiters
        const beforeMatch = text.substring(Math.max(0, startPos - 2), startPos)
        const afterMatch = text.substring(endPos, Math.min(text.length, endPos + 2))
        
        // Skip if already wrapped in $$ or $
        if (
          !(beforeMatch.endsWith('$$') || beforeMatch.endsWith('$')) &&
          !(afterMatch.startsWith('$$') || afterMatch.startsWith('$'))
        ) {
          matches.push({ full: fullMatch, start: startPos, end: endPos })
        }
      } catch (matchError) {
        // Skip invalid matches and continue
        console.warn('Error processing begin/end block match:', matchError)
        continue
      }
    }
    
    // Second pass: wrap unmatched blocks (process from end to start to preserve indices)
    let processedText = text
    for (let i = matches.length - 1; i >= 0; i--) {
      try {
        const { full, start, end } = matches[i]
        // Validate indices before processing
        if (start >= 0 && end <= processedText.length && start < end) {
          // Wrap in $$ delimiters for display math
          processedText = 
            processedText.substring(0, start) + 
            `$$${full}$$` + 
            processedText.substring(end)
        }
      } catch (wrapError) {
        // Skip invalid wraps and continue
        console.warn('Error wrapping begin/end block:', wrapError)
        continue
      }
    }
    
    return processedText
  } catch (error) {
    console.error('Error in convertLatexNotation:', error, text)
    // Return original text if processing fails
    return text
  }
}

/**
 * Processes text content to properly format LaTeX expressions
 * Converts $$ inline $$ and $$block$$ to markdown-compatible format
 */
export const processLatexContent = (text: string): string => {
    if (!text) return ''

    // Convert $$...$$ (display math) to $$\n...\n$$ for better rendering
    let processed = text.replace(/\$\$([^\$]+)\$\$/g, (match, content) => {
        return `$$${content.trim()}$$`
    })

    // Handle single $ for inline math (if needed)
    // processed = processed.replace(/\$([^\$]+)\$/g, (match, content) => {
    //   return `$${content.trim()}$`
    // })

    return processed
}

/**
 * Extracts plain text from LaTeX content (useful for editing)
 */
export const extractPlainText = (text: string): string => {
    if (!text) return ''
    // Remove LaTeX delimiters but keep the content
    return text.replace(/\$\$/g, '')
}

/**
 * Checks if text contains LaTeX expressions
 */
export const containsLatex = (text: string): boolean => {
    if (!text) return false
    // Check for delimiters and also begin/end blocks
    return /\$\$.*?\$\$/g.test(text) || 
           /\$.*?\$/g.test(text) || 
           /\\begin\{[^}]+\}.*?\\end\{[^}]+\}/g.test(text) ||
           /\\\(.*?\\\)/g.test(text) ||
           /\\\[.*?\\\]/g.test(text)
}