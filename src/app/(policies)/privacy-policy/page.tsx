'use client'
import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import logo from '../../../assets/logo.jpeg'; // Adjust path as needed

const PrivacyPolicy: React.FC = () => {
    const router = useRouter();

    const buttonVariants = {
        hover: { scale: 1.05 },
        tap: { scale: 0.95 },
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                            <Image
                                src={logo}
                                alt="Tryzent Logo"
                                width={28}
                                height={28}
                                className="cursor-pointer sm:w-8 sm:h-8"
                            />
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tryzent</h1>
                        </div>
                        <motion.button
                            onClick={() => router.back()}
                            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </motion.button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
                <motion.div
                    className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 lg:p-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="mb-6 sm:mb-8">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
                        <p className="text-sm sm:text-base text-gray-600">Last updated: May 25, 2025</p>
                    </div>

                    <div className="prose prose-gray max-w-none space-y-6 sm:space-y-8">
                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">1. Introduction</h2>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                                At Tryzent, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI chatbot platform and services.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">2. Information We Collect</h2>
                            
                            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-3">Personal Information</h3>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                                We collect information that you provide directly to us, including:
                            </p>
                            <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1 sm:space-y-2 mb-4 sm:mb-6 pl-2 sm:pl-0">
                                <li>Name and email address when you create an account</li>
                                <li>Payment information for subscription services</li>
                                <li>Communication preferences and settings</li>
                                <li>Support requests and correspondence</li>
                            </ul>

                            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-3">Usage Information</h3>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                                We automatically collect certain information about your use of our service:
                            </p>
                            <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1 sm:space-y-2 mb-4 sm:mb-6 pl-2 sm:pl-0">
                                <li>Device information (IP address, browser type, operating system)</li>
                                <li>Usage patterns and feature interactions</li>
                                <li>Assistants performance and analytics data</li>
                                <li>Log files and technical data</li>
                            </ul>

                            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-3">Chatbot Data</h3>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                                When you create and use Assistant through our platform:
                            </p>
                            <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1 sm:space-y-2 pl-2 sm:pl-0">
                                <li>Training data and conversation flows you input</li>
                                <li>Assistants configurations and customizations</li>
                                <li>End-user interactions with your assistants (if analytics enabled)</li>
                                <li>Performance metrics and usage statistics</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">3. How We Use Your Information</h2>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                                We use the collected information for the following purposes:
                            </p>
                            <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1 sm:space-y-2 pl-2 sm:pl-0">
                                <li>Provide, maintain, and improve our services</li>
                                <li>Process transactions and manage subscriptions</li>
                                <li>Send important service communications and updates</li>
                                <li>Provide customer support and technical assistance</li>
                                <li>Analyze usage patterns to enhance user experience</li>
                                <li>Ensure platform security and prevent abuse</li>
                                <li>Comply with legal obligations and protect our rights</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">4. Information Sharing and Disclosure</h2>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                                We do not sell, trade, or otherwise transfer your personal information to third parties, except in the following circumstances:
                            </p>
                            
                            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-3">Service Providers</h3>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                                We may share information with trusted third-party service providers who assist us in operating our platform, including:
                            </p>
                            <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1 sm:space-y-2 mb-4 sm:mb-6 pl-2 sm:pl-0">
                                <li>Cloud hosting and infrastructure providers</li>
                                <li>Payment processing companies</li>
                                <li>Analytics and monitoring services</li>
                                <li>Customer support platforms</li>
                            </ul>

                            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-3">Legal Requirements</h3>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                                We may disclose information when required by law or to:
                            </p>
                            <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1 sm:space-y-2 pl-2 sm:pl-0">
                                <li>Comply with legal processes or government requests</li>
                                <li>Protect our rights, property, or safety</li>
                                <li>Prevent fraud or security issues</li>
                                <li>Enforce our terms of service</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">5. Data Security</h2>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                                We implement appropriate technical and organizational measures to protect your information, including:
                            </p>
                            <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1 sm:space-y-2 pl-2 sm:pl-0">
                                <li>Encryption of data in transit and at rest</li>
                                <li>Regular security assessments and updates</li>
                                <li>Access controls and authentication measures</li>
                                <li>Secure data centers and infrastructure</li>
                                <li>Employee training on data protection practices</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">6. Data Retention</h2>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                                We retain your information for as long as necessary to provide our services and fulfill the purposes outlined in this policy. Account information is retained until you delete your account, after which we may retain certain data for legitimate business purposes or legal compliance requirements.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">7. Your Rights and Choices</h2>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                                You have the following rights regarding your personal information:
                            </p>
                            <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1 sm:space-y-2 pl-2 sm:pl-0">
                                <li><strong>Access:</strong> Request information about the data we have about you</li>
                                <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                                <li><strong>Portability:</strong> Request export of your data in a portable format</li>
                                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">8. AI and Machine Learning</h2>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                                Our AI systems may process and learn from data to improve chatbot performance. We implement privacy-preserving techniques and do not use personal information for AI training without appropriate safeguards. Users maintain control over their chatbot training data and can opt out of certain data processing activities.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">9. International Data Transfers</h2>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                                Your information may be processed and stored in countries other than your own. We ensure appropriate safeguards are in place for international data transfers, including standard contractual clauses and adequacy decisions where applicable.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">10. Children's Privacy</h2>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                                Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected information from a child under 13, we will take steps to delete that information promptly.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">11. Cookies and Tracking Technologies</h2>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                                We use cookies and similar technologies to:
                            </p>
                            <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1 sm:space-y-2 pl-2 sm:pl-0">
                                <li>Remember your preferences and settings</li>
                                <li>Analyze platform usage and performance</li>
                                <li>Provide personalized experiences</li>
                                <li>Ensure platform security</li>
                            </ul>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mt-3 sm:mt-4">
                                You can control cookie settings through your browser preferences.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">12. Changes to This Privacy Policy</h2>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                                We may update this Privacy Policy from time to time. We will notify you of any material changes by email or through our platform. The updated policy will be effective when posted, and your continued use constitutes acceptance of the changes.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">13. Contact Us</h2>
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                                If you have any questions about this Privacy Policy or our data practices, please contact us:
                            </p>
                            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                                    <strong>Email:</strong> contact@tryzent.com<br />
                                    <strong>Address:</strong>  Lajpat Nagar, New Delhi, India <br />
                                    <strong>Phone:</strong> +91 9105910566
                                </p>
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-200">
                        <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
                            <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                                © 2025 Tryzent. All rights reserved.
                            </p>
                            <motion.button
                                onClick={() => router.push('/terms-and-conditions')}
                                className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                                variants={buttonVariants}
                                whileHover="hover"
                                whileTap="tap"
                            >
                                View Terms and Conditions
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default PrivacyPolicy;
