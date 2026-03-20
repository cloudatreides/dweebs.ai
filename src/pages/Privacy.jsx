import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Privacy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh px-6 py-10" style={{ background: '#0D0D0F', color: '#D1D5DB' }}>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm mb-8 transition-opacity hover:opacity-70"
          style={{ color: '#A78BFA' }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <h1 className="text-2xl font-bold text-white mb-1">Privacy Policy</h1>
        <p className="text-xs mb-8" style={{ color: '#4B5563' }}>Last updated: March 2026</p>

        <div className="flex flex-col gap-6 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold mb-2">1. Overview</h2>
            <p>dweebs.lol ("we", "us") is operated by Cloud Labs. This Privacy Policy explains what data we collect, how we use it, and your rights. We keep it simple because we're a small team and we actually care.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">2. Data We Collect</h2>
            <ul className="list-disc list-inside flex flex-col gap-1" style={{ color: '#9CA3AF' }}>
              <li><span className="text-white">Account data</span> — email address, display name, profile avatar</li>
              <li><span className="text-white">Chat data</span> — messages you send, characters you choose, worlds you create</li>
              <li><span className="text-white">Usage data</span> — API request counts (for rate limiting), feature interactions</li>
              <li><span className="text-white">Feedback</span> — messages submitted via the feedback form</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">3. How We Use Your Data</h2>
            <ul className="list-disc list-inside flex flex-col gap-1" style={{ color: '#9CA3AF' }}>
              <li>To provide and improve the Service</li>
              <li>To enforce rate limits and prevent abuse</li>
              <li>To respond to feedback you submit</li>
              <li>To send transactional emails (e.g. email confirmation)</li>
            </ul>
            <p className="mt-2">We do not sell your data. We do not use your chat content to train AI models.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">4. Third-Party Services</h2>
            <p className="mb-2">We use the following third-party services to operate dweebs.lol:</p>
            <ul className="list-disc list-inside flex flex-col gap-1" style={{ color: '#9CA3AF' }}>
              <li><span className="text-white">Supabase</span> — database and authentication</li>
              <li><span className="text-white">Anthropic</span> — AI character response generation</li>
              <li><span className="text-white">Vercel</span> — hosting and serverless functions</li>
              <li><span className="text-white">Vercel Analytics</span> — anonymous page view analytics</li>
            </ul>
            <p className="mt-2">Each service has its own privacy policy. Your messages are sent to Anthropic's API to generate AI responses but are not stored by Anthropic beyond the request.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">5. Data Retention</h2>
            <p>Your account and chat data is retained as long as your account is active. You can delete your account at any time by contacting us via the feedback form, and we will delete your data within 30 days.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">6. Cookies</h2>
            <p>We use only functional cookies required for authentication (via Supabase). We do not use advertising or tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">7. Your Rights</h2>
            <p>Depending on your location, you may have rights to access, correct, or delete your personal data. To exercise these rights, contact us via the in-app feedback form.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">8. Children's Privacy</h2>
            <p>dweebs.lol is not directed at children under 13. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will delete the data promptly.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">9. Changes to This Policy</h2>
            <p>We may update this policy as the Service evolves. The "last updated" date at the top will reflect any changes. Continued use of the Service constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">10. Contact</h2>
            <p>Questions about privacy? Use the feedback form inside the app.</p>
          </section>

        </div>

        <p className="text-xs mt-10" style={{ color: '#374151' }}>© 2025 dweebs.lol · Made by Cloud Labs</p>
      </div>
    </div>
  )
}
