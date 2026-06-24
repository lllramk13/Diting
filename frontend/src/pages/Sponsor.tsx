import { Link } from 'react-router-dom'
import TopNav from './Home/TopNav'

const mono = "'Space Mono', monospace"
const cnf = "'Noto Sans SC', sans-serif"

const t = {
  page: '#0A0E18',
  card: 'rgba(255,255,255,0.03)',
  cardStrong: 'rgba(255,255,255,0.05)',
  line: 'rgba(255,255,255,0.08)',
  line2: 'rgba(255,255,255,0.14)',
  label: 'rgba(200,220,255,0.5)',
  muted: 'rgba(230,236,250,0.72)',
  ink: '#EAEEF7',
  accent: '#E8B23A',
  accentSoft: 'rgba(232,178,58,0.14)',
  accentBorder: 'rgba(232,178,58,0.30)',
  danger: '#F0888A',
  success: '#2D8C50',
}
{/*
type SponsorCardProps = {
  title: string
  desc: string
  image?: string
  link?: string
  button?: string
  note?: string
}*/}

{/*
function SponsorCard({ title, desc, image, link, button, note }: SponsorCardProps) {
  return (
    <section
      style={{
        border: `1px solid ${t.line}`,
        borderRadius: 18,
        background: t.card,
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontFamily: cnf,
            fontSize: 20,
            fontWeight: 800,
            color: t.ink,
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin: '8px 0 0',
            color: t.muted,
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          {desc}
        </p>
      </div>

      {image && (
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            padding: 12,
            width: 190,
            alignSelf: 'center',
          }}
        >
          <img
            src={image}
            alt={title}
            style={{
              width: '100%',
              display: 'block',
              borderRadius: 8,
            }}
          />
        </div>
      )}

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            borderRadius: 10,
            padding: '11px 16px',
            background: t.accent,
            color: '#0A0E18',
            fontFamily: cnf,
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          {button ?? '前往支持'}
        </a>
      )}

      {note && (
        <div
          style={{
            fontSize: 12,
            color: t.label,
            lineHeight: 1.6,
          }}
        >
          {note}
        </div>
      )}
    </section>
  )
}
*/}
export default function Sponsor() {
  return (
    <>
      <TopNav />

      <main
        style={{
          minHeight: '100vh',
          background:
            'radial-gradient(circle at top, rgba(232,178,58,0.10), transparent 34%), #0A0E18',
          color: t.ink,
          fontFamily: "'Space Grotesk', 'Noto Sans SC', -apple-system, sans-serif",
        }}
      >
        <div style={{ height: 3, background: t.accent }} />

        <div
          style={{
            maxWidth: 1040,
            margin: '0 auto',
            padding: '56px 32px 90px',
          }}
        >
          <section
            style={{
              marginBottom: 34,
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 300px',
              gap: 28,
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  letterSpacing: 2.2,
                  color: t.accent,
                  marginBottom: 14,
                }}
              >
                SPONSOR · SUPPORT THE PROJECT
              </div>

              <h1
                style={{
                  margin: 0,
                  fontFamily: cnf,
                  fontSize: 42,
                  lineHeight: 1.15,
                  letterSpacing: 1,
                  fontWeight: 900,
                }}
              >
                支持 Diting 与汉化项目继续维护
              </h1>

              <p
                style={{
                  margin: '18px 0 0',
                  color: t.muted,
                  fontSize: 16,
                  lineHeight: 1.85,
                  maxWidth: 680,
                }}
              >
                这个项目花费了大量的时间、精力和金钱，目前服务器、ai翻译花掉了210USD。
                如果这个项目帮到了你，或者你只是想请我喝杯咖啡，可以在这里进行自愿赞助。
                所有发布内容都会尽量保持免费公开，赞助不是购买补丁，也不会影响任何人的正常下载与使用。
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  marginTop: 22,
                }}
              >
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    padding: '6px 11px',
                    borderRadius: 999,
                    background: t.accentSoft,
                    border: `1px solid ${t.accentBorder}`,
                    color: t.accent,
                  }}
                >
                  自愿支持
                </span>

                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    padding: '6px 11px',
                    borderRadius: 999,
                    background: t.cardStrong,
                    border: `1px solid ${t.line2}`,
                    color: t.muted,
                  }}
                >
                  免费发布
                </span>

                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    padding: '6px 11px',
                    borderRadius: 999,
                    background: t.cardStrong,
                    border: `1px solid ${t.line2}`,
                    color: t.muted,
                  }}
                >
                  长期维护
                </span>
              </div>
            </div>

            <div
              style={{
                border: `1px solid ${t.line}`,
                borderRadius: 20,
                background: t.card,
                padding: 22,
              }}
            >
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 10,
                  letterSpacing: 2,
                  color: t.label,
                  marginBottom: 12,
                }}
              >
                赞助会用于
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  '服务器、域名与下载分发成本',
                  '开发工具、测试环境与存档管理',
                  '汉化文本校对、补丁测试与版本维护',
                  '未来更多 Atlus / PS1 项目的自动化工具开发',
                ].map(item => (
                  <div
                    key={item}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      color: t.muted,
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ color: t.accent, marginTop: 1 }}>✦</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/*<section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 18,
              marginBottom: 30,
            }}
          >
            <SponsorCard
              title="支付宝"
              desc="适合国内用户。扫码即可支持，金额随意。"
              image="/sponsor/alipay.png"
              note="把你的支付宝收款码放到 public/sponsor/alipay.png"
            />

            <SponsorCard
              title="微信支付"
              desc="适合微信用户。扫码支持即可，非常感谢。"
              image="/sponsor/wechat.png"
              note="把你的微信收款码放到 public/sponsor/wechat.png"
            />

            <SponsorCard
              title="Buy Me a Coffee"
              desc="适合海外用户。可以用信用卡或 PayPal 支持。"
              link="https://www.buymeacoffee.com/你的用户名"
              button="Buy me a coffee"
              note="把链接换成你的 Buy Me a Coffee 地址。"
            />
          </section>*/}

          {/* ===== B站充电 ===== */}
          <section
            style={{
              marginBottom: 30,
            }}
          >
            <a
              href="https://space.bilibili.com/156012567"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                textDecoration: 'none',
                border: `1px solid ${t.accentBorder}`,
                borderRadius: 22,
                background:
                  'linear-gradient(135deg, rgba(232,178,58,0.18), rgba(232,178,58,0.04)), rgba(255,255,255,0.03)',
                padding: '34px 36px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: -70,
                  top: -80,
                  width: 220,
                  height: 220,
                  borderRadius: '50%',
                  background: 'rgba(232,178,58,0.10)',
                  filter: 'blur(4px)',
                }}
              />

              <div
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: 28,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: 11,
                      letterSpacing: 2.2,
                      color: t.accent,
                      marginBottom: 12,
                    }}
                  >
                    BILIBILI · 充电支持
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      fontFamily: cnf,
                      fontSize: 30,
                      lineHeight: 1.25,
                      fontWeight: 900,
                      color: t.ink,
                    }}
                  >
                    喜欢这个汉化项目的话，可以去 B 站充电
                  </h2>

                  <p
                    style={{
                      margin: '14px 0 0',
                      color: t.muted,
                      fontSize: 15,
                      lineHeight: 1.8,
                      maxWidth: 720,
                    }}
                  >
                    补丁下载会始终尽量保持免费公开。充电完全自愿，会用于服务器、开发工具、测试时间和后续汉化维护。
                    如果你不方便赞助，点个关注、投币、评论反馈 bug 也一样很有帮助。
                  </p>
                </div>

                <div
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 74,
                      height: 74,
                      borderRadius: 20,
                      background: t.accentSoft,
                      border: `1px solid ${t.accentBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: t.accent,
                      fontFamily: mono,
                      fontSize: 30,
                      fontWeight: 800,
                    }}
                  >
                    充
                  </div>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 999,
                      padding: '11px 18px',
                      background: t.accent,
                      color: '#0A0E18',
                      fontFamily: cnf,
                      fontSize: 14,
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    前往 B 站主页 →
                  </span>
                </div>
              </div>
            </a>
          </section>

          <section
            style={{
              border: `1px solid ${t.line}`,
              borderRadius: 18,
              background: t.card,
              padding: '24px 26px',
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: cnf,
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              赞助说明
            </h2>

            <div
              style={{
                marginTop: 16,
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 18,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 11,
                    letterSpacing: 1.8,
                    color: t.accent,
                    marginBottom: 8,
                  }}
                >
                  不是购买
                </div>

                <p style={{ margin: 0, color: t.muted, fontSize: 14, lineHeight: 1.8 }}>
                  赞助是对项目维护的自愿支持，不构成购买游戏、补丁、ROM、ISO 或任何商业服务。
                  项目不会出售游戏本体，也不会提供任何受版权保护的游戏文件。
                </p>
              </div>

              <div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 11,
                    letterSpacing: 1.8,
                    color: t.accent,
                    marginBottom: 8,
                  }}
                >
                  不设门槛
                </div>

                <p style={{ margin: 0, color: t.muted, fontSize: 14, lineHeight: 1.8 }}>
                  不赞助也可以正常下载和使用公开发布的内容。赞助不会影响补丁获取，也不会制造付费墙。
                  如果你愿意支持，我会非常感谢。
                </p>
              </div>
            </div>
          </section>

          <section
            style={{
              border: `1px solid ${t.accentBorder}`,
              borderRadius: 18,
              background: t.accentSoft,
              padding: '22px 24px',
              marginBottom: 28,
            }}
          >
            <div
              style={{
                fontFamily: mono,
                fontSize: 11,
                letterSpacing: 2,
                color: t.accent,
                marginBottom: 10,
              }}
            >
              THANK YOU
            </div>

            <p
              style={{
                margin: 0,
                color: t.ink,
                fontSize: 15,
                lineHeight: 1.8,
              }}
            >
              谢谢每一个下载、测试、反馈 bug、提交翻译建议、转发项目的人。汉化不是一个人能轻松完成的事情，
              你们的反馈和支持会直接影响这个项目能不能走得更远。
            </p>
          </section>

          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <Link
              to="/game"
              style={{
                textDecoration: 'none',
                borderRadius: 10,
                padding: '11px 16px',
                background: t.cardStrong,
                border: `1px solid ${t.line2}`,
                color: t.ink,
                fontFamily: cnf,
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              返回游戏列表
            </Link>

            <Link
              to="/game/psx/p2is"
              style={{
                textDecoration: 'none',
                borderRadius: 10,
                padding: '11px 16px',
                background: t.accent,
                color: '#0A0E18',
                fontFamily: cnf,
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              查看 P2IS 项目
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}