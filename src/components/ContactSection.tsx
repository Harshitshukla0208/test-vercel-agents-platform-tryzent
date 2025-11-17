"use client"
import { motion } from "framer-motion"
import { Mail } from "lucide-react"

export default function ContactSection() {
    const preWrittenMessage = "Hi Team, I'm interested in using the AgentHub for my use case. Please share more details.";

    const handleWhatsAppClick = () => {
        const encodedMessage = encodeURIComponent(preWrittenMessage);
        window.open(`https://wa.me/919105910566?text=${encodedMessage}`, '_blank');
    };

    const handleEmailClick = () => {
        const subject = encodeURIComponent("Interest in AgentHub");
        const body = encodeURIComponent(preWrittenMessage);
        window.open(`mailto:contact@tryzent.com?subject=${subject}&body=${body}`, '_blank');
    };

    return (
        <section className="relative py-12 sm:py-16 md:py-20 overflow-hidden mt-10">
            {/* White to Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-50 to-blue-100"></div>

            <div className="container relative mx-auto px-4 sm:px-6 max-w-4xl">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center"
                >
                    {/* Header Section */}
                    <div className="mb-8 sm:mb-10">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            viewport={{ once: true }}
                            className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight"
                        >
                            Want to build powerful{" "}
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
                                AI Agents
                            </span>{" "}
                            for your use case?
                        </motion.h2>
                        
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            viewport={{ once: true }}
                            className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto"
                        >
                            Contact us to learn more about commercial plans or to request additional access
                        </motion.p>
                    </div>

                    {/* Contact Icons */}
                    <div className="flex justify-center items-center gap-6 sm:gap-8">
                        {/* WhatsApp Icon */}
                        <motion.button
                            onClick={handleWhatsAppClick}
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            viewport={{ once: true }}
                            className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            <svg 
                                className="w-7 h-7 sm:w-8 sm:h-8" 
                                fill="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                            </svg>
                        </motion.button>

                        {/* Email Icon */}
                        <motion.button
                            onClick={handleEmailClick}
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            viewport={{ once: true }}
                            className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            <Mail className="w-7 h-7 sm:w-8 sm:h-8" />
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
