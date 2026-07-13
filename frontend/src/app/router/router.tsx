import { createBrowserRouter } from 'react-router'
import RelayHomePage from '../../relay/public/pages/RelayHomePage'
import LoginPage from '../../auth/pages/LoginPage'
import NotFoundPage from '../../shared/pages/NotFoundPage'
import RelayLayout from '../layouts/RelayLayout'
import AuthLayout from '../layouts/AuthLayout'

export const router = createBrowserRouter([
    {
        path:'/relay',
        Component:RelayLayout,
        children: [
            { index: true, Component: RelayHomePage },
            // TODO add all need component and path
        ],
    },
    {
        Component:AuthLayout,
        children: [
            { path:'/auth/login', Component: LoginPage },
            // TODO add all need component and path
        ],
    },
    {
        path:'*',
        Component: NotFoundPage
    }
])