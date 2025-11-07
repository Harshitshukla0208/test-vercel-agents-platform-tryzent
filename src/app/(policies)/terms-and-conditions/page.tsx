'use client'
import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import logo from '../../../assets/logo.jpeg'; // Adjust path as needed

const TermsAndConditions: React.FC = () => {
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
                            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
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
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Terms and Conditions</h1>
                        <p className="text-sm sm:text-base text-gray-600">Last updated: May 25, 2025</p>
                    </div>

                    <div className="prose prose-gray max-w-none space-y-6 sm:space-y-8 text-sm sm:text-base">
                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">1. Acceptance of Terms</h2>
                            <p className="text-gray-700 leading-relaxed">
                                By accessing and using Tryzent's AI agents platform and services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">2. Description of Service</h2>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                Tryzent provides an AI-powered agents platform that allows users to create, customize, and integrate intelligent agentss for various applications. Our service includes:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 sm:space-y-2 pl-2 sm:pl-0">
                                <li>AI assistant creation and customization tools</li>
                                <li>Integration capabilities for websites and applications</li>
                                <li>Analytics and performance monitoring</li>
                                <li>Customer support and maintenance services</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">3. User Accounts and Registration</h2>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                To access certain features of our service, you must register for an account. You agree to:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 sm:space-y-2 pl-2 sm:pl-0">
                                <li>Provide accurate, current, and complete information during registration</li>
                                <li>Maintain and update your information to keep it accurate</li>
                                <li>Maintain the security of your password and account</li>
                                <li>Accept all risks of unauthorized access to your account</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">4. Acceptable Use Policy</h2>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                You agree not to use the service to:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 sm:space-y-2 pl-2 sm:pl-0">
                                <li>Violate any applicable laws or regulations</li>
                                <li>Infringe upon intellectual property rights</li>
                                <li>Transmit harmful, offensive, or inappropriate content</li>
                                <li>Attempt to gain unauthorized access to our systems</li>
                                <li>Use the service for any commercial purpose without authorization</li>
                                <li>Create assistants that impersonate others or spread misinformation</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">5. AI Content and Accuracy</h2>
                            <p className="text-gray-700 leading-relaxed">
                                Our AI assistant generate responses based on training data and algorithms. While we strive for accuracy, we cannot guarantee that all AI-generated content is correct, complete, or suitable for your specific needs. Users are responsible for reviewing and validating AI-generated content before use.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">6. Intellectual Property</h2>
                            <p className="text-gray-700 leading-relaxed">
                                The Tryzent platform, including all software, designs, text, graphics, and other content, is owned by Tryzent and protected by copyright and other intellectual property laws. You retain ownership of content you create using our platform, but grant us a license to host and process it as necessary to provide our services.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">7. Privacy and Data Protection</h2>
                            <p className="text-gray-700 leading-relaxed">
                                Your privacy is important to us. Our collection, use, and disclosure of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">8. Subscription and Billing</h2>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                Our services may be offered under different subscription plans. By subscribing:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 sm:space-y-2 pl-2 sm:pl-0">
                                <li>You agree to pay all fees associated with your chosen plan</li>
                                <li>Subscriptions automatically renew unless cancelled</li>
                                <li>Refunds are subject to our refund policy</li>
                                <li>We may change pricing with 30 days notice</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">9. Service Availability</h2>
                            <p className="text-gray-700 leading-relaxed">
                                While we strive to maintain high service availability, we do not guarantee uninterrupted access to our platform. We may perform maintenance, updates, or modifications that temporarily affect service availability.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">10. Limitation of Liability</h2>
                            <p className="text-gray-700 leading-relaxed">
                                To the fullest extent permitted by law, Tryzent shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our service, even if we have been advised of the possibility of such damages.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">11. Termination</h2>
                            <p className="text-gray-700 leading-relaxed">
                                Either party may terminate this agreement at any time. Upon termination, your right to use the service ceases immediately. We may suspend or terminate your account if you violate these terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">12. Changes to Terms</h2>
                            <p className="text-gray-700 leading-relaxed">
                                We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through our platform. Continued use after changes constitutes acceptance of new terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">13. Contact Information</h2>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                If you have any questions about these Terms and Conditions, please contact us at:
                            </p>
                            <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                                <p className="text-gray-700 text-sm sm:text-base">
                                    <strong>Email:</strong> contact@tryzent.com<br />
                                    <strong>Address:</strong>  Lajpat Nagar, New Delhi, India <br />
                                    <strong>Phone:</strong> +91 9105910566
                                </p>
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-200">
                        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                            <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                                © 2025 Tryzent. All rights reserved.
                            </p>
                            <motion.button
                                onClick={() => router.push('/privacy-policy')}
                                className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                                variants={buttonVariants}
                                whileHover="hover"
                                whileTap="tap"
                            >
                                View Privacy Policy
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default TermsAndConditions;
