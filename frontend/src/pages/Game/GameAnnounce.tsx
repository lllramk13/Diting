import { Link, useParams } from "react-router-dom"
import TopNav from "../Home/TopNav"
import { getGameBySlug } from "../../games/registry"
import "./GameAnnounce.css"
import GamePageShell from "./GamePageShell"

const statusLabels: Record<string, string> = {
  planning: "计划中",
  in_progress: "进行中",
  translated: "初翻完成",
  released: "已发布",
  paused: "暂停",
}

export default function GameAnnounce() {
  const { gameSlug } = useParams()
  const game = getGameBySlug(gameSlug ?? "")

  if (!game) {
    return (
      <>
        <TopNav />
        <main className="game-announce-page">
          <h1>Game not found</h1>
          <Link to="/game">返回游戏列表</Link>
        </main>
      </>
    )
  }

  return (
    <GamePageShell game={game}>
      <main className="game-announce-page">
        <section className="game-announce-hero">
          <p className="game-announce-kicker">
            {game.platform.toUpperCase()} / {statusLabels[game.status] ?? game.status}
          </p>

          <h1>{game.title}</h1>

          <p>{game.description}</p>

          <div className="game-announce-meta">
            <span>当前版本：{game.announcement.version}</span>
            <span>进度：{game.progress}%</span>
          </div>
        </section>

        <section className="game-announce-section">
          <h2>下载</h2>

          <div className="game-download-grid">
            {game.announcement.downloadLinks.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="game-download-card"
              >
                <strong>{link.label}</strong>
                {link.note && <span>{link.note}</span>}
              </a>
            ))}
          </div>
        </section>

        <section className="game-announce-section">
          <h2>使用前注意</h2>
          <ul>
            {game.announcement.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>

        <section className="game-announce-section">
          <h2>补丁使用教程</h2>
          <ol>
            {game.announcement.installGuide.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="game-announce-section warning">
          <h2>版权声明与禁止倒卖</h2>
          <p>{game.announcement.copyrightNotice}</p>
          <p>{game.announcement.resaleNotice}</p>
        </section>

        <section className="game-announce-section">
          <h2>支持项目</h2>
          <p>{game.announcement.sponsorNote}</p>
          <Link to="/sponsor">查看赞助方式</Link>
        </section>

        <section className="game-announce-section">
          <h2>反馈与参与</h2>
          <p>
            如果你发现错字、bug、文本溢出或补丁问题，可以提交反馈。
            如果你想参与翻译，也可以进入协作翻译页面。
          </p>

          <div className="game-announce-actions">
            <Link to={game.routes.issues}>提交问题</Link>
            <Link to={game.routes.main}>参与协作翻译</Link>
          </div>
        </section>
      </main>
    </GamePageShell>
  )
}