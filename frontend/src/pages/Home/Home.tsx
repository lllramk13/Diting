import Marquee from './Marquee'
import TopNav from './TopNav'
import BottomStage from './BottomStage'
import HomeSections from './HomeSections'

function Home() {
  return (
    <div className="home-page">
      <TopNav />
      <section className="home-hero">
        <Marquee />
        <BottomStage />
      </section>
      <HomeSections />
    </div>
  )
}

export default Home
