import type { Metadata } from "next"
import Link from "next/link"
import Footer from "@/components/footer"
import { Header } from "@/components/header"

export const metadata: Metadata = {
  title: "Terms and Conditions | LeoQui",
  description: "Read the terms and conditions governing access to the LeoQui platform operated by Tryzent Technologies Private Limited.",
}

const LAST_UPDATED = "August 2025"

const sections = [
  {
    title: "1. Acceptance of Terms",
    paragraphs: [
      "These Terms and Conditions (\"Terms\") govern your access to and use of the LeoQui platform, services, and content provided by Tryzent Technologies Private Limited (\"Tryzent\", \"we\", \"our\", or \"us\").",
      "By accessing or using the Services, including AI-powered features and analytics dashboards, you agree to be bound by these Terms and all applicable laws. If you are using the Services on behalf of an institution or organization, you represent that you have authority to bind that entity to these Terms.",
    ],
  },
  {
    title: "2. Eligibility and Accounts",
    paragraphs: [
      "You must be at least the age of majority in your jurisdiction or have the consent of a parent, guardian, or authorized educational institution to use the Services.",
      "Account credentials must be kept confidential. You are responsible for all activities that occur under your account and must promptly notify us of any unauthorized use or security breach.",
    ],
  },
  {
    title: "3. Permitted Use",
    paragraphs: [
      "You agree to use the Services solely for lawful educational and collaborative purposes, and in accordance with all applicable policies, including this document and our Privacy Policy.",
      "You will not interfere with or disrupt the integrity or performance of the Services, attempt to gain unauthorized access, or use the Services to transmit malicious code or infringing content.",
      "You will not attempt to misuse AI-powered tools (for example, by submitting prohibited content or attempting to reverse engineer third-party AI models) and you acknowledge that output quality may depend on the prompts and context you provide.",
    ],
  },
  {
    title: "4. Content and Intellectual Property",
    paragraphs: [
      "All intellectual property rights in the Services, including software, features, and visual design, are owned by or licensed to Tryzent and are protected by applicable laws.",
      "You retain ownership of content you upload to the Services. By submitting content, you grant Tryzent a limited, non-exclusive, worldwide license to host, display, and process the content solely to operate and improve the Services.",
      "To the extent AI-generated content is produced through the Services, you may use such output for permitted educational purposes, subject to any usage restrictions communicated within the platform.",
      "You are responsible for ensuring that your content does not violate the rights of third parties or applicable laws.",
    ],
  },
  {
    title: "5. Third-Party Services and AI Providers",
    paragraphs: [
      "The Services may integrate with third-party tools or content providers, including external AI model providers that process prompts, contextual data, and other inputs to deliver requested outputs.",
      "Your use of such integrations is subject to the terms and privacy policies of those third parties. We require our AI partners to implement safeguards that prohibit the use of your data for unrelated model training without explicit authorization.",
      "Tryzent does not endorse or assume responsibility for third-party services and is not liable for any damages or losses arising from their use.",
    ],
  },
  {
    title: "6. Analytics and Performance Insights",
    paragraphs: [
      "We provide analytics dashboards to help administrators and educators understand platform engagement, progress trends, and AI usage patterns.",
      "Analytics data may be aggregated or de-identified and can be processed by trusted analytics providers in accordance with our Privacy Policy.",
      "You agree not to misuse analytics outputs or attempt to re-identify individuals from aggregated or anonymized data.",
    ],
  },
  {
    title: "7. Fees and Payment",
    paragraphs: [
      "Certain features of the Services may require payment. All fees will be communicated to you or your institution prior to purchase and are due according to the payment schedule set forth in the applicable order form or agreement.",
      "Unless stated otherwise, fees are non-refundable. Late payments may result in suspension or termination of access to the applicable Services.",
    ],
  },
  {
    title: "8. Confidentiality",
    paragraphs: [
      "Both parties agree to protect confidential information disclosed in connection with the Services and to use such information only for the purposes for which it was provided.",
      "Confidential information does not include information that is publicly available, independently developed without reference to the confidential information, or rightfully obtained from a third party without restriction.",
    ],
  },
  {
    title: "9. Privacy",
    paragraphs: [
      "Our collection and use of personal information in connection with the Services are described in our Privacy Policy. By using the Services, you acknowledge and consent to the data practices outlined therein, including the use of third-party AI providers and analytics tools to support platform functionality.",
    ],
  },
  {
    title: "10. Termination",
    paragraphs: [
      "We may suspend or terminate your access to the Services if you violate these Terms, engage in fraudulent or illegal activities, or pose a risk to the security or integrity of the platform.",
      "You may stop using the Services at any time. Upon termination, sections intended to survive (including intellectual property, confidentiality, warranty disclaimers, and limitations of liability) will remain in effect.",
    ],
  },
  {
    title: "11. Disclaimers",
    paragraphs: [
      "The Services are provided on an \"as is\" and \"as available\" basis. To the fullest extent permitted by law, Tryzent disclaims all warranties, express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement.",
      "AI-generated outputs may not always be accurate, complete, or appropriate for every context. You are responsible for reviewing and validating AI-generated content before relying on it.",
      "We do not guarantee that the Services will be uninterrupted, error-free, secure, or free of harmful components, nor do we warrant any specific learning outcomes.",
    ],
  },
  {
    title: "12. Limitation of Liability",
    paragraphs: [
      "To the maximum extent permitted by law, Tryzent, its affiliates, and their respective directors, officers, employees, and agents shall not be liable for indirect, incidental, consequential, or punitive damages, or any loss of profits or data arising out of your use of the Services.",
      "In no event will Tryzent's total liability exceed the amounts paid by you (or your institution) to Tryzent for access to the Services during the twelve (12) months preceding the event giving rise to the claim.",
    ],
  },
  {
    title: "13. Indemnification",
    paragraphs: [
      "You agree to indemnify and hold harmless Tryzent, its affiliates, and their respective officers, directors, employees, and agents from any claims, damages, liabilities, and expenses (including reasonable attorneys' fees) arising out of or related to your misuse of the Services or violation of these Terms.",
    ],
  },
  {
    title: "14. Governing Law and Dispute Resolution",
    paragraphs: [
      "These Terms are governed by the laws of India, without regard to its conflict of law principles. The courts located in New Delhi, Delhi, India shall have exclusive jurisdiction over any disputes arising from or relating to these Terms or the Services.",
      "Before initiating formal proceedings, the parties agree to attempt to resolve any dispute through good-faith negotiations within thirty (30) days of written notice.",
    ],
  },
  {
    title: "15. Changes to These Terms",
    paragraphs: [
      "We may update these Terms to reflect changes in our Services, business operations, or legal requirements. When changes are made, we will update the \"Last Updated\" date and, where required, provide additional notice.",
      "Continued use of the Services after the effective date of updated Terms constitutes acceptance of the changes.",
    ],
  },
  {
    title: "16. Contact Us",
    paragraphs: [
      "For questions about these Terms or the Services, please contact Tryzent Technologies Private Limited at contact@tryzent.com or +91 9105910566.",
      "Registered Office: Tryzent Technologies Private Limited, New Delhi, Delhi, India.",
    ],
  },
]

export default function TermsAndConditionsPage() {
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
            <h1 className="text-4xl font-bold mb-6">Terms and Conditions</h1>
            <p className="text-lg text-gray-600 mb-10">
              These Terms and Conditions outline the rules and obligations that apply when you use the LeoQui platform, including AI-powered learning tools and analytics services provided by Tryzent Technologies Private Limited.
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
