import { Link } from "react-router-dom"
import { getGamesByPlatform } from "../../games/registry"
import './GameIndex.css'
import TopNav from "../Home/TopNav"

const statusLabels: Record<string, string> = {
  planning: '计划中',
  in_progress: '进行中',
  translated: '初翻完成',
  released: '已发布',
  paused: '暂停',
}

export default function GameIndex() {
    const gamesByPlatform = getGamesByPlatform()

    return (
        <>
        <TopNav />
        <main className="game-index-page">
            <section className="game-index-hero">
                <h1>Game Translation Project</h1>
                <p>
                    浏览本站的游戏汉化项目、补丁发布页面和协作翻译入口。
                </p>
            </section>
            
            {Object.entries(gamesByPlatform).map(([platform, games]) => (
                <section key={platform} className="game-platform-section">
                    <h2>{platform.toUpperCase()}</h2>

                    <div className="game-card-grid">
                        {games.map((game) => (
                            <article key={game.slug} className="game-card">
                                <div className="game-card-cover">
                                    {game.coverImage ? (
                                        <img src={game.coverImage} alt={`${game.title} cover`}/>
                                    ): (
                                        <div className="game-card-cover-placeholder">
                                            {game.shortTitle}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <p className="game-card-platform">{game.platform.toUpperCase()}</p>
                                    <h3>{game.title}</h3>
                                    <p>{game.description}</p>
                                </div>

                                <div className="game-card-meta">
                                    <span>状态：{statusLabels[game.status] ?? game.status}</span>
                                    <span>进度：{game.progress}%</span>
                                </div>

                                <div className="game-card-actions">
                                    <Link to={game.routes.announce}>公告 / 下载</Link>
                                    <Link to={game.routes.main}>协作翻译</Link>
                                </div>

                            </article>
                        ))}
                    </div>
                </section>
            ))}
        </main>
    </>
    )
}