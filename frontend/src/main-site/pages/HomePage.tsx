import Marquee from "../components/Marquee"
import HomeSections from "../components/HomeSections"
import BottomStage from "../components/BottomStage"

function HomePage() {
    return (
        <div className="home-page">
            <section className="home-hero">
                <Marquee />
                <BottomStage />
            </section>
            <HomeSections />
        </div>
    )
}

export default HomePage