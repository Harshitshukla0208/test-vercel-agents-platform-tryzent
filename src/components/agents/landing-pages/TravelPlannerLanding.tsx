import React, { useState, useEffect } from "react";
import type { Agent } from "@/lib/agentSlugs"
import Image from "next/image";
import LogoImage from '@/assets/logo.jpeg'
import {
    Plane,
    MapPin,
    Star,
    ArrowRight,
    Shield,
    Menu,
    X,
    Car,
    Utensils,
    Smartphone,
    AlertTriangle,
    DollarSign,
    FileText,
    Camera,
} from "lucide-react";
import Link from "next/link";
import Footer from "@/components/Home/Footer";
import SupportButton from "@/components/ShareSupportBtn";
import ContactPopup from "@/components/ContactPopup";

interface Metadata {
    title: string;
    description: string;
    features: string[];
    benefits: string[];
    keywords: string;
    category: string;
    rating: number;
    executionCount: number;
    credits: number;
}

interface TravelPlannerLandingProps {
    agent: Agent
    metadata?: Metadata
    onGetStarted?: () => void
}

interface VisibilityState {
    [key: string]: boolean;
}

interface Feature {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    title: string;
    description: string;
}

const TravelPlannerLanding: React.FC<TravelPlannerLandingProps> = ({
    metadata = {
        title: "AI Travel Planner",
        description: "Create personalized travel itineraries with AI",
        features: [
            "Smart Itineraries",
            "Budget Planning",
            "Local Insights",
            "Real-time Updates",
            "Multi-destination",
            "Travel Tips",
        ],
        benefits: [],
        keywords: "travel, planning, AI",
        category: "travel",
        rating: 4.8,
        executionCount: 25000,
        credits: 2,
    },
    onGetStarted = () => console.log("Get started clicked"),
}) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState<VisibilityState>({});
    const [showContactPopup, setShowContactPopup] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const section = entry.target.getAttribute("data-section");
                        if (section) {
                            setIsVisible((prev) => ({
                                ...prev,
                                [section]: true,
                            }));
                        }
                    }
                });
            },
            { threshold: 0.2, rootMargin: "0px 0px -100px 0px" }
        );

        const sections = document.querySelectorAll("[data-section]");
        sections.forEach((section) => observer.observe(section));

        window.addEventListener("scroll", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll);
            observer.disconnect();
        };
    }, []);

    const features: Feature[] = [
        {
            icon: FileText,
            title: "Detailed Itinerary",
            description: "Complete day-by-day plans with timings, locations, and activities",
        },
        {
            icon: Car,
            title: "Transportation Options",
            description: "Multiple transport modes with routes, timings, and booking links",
        },
        {
            icon: Utensils,
            title: "Budget-Based Restaurants",
            description: "Curated dining options that match your spending preferences",
        },
        {
            icon: Smartphone,
            title: "Local Apps & Tools",
            description: "Essential apps for navigation, translation, and local services",
        },
        {
            icon: AlertTriangle,
            title: "Dos & Don'ts Guide",
            description: "Cultural tips and important guidelines for your destination",
        },
        {
            icon: DollarSign,
            title: "Smart Budget Planner",
            description: "Detailed cost breakdown with money-saving recommendations",
        },
        {
            icon: Shield,
            title: "Visa Requirements",
            description: "Complete visa information and application guidance",
        },
        {
            icon: Camera,
            title: "Must-Visit Places",
            description: "Top attractions and hidden gems based on your interests",
        },
    ];

    const steps = [
        {
            number: "01",
            title: "Share Preferences",
            description: "Tell us your destination, dates, budget, and interests",
        },
        {
            number: "02",
            title: "AI Planning",
            description: "Our AI creates your comprehensive travel plan",
        },
        {
            number: "03",
            title: "Customize & Go",
            description: "Review, adjust, and start your perfect journey",
        },
    ];

    return (
        <div className="min-h-screen bg-white overflow-x-hidden">
            {/* Header */}
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-2">
                            <Image
                                src={LogoImage || "/placeholder.svg"}
                                alt="logo"
                                className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 rounded-md"
                            />
                            <div className="flex flex-col">
                                <Link href='/'>
                                    <span className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">AgentHub</span>
                                </Link>
                                <span className="text-xs sm:text-xs text-gray-500 leading-none">
                                    by{" "}
                                    <a
                                        href="https://tryzent.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                                    >
                                        Tryzent
                                    </a>
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <SupportButton
                                onClick={() => setShowContactPopup(true)}
                                className="text-indigo-600 hover:text-indigo-900 border-indigo-200 hover:border-indigo-300 duration-150 transform hover:scale-105"
                            />
                            <button
                                onClick={onGetStarted}
                                className="hidden md:inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-all duration-150 transform hover:scale-105"
                            >
                                Start Planning
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 sm:pt-28">
                {/* Background Image */}
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:%23e0f2fe;stop-opacity:1" /><stop offset="100%" style="stop-color:%23b3e5fc;stop-opacity:1" /></linearGradient></defs><rect width="100%" height="100%" fill="url(%23skyGrad)"/><polygon points="0,600 200,500 400,550 600,450 800,500 1000,400 1200,450 1200,800 0,800" fill="%2381c784" opacity="0.8"/><polygon points="0,650 150,580 300,620 450,550 600,590 750,520 900,560 1050,500 1200,540 1200,800 0,800" fill="%2366bb6a" opacity="0.9"/><polygon points="100,200 200,150 300,180 400,120 500,160 600,100 700,140 800,90 900,130 1000,80 1100,120 1200,70 1200,0 0,0" fill="%23fff" opacity="0.9"/><polygon points="50,300 180,250 320,280 480,220 640,260 820,200 980,240 1200,180 1200,0 0,0" fill="%23f5f5f5" opacity="0.8"/></svg>')`
                    }}>
                </div>

                {/* Overlay for better text readability */}
                <div className="absolute inset-0 bg-white/10"></div>

                <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
                    <div className="space-y-8">
                        <div className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-indigo-700 text-sm font-medium border border-indigo-100 shadow-sm">
                            ✨ AI-Powered Travel Planning
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-gray-900 leading-tight drop-shadow-sm">
                            Explore The World
                            <span className="block text-indigo-600 mt-2">With AI Planning</span>
                        </h1>

                        <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed drop-shadow-sm">
                            Create comprehensive travel itineraries with detailed schedules, budget planning, visa requirements, and local recommendations.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                            <button
                                onClick={onGetStarted}
                                className="inline-flex items-center justify-center px-10 py-4 bg-indigo-600 text-white rounded-xl text-lg font-semibold hover:bg-indigo-700 transition-all duration-150 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                            >
                                <MapPin className="mr-2 h-5 w-5" />
                                Start Your Journey 
                            </button>
                            <button
                                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                                className="inline-flex items-center justify-center px-10 py-4 bg-white/90 backdrop-blur-sm text-indigo-600 border border-indigo-200 rounded-xl text-lg font-semibold hover:bg-white transition-all duration-150 shadow-lg hover:shadow-xl"
                            >
                                Explore Features
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600 bg-white/80 backdrop-blur-sm rounded-2xl py-4 px-8 mx-auto max-w-2xl shadow-lg">
                            <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 text-indigo-500 fill-current" />
                                <span className="font-medium">{metadata.rating.toFixed(1)}/5 rating</span>
                            </div>
                            <div className="font-medium">{metadata.executionCount.toLocaleString()}+ trips planned</div>
                            <div className="font-medium">{metadata.credits} credits per execution</div>
                        </div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                    <div className="w-6 h-10 border-2 border-gray-200 rounded-full flex justify-center">
                        <div className="w-1 h-3 bg-gray-200 rounded-full mt-2 animate-pulse"></div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section
                id="features"
                data-section="features"
                className={`py-16 bg-gray-50 transition-all duration-400 ${isVisible?.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                            Complete Travel Planning Suite
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Everything you need for a perfect trip, powered by AI
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-1"
                            >
                                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 transition-colors">
                                    <feature.icon className="h-6 w-6 text-indigo-600" />
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2 text-lg">{feature.title}</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="pb-8 bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <div className="space-y-8">
                        <button
                            onClick={onGetStarted}
                            className="inline-flex border border-indigo-300 items-center px-12 py-4 bg-white text-indigo-600 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-all duration-150 transform hover:scale-105 shadow-lg"
                        >
                            <Plane className="mr-2 h-5 w-5" />
                            Start Your Journey
                        </button>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section
                id="how-it-works"
                data-section="process"
                className={`py-20 bg-white transition-all duration-400 ${isVisible?.process ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                            How It Works
                        </h2>
                        <p className="text-xl text-gray-600">
                            From idea to comprehensive travel plan in three simple steps
                        </p>
                    </div>

                    <div className="relative">
                        {/* Desktop connecting line */}
                        <div className="hidden md:block absolute top-8 left-0 right-0 h-0.5 bg-indigo-100">
                            <div className="absolute inset-0 flex">
                                <div className="flex-1"></div>
                                <div className="w-16 bg-white"></div>
                                <div className="flex-1 bg-indigo-100"></div>
                                <div className="w-16 bg-white"></div>
                                <div className="flex-1"></div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-12 relative">
                            {steps.map((step, index) => (
                                <div
                                    key={index}
                                    className="text-center relative"
                                >
                                    <div className="relative mb-8">
                                        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg transition-transform duration-150 hover:scale-110 relative z-10">
                                            <span className="text-white font-bold text-xl">{step.number}</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                                    <p className="text-gray-600 leading-relaxed">{step.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-indigo-600">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <div className="space-y-8">
                        <h2 className="text-3xl lg:text-4xl font-bold text-white">
                            Ready to Plan Your Adventure?
                        </h2>
                        <p className="text-xl text-indigo-100 max-w-2xl mx-auto">
                            Join travelers who create perfect journeys with comprehensive AI planning
                        </p>
                        <button
                            onClick={onGetStarted}
                            className="inline-flex items-center px-12 py-4 bg-white text-indigo-600 rounded-lg text-xl font-semibold hover:bg-gray-50 transition-all duration-150 transform hover:scale-105 shadow-lg"
                        >
                            <Plane className="mr-2 h-6 w-6" />
                            Start Your Journey
                        </button>
                        {/* <p className="text-indigo-200 text-sm">
                            • Get 50 free credits • {metadata.credits} credits per use
                        </p> */}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <Footer />

            <ContactPopup isOpen={showContactPopup} onClose={() => setShowContactPopup(false)} trigger="credits" />
        </div>
    );
};

export default TravelPlannerLanding;