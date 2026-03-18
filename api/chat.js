import { createClient } from '@supabase/supabase-js'

const ALLOWED_MODELS = ['claude-haiku-4-5-20251001']

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify auth token
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' })
  }

  const token = authHeader.split(' ')[1]

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid auth token' })
  }

  // Rate limit check — atomic check + record via RPC
  const { data: allowed, error: rlError } = await supabase.rpc('check_rate_limit', {
    p_user_id: user.id,
    p_endpoint: 'chat'
  })

  if (rlError) {
    console.error('Rate limit check failed:', rlError.message)
    return res.status(503).json({ error: 'Service temporarily unavailable' })
  }

  if (!allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Limits: 30/min, 300/hour, 600/day.'
    })
  }

  // Validate request body
  const { model, system, messages, max_tokens } = req.body

  if (!system || typeof system !== 'string' || system.length > 8000) {
    return res.status(400).json({ error: 'Invalid or oversized system prompt' })
  }

  if (!messages || !Array.isArray(messages) || messages.length > 50) {
    return res.status(400).json({ error: 'Invalid or too many messages' })
  }

  // Enforce model allowlist — ignore client-supplied model
  const resolvedModel = ALLOWED_MODELS.includes(model) ? model : ALLOWED_MODELS[0]

  // Proxy to Anthropic
  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: resolvedModel,
        max_tokens: Math.min(max_tokens || 500, 1000),
        system,
        messages,
      }),
    })

    const data = await anthropicRes.json()

    if (!anthropicRes.ok) {
      console.error('Anthropic error:', data)
      return res.status(anthropicRes.status).json({
        error: data.error?.message || 'Anthropic API error'
      })
    }

    return res.status(200).json(data)
  } catch (err) {
    console.error('Proxy error:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
