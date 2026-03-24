import { supabase } from './supabase'

// ============================================
// PROFILES
// ============================================

export async function updateProfile(userId, { displayName, avatarUrl }) {
  const updates = {}
  if (displayName !== undefined) updates.display_name = displayName
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================
// CUSTOM CHARACTERS
// ============================================

export async function getUserCustomCharacters(userId) {
  const { data, error } = await supabase
    .from('custom_characters')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function saveCustomCharacter({ userId, id, name, fandom, color, emoji, avatarUrl, tags, quote, bio, personality, isPublic }) {
  const { data, error } = await supabase
    .from('custom_characters')
    .insert({
      id,
      user_id: userId,
      name,
      fandom: fandom || 'Custom',
      category: 'Custom',
      color: color || '#A78BFA',
      emoji: emoji || '🎤',
      avatar_url: avatarUrl || null,
      tags: tags || [],
      quote: quote || '',
      bio: bio || '',
      personality: personality || '',
      is_public: isPublic ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCustomCharacter(charId) {
  const { error } = await supabase
    .from('custom_characters')
    .delete()
    .eq('id', charId)

  if (error) throw error
}

// ============================================
// GROUP CHATS
// ============================================

export async function getUserChats(userId) {
  const { data, error } = await supabase
    .from('group_chats')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getChat(chatId) {
  const { data, error } = await supabase
    .from('group_chats')
    .select('*')
    .eq('id', chatId)
    .single()

  if (error) throw error
  return data
}

export async function createChat({ userId, name, scene, characterIds }) {
  const { data, error } = await supabase
    .from('group_chats')
    .insert({
      user_id: userId,
      name,
      scene: scene || '',
      character_ids: characterIds,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateChat(chatId, updates) {
  const { error } = await supabase
    .from('group_chats')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', chatId)

  if (error) throw error
}

export async function deleteChat(chatId) {
  const { error } = await supabase
    .from('group_chats')
    .delete()
    .eq('id', chatId)

  if (error) throw error
}

// ============================================
// MESSAGES
// ============================================

export async function getChatMessages(chatId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('group_chat_id', chatId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function addMessage({ groupChatId, senderType, senderId, content }) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      group_chat_id: groupChatId,
      sender_type: senderType,
      sender_id: senderId || null,
      content,
    })
    .select()
    .single()

  if (error) throw error

  // Touch the chat's updated_at
  await supabase
    .from('group_chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', groupChatId)

  return data
}

// ============================================
// SHARED WORLDS & AURA
// ============================================

export async function checkDuplicateWorld(characterIds) {
  const sorted = [...characterIds].sort()
  const { data, error } = await supabase
    .from('shared_worlds')
    .select('id, name')

  if (error) return null
  // Check if any existing world has the exact same sorted character set
  return (data || []).find(w => {
    const wSorted = [...(w.character_ids || [])].sort()
    return wSorted.length === sorted.length && wSorted.every((id, i) => id === sorted[i])
  }) || null
}

export async function shareWorld({ creatorId, name, description, scene, characterIds }) {
  // Validate: at least 2 characters
  if (!characterIds || characterIds.length < 2) {
    throw new Error('You need at least 2 characters to share a World.')
  }

  const { data, error } = await supabase
    .from('shared_worlds')
    .insert({
      creator_id: creatorId,
      name,
      description: description || '',
      scene: scene || '',
      character_ids: characterIds,
    })
    .select()
    .single()

  if (error) {
    console.error('shareWorld error:', error.message)
    throw new Error(error.message || 'Failed to share world. Run the Aura migration first.')
  }
  return data
}

export async function getSharedWorlds() {
  const { data, error } = await supabase
    .from('shared_worlds')
    .select('*, profiles(display_name)')
    .order('try_count', { ascending: false })
    .limit(20)

  if (error) throw error
  return data
}

export async function getUserSharedWorlds(userId) {
  const { data, error } = await supabase
    .from('shared_worlds')
    .select('*')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function recordWorldTry(worldId, userId) {
  const { error } = await supabase.rpc('record_world_try', {
    world_id: worldId,
    trying_user_id: userId,
  })
  if (error) throw error
}

export async function getUserAura(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('aura')
      .eq('id', userId)
      .single()

    if (error) return 0
    return data?.aura || 0
  } catch {
    return 0
  }
}

// ============================================
// FEEDBACK
// ============================================

export async function submitFeedback({ userId, type, message }) {
  const { error } = await supabase
    .from('feedback')
    .insert({ user_id: userId, type, message })

  if (error) throw error
}

export async function addMessages(messages) {
  const { data, error } = await supabase
    .from('messages')
    .insert(messages)
    .select()

  if (error) throw error

  // Touch the chat's updated_at for the first message's chat
  if (messages.length > 0) {
    await supabase
      .from('group_chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', messages[0].group_chat_id)
  }

  return data
}

// ============================================
// MEMORY
// ============================================

export async function getWorldMemory(worldId) {
  const { data, error } = await supabase
    .from('world_memories')
    .select('*')
    .eq('world_id', worldId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertWorldMemory(worldId, facts, summary) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('world_memories')
    .upsert(
      {
        user_id: user.id,
        world_id: worldId,
        facts: JSON.stringify(facts),
        summary: summary || '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,world_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUserFacts() {
  const { data, error } = await supabase
    .from('user_facts')
    .select('*')
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertUserFacts(facts) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('user_facts')
    .upsert(
      {
        user_id: user.id,
        facts: JSON.stringify(facts),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteMemoryEntry(worldId, factIndex) {
  // Fetch current facts, remove by index, write back
  const memory = await getWorldMemory(worldId)
  if (!memory) return

  const facts = Array.isArray(memory.facts) ? [...memory.facts] : []
  if (factIndex < 0 || factIndex >= facts.length) return

  facts.splice(factIndex, 1)
  return upsertWorldMemory(worldId, facts, memory.summary)
}

export async function deleteUserFact(factIndex) {
  // Fetch current facts, remove by index, write back
  const userFacts = await getUserFacts()
  if (!userFacts) return

  const facts = Array.isArray(userFacts.facts) ? [...userFacts.facts] : []
  if (factIndex < 0 || factIndex >= facts.length) return

  facts.splice(factIndex, 1)
  return upsertUserFacts(facts)
}
