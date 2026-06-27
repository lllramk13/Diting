import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import TopNav from '../Home/TopNav'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import { themeVars } from './gameTheme'
import './gameTheme.css'
import './GameAnnounce.css'

const statusLabels: Record<string, string> = {
  planning: '计划中',
  in_progress: '进行中',
  translated: '初翻完成 · 校对中',
  released: '已发布',
  paused: '暂停',
}

type SecretButtonKey = 'up' | 'down' | 'left' | 'right' | 'a' | 'b'
type SecretLink = {
  label: string
  url: string
  note?: string
  primary?: boolean
}

type SecretConfig = {
  code: SecretButtonKey[]
  title: string
  subtitle: string
  body: string
  links: SecretLink[]
}

const secretConfigs: Record<string, SecretConfig> = {
  p2is: {
    code: ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a'],
    title: 'P2IS 隐藏入口已解锁',
    subtitle: 'CHEAT ACTIVATED · PERSONA 2 INNOCENT SIN',
    body:
      '你输入了隐藏秘籍',
    links: [
      {
        label: '隐藏版',
        url: 'https://pan.baidu.com/s/1aGYZf-5RK2ST-abq5p725Q?pwd=ngix',
        note: '完整游戏镜像',
        primary: true,
      },
      {
        label: '去 B 站主页充电',
        url: 'https://space.bilibili.com/156012567',
        note: '如果项目帮到了你，可以自愿支持。',
      },
    ],
  },

  p2ep: {
    code: ['left', 'right', 'left', 'right', 'up', 'down', 'up', 'down', 'a', 'b'],
    title: 'P2EP 隐藏入口已解锁',
    subtitle: 'CHEAT ACTIVATED · PERSONA 2 ETERNAL PUNISHMENT',
    body:
      '这是 P2EP 公告页专属的隐藏秘籍。',
    links: [
      {
        label: '隐藏版',
        url: 'https://pan.baidu.com/s/1njGANWf7os-WfrYcpVf0-Q?pwd=5ud5',
        note: '完整游戏镜像',
        primary: true,
      },
      {
        label: '去 B 站主页充电',
        url: 'https://space.bilibili.com/156012567',
      },
    ],
  },
}

const defaultSecretConfig: SecretConfig = {
  code: ['up', 'a'],
  title: '隐藏入口已解锁',
  subtitle: 'CHEAT ACTIVATED',
  body:
    '你发现了这个公告页的隐藏入口。',
  links: [
    {
      label: '',
      url: '',
      note: '',
      primary: true,
    },
  ],
}

const secretButtons: Array<{
  keyName: SecretButtonKey
  label: string
  title: string
}> = [
  { keyName: 'up', label: '↑', title: 'up' },
  { keyName: 'left', label: '←', title: 'left' },
  { keyName: 'right', label: '→', title: 'right' },
  { keyName: 'down', label: '↓', title: 'down' },
  { keyName: 'a', label: 'A', title: 'a' },
  { keyName: 'b', label: 'B', title: 'b' },
]

