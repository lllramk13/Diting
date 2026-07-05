import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './Home.css'

type SessionUser = {
  id: string
  email: string | null
  username: string
}

function deriveUsername(user: { user_metadata?: Record<string, unknown> }): string {
  const metaName = user.user_metadata?.username
  if (typeof metaName === 'string' && metaName.trim()) return metaName.trim()
  return '用户'
}

function TopNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isEmulator = location.pathname === '/emulator'

  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    let active = true

    async function loadUsername(id: string, fallback: string): Promise<string> {
      const { data } = await supabase
        .from('public_profiles')
        .select('username')
        .eq('id', id)
        .single()

      const name = (data as { username?: string } | null)?.username
      return name?.trim() ? name.trim() : fallback
    }

    async function apply(authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null) {
      if (!authUser) {
        if (active) setUser(null)
        return
      }

      const fallback = deriveUsername(authUser)
      const username = await loadUsername(authUser.id, fallback)

      if (active) {
        setUser({ id: authUser.id, email: authUser.email ?? null, username })
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      apply(data.session?.user ?? null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user ?? null)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    navigate('/')
  }

  return (
    <div className="nav">
      <div className="nav-left">
        <span className="nav-logo">DITING</span>
      </div>
      <div className="nav-center"></div>
      <div className="nav-right">
        <button
          className={`nav-link${isHome ? ' active' : ''}`}
          onClick={() => navigate('/')}
        >
          首页
        </button>
        <button className="nav-link" onClick={() => navigate('/game')}>
          游戏汉化
        </button>
        <button
          className={`nav-link${isEmulator ? ' active' : ''}`}
          onClick={() => navigate('/emulator')}
        >
          模拟器
        </button>
        <button className="nav-link" onClick={() => navigate('/sponsor')}>
          赞助
        </button>
        <span className="nav-link disabled">关于</span>

        {user ? (
          <>
            <span className="nav-user" title={user.email ?? undefined}>
              {user.username}
            </span>
            <button className="nav-login" onClick={signOut}>
              退出
            </button>
          </>
        ) : (
          <button className="nav-login" onClick={() => navigate('/auth')}>
            登录
          </button>
        )}
      </div>
    </div>
  )
}

export default TopNav
