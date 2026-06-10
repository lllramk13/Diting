import TopNav from '../Home/TopNav'
import P2ISNav from './P2ISNav'
import './P2IS.css'

const DOWNLOAD_LINK_1 = 'https://pan.baidu.com/s/14s1VWYrj6qWDelHmEIpQ7Q?pwd=ij8t'
const DOWNLOAD_LINK_2 = 'https://mega.nz/folder/7Uo2lDCQ#BKiuCCg4shAXwmKJM5E5DA'
const GITHUB_LINK = 'https://github.com/lllramk13/P2IS_Translation_Tools'

export default function Announce() {
  return (
    <div className="p2is-page">
      <TopNav />
      <div className="browse-wrap">
        <P2ISNav />
        <div className="announce-wrap">
          <h1 className="announce-title">女神异闻录 2 罪 汉化计划</h1>
          <p className="announce-subtitle">
            基于 PS1 版 Persona 2: Innocent Sin 的协作翻译平台
          </p>

          <section className="announce-section">
            <h2>下载</h2>
            <div className="video-wrap">
              <iframe
                src="//player.bilibili.com/player.html?isOutside=true&aid=116711676188856&bvid=BV1CbET63EXH&cid=38944507337&p=1"
                allowFullScreen
                style={{ width: '100%', height: '400px', border: 'none', borderRadius: 10, overflow: 'hidden' }}
              />
            </div>
            <div className="download-grid">
              <a className="download-card" href={DOWNLOAD_LINK_1} target="_blank" rel="noreferrer">
                <div className="download-icon">↓</div>
                <div>
                  <div className="download-name">百度网盘</div>
                  <div className="download-desc muted">v0.2.0</div>
                </div>
              </a>
              <a className="download-card" href={DOWNLOAD_LINK_2} target="_blank" rel="noreferrer">
                <div className="download-icon">↓</div>
                <div>
                  <div className="download-name">Mega Link</div>
                  <div className="download-desc muted">v0.2.0</div>
                </div>
              </a>
            </div>
            <a className="github-link" href={GITHUB_LINK} target="_blank" rel="noreferrer">
              GitHub 项目页面 →
            </a>
          </section>

          <section className="announce-section">
            <h2>如何参与翻译</h2>
            <ol className="announce-steps">
              <li>
                <span className="step-num">1</span>
                <div>
                  <strong>注册账号</strong>
                  <p>点击右上角登录/注册，使用邮箱注册账号并设置用户名。</p>
                </div>
              </li>
              <li>
                <span className="step-num">2</span>
                <div>
                  <strong>搜索你感兴趣的文本</strong>
                  <p>在搜索页面输入日文或中文关键词，找到你想翻译的内容所在的文件组。</p>
                </div>
              </li>
              <li>
                <span className="step-num">3</span>
                <div>
                  <strong>Fork 主集</strong>
                  <p>在主集页面找到对应的文件组，点击 Fork 创建你自己的译文集副本。</p>
                </div>
              </li>
              <li>
                <span className="step-num">4</span>
                <div>
                  <strong>编辑译文</strong>
                  <p>在编辑器里逐条修改翻译，支持搜索和分页。你不需要翻译全部内容，只改你想改的部分即可。</p>
                </div>
              </li>
              <li>
                <span className="step-num">5</span>
                <div>
                  <strong>提交修改请求</strong>
                  <p>点击"提交修改请求"，填写标题和说明。社区成员可以对你的请求投票，管理员审核后合并到主集。</p>
                </div>
              </li>
            </ol>
          </section>

          <section className="announce-section">
            <h2>说明</h2>
            <ul className="announce-notes">
              <li>本平台为民间汉化项目，与 ATLUS 官方无关。</li>
              <li>所有翻译内容遵循协作开放原则，欢迎贡献和讨论。</li>
              <li>如遇问题请在讨论页面发帖，或在 GitHub 提交 Issue。</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
