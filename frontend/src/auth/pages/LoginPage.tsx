import { useState } from 'react';
import { signIn, signUp } from '../../api/auth'
import DotField from '../../shared/components/DotField'
import './LoginPage.css'

function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    async function handleLogin() {
        try {
            await signIn(email, password)
            // TODO jump to dashboard
        } catch (err) {
            setError((err as Error).message)
        }
    }

    async function handleSignUp() {
        try {
            await signUp(email, password)
            // TODO jump project main
            alert('注册成功！')
        } catch (err) {
            setError((err as Error).message)
        }
    }

    const triangle = (
        <svg viewBox="0 0 14 14">
            <polygon points="7,1 13,13 1,13" fill="#e8ecef" />
        </svg>
    )

    return (
        <div className="login-screen">
            <DotField />

            <div className="hud-outer">
                <span className="hud-tick top">{triangle}</span>
                <span className="hud-tick bottom">{triangle}</span>
                <span className="hud-tick left">{triangle}</span>
                <span className="hud-tick right">{triangle}</span>

                <div className="hud-inner">
                    <h1 className="hud-title">登录</h1>

                    <input
                        className="hud-field"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@work-email.com"
                    />
                    <input
                        className="hud-field"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="密码"
                    />

                    <div className="hud-actions">
                        <button className="hud-btn primary" onClick={handleLogin}>登录</button>
                        <button className="hud-btn ghost" onClick={handleSignUp}>注册</button>
                    </div>

                    {error && <p className="hud-error">{error}</p>}

                    <p className="hud-disclaimer">
                        继续即表示你同意本平台的服务条款与隐私政策
                    </p>
                </div>
            </div>

            <div className="crt-bloom" />
        </div>
    )
}

export default LoginPage
