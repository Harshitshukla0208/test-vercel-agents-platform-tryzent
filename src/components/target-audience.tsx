import Image from "next/image"
import platformImg1 from "../assets/platformImg1.png"
import platformImg2 from "../assets/platformImg2.png"
import platformImg3 from "../assets/platformImg3.png"

export function TargetAudience() {
  return (
    <div className="bg-white">
      <section className="py-20 px-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-t-[80px] md:rounded-t-[120px]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Built for Students, Parents & Teachers
            </h2>
            <p className="text-xl text-gray-600">
              Powerful tools for everyone in the learning journey
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12 mb-12">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-6">
                  For Students
                </h3>
                <p className="text-lg text-gray-600 mb-8">
                  Learn at your own pace with AI-powered tools designed to help you succeed
                </p>
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Voice-Based Doubt Solving</h4>
                      <p className="text-gray-600 text-sm">Ask questions naturally by speaking in your language</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Homework Help</h4>
                      <p className="text-gray-600 text-sm">Get step-by-step guidance on assignments</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Assessment Tests</h4>
                      <p className="text-gray-600 text-sm">Auto-generated tests with instant grading and feedback</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Image Upload Q&A</h4>
                      <p className="text-gray-600 text-sm">Upload photos of problems for detailed explanations</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Multilingual Support</h4>
                      <p className="text-gray-600 text-sm">Switch between 12+ Indian languages seamlessly</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Chapter-Wise Learning</h4>
                      <p className="text-gray-600 text-sm">NCERT-aligned curriculum with organized topics</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-3">
                  <div className="bg-white rounded-xl p-0 shadow-lg">
                    <Image
                      src={platformImg1}
                      alt="Preview of LeoQui learning platform interface"
                      className="w-full h-auto object-contain rounded-xl"
                      priority
                    />
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-xl p-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700 font-semibold">24/7 Available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12 mb-12">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
              <div className="order-2 lg:order-1 relative">
              <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl p-3">
                  <div className="bg-white rounded-xl p-0 shadow-lg">
                    <Image
                      src={platformImg2}
                      alt="Preview of LeoQui learning platform interface"
                      className="w-full h-auto object-contain rounded-xl"
                      priority
                    />
                  </div>
                </div>
                <div className="absolute -top-4 -left-4 bg-white rounded-xl shadow-xl p-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-sm text-gray-700 font-semibold">AI-Powered</span>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <h3 className="text-3xl font-bold text-gray-900 mb-6">
                  For Teachers
                </h3>
                <p className="text-lg text-gray-600 mb-8">
                  Save hours with AI-powered tools that help you teach better
                </p>
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Auto-Generate Tests</h4>
                      <p className="text-gray-600 text-sm">Create customized quizzes and tests in minutes</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Instant Lesson Plans</h4>
                      <p className="text-gray-600 text-sm">Generate comprehensive lesson plans with objectives</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Track Student Progress</h4>
                      <p className="text-gray-600 text-sm">Monitor performance with detailed analytics</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-6">
                  For Parents
                </h3>
                <p className="text-lg text-gray-600 mb-8">
                  Stay connected with your child&apos;s learning journey
                </p>
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center text-pink-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Monitor Learning</h4>
                      <p className="text-gray-600 text-sm">Track your child&apos;s progress and engagement</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center text-pink-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Progress Summaries</h4>
                      <p className="text-gray-600 text-sm">Receive regular updates on achievements and areas to improve</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center text-pink-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Support Journey</h4>
                      <p className="text-gray-600 text-sm">Get insights on how to help your child succeed</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl p-3">
                  <div className="bg-white rounded-xl p-0 shadow-lg">
                    <Image
                      src={platformImg3}
                      alt="Preview of LeoQui learning platform interface"
                      className="w-full h-auto object-contain rounded-xl"
                      priority
                    />
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-xl p-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700 font-semibold">Real-time Updates</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}