import { createBrowserRouter } from 'react-router'
import RelayHomePage from '../../relay/public/pages/RelayHomePage'
import LoginPage from '../../auth/pages/LoginPage'
import NotFoundPage from '../../shared/pages/NotFoundPage'
import RelayLayout from '../layouts/RelayLayout'
import AuthLayout from '../layouts/AuthLayout'
import MainSiteLayout from '../layouts/MainSiteLayout'
import RootLayout from '../layouts/RootLayout'

export const router = createBrowserRouter([
    {
        Component: RootLayout,
        children: [
            {
                Component: MainSiteLayout,
                children: [
                    { path: '/', Component: null },
                ],
            },
            {
                path: '/relay',
                Component: RelayLayout,
                children: [
                    { index: true, Component: RelayHomePage },
                ],
            },
            {
                Component: AuthLayout,
                children: [
                    { path: '/auth/login', Component: LoginPage },
                ],
            },
            {
                path: '*',
                Component: NotFoundPage,
            },
        ],
    },
])