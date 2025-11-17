import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: {
        default: "Tryzent - Discover & Use AI Solutions for Every Use Case",
        template: "%s | Tryzent"
    },
    description: "Explore a comprehensive marketplace of specialized AI agents tailored for business, creativity, automation, and more. Find the perfect AI solution for your specific needs and boost productivity instantly.",
    keywords: [
        "AI agents",
        "artificial intelligence",
        "AI marketplace",
        "automation tools",
        "business AI",
        "AI solutions",
        "machine learning",
        "AI assistant",
        "workflow automation",
        "AI platform",
        "intelligent agents",
        "AI services"
    ],
    authors: [{ name: "Tryzent Team" }],
    creator: "Tryzent",
    publisher: "Tryzent",
    metadataBase: new URL("https://agents.tryzent.com"),
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    openGraph: {
        type: "website",
        locale: "en_US",
        url: "https://agents.tryzent.com",
        siteName: "Tryzent",
        title: "Tryzent - Discover & Deploy AI Solutions for Every Use Case",
        description: "Explore a comprehensive marketplace of specialized AI agents tailored for business, creativity, automation, and more. Find the perfect AI solution for your specific needs.",
        images: [
            {
                url: "https://agents.tryzent.com/og-image.png", // Must be a full URL
                width: 1200,
                height: 630,
                alt: "Tryzent - Marketplace for AI Solutions",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Tryzent - Discover & Use AI Solutions",
        description: "Explore specialized AI agents for business, creativity, and automation. Find your perfect AI solution today.",
        images: ["https://agents.tryzent.com/og-image.png"], // Full URL
        creator: "@yourtwitterhandle",
    },
    category: "Technology",
    classification: "AI Platform",
    alternates: {
        canonical: "https://agents.tryzent.com", // Replace with your actual domain
    },
    verification: {
        google: "your-google-verification-code", // Add your Google Search Console verification
        // yandex: "your-yandex-verification-code",
        // bing: "your-bing-verification-code",
    },
    other: {
        "apple-mobile-web-app-capable": "yes",
        "apple-mobile-web-app-status-bar-style": "default",
        "apple-mobile-web-app-title": "Tryzent",
        "format-detection": "telephone=no",
        "mobile-web-app-capable": "yes",
        "msapplication-config": "/browserconfig.xml",
        "msapplication-TileColor": "#000000",
        "msapplication-tap-highlight": "no",
        "theme-color": "#000000",
    },
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <GoogleAnalytics />
                {children}
            </body>
        </html>
    );
}
