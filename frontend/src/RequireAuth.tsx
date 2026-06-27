import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'

type RequireAuthProps = {
  children: ReactNode
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'anonymous'>('loading')

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active) setStatus(data.session ? 'authenticated' : 'anonymous')
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setStatus(session ? 'authenticated' : 'anonymous')
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  if (status === 'loading') {
    return <main style={{ minHeight: '100vh', background: '#0a0e18' }} />
  }

  if (status === 'anonymous') {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  return children
}
