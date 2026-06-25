import { Link } from 'react-router-dom'
import TopNav from './Home/TopNav'
import './Sponsor.css'

export default function Sponsor() {
  return (
    <>
      <TopNav />

      <main className="sponsor-main">
        <div className="sp-topline" />

        <div className="sp-wrap">
          <section className="sp-hero">
            <div>
              <div className="sp-hero-eyebrow">SPONSOR · SUPPORT THE PROJECT</div>

              <h1 className="sp-h1">支持 Diting 与汉化项目继续维护</h1>

              <p className="sp-hero-p">
                这个项目花费了大量的时间、精力和金钱，目前服务器、ai翻译花掉了210USD。
                如果这个项目帮到了你，或者你只是想请我喝杯咖啡，可以在这里进行自愿赞助。
                所有发布内容都会尽量保持免费公开，赞助不是购买补丁，也不会影响任何人的正常下载与使用。
              </p>

              <div className="sp-tags">
                <span className="sp-tag sp-tag--accent">自愿支持</span>
                <span className="sp-tag sp-tag--muted">免费发布</span>
                <span className="sp-tag sp-tag--muted">长期维护</span>
              </div>
            </div>

            <div className="sp-uses">
              <div className="sp-uses-label">赞助会用于</div>

              <div className="sp-uses-list">
                {[
                  '服务器、域名与下载分发成本',
                  '开发工具、测试环境与存档管理',
                  '汉化文本校对、补丁测试与版本维护',
                  '未来更多 Atlus / PS1 项目的自动化工具开发',
                ].map(item => (
                  <div key={item} className="sp-use">
                    <span className="sp-use-mark">✦</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ===== B站充电 ===== */}
          <section className="sp-bili-section">
            <a
              className="sp-bili"
              href="https://space.bilibili.com/156012567"
              target="_blank"
              rel="noreferrer"
            >
              <div className="sp-bili-blob" />

              <div className="sp-bili-grid">
                <div>
                  <div className="sp-bili-eyebrow">BILIBILI · 充电支持</div>

                  <h2 className="sp-bili-h2">喜欢这个汉化项目的话，可以去 B 站充电</h2>

                  <p className="sp-bili-p">
                    补丁下载会始终尽量保持免费公开。充电完全自愿，会用于服务器、开发工具、测试时间和后续汉化维护。
                    如果你不方便赞助，点个关注、投币、评论反馈 bug 也一样很有帮助。
                  </p>
                </div>

                <div className="sp-bili-side">
                  <div className="sp-bili-badge">充</div>

                  <span className="sp-bili-cta">前往 B 站主页 →</span>
                </div>
              </div>
            </a>
          </section>

          <section className="sp-card">
            <h2 className="sp-card-h2">赞助说明</h2>

            <div className="sp-two">
              <div>
                <div className="sp-mini-label">不是购买</div>

                <p className="sp-mini-p">
                  赞助是对项目维护的自愿支持，不构成购买游戏、补丁、ROM、ISO 或任何商业服务。
                  项目不会出售游戏本体，也不会提供任何受版权保护的游戏文件。
                </p>
              </div>

              <div>
                <div className="sp-mini-label">不设门槛</div>

                <p className="sp-mini-p">
                  不赞助也可以正常下载和使用公开发布的内容。赞助不会影响补丁获取，也不会制造付费墙。
                  如果你愿意支持，我会非常感谢。
                </p>
              </div>
            </div>
          </section>

          <section className="sp-thanks">
            <div className="sp-thanks-label">THANK YOU</div>

            <p className="sp-thanks-p">
              谢谢每一个下载、测试、反馈 bug、提交翻译建议、转发项目的人。汉化不是一个人能轻松完成的事情，
              你们的反馈和支持会直接影响这个项目能不能走得更远。
            </p>
          </section>

          <div className="sp-foot">
            <Link to="/game" className="sp-btn sp-btn--ghost">
              返回游戏列表
            </Link>

            <Link to="/game/psx/p2is" className="sp-btn sp-btn--accent">
              查看 P2IS 项目
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
