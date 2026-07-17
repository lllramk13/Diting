import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import {
    getCurrentSessionUser,
    signOut as signOutCurrentUser,
    subscribeToAuthUser,
} from '../../api/auth'
import { getProfileUsername } from '../../api/profiles'
import '../../main-site/pages/Home.css'

type SessionUser = {
    id: string
    email: string | null
    username: string
}

function deriveUsername(user: User): string {
    const metaName = user.user_metadata?.username
    if (typeof metaName === 'string' && metaName.trim()) return metaName.trim()
    return '用户'
}

function navLinkClass({ isActive }: { isActive: boolean }): string {
    return 'nav-link' + (isActive ? ' active' : '')
}

function MainSiteLayout() {
    const navigate = useNavigate()
    const [user, setUser] = useState<SessionUser | null>(null)
    const [authReady, setAuthReady] = useState(false)

    useEffect(() => {
        let active = true
        let requestVersion = 0

        async function apply(authUser: User | null) {
            const version = ++requestVersion

            if (!authUser) {
                if (active && version === requestVersion) {
                    setUser(null)
                    setAuthReady(true)
                }
                return
            }

            let username = deriveUsername(authUser)

            try {
                const profileName = await getProfileUsername(authUser.id)
                if (profileName?.trim()) username = profileName.trim()
            } catch {
                // Auth metadata remains a safe display fallback when a profile
                // has not been created yet or is temporarily unavailable.
            }

            if (active && version === requestVersion) {
                setUser({
                    id: authUser.id,
                    email: authUser.email ?? null,
                    username,
                })
                setAuthReady(true)
            }
        }

        void getCurrentSessionUser()
            .then((authUser) => void apply(authUser))
            .catch(() => {
                if (active) {
                    setUser(null)
                    setAuthReady(true)
                }
            })

        const unsubscribe = subscribeToAuthUser((authUser) => {
            void apply(authUser)
        })

        return () => {
            active = false
            unsubscribe()
        }
    }, [])

    async function signOut() {
        await signOutCurrentUser()
        setUser(null)
        setAuthReady(true)
        navigate('/')
    }

    return (
        <>
            <div className="nav">
                <div className="nav-left">
                    <Link className="nav-logo" to="/">DITING</Link>
                </div>
                <nav className="nav-center" aria-label="主导航">
                    <NavLink className={navLinkClass} to="/relay">游戏汉化</NavLink>
                    <NavLink className={navLinkClass} to="/works">项目</NavLink>
                    <NavLink className={navLinkClass} to="/blog">博客</NavLink>
                    <NavLink className={navLinkClass} to="/emulator">模拟器</NavLink>
                    <NavLink className={navLinkClass} to="/about">关于我</NavLink>
                    <NavLink className={navLinkClass} to="/support">投喂</NavLink>
                </nav>

                <div className="nav-right">
                    <div className="nav-auth-area">
                        {!authReady ? (
                            <span className="nav-user">游客</span>
                        ) : user ? (
                            <>
                                <span className="nav-user" title={user.email ?? undefined}>
                                    {user.username}
                                </span>
                                <button className="nav-login" onClick={signOut}>退出</button>
                            </>
                        ) : (
                            <>
                                <span className="nav-user">游客</span>
                                <Link className="nav-login" to="/auth/login">登录</Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <Outlet />
        </>
    )
}

export default MainSiteLayout
