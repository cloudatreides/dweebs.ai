import { createContext, useContext, useState } from 'react'

const TierContext = createContext()

export function TierProvider({ children }) {
  const [isPro, setIsPro] = useState(false)
  return (
    <TierContext.Provider value={{ isPro, setIsPro }}>
      {children}
    </TierContext.Provider>
  )
}

export function useTier() {
  return useContext(TierContext)
}
