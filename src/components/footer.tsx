import Link from 'next/link';
import LogoImage from '@/assets/create-profile/LeoQuiIconBall.png'
import Image from 'next/image';

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-white py-6 sm:py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                {/* Main footer content */}
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-6 lg:space-y-0">

                    {/* Logo and company info section */}
                    <div className="flex flex-col items-center lg:items-start space-y-3">
                        {/* Company Logo */}
                        <div className="flex items-center space-x-2 sm:space-x-3">
                            <Image 
                                src={LogoImage} 
                                alt='logo' 
                                className='mb-1 h-6 w-6 sm:h-7 sm:w-7 rounded-md' 
                            />
                            <div className="flex flex-col">
                                <Link href='/'>
                                    <span className="text-lg sm:text-xl font-semibold text-white">LeoQui</span>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Links section */}
                    <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-6 md:space-x-8">
                        <Link
                            target="_blank"
                            href="/privacy-policy"
                            className="text-gray-300 hover:text-white transition-colors duration-200 text-sm sm:text-base font-medium"
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            target="_blank"
                            href="/terms-and-conditions"
                            className="text-gray-300 hover:text-white transition-colors duration-200 text-sm sm:text-base font-medium"
                        >
                            Terms & Conditions
                        </Link>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-700 my-5 sm:my-6"></div>

                {/* Bottom section with copyright */}
                <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                    <p className="text-gray-400 text-xs sm:text-sm text-center sm:text-left">
                        © 2025 Tryzent Technologies Private Limited. All rights reserved.
                    </p>

                    {/* Social links - LinkedIn and YouTube */}
                    <div className="flex space-x-4 sm:space-x-5">
                        <a
                            href="https://www.linkedin.com/company/tryzent-tech"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-white transition-colors duration-200"
                            aria-label="LinkedIn"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                        </a>
                        <a
                            href="https://www.youtube.com/@Tryzent"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-white transition-colors duration-200"
                            aria-label="YouTube"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;