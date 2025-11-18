'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";

export function CTAsection() {
    const router = useRouter();

    return (
        <section className="py-20 px-6 bg-gradient-to-b from-purple-50 to-white">
            <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                    Start Your Learning Journey Today
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                    Join thousands of students transforming their education with AI-powered voice tutoring
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button onClick={() => router.push('/login?view=signup')} className="px-8 py-3 bg-primary hover:bg-primary/90 text-white text-base rounded-xl transition-all shadow-xl hover:shadow-2xl w-full sm:w-auto">
                        Get Started Free
                    </button>
                    <Link href="https://calendly.com/tryzent-tech/30min" target="_blank" className="w-full sm:w-auto">
                        <button className="px-8 py-3 border-2 border-primary text-primary text-base rounded-xl hover:bg-primary/10 transition-all w-full sm:w-auto">
                            Schedule Demo
                        </button>
                    </Link>
                </div>
            </div>
        </section>
    )
}