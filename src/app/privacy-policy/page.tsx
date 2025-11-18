import type { Metadata } from "next"
import Link from "next/link"
import Footer from "@/components/footer"
import { Header } from "@/components/header"

export const metadata: Metadata = {
  title: "Privacy Policy | LeoQui",
  description: "Learn how Tryzent Technologies Private Limited collects, uses, and protects your information when you use the LeoQui platform.",
}

const LAST_UPDATED = "August 2025"

const sections = [
  {
    title: "1. Introduction",
    paragraphs: [
      "Tryzent Technologies Private Limited (\"Tryzent\", \"we\", \"our\", or \"us\") operates the LeoQui platform, providing AI-driven learning and collaboration tools for educators and students.",
      "This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you interact with LeoQui, our websites, mobile applications, AI-powered features, and related services (collectively, the \"Services\").",
    ],
  },
  {
    title: "2. Information We Collect",
    paragraphs: [
      "Account Information: When you register or are provisioned with an account, we collect identifiers such as your name, institutional affiliation, role, email address, phone number, and authentication credentials.",
      "Profile and Usage Data: We collect optional profile details you provide (e.g., biography, areas of expertise, preferred subjects) and usage data such as course enrollment, activity logs, learning preferences, and communication history within the Services.",
      "Device and Technical Data: We automatically collect technical information including IP address, browser type, operating system, device identifiers, access times, and referring URLs to help secure and improve the Services.",
      "Content You Share: We process documents, assignments, assessments, messages, and other content you upload or generate while using LeoQui to facilitate collaboration and analytics.",
      "Prompts and Interaction Data: When you engage with generative features, prompts, responses, and feedback may be transmitted to vetted third-party AI providers to enable contextual assistance, subject to contractual privacy protections.",
      "Third-Party Data: We may receive information from trusted partners or educational institutions that integrate with LeoQui, consistent with their privacy obligations and your permissions.",
    ],
  },
  {
    title: "3. How We Use Information",
    paragraphs: [
      "Provide and Improve the Services: We use your information to deliver platform functionality, personalize experiences, process transactions, troubleshoot issues, and enhance performance.",
      "AI-Powered Experiences: We leverage third-party AI models to generate insights, feedback, and recommendations based on the content you choose to share, and we apply safeguards to limit exposure of personal data in those workflows.",
      "Communications: We send administrative notices, security alerts, onboarding information, and educational updates relevant to your use of LeoQui. You can opt out of non-essential communications at any time.",
      "Analytics and Research: Aggregated, de-identified, and pseudonymized information may be analyzed using internal dashboards and trusted analytics platforms to understand engagement, develop new features, and conduct research that advances AI-powered learning.",
      "Safety and Compliance: We may use your data to enforce our Terms and Conditions, prevent fraud or misuse, protect the rights and safety of users, and comply with legal obligations.",
    ],
  },
  {
    title: "4. Sharing Your Information",
    paragraphs: [
      "Service Providers: We engage trusted vendors to host infrastructure, provide analytics, support customer service, deliver communication services, and power certain AI capabilities. They are bound by contractual obligations to protect your data and use it only as instructed.",
      "Third-Party AI Partners: Select AI service providers process prompts and contextual information solely to deliver requested outputs. We require them to implement robust technical and organizational safeguards and prohibit them from using your data to train their generalized models without explicit permission.",
      "Educational Institutions and Administrators: When LeoQui is deployed by an institution, relevant usage insights and roster information may be shared with authorized administrators or educators to support academic outcomes.",
      "Legal Requirements: We may disclose information to comply with applicable law, respond to legal requests, or protect the rights, property, or safety of Tryzent, our users, or others.",
      "Business Transfers: In connection with a merger, acquisition, financing, or sale of assets, your information may be transferred subject to safeguards consistent with this Privacy Policy.",
    ],
  },
  {
    title: "5. Cookies and Similar Technologies",
    paragraphs: [
      "We use cookies, web beacons, and similar technologies to authenticate users, remember preferences, analyze usage patterns, and deliver relevant content.",
      "Analytics Cookies: We deploy analytics tools to measure how the Services are used so we can improve navigation, content quality, and AI recommendations. Where required, we will seek your consent prior to enabling analytics cookies.",
      "You may adjust your browser settings to refuse cookies; however, doing so may affect the availability or functionality of certain features of the Services.",
    ],
  },
  {
    title: "6. Data Retention",
    paragraphs: [
      "We retain personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, comply with legal obligations, resolve disputes, and enforce agreements.",
      "When information is no longer required, we will delete or anonymize it in accordance with our data retention policies and applicable law.",
    ],
  },
  {
    title: "7. Security",
    paragraphs: [
      "We implement administrative, technical, and physical safeguards designed to protect your information against unauthorized access, alteration, disclosure, or destruction.",
      "While we strive to protect your data, no system can be guaranteed as 100% secure. Please notify us immediately of any suspected unauthorized use of your account.",
    ],
  },
  {
    title: "8. Your Rights and Choices",
    paragraphs: [
      "Depending on your jurisdiction, you may have the right to access, correct, update, or delete your personal information, object to certain processing, or request data portability.",
      "To exercise these rights, please contact us using the details provided below. We may need to verify your identity before responding to your request.",
    ],
  },
  {
    title: "9. Children's Privacy",
    paragraphs: [
      "LeoQui is designed to support learners of various age groups, including minors enrolled by their institutions or guardians. We require schools or parents/guardians to obtain appropriate consents before sharing a minor's personal information with us.",
      "If we discover that we have collected personal information from a child without proper consent, we will promptly take steps to delete such information.",
    ],
  },
  {
    title: "10. International Transfers",
    paragraphs: [
      "As a global platform, we may store and process information in countries other than your own. When we transfer personal data internationally, including to third-party AI or analytics providers, we ensure appropriate safeguards are in place in accordance with applicable data protection laws.",
    ],
  },
  {
    title: "11. Updates to This Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time to reflect changes in technology, regulatory requirements, or our business practices.",
      "If we make material changes, we will notify you by updating the \"Last Updated\" date below and, when appropriate, providing additional notice through the Services.",
    ],
  },
  {
    title: "12. Contact Us",
    paragraphs: [
      "If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact Tryzent Technologies Private Limited at contact@tryzent.com or +91 9105910566.",
      "Registered Office: Tryzent Technologies Private Limited, New Delhi, Delhi, India.",
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#FFFBF2] text-gray-900 flex flex-col">
      <Header />
      <section className="flex-1 w-full">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="bg-white border border-orange-100 shadow-lg rounded-3xl px-8 py-12 md:px-12 md:py-16">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold mb-6"
            >
              <span aria-hidden="true">←</span>
              <span>Back to Home</span>
            </Link>
            <p className="text-sm text-gray-500 mb-2">Last Updated: {LAST_UPDATED}</p>
            <h1 className="text-4xl font-bold mb-6 text-gray-900">Privacy Policy</h1>
            <p className="text-lg text-gray-600 mb-10">
              Your privacy is important to us. This Privacy Policy describes how Tryzent Technologies Private Limited protects and
              processes your information when you use the LeoQui platform, AI-enabled features, and related services.
            </p>
            <div className="space-y-10">
              {sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-2xl font-semibold mb-4 text-gray-900">{section.title}</h2>
                  <div className="space-y-4 text-gray-700 leading-relaxed">
                    {section.paragraphs.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
