import { useNavigate, Link } from 'react-router'
import type { CSSProperties } from 'react'
import './HomeSections.css'

export default function HomeSections() {
  const navigate = useNavigate()

  return (
    <div className="home-sections">
      {/* ===== 正在进行的汉化 ===== */}
      <section className="hs-section">
        <div className="hs-head">
          <h2 className="hs-eyebrow">// 正在进行的汉化</h2>
          <button className="hs-all-btn" onClick={() => navigate('/game')}>
            全部游戏 →
          </button>
        </div>
        <div className="hs-cards">
          {/* 罪 */}
          <div className="hs-card is-sin" onClick={() => navigate('/game/psx/p2is/announce')}>
            <div className="hs-ghost">罪</div>
            <div className="hs-card-body">
              <div className="hs-platform">PSX · INNOCENT SIN</div>
              <div className="hs-title">女神异闻录2 · 罪</div>
              <div className="hs-subtitle">Persona 2: Innocent Sin</div>
              <div className="hs-progress-row">
                <div className="hs-progress">
                  <div className="hs-progress-bar" style={{ '--hs-pct': '62%' } as CSSProperties} />
                </div>
                <span className="hs-percent">87.5%</span>
              </div>
              <div className="hs-tags">
                <span className="hs-tag hs-tag--status">进行中</span>
                <span className="hs-tag hs-tag--ver">v0.9.1</span>
              </div>
            </div>
          </div>
          {/* 罚 */}
          <div className="hs-card is-punish" onClick={() => navigate('/game/psx/p2ep/announce')}>
            <div className="hs-ghost">罚</div>
            <div className="hs-card-body">
              <div className="hs-platform">PSX · ETERNAL PUNISHMENT</div>
              <div className="hs-title">女神异闻录2 · 罚</div>
              <div className="hs-subtitle">Persona 2: Eternal Punishment</div>
              <div className="hs-progress-row">
                <div className="hs-progress">
                  <div className="hs-progress-bar" style={{ '--hs-pct': '40%' } as CSSProperties} />
                </div>
                <span className="hs-percent">50%</span>
              </div>
              <div className="hs-tags">
                <span className="hs-tag hs-tag--status">初翻完成 · 校对中</span>
                <span className="hs-tag hs-tag--ver">v0.3.2</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 找到我 + 赞助 ===== */}
      <section id="sponsor" className="hs-section is-sponsor">
        <div className="hs-sponsor-grid">
          <div className="hs-panel">
            <h2 className="hs-eyebrow">// 找到我</h2>
            <div className="hs-links">
              <a className="hs-link" href="https://www.bilibili.com/video/BV1CbET63EXH/">
                <span>哔哩哔哩 · 视频与汉化进度</span>
                <span className="hs-link-tag">B站 →</span>
              </a>
              <a className="hs-link" href="https://github.com/lllramk13/P2IS_Translation_Tools">
                <span>GitHub · 工具与开源代码</span>
                <span className="hs-link-tag">GitHub →</span>
              </a>
              {/*<a className="hs-link" href="#"><span>联系方式 · 合作与反馈</span><span className="hs-link-tag">Email →</span></a>*/}
            </div>
          </div>
          <div className="hs-sponsor-card">
            <div>
              <div className="hs-sponsor-title">喜欢的话，可以请我喝杯咖啡</div>
              <p className="hs-sponsor-text">
                补丁下载始终免费公开。赞助完全自愿，用于服务器、工具与开发时间。
              </p>
            </div>
            <Link to="/sponsor" className="hs-sponsor-link">
              前往赞助页 →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
