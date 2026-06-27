import { Link, useParams } from 'react-router-dom'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import { themeVars } from './gameTheme'
import './gameTheme.css'
import './GameEmulator.css'

export default function GameEmulator() {
  const { gameSlug } = useParams<{ gameSlug: string }>()
  const game = getGameBySlug(gameSlug ?? '')

  if (!game) {
    return (
      <main className="emu-notfound">
        <div className="emu-notfound-card">
          <span className="emu-eyebrow">PLAYER / 404</span>
          <h1>未找到游戏</h1>
          <p>这个在线游玩入口不存在，或者游戏尚未加入模拟器。</p>
          <Link to="/game">返回游戏列表</Link>
        </div>
      </main>
    )
  }

  return (
    <GamePageShell game={game}>
      <main className="game-theme emu-main" style={themeVars(game)}>
        <div className="emu-ambient" aria-hidden="true" />

        <div className="emu-container">
          <header className="emu-hero">
            <div className="emu-hero-copy">
              <div className="emu-eyebrow">
                {game.platform.toUpperCase()} / WEB PLAYER
              </div>
              <h1>{game.titleZh ?? game.title}</h1>
              <p>
                在浏览器中载入你本地的游戏镜像。文件只在当前设备中读取，不会上传到服务器。请使用合法来源的游戏副本与补丁。
              </p>
            </div>

            <div className="emu-hero-meta" aria-label="运行环境">
              <span className="emu-chip emu-chip--accent">
                <i /> PLAYER READY
              </span>
              <span className="emu-chip">{game.shortTitle}</span>
              <span className="emu-chip">SCPH-5500</span>
            </div>
          </header>

          <div className="emu-workspace">
            <section className="emu-console" aria-label={`${game.shortTitle} 模拟器`}>
              <div className="emu-console-bar">
                <div className="emu-window-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="emu-console-title">
                  <span>{game.shortTitle}</span>
                  <b>EmulatorJS 4.2.3</b>
                </div>
                <span className="emu-console-state">LOCAL SESSION</span>
              </div>

              <div className="emu-screen">
                <iframe
                  src="/emulator/4.2.3/index.html?v=biosfix1"
                  title={`${game.shortTitle} 在线游玩`}
                  allow="fullscreen; gamepad"
                  allowFullScreen
                />
              </div>

              <div className="emu-console-foot">
                <span>CORE / PCSX_REARMED</span>
                <span>BIOS / JP</span>
                <span>SAVE / BROWSER</span>
              </div>
            </section>

            <aside className="emu-sidebar">
              <section className="emu-map-card">
                <div className="emu-card-head">
                  <div>
                    <span className="emu-card-kicker">NAV ASSIST</span>
                    <h2></h2>{/*实时小地图*/}
                  </div>
                  <span className="emu-status-pill">开发中</span>
                </div>

                {/*<div className="emu-map-preview" aria-label="小地图功能预览">
                  <div className="emu-map-grid" />
                  <div className="emu-map-route emu-map-route--one" />
                  <div className="emu-map-route emu-map-route--two" />
                  <div className="emu-map-player">
                    <span />
                  </div>
                  <div className="emu-map-coord">X --- &nbsp; Y ---</div>
                </div>*/}

                <p className="emu-map-copy">
                </p>
              </section>

              <section className="emu-session-card">
                <div className="emu-card-head emu-card-head--compact">
                  <div>
                    <span className="emu-card-kicker">SESSION</span>
                    <h2>运行状态</h2>
                  </div>
                </div>

                <dl className="emu-specs">
                  <div>
                    <dt>模拟平台</dt>
                    <dd>PlayStation</dd>
                  </div>
                  <div>
                    <dt>核心</dt>
                    <dd>PCSX-ReARMed</dd>
                  </div>
                  <div>
                    <dt>BIOS</dt>
                    <dd>SCPH-5500 / JP</dd>
                  </div>
                  <div>
                    <dt>镜像来源</dt>
                    <dd className="emu-local-value">本地设备</dd>
                  </div>
                </dl>
              </section>
            </aside>
          </div>

          <section className="emu-guide" aria-label="使用说明">
            <div className="emu-guide-item">
              <span className="emu-guide-num">01</span>
              <div>
                <h3>选择游戏镜像</h3>
                <p>点击模拟器中的载入区域，选择你合法持有的镜像文件。</p>
              </div>
            </div>
            <div className="emu-guide-item">
              <span className="emu-guide-num">02</span>
              <div>
                <h3>开始本地运行</h3>
                <p>游戏在浏览器内运行；首次载入核心可能需要一点时间。</p>
              </div>
            </div>
            <div className="emu-guide-item">
              <span className="emu-guide-num">03</span>
              <div>
                <h3>保留进度</h3>
                <p>建议定期下载存档或即时存档，避免浏览器数据被清理。</p>
              </div>
            </div>
          </section>

          <footer className="emu-footer">
            <p>
              游戏镜像仅在你的浏览器中处理。请使用合法来源的游戏副本与补丁。
            </p>
            <p className="emu-credit">
              模拟器基于{' '}
              <a
                href="https://github.com/EmulatorJS/EmulatorJS"
                target="_blank"
                rel="noreferrer"
              >
                EmulatorJS 4.2.3
              </a>
              {' '}·{' '}
              <a
                href="/emulator/4.2.3/LICENSE"
                target="_blank"
                rel="noreferrer"
              >
                GPL-3.0
              </a>
              {' '}· 本项目修改版 2026-06-27
            </p>
          </footer>
        </div>
      </main>
    </GamePageShell>
  )
}
