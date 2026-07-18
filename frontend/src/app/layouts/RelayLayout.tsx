import { NavLink, Outlet } from 'react-router'

function navLinkClass({ isActive }: { isActive: boolean }): string {
    return 'nav-link' + (isActive ? ' active' : '')
}

function RelayLayout() {
    return (
        <>
                <nav className="nav-center" aria-label="主导航">
                    <NavLink className={navLinkClass} to="/relay">Relay</NavLink>
                    <NavLink className={navLinkClass} to="/relay/tutorial">教程</NavLink>
                    <NavLink className={navLinkClass} to="/relay/projects">项目</NavLink>
                </nav>
            <Outlet />
            <footer></footer>
        </>
    )
}

export default RelayLayout