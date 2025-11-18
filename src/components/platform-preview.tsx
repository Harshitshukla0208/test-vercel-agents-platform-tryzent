
export function PlatformPreview() {
  return (
    <div className="bg-white">
      
    <section className="py-20 px-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-t-[60px] md:rounded-t-[90px]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              The Education Gap in India
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Over 65% of India&apos;s population lives in rural and semi-urban areas where quality education remains a critical challenge
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                icon: '👨‍🏫', 
                title: 'Teacher Shortage', 
                desc: 'Millions of students lack access to qualified teachers in their subjects' 
              },
              { 
                icon: '🗣️', 
                title: 'Language Barriers', 
                desc: 'Most students learn better in their mother tongue but quality content is only in English' 
              },
              { 
                icon: '💰', 
                title: 'Unaffordable Tutoring', 
                desc: 'Private coaching costs ₹5,000-20,000/month - beyond reach for most families' 
              },
              { 
                icon: '📚', 
                title: 'One-Size-Fits-All', 
                desc: 'Traditional classrooms can\'t provide personalized attention to individual students' 
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </div>
  )
}