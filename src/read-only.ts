import { createContext, useContext } from 'react'

/** True when the workspace can be read but not edited (signed out with cloud on). */
export const ReadOnlyContext = createContext(false)

export function useReadOnly(): boolean {
  return useContext(ReadOnlyContext)
}
