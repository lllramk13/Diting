import { useEffect, useState } from "react"
import { NavLink } from "react-router-dom"
import type { GameConfig } from "../../games/types"
import { supabase } from "../../lib/supabase"
import "./GameNav.css"

type GameNavProps = {
  game: GameConfig
}

export default function GameNav({ game }: GameNavProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active) setIsAuthenticated(Boolean(data.session))
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setIsAuthenticated(Boolean(session))
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const publicLinks = [
    { label: "公告", path: game.routes.announce },
    { label: "数据", path: `${game.basePath}/stats` },
    { label: "问题", path: game.routes.issues },
  ]

  const protectedLinks = [
    { label: "主集", path: game.routes.main },
    { label: "社区", path: game.basePath },
    { label: "搜索", path: game.routes.search },
    { label: "合并请求", path: game.routes.requests },
    { label: "术语表", path: game.routes.glossary },
    { label: "字库校对", path: game.routes.font ?? `${game.basePath}/font` },
  ]

  const links = isAuthenticated
    ? [...publicLinks, ...protectedLinks]
    : publicLinks

  return (
    <nav className="game-nav">
      <div className="game-nav-inner">
        <div className="game-nav-title">
          <span>{game.shortTitle}</span>
        </div>

        <div className="game-nav-links">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                isActive ? "game-nav-link active" : "game-nav-link"
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
