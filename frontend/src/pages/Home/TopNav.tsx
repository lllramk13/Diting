import './Home.css'

function TopNav() {
  return (
    <div className="nav">
      <div className="nav-left">
        <span className="nav-logo">DITING</span>
      </div>
      <div className="nav-center">
        <span>ABOUT</span>
        <span>WORK</span>
        <span>CONTACT</span>
      </div>
      <div className="nav-right">
        <div className="dl"></div>
        <span>SYSTEM OFFLINE</span>
      </div>
    </div>
  )
}

export default TopNav