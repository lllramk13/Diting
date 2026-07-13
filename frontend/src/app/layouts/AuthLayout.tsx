import { Outlet } from 'react-router'

function AuthLayout() {
    return (
        <>
            <nav>
            </nav>
            <Outlet />
            <footer></footer>
        </>
    )
}

export default AuthLayout