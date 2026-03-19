import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { characters as defaultCharacters } from '../data/mockData'
import { getUserCustomCharacters, saveCustomCharacter as dbSaveChar } from '../lib/db'
import { useAuth } from './AuthContext'

const CharacterContext = createContext()

// Convert Supabase row to app character format
function toAppChar(row, creatorProfile) {
  return {
    id: row.id,
    name: row.name,
    fandom: row.fandom || 'Custom',
    category: 'Custom',
    color: row.color || '#A78BFA',
    emoji: row.emoji || '🎤',
    avatar: row.avatar_url || null,
    tags: row.tags || [],
    quote: row.quote || '',
    bio: row.bio || '',
    personality: row.personality || '',
    isCustom: true,
    isPublic: row.is_public ?? true,
    createdBy: creatorProfile
      ? { name: creatorProfile.display_name || 'Anonymous', avatar: creatorProfile.avatar_url || null }
      : null,
  }
}

export function CharacterProvider({ children }) {
  const { user, profile } = useAuth()
  const [customCharacters, setCustomCharacters] = useState([])
  // Always-current ref so callbacks never have stale profile
  const profileRef = useRef(profile)
  useEffect(() => { profileRef.current = profile }, [profile])

  // Load custom characters when user logs in
  useEffect(() => {
    if (!user) {
      setCustomCharacters([])
      return
    }
    getUserCustomCharacters(user.id)
      .then(rows => setCustomCharacters(rows.map(row => toAppChar(row, profileRef.current))))
      .catch(err => console.warn('Failed to load custom characters:', err))
  }, [user])

  // Re-map createdBy whenever profile changes (handles the async load race)
  useEffect(() => {
    if (!profile) return
    setCustomCharacters(prev =>
      prev.map(c => ({ ...c, createdBy: { name: profile.display_name || 'Anonymous', avatar: profile.avatar_url || null } }))
    )
  }, [profile])

  const allCharacters = [...defaultCharacters, ...customCharacters]

  const getCharacter = useCallback((id) => {
    return allCharacters.find(c => c.id === id) || null
  }, [customCharacters])

  const saveCustomCharacter = useCallback(async (form) => {
    if (!user) return null
    const charId = `custom-${Date.now()}`
    const saved = await dbSaveChar({
      userId: user.id,
      id: charId,
      name: form.name,
      fandom: form.fandom,
      color: form.color,
      emoji: form.emoji,
      avatarUrl: form.avatarUrl,
      tags: form.tags,
      quote: form.quote,
      bio: form.bio,
      personality: form.personality,
      isPublic: form.isPublic,
    })
    const appChar = toAppChar(saved, profileRef.current)
    setCustomCharacters(prev => [appChar, ...prev])
    return appChar
  }, [user])

  return (
    <CharacterContext.Provider value={{
      allCharacters,
      customCharacters,
      defaultCharacters,
      getCharacter,
      saveCustomCharacter,
    }}>
      {children}
    </CharacterContext.Provider>
  )
}

export function useCharacters() {
  return useContext(CharacterContext)
}
