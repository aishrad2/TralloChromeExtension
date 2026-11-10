import { useContext } from 'react'
import { TripContext, type TripContextValue } from './context'

export function useTrip(): TripContextValue {
  const value = useContext(TripContext)
  if (!value) throw new Error('useTrip must be used inside <TripProvider>')
  return value
}
