import { useState } from 'react'

export default function CharacterAvatar({ character, size = 36 }) {
  const [failed, setFailed] = useState(false)

  if (character.avatar && !failed) {
    return (
      <img
        src={character.avatar}
        alt={character.name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: character.color + '33',
        border: `1.5px solid ${character.color}55`,
        fontSize: size * 0.45,
      }}
    >
      {character.emoji}
    </div>
  )
}