export default function GameAnnounce() {
  const { gameSlug } = useParams()
  const navigate = useNavigate()
  const game = getGameBySlug(gameSlug ?? '')

  const [, setSecretInput] = useState<SecretButtonKey[]>([])
  const [secretOpen, setSecretOpen] = useState(false)

  if (!game) {
    return (
      <>
        <TopNav />
        <main className="an-notfound">
          <h1>Game not found</h1>
          <Link to="/game" className="an-notfound-link">
            返回游戏列表
          </Link>
        </main>
      </>
    )
  }

  const a = game.announcement

  const secret = secretConfigs[game.slug] ?? defaultSecretConfig
  const secretCodeLabel = secret.code
    .map(k => secretButtons.find(b => b.keyName === k)?.label ?? '?')
    .join(' ')

  function pressSecret(key: SecretButtonKey) {
    setSecretInput(prev => {
      const next = [...prev, key].slice(-secret.code.length)

      if (next.join(',') === secret.code.join(',')) {
        setSecretOpen(true)
        return []
      }

      return next
    })
  }

  return (
    <GamePageShell game={game}>
      <main className="game-theme an-main" style={themeVars(game)}>
        <div className="an-container">
          {game.ghostChar && <div className="an-ghost">{game.ghostChar}</div>}

          {/* hero */}
          <div className="an-hero">
            <div>
              <div className="an-hero-eyebrow">
                {game.platform.toUpperCase()} · {game.title}
              </div>

              <h1 className="an-hero-title">{game.titleZh ?? game.title}</h1>

              <div className="an-hero-tags">
                <span className="an-tag-status">{statusLabels[game.status] ?? game.status}</span>

                <span className="an-tag-ver">当前版本 {a.version}</span>

                {a.updated && <span className="an-tag-ver">更新 {a.updated}</span>}
              </div>
            </div>

            <div className="an-progress-wrap">
              <div className="an-progress-label">翻译进度</div>
              <div className="an-progress-val">{game.progress}%</div>
            </div>
          </div>

          {/* two col */}
          <div className="an-grid">
            {/* left main */}
            <div className="an-col-main">
              {/* notice */}
              <div className="an-notice">
                <div className="an-notice-title">⚠ 重要注意事项</div>

                <ul className="an-list">
                  {a.notes.map((n, i) => (
                    <li key={i} className="an-list-item">
                      {n}
                    </li>
                  ))}
                </ul>
              </div>

              {/* tutorial */}
              <div className="an-card">
                <div className="an-card-title">补丁使用教程</div>

                <ol className="an-steps">
                  {a.installGuide.map((s, i) => (
                    <li key={i} className="an-step">
                      <span className="an-step-num">{i + 1}</span>
                      <span className="an-step-text">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* known issues */}
              {a.knownIssues && a.knownIssues.length > 0 && (
                <div className="an-card">
                  <div className="an-card-title an-card-title--tight">已知问题</div>

                  <ul className="an-list">
                    {a.knownIssues.map((k, i) => (
                      <li key={i} className="an-list-item an-list-item--dim">
                        {k}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* changelog */}
              {a.changelog && a.changelog.length > 0 && (
                <div className="an-card">
                  <div className="an-card-title">更新说明</div>

                  <div className="an-changelog">
                    {a.changelog.map((c, i) => (
                      <div key={i} className="an-change">
                        <span className="an-change-ver">{c.version}</span>
                        <span className="an-change-text">{c.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* copyright */}
              <div className="an-copyright">
                <div className="an-copyright-title">版权声明 · 禁止倒卖</div>

                <p className="an-copyright-p">{a.copyrightNotice}</p>

                <p className="an-resale-p">{a.resaleNotice}</p>
              </div>
            </div>

            {/* right sticky */}
            <div className="an-col-side">
              <div className="an-download">
                <div className="an-download-title">下载补丁</div>

                <div className="an-download-meta">
                  {a.version}
                  {a.size ? ` · ${a.size}` : ''}
                  {a.updated ? ` · ${a.updated}` : ''}
                </div>

                {a.downloadLinks[0] && (
                  <a
                    className="an-dl-primary"
                    href={a.downloadLinks[0].url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    ⬇ 下载主补丁包
                  </a>
                )}

                {a.downloadLinks.slice(1).map(l => (
                  <a
                    key={l.label}
                    className="an-dl-secondary"
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {l.label}
                    {l.note ? ` · ${l.note}` : ''}
                  </a>
                ))}
              </div>

              <div className="an-side-actions">
                <button className="an-side-btn" onClick={() => navigate(game.routes.main)}>
                  <span>参与翻译</span>
                  <span className="an-side-btn-hint">主集 / Fork →</span>
                </button>

                <button className="an-side-btn" onClick={() => navigate(game.routes.issues)}>
                  <span>提交问题 / 反馈</span>
                  <span className="an-side-btn-hint">可匿名 →</span>
                </button>
              </div>

              <div className="an-sponsor" onClick={() => navigate('/sponsor')}>
                <div className="an-sponsor-title">这个项目帮到你了吗？</div>

                <p className="an-sponsor-text">
                  轻量赞助支持后续开发（自愿，下载始终免费）
                </p>

                <span className="an-sponsor-link">去赞助 →</span>
              </div>
            </div>
          </div>

          {/* GTA style secret pad */}
          {/*
          <div className="an-pad">
            <button className="an-pad-btn an-pad-up an-pad--accent" onClick={() => pressSecret('up')}>
              ↑
            </button>

            <button className="an-pad-btn an-pad-b an-pad--b" onClick={() => pressSecret('b')}>
              B
            </button>

            <button
              className="an-pad-btn an-pad-left an-pad--accent"
              onClick={() => pressSecret('left')}
            >
              ←
            </button>

            <button
              className="an-pad-btn an-pad-down an-pad--accent"
              onClick={() => pressSecret('down')}
            >
              ↓
            </button>

            <button
              className="an-pad-btn an-pad-right an-pad--accent"
              onClick={() => pressSecret('right')}
            >
              →
            </button>

            <button className="an-pad-btn an-pad-a an-pad--a" onClick={() => pressSecret('a')}>
              A
            </button>

            <div className="an-pad-spacer" />
          </div>*/}

          {secretOpen && (
            <SecretModal
              secret={secret}
              codeLabel={secretCodeLabel}
              onClose={() => setSecretOpen(false)}
            />
          )}
        </div>
      </main>
    </GamePageShell>
  )
}

function SecretModal({
  secret,
  codeLabel,
  onClose,
}: {
  secret: SecretConfig
  codeLabel: string
  onClose: () => void
}) {
  return (
    <div className="an-secret-overlay" onClick={onClose}>
      <div className="an-secret-modal" onClick={e => e.stopPropagation()}>
        <div className="an-secret-top" />

        <div className="an-secret-body">
          <div className="an-secret-head">
            <div>
              <div className="an-secret-subtitle">{secret.subtitle}</div>
              <h2 className="an-secret-title">{secret.title}</h2>
            </div>

            <button className="an-secret-close" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="an-secret-code">输入序列：{codeLabel}</div>

          <p className="an-secret-bodytext">{secret.body}</p>

          <div className="an-secret-links">
            {secret.links.map(link => (
              <a
                key={link.label}
                className={`an-secret-link${link.primary ? ' is-primary' : ''}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
              >
                <span>
                  {link.label}
                  {link.note && <span className="an-secret-link-note">{link.note}</span>}
                </span>

                <span className="an-secret-arrow">→</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
