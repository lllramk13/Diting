import { Outlet, useLocation } from 'react-router'
import HomePage from '../../main-site/pages/HomePage'

function RootLayout() {
    const location = useLocation()
    const homeActive = location.pathname === '/'

    return (
        <>
            <Outlet />

            <div hidden={!homeActive}>
                <HomePage active={homeActive} />
            </div>
        </>
    )
}

export default RootLayout