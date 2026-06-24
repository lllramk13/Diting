import { useNavigate, Link } from 'react-router-dom'

const mono = "'Space Mono', monospace"
const cn = "'Noto Sans SC', sans-serif"

export default function HomeSections() {
  const navigate = useNavigate()

  return (
    <div style={{ background: '#0A0E18', fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif", color: '#EAEEF7' }}>
      {/* ===== 正在进行的汉化 ===== */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '50px 40px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ fontSize: 13, fontFamily: mono, letterSpacing: 3, color: 'rgba(200,220,255,0.5)', margin: 0, textTransform: 'uppercase' }}>// 正在进行的汉化</h2>
          <button onClick={() => navigate('/game')} style={{ background: 'none', border: 'none', color: '#E8B23A', cursor: 'pointer', fontFamily: mono, fontSize: 13 }}>全部游戏 →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* 罪 */}
          <div onClick={() => navigate('/game/psx/p2is/announce')} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', padding: 30, borderRadius: 16, background: 'linear-gradient(135deg,rgba(94,139,255,0.14),rgba(94,139,255,0.03))', border: '1px solid rgba(94,139,255,0.28)' }}>
            <div style={{ position: 'absolute', right: -10, top: -30, fontFamily: cn, fontWeight: 900, fontSize: 160, color: 'rgba(94,139,255,0.10)', lineHeight: 1 }}>罪</div>
            <div style={{ position: 'relative' }}>
              <div style={{ fontFamily: mono, fontSize: 12, color: '#5E8BFF', letterSpacing: 2 }}>PSX · INNOCENT SIN</div>
              <div style={{ fontFamily: cn, fontWeight: 700, fontSize: 26, margin: '8px 0 4px' }}>女神异闻录2 · 罪</div>
              <div style={{ fontSize: 14, color: 'rgba(200,220,255,0.55)' }}>Persona 2: Innocent Sin</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}><div style={{ width: '62%', height: '100%', borderRadius: 3, background: '#5E8BFF' }} /></div>
                <span style={{ fontFamily: mono, fontSize: 13, color: '#5E8BFF' }}>62%</span>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'rgba(94,139,255,0.15)', color: '#9FB8FF' }}>进行中</span>
                <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'rgba(200,220,255,0.6)', fontFamily: mono }}>v0.8.2</span>
              </div>
            </div>
          </div>
          {/* 罚 */}
          <div onClick={() => navigate('/game/psx/p2ep/announce')} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', padding: 30, borderRadius: 16, background: 'linear-gradient(135deg,rgba(232,69,90,0.14),rgba(232,69,90,0.03))', border: '1px solid rgba(232,69,90,0.28)' }}>
            <div style={{ position: 'absolute', right: -10, top: -30, fontFamily: cn, fontWeight: 900, fontSize: 160, color: 'rgba(232,69,90,0.10)', lineHeight: 1 }}>罚</div>
            <div style={{ position: 'relative' }}>
              <div style={{ fontFamily: mono, fontSize: 12, color: '#E8455A', letterSpacing: 2 }}>PSX · ETERNAL PUNISHMENT</div>
              <div style={{ fontFamily: cn, fontWeight: 700, fontSize: 26, margin: '8px 0 4px' }}>女神异闻录2 · 罚</div>
              <div style={{ fontSize: 14, color: 'rgba(200,220,255,0.55)' }}>Persona 2: Eternal Punishment</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}><div style={{ width: '40%', height: '100%', borderRadius: 3, background: '#E8455A' }} /></div>
                <span style={{ fontFamily: mono, fontSize: 13, color: '#E8455A' }}>40%</span>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'rgba(232,69,90,0.15)', color: '#FF8A98' }}>初翻完成 · 校对中</span>
                <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'rgba(200,220,255,0.6)', fontFamily: mono }}>v0.5.0</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 找到我 + 赞助 ===== */}
      <section id="sponsor" style={{ maxWidth: 1180, margin: '0 auto', padding: '50px 40px 90px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
          <div style={{ padding: 28, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 style={{ fontSize: 13, fontFamily: mono, letterSpacing: 3, color: 'rgba(200,220,255,0.5)', margin: '0 0 18px', textTransform: 'uppercase' }}>// 找到我</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href="https://www.bilibili.com/video/BV1CbET63EXH/" style={linkStyle}><span>哔哩哔哩 · 视频与汉化进度</span><span style={linkTag}>B站 →</span></a>
              <a href="https://github.com/lllramk13/P2IS_Translation_Tools" style={linkStyle}><span>GitHub · 工具与开源代码</span><span style={linkTag}>GitHub →</span></a>
              {/*<a href="#" style={linkStyle}><span>联系方式 · 合作与反馈</span><span style={linkTag}>Email →</span></a>*/}
            </div>
          </div>
          <div style={{ padding: 28, borderRadius: 16, background: 'linear-gradient(135deg,rgba(232,178,58,0.12),rgba(232,178,58,0.02))', border: '1px solid rgba(232,178,58,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: cn, fontWeight: 700, fontSize: 20, color: '#E8B23A' }}>喜欢的话，可以请我喝杯咖啡</div>
              <p style={{ fontSize: 14, color: 'rgba(220,228,245,0.65)', margin: '12px 0 0', lineHeight: 1.6 }}>补丁下载始终免费公开。赞助完全自愿，用于服务器、工具与开发时间。</p>
            </div>
              <Link
                to="/sponsor"
                style={{
                  fontFamily: mono,
                  color: '#E8B23A',
                  fontSize: 14,
                  marginTop: 24,
                  textDecoration: 'none',
                }}
              >
                前往赞助页 →
              </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

const linkStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  textDecoration: 'none', color: '#EAEEF7', padding: '14px 18px', borderRadius: 10,
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
}
const linkTag: React.CSSProperties = { fontFamily: mono, color: '#E8B23A', fontSize: 13 }
