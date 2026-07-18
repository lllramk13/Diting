import WelcomeScene from "../components/welcome/WelcomeScene"

type HomePageProps = {
    active: boolean
}

function HomePage({ active }: HomePageProps) {
    return (
        <div className="home-page">
            <WelcomeScene active={active} />
        </div>
    )
}

export default HomePage