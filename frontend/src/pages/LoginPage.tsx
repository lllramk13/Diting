import { useState } from 'react';
import { signIn, signOut, signUp } from '../api/auth'

function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    async function handleLogin() {
        try {
            await signIn(email, password)
            // TODO jump
            alert('登陆成功！')
        } catch (err) {
            setError((err as Error).message)
        }
    }

    async function handleSignUp() {
        try {
            await signUp(email, password)
            // TODO jump
            alert('注册成功！')
        } catch (err) {
            setError((err as Error).message)
        }
    }

    return (
        <div>
            <h1>登录</h1>
            <input 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='邮箱'
            />
            <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='密码'
            />
            <button onClick={handleLogin}>登录</button>
            <button onClick={handleSignUp}>注册</button>
            {error && <p style={{color: 'red'}}>{error}</p>}
        </div>
    )

}

export default LoginPage