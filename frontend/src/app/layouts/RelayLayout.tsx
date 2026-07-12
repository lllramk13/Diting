import { Outlet } from 'react-router'

function RelayLayout() {
    return (
        <>
            <nav>
                <a href="/relay"></a>
                <a href="/relay/tutorial"></a>
                <a href="/relay/projects"></a>
            </nav>
            <Outlet />
            <footer></footer>
        </>
    )
}

export default RelayLayout