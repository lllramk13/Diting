import { Link, Outlet } from 'react-router'

function RelayLayout() {
    return (
        <>
            <nav>
                <Link to="/relay">Relay</Link>
                <Link to="/relay/tutorial">教程</Link>
                <Link to="/relay/projects">项目</Link>
            </nav>
            <Outlet />
            <footer></footer>
        </>
    )
}

export default RelayLayout