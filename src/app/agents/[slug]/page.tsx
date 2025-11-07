import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getAgentBySlug, generateAgentMetadata, getAllAgentSlugs } from "@/lib/agentSlugs"
import AgentPage from "@/components/agents/AgentPage"

interface Props {
  params: Promise<{ slug: string }>
}

// This generates static pages for each agent at build time
export async function generateStaticParams() {
  try {
    const slugs = await getAllAgentSlugs()
    console.log(`Generating static pages for ${slugs.length} agents:`, slugs)
    return slugs.map((slug) => ({
      slug,
    }))
  } catch (error) {
    console.error("Error generating static params:", error)
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params
    const agent = await getAgentBySlug(slug)

    if (!agent) {
      return {
        title: "Agent Not Found | TryZent AI Agents",
        description: "The requested AI agent could not be found. Explore our other AI-powered tools.",
        robots: "noindex, nofollow",
      }
    }

    const metadata = generateAgentMetadata(agent)

    return {
      title: metadata.title,
      description: metadata.description,
      keywords: metadata.keywords,
      authors: [{ name: "TryZent" }],
      creator: "TryZent",
      publisher: "TryZent",
      robots: "index, follow",
      openGraph: {
        title: metadata.title,
        description: metadata.description,
        type: "website",
        url: `https://agents.tryzent.com/agents/${slug}`,
        siteName: "TryZent AI Agents",
        locale: "en_US",
        images: [
          {
            url: "/assets/bannerImage.png",
            width: 1200,
            height: 630,
            alt: metadata.title,
            type: "image/png",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        site: "@tryzent",
        creator: "@tryzent",
        title: metadata.title,
        description: metadata.description,
        images: ["/assets/bannerImage.png"],
      },
      alternates: {
        canonical: `https://agents.tryzent.com/agents/${slug}`,
      },
      other: {
        "application-name": "TryZent AI Agents",
        "apple-mobile-web-app-title": "TryZent AI Agents",
        "apple-mobile-web-app-capable": "yes",
        "apple-mobile-web-app-status-bar-style": "default",
        "format-detection": "telephone=no",
        "mobile-web-app-capable": "yes",
        "msapplication-config": "/browserconfig.xml",
        "msapplication-TileColor": "#2563eb",
        "msapplication-tap-highlight": "no",
        "theme-color": "#2563eb",
      },
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
    return {
      title: "Agent Not Found | TryZent AI Agents",
      description: "The requested AI agent could not be found. Explore our other AI-powered tools.",
      robots: "noindex, nofollow",
    }
  }
}

export default async function AgentSlugPage({ params }: Props) {
  try {
    const { slug } = await params
    const agent = await getAgentBySlug(slug)

    if (!agent) {
      notFound()
    }

    const metadata = generateAgentMetadata(agent)

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: agent.agent_Name,
      description: agent.agent_description,
      url: `https://agents.tryzent.com/agents/${slug}`,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      softwareVersion: "1.0",
      datePublished: "2024-01-01",
      dateModified: new Date().toISOString().split("T")[0],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        validFrom: "2024-01-01",
      },
      provider: {
        "@type": "Organization",
        name: "TryZent",
        url: "https://agents.tryzent.com",
        logo: {
          "@type": "ImageObject",
          url: "https://agents.tryzent.com/assets/logo-modified.png",
          width: 200,
          height: 200,
        },
        sameAs: ["https://twitter.com/tryzent", "https://linkedin.com/company/tryzent"],
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: agent.agent_rating,
        ratingCount: Math.max(agent.execution_count, 10),
        bestRating: 5,
        worstRating: 1,
      },
      category: agent.agent_Category,
      featureList: metadata.features,
      screenshot: {
        "@type": "ImageObject",
        url: "https://agents.tryzent.com/assets/bannerImage.png",
        width: 1200,
        height: 630,
      },
      applicationSubCategory: metadata.category,
      downloadUrl: `https://agents.tryzent.com/agents/${slug}`,
      installUrl: `https://agents.tryzent.com/agents/${slug}`,
      permissions: "No special permissions required",
      storageRequirements: "Minimal storage required",
      memoryRequirements: "Standard browser memory",
      processorRequirements: "Any modern processor",
    }

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData, null, 2) }}
        />
        <AgentPage slug={slug} agent={agent} metadata={metadata} />
      </>
    )
  } catch (error) {
    console.error("Error rendering agent page:", error)
    notFound()
  }
}

// Enable static generation for better SEO and performance
export const dynamic = "force-static"
export const revalidate = 3600 // Revalidate every hour
