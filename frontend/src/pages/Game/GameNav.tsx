import { NavLink } from "react-router-dom"
import type { GameConfig } from "../../games/types"
import "./GameNav.css"

type GameNavProps = {
  game: GameConfig
}

export default function GameNav({ game }: GameNavProps) {
  const links = [
    { label: "公告", path: game.routes.announce },
    { label: "主集", path: game.routes.main },
    { label: "社区", path: game.basePath },
    { label: "搜索", path: game.routes.search },
    { label: "合并请求", path: game.routes.requests },
    { label: "问题", path: game.routes.issues },
    { label: "术语表", path: game.routes.glossary },
  ]

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