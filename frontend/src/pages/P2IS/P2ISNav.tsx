import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './P2IS.css'

const links = [
  { label: '公告', path: '/game/psx/p2is/announce' },
  { label: '主集', path: '/game/psx/p2is/main' },
  { label: '社区', path: '/game/psx/p2is' },
  { label: '搜索', path: '/game/psx/p2is/search' },
  { label: '合并请求', path: '/game/psx/p2is/requests' },
  { label: '问题', path: '/game/psx/p2is/issues' },
  { label: '术语表', path: '/game/psx/p2is/glossary' },
]

export default function P2ISNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id
      if (!uid) { setUsername(null); return }
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', uid).single()
      setUsername(profile?.username ?? data.user?.email ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (!session?.user) { setUsername(null); return }
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', session.user.id).single()
      setUsername(profile?.username ?? session.user.email ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    setUsername(null)
    navigate('/game/psx/p2is')
  }

  return (
    <nav className="p2is-subnav">
      <div className="subnav-links">
        {links.map(l => (
          <button
            key={l.path}
            className={`subnav-item ${pathname === l.path ? 'active' : ''}`}
            onClick={() => navigate(l.path)}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className="subnav-auth">
        {username ? (
          <>
            <span className="subnav-username">{username}</span>
            <button className="subnav-btn" onClick={logout}>登出</button>
          </>
        ) : (
          <button className="subnav-btn primary" onClick={() => navigate('/auth')}>登录 / 注册</button>
        )}
      </div>
    </nav>
  )
}
