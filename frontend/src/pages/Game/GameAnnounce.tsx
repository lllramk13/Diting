import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState, type CSSProperties } from 'react'
import TopNav from '../Home/TopNav'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import { getGameTheme, hexToRgb } from './gameTheme'

const mono = "'Space Mono', monospace"
const cn = "'Noto Sans SC', sans-serif"

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
        label: 'P2EP 测试补丁',
        url: 'https://pan.baidu.com/s/1njGANWf7os-WfrYcpVf0-Q?pwd=5ud5',
        note: '这里换成 P2EP 自己的链接。',
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
        <main
          style={{
            minHeight: '100vh',
            background: '#0A0E18',
            color: '#EAEEF7',
            padding: 40,
          }}
        >
          <h1>Game not found</h1>
          <Link to="/game" style={{ color: '#E8B23A' }}>
            返回游戏列表
          </Link>
        </main>
      </>
    )
  }

  const a = game.announcement
  const t = getGameTheme(game)
  const accent = t.accent
  const rgb = hexToRgb(accent)

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

  const card: CSSProperties = {
    padding: 24,
    borderRadius: 14,
    background: t.card,
    border: `1px solid ${t.cardBorder}`,
  }

  const cardTitle: CSSProperties = {
    fontFamily: cn,
    fontWeight: 700,
    fontSize: 18,
    marginBottom: 16,
  }

  return (
    <GamePageShell game={game}>
      <main
        style={{
          background: t.bg,
          color: t.text,
          fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif",
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            maxWidth: 1180,
            margin: '0 auto',
            padding: '36px 40px 60px',
          }}
        >
          {game.ghostChar && (
            <div
              style={{
                position: 'absolute',
                right: -40,
                top: -60,
                fontFamily: cn,
                fontWeight: 900,
                fontSize: 340,
                color: `rgba(${rgb},0.07)`,
                lineHeight: 1,
                pointerEvents: 'none',
                zIndex: 0,
              }}
            >
              {game.ghostChar}
            </div>
          )}

          {/* hero */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 18,
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: 32,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 13,
                  color: accent,
                  letterSpacing: 2,
                }}
              >
                {game.platform.toUpperCase()} · {game.title}
              </div>

              <h1
                style={{
                  fontFamily: cn,
                  fontWeight: 900,
                  fontSize: 56,
                  margin: '12px 0 0',
                  letterSpacing: 2,
                }}
              >
                {game.titleZh ?? game.title}
              </h1>

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  marginTop: 18,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    padding: '6px 14px',
                    borderRadius: 20,
                    background: `rgba(${rgb},0.15)`,
                    color: accent,
                  }}
                >
                  {statusLabels[game.status] ?? game.status}
                </span>

                <span
                  style={{
                    fontSize: 13,
                    padding: '6px 14px',
                    borderRadius: 20,
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(220,228,245,0.7)',
                    fontFamily: mono,
                  }}
                >
                  当前版本 {a.version}
                </span>

                {a.updated && (
                  <span
                    style={{
                      fontSize: 13,
                      padding: '6px 14px',
                      borderRadius: 20,
                      background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(220,228,245,0.7)',
                      fontFamily: mono,
                    }}
                  >
                    更新 {a.updated}
                  </span>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 13,
                  color: 'rgba(200,220,255,0.5)',
                }}
              >
                翻译进度
              </div>

              <div
                style={{
                  fontFamily: mono,
                  fontWeight: 700,
                  fontSize: 38,
                  color: accent,
                }}
              >
                {game.progress}%
              </div>
            </div>
          </div>

          {/* two col */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'grid',
              gridTemplateColumns: '1.7fr 1fr',
              gap: 24,
              alignItems: 'start',
            }}
          >
            {/* left main */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {/* notice */}
              <div
                style={{
                  padding: '22px 24px',
                  borderRadius: 14,
                  background: 'rgba(255,180,60,0.06)',
                  border: '1px solid rgba(255,180,60,0.22)',
                }}
              >
                <div
                  style={{
                    fontFamily: cn,
                    fontWeight: 700,
                    fontSize: 16,
                    color: '#F0B84A',
                    marginBottom: 12,
                  }}
                >
                  ⚠ 重要注意事项
                </div>

                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {a.notes.map((n, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 14,
                        color: 'rgba(230,236,250,0.82)',
                        lineHeight: 1.6,
                      }}
                    >
                      {n}
                    </li>
                  ))}
                </ul>
              </div>

              {/* tutorial */}
              <div style={card}>
                <div style={cardTitle}>补丁使用教程</div>

                <ol
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  {a.installGuide.map((s, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        gap: 14,
                        alignItems: 'flex-start',
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: `rgba(${rgb},0.15)`,
                          color: accent,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: mono,
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {i + 1}
                      </span>

                      <span
                        style={{
                          fontSize: 14,
                          color: 'rgba(230,236,250,0.82)',
                          lineHeight: 1.6,
                          paddingTop: 3,
                        }}
                      >
                        {s}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* known issues */}
              {a.knownIssues && a.knownIssues.length > 0 && (
                <div style={card}>
                  <div style={{ ...cardTitle, marginBottom: 14 }}>已知问题</div>

                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {a.knownIssues.map((k, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: 14,
                          color: 'rgba(230,236,250,0.7)',
                          lineHeight: 1.6,
                        }}
                      >
                        {k}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* changelog */}
              {a.changelog && a.changelog.length > 0 && (
                <div style={card}>
                  <div style={cardTitle}>更新说明</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {a.changelog.map((c, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 14,
                          alignItems: 'baseline',
                        }}
                      >
                        <span
                          style={{
                            flexShrink: 0,
                            fontFamily: mono,
                            fontSize: 13,
                            color: accent,
                            width: 64,
                          }}
                        >
                          {c.version}
                        </span>

                        <span
                          style={{
                            fontSize: 14,
                            color: 'rgba(230,236,250,0.72)',
                            lineHeight: 1.5,
                          }}
                        >
                          {c.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* copyright */}
              <div
                style={{
                  padding: 24,
                  borderRadius: 14,
                  background: 'rgba(248,81,73,0.05)',
                  border: '1px solid rgba(248,81,73,0.2)',
                }}
              >
                <div
                  style={{
                    fontFamily: cn,
                    fontWeight: 700,
                    fontSize: 16,
                    color: '#F0888A',
                    marginBottom: 12,
                  }}
                >
                  版权声明 · 禁止倒卖
                </div>

                <p
                  style={{
                    fontSize: 13.5,
                    color: 'rgba(230,236,250,0.72)',
                    lineHeight: 1.7,
                    margin: '0 0 10px',
                  }}
                >
                  {a.copyrightNotice}
                </p>

                <p
                  style={{
                    fontSize: 13.5,
                    color: 'rgba(255,180,180,0.9)',
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {a.resaleNotice}
                </p>
              </div>
            </div>

            {/* right sticky */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                position: 'sticky',
                top: 90,
              }}
            >
              <div
                style={{
                  padding: 24,
                  borderRadius: 16,
                  background: `linear-gradient(160deg,rgba(${rgb},0.10),rgba(255,255,255,0.02))`,
                  border: `1px solid rgba(${rgb},0.20)`,
                }}
              >
                <div
                  style={{
                    fontFamily: cn,
                    fontWeight: 700,
                    fontSize: 18,
                    marginBottom: 4,
                  }}
                >
                  下载补丁
                </div>

                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    color: 'rgba(200,220,255,0.5)',
                    marginBottom: 18,
                  }}
                >
                  {a.version}
                  {a.size ? ` · ${a.size}` : ''}
                  {a.updated ? ` · ${a.updated}` : ''}
                </div>

                {a.downloadLinks[0] && (
                  <a
                    href={a.downloadLinks[0].url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      width: '100%',
                      boxSizing: 'border-box',
                      textDecoration: 'none',
                      background: accent,
                      color: '#0A0E18',
                      fontWeight: 700,
                      padding: 15,
                      fontSize: 15,
                      borderRadius: 10,
                      marginBottom: 10,
                    }}
                  >
                    ⬇ 下载主补丁包
                  </a>
                )}

                {a.downloadLinks.slice(1).map(l => (
                  <a
                    key={l.label}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      width: '100%',
                      boxSizing: 'border-box',
                      textDecoration: 'none',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: '#EAEEF7',
                      padding: 12,
                      fontSize: 13,
                      borderRadius: 10,
                      marginBottom: 8,
                    }}
                  >
                    {l.label}
                    {l.note ? ` · ${l.note}` : ''}
                  </a>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => navigate(game.routes.main)} style={sideBtn}>
                  <span>参与翻译</span>
                  <span style={{ fontFamily: mono, fontSize: 12, color: accent }}>
                    主集 / Fork →
                  </span>
                </button>

                <button onClick={() => navigate(game.routes.issues)} style={sideBtn}>
                  <span>提交问题 / 反馈</span>
                  <span style={{ fontFamily: mono, fontSize: 12, color: accent }}>
                    可匿名 →
                  </span>
                </button>
              </div>

              <div
                onClick={() => navigate('/sponsor')}
                style={{
                  cursor: 'pointer',
                  padding: 18,
                  borderRadius: 12,
                  background: 'rgba(232,178,58,0.08)',
                  border: '1px solid rgba(232,178,58,0.22)',
                }}
              >
                <div
                  style={{
                    fontFamily: cn,
                    fontWeight: 600,
                    fontSize: 14,
                    color: '#E8B23A',
                  }}
                >
                  这个项目帮到你了吗？
                </div>

                <p
                  style={{
                    fontSize: 12.5,
                    color: 'rgba(220,228,245,0.6)',
                    margin: '8px 0 0',
                    lineHeight: 1.6,
                  }}
                >
                  轻量赞助支持后续开发（自愿，下载始终免费）
                </p>

                <span
                  style={{
                    display: 'inline-block',
                    marginTop: 10,
                    fontFamily: mono,
                    fontSize: 12,
                    color: '#E8B23A',
                  }}
                >
                  去赞助 →
                </span>
              </div>
            </div>
          </div>

          {/* GTA style secret pad */}
          <div
            style={{
              position: 'fixed',
              right: 22,
              bottom: 22,
              zIndex: 9999,
              display: 'grid',
              gridTemplateColumns: '44px 44px 44px 44px',
              gridTemplateRows: '44px 44px 24px',
              gap: 8,
              padding: 12,
              borderRadius: 18,
              background: 'rgba(10,14,24,0.90)',
              border: `1px solid rgba(${rgb},0.36)`,
              boxShadow: `0 0 24px rgba(${rgb},0.26)`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <button
              onClick={() => pressSecret('up')}
              style={{
                ...secretPadBtn,
                gridColumn: '2 / 3',
                gridRow: '1 / 2',
                color: accent,
                borderColor: `rgba(${rgb},0.45)`,
                background: `rgba(${rgb},0.12)`,
              }}
            >
              ↑
            </button>

            <button
              onClick={() => pressSecret('b')}
              style={{
                ...secretPadBtn,
                gridColumn: '4 / 5',
                gridRow: '1 / 2',
                color: '#F0888A',
                borderColor: 'rgba(240,136,138,0.45)',
                background: 'rgba(240,136,138,0.12)',
              }}
            >
              B
            </button>

            <button
              onClick={() => pressSecret('left')}
              style={{
                ...secretPadBtn,
                gridColumn: '1 / 2',
                gridRow: '2 / 3',
                color: accent,
                borderColor: `rgba(${rgb},0.45)`,
                background: `rgba(${rgb},0.12)`,
              }}
            >
              ←
            </button>

            <button
              onClick={() => pressSecret('down')}
              style={{
                ...secretPadBtn,
                gridColumn: '2 / 3',
                gridRow: '2 / 3',
                color: accent,
                borderColor: `rgba(${rgb},0.45)`,
                background: `rgba(${rgb},0.12)`,
              }}
            >
              ↓
            </button>

            <button
              onClick={() => pressSecret('right')}
              style={{
                ...secretPadBtn,
                gridColumn: '3 / 4',
                gridRow: '2 / 3',
                color: accent,
                borderColor: `rgba(${rgb},0.45)`,
                background: `rgba(${rgb},0.12)`,
              }}
            >
              →
            </button>

            <button
              onClick={() => pressSecret('a')}
              style={{
                ...secretPadBtn,
                gridColumn: '4 / 5',
                gridRow: '2 / 3',
                color: '#2DFF9A',
                borderColor: 'rgba(45,255,154,0.36)',
                background: 'rgba(45,255,154,0.10)',
              }}
            >
              A
            </button>

            <div
              style={{
                gridColumn: '1 / 5',
                gridRow: '3 / 4',
                alignSelf: 'center',
                justifySelf: 'end',
                fontFamily: mono,
                fontSize: 9,
                letterSpacing: 1.5,
                color: 'rgba(200,220,255,0.34)',
                pointerEvents: 'none',
                paddingRight: 4,
              }}
            >
            </div>
          </div>

          {secretOpen && (
            <SecretModal
              secret={secret}
              codeLabel={secretCodeLabel}
              accent={accent}
              rgb={rgb}
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
  accent,
  rgb,
  onClose,
}: {
  secret: SecretConfig
  codeLabel: string
  accent: string
  rgb: string
  onClose: () => void
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.62)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(620px, 100%)',
          borderRadius: 22,
          background:
            'radial-gradient(circle at top right, rgba(232,178,58,0.18), transparent 42%), #0A0E18',
          border: `1px solid rgba(${rgb},0.34)`,
          boxShadow: '0 30px 90px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 4,
            background: accent,
          }}
        />

        <div style={{ padding: 28 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 18,
              alignItems: 'flex-start',
              marginBottom: 18,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  letterSpacing: 2.2,
                  color: accent,
                  marginBottom: 10,
                }}
              >
                {secret.subtitle}
              </div>

              <h2
                style={{
                  margin: 0,
                  fontFamily: cn,
                  fontSize: 28,
                  lineHeight: 1.25,
                  color: '#EAEEF7',
                  fontWeight: 900,
                }}
              >
                {secret.title}
              </h2>
            </div>

            <button
              onClick={onClose}
              style={{
                flexShrink: 0,
                width: 36,
                height: 36,
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                color: '#EAEEF7',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              fontFamily: mono,
              fontSize: 12,
              color: 'rgba(200,220,255,0.52)',
              marginBottom: 16,
            }}
          >
            输入序列：{codeLabel}
          </div>

          <p
            style={{
              margin: '0 0 22px',
              color: 'rgba(230,236,250,0.76)',
              fontSize: 14.5,
              lineHeight: 1.8,
            }}
          >
            {secret.body}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {secret.links.map(link => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  alignItems: 'center',
                  textDecoration: 'none',
                  borderRadius: 13,
                  padding: '14px 16px',
                  background: link.primary
                    ? accent
                    : 'rgba(255,255,255,0.05)',
                  border: link.primary
                    ? `1px solid ${accent}`
                    : '1px solid rgba(255,255,255,0.12)',
                  color: link.primary ? '#0A0E18' : '#EAEEF7',
                  fontFamily: cn,
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                <span>
                  {link.label}
                  {link.note && (
                    <span
                      style={{
                        display: 'block',
                        marginTop: 4,
                        fontFamily: cn,
                        fontSize: 12,
                        fontWeight: 400,
                        color: link.primary
                          ? 'rgba(10,14,24,0.72)'
                          : 'rgba(230,236,250,0.56)',
                        lineHeight: 1.5,
                      }}
                    >
                      {link.note}
                    </span>
                  )}
                </span>

                <span style={{ fontFamily: mono, fontSize: 13 }}>→</span>
              </a>
            ))}
          </div>

          <p
            style={{
              margin: '18px 0 0',
              color: 'rgba(200,220,255,0.44)',
              fontSize: 12,
              lineHeight: 1.7,
            }}
          >
          </p>
        </div>
      </div>
    </div>
  )
}

const secretPadBtn: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.05)',
  color: '#EAEEF7',
  fontFamily: mono,
  fontSize: 17,
  fontWeight: 900,
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.24)',
}

const sideBtn: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
  padding: '15px 18px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#EAEEF7',
  fontFamily: 'inherit',
  fontSize: 14,
}