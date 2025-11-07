// Dynamic agent data fetching
export interface Agent {
  agent_id: string
  agent_Name: string
  agent_description: string
  agent_rating: number
  agent_Type: string
  execution_credit: number
  execution_count: number
  Logo_URL: string | null
  agent_Category: string
}

export interface AgentResponse {
  status: boolean
  message: string
  data: Agent[]
  meta: {
    total_records: number
    page: number
    page_size: number
    total_pages: number
  }
}

// Cache for agents data
let agentsCache: Agent[] | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function fetchAllAgents(): Promise<Agent[]> {
  // Return cached data if still valid
  if (agentsCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return agentsCache
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://agents.tryzent.com"
    const response = await fetch(`${baseUrl}/api/dashboard?page=1&page_size=50`, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 300 }, // Revalidate every 5 minutes
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch agents: ${response.status}`)
    }

    const data: AgentResponse = await response.json()

    if (!data.status || !Array.isArray(data.data)) {
      throw new Error("Invalid response format")
    }

    // Update cache
    agentsCache = data.data
    cacheTimestamp = Date.now()

    return data.data
  } catch (error) {
    console.error("Error fetching agents:", error)
    // Return empty array on error
    return []
  }
}

// Generate slug from agent name
export function generateSlug(agentName: string): string {
  return agentName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .trim()
}

// Get agent by slug
export async function getAgentBySlug(slug: string): Promise<Agent | null> {
  const agents = await fetchAllAgents()
  return agents.find((agent) => generateSlug(agent.agent_Name) === slug) || null
}

// Get agent by ID
export async function getAgentById(agentId: string): Promise<Agent | null> {
  const agents = await fetchAllAgents()
  return agents.find((agent) => agent.agent_id === agentId) || null
}

// Generate all possible slugs for static generation
export async function getAllAgentSlugs(): Promise<string[]> {
  const agents = await fetchAllAgents()
  return agents.map((agent) => generateSlug(agent.agent_Name))
}

// Agent metadata generation
export function generateAgentMetadata(agent: Agent) {
  const slug = generateSlug(agent.agent_Name)

  // Category-specific keywords and features
  const categoryData = getCategoryData(agent.agent_Category, agent.agent_Name)

  return {
    title: `${agent.agent_Name} - AI-Powered ${categoryData.type} | TryZent`,
    description: agent.agent_description,
    keywords: categoryData.keywords,
    features: categoryData.features,
    benefits: categoryData.benefits,
    slug,
    category: agent.agent_Category,
    rating: agent.agent_rating,
    executionCount: agent.execution_count,
    credits: agent.execution_credit,
  }
}

function getCategoryData(category: string, agentName: string) {
  const categoryMap: Record<string, any> = {
    Education: {
      type: "Educational Tool",
      keywords: "AI education, lesson planning, test generation, educational technology, teaching assistant",
      features: [
        "Curriculum-aligned content generation",
        "Interactive learning activities",
        "Assessment and evaluation tools",
        "Professional formatting",
        "Export to multiple formats",
      ],
      benefits: [
        "Save hours of preparation time",
        "Ensure educational standards compliance",
        "Create engaging learning experiences",
        "Professional presentation quality",
        "Easy sharing and collaboration",
      ],
    },
    Fitness: {
      type: "Fitness & Health Tool",
      keywords: "AI fitness, workout planning, diet planning, health optimization, personal trainer",
      features: [
        "Personalized recommendations",
        "Goal-oriented planning",
        "Progress tracking capabilities",
        "Flexible scheduling options",
        "Equipment-based customization",
      ],
      benefits: [
        "Achieve health goals faster",
        "Professional guidance at home",
        "Customized to your lifestyle",
        "Cost-effective fitness solution",
        "Sustainable habit formation",
      ],
    },
    Travel: {
      type: "Travel Planning Tool",
      keywords: "AI travel planner, trip planning, itinerary generator, travel assistant, vacation planning",
      features: [
        "Personalized itinerary creation",
        "Local recommendations and insights",
        "Budget planning and optimization",
        "Real-time travel information",
        "Multi-destination support",
      ],
      benefits: [
        "Discover hidden gems and local favorites",
        "Optimize travel time and budget",
        "Stress-free trip planning",
        "Expert local knowledge",
        "Memorable travel experiences",
      ],
    },
    Audio: {
      type: "Audio Processing Tool",
      keywords: "AI audio processing, transcription, audio analysis, voice notes, audio summarization",
      features: [
        "Advanced audio transcription",
        "Key insights extraction",
        "Multiple format support",
        "Searchable content creation",
        "Summary generation",
      ],
      benefits: [
        "Never miss important details",
        "Save time on note-taking",
        "Easy content review and search",
        "Professional documentation",
        "Enhanced productivity",
      ],
    },
  }

  return (
    categoryMap[category] || {
      type: "AI Tool",
      keywords: `AI ${agentName.toLowerCase()}, artificial intelligence, automation, productivity`,
      features: [
        "AI-powered automation",
        "User-friendly interface",
        "Fast processing",
        "Reliable results",
        "Easy integration",
      ],
      benefits: [
        "Increased productivity",
        "Time-saving automation",
        "Professional results",
        "Easy to use",
        "Cost-effective solution",
      ],
    }
  )
}
