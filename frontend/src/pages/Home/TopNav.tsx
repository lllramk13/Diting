import { useLocation, useNavigate } from 'react-router-dom'
import './Home.css'

function TopNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="nav">
      <div className="nav-left">
        <span className="nav-logo">DITING</span>
      </div>
      <div className="nav-center"></div>
      <div className="nav-right">
        <button
          className={`nav-link${isHome ? ' active' : ''}`}
          onClick={() => navigate('/')}
        >
          首页
        </button>
        <button className="nav-link" onClick={() => navigate('/game')}>
          游戏汉化
        </button>
        <button className="nav-link" onClick={() => navigate('/sponsor')}>
          赞助
        </button>
        <span className="nav-link disabled">关于</span>
        <button className="nav-login" onClick={() => navigate('/auth')}>
          登录
        </button>
      </div>
    </div>
  )
}

export default TopNav
