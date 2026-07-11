import { useEffect, useRef } from 'react'

// 确定性伪随机:同一个 n 永远得到同一个 0~1 的值(让跳变稳定、不乱糊)
function pseudoRandom(n: number): number {
    const x = Math.sin(n * 12.9898) * 43758.5453
    return x - Math.floor(x)
}

/**
 * 随机深浅点阵背景(canvas)。
 * - 每个点有自己的随机基础亮度(白→灰),纯 CSS 做不到,所以用 canvas。
 * - 开场:从外圈向中心逐点亮起(汇聚)。
 * - 之后:各点保持分布,轻微随机明灭(待机呼吸)。
 */
function DotField() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const GAP = 14          // 点间距(越小越密)
        const DOT = 1.6         // 点半径
        let dots: {
            x: number; y: number
            dist: number         // 到中心的距离(扩散顺序)
            finalBright: number  // 静止时亮度(集中在四角,其余≈0)
            preLit: number       // 开场前就微亮的少数点
            flashAmp: number     // 扩散波经过时的闪亮强度
            revealNoise: number  // 波前不规则(不是完整圆)
            phase: number        // 闪烁相位
            speed: number        // 闪烁速度
            jitter: boolean      // 是否随机跳变
        }[] = []
        let cx = 0, cy = 0, maxDist = 1
        let raf = 0
        const start = performance.now()

        function build() {
            const canvas = canvasRef.current!
            const w = canvas.width = canvas.offsetWidth * devicePixelRatio
            const h = canvas.height = canvas.offsetHeight * devicePixelRatio
            ctx!.scale(1, 1)
            cx = w / 2
            cy = h / 2
            maxDist = Math.hypot(cx, cy)
            const step = GAP * devicePixelRatio
            dots = []
            for (let x = step / 2; x < w; x += step) {
                for (let y = step / 2; y < h; y += step) {
                    const dist = Math.hypot(x - cx, y - cy)
                    dots.push({
                        x, y,
                        dist,
                        // 静止亮度:按到中心的距离(圆形渐隐)——中心亮、外圈暗
                        // (1 - dist/maxDist) 是 0~1 的圆形衰减;pow 调整柔和度
                        finalBright: Math.pow(1 - dist / maxDist, 1.3)
                                     * (0.25 + Math.random() * 0.75)
                                     + (Math.random() < 0.12 ? Math.random() * 0.3 : 0),
                        // 开场前:极少数点浅浅亮着
                        preLit: Math.random() < 0.05 ? Math.random() * 0.18 : 0,
                        flashAmp: 0.35 + Math.random() * 0.5,
                        revealNoise: Math.random(),
                        phase: Math.random() * Math.PI * 2,
                        speed: 1.2 + Math.random() * 3.5,        // 更快
                        jitter: Math.random() < 0.25,            // 1/4 的点会随机跳变
                    })
                }
            }
        }

        function frame(now: number) {
            const t = (now - start) / 1000
            const REVEAL = 2.6   // 波从中心扩到最外圈的耗时(秒)

            ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
            const r = DOT * devicePixelRatio

            for (const d of dots) {
                // 这个点被波前"点亮"的时刻:按到中心距离排序 + 随机噪声(波前不规则)
                const passT = (d.dist / maxDist) * REVEAL + d.revealNoise * 0.5

                let b: number
                if (t < passT) {
                    b = d.preLit                       // 波还没到:大部分黑,少数浅亮
                } else {
                    const since = t - passT
                    const flash = Math.exp(-since * 1.6) * d.flashAmp   // 衰减更慢=圆环更宽
                    b = d.finalBright + flash           // 衰减后回到静止亮度(只剩四角)
                }
                if (b <= 0.01) continue

                // 基础呼吸(幅度更大)
                let twinkle = 0.35 + 0.65 * Math.sin(t * d.speed + d.phase)
                // 1/4 的点叠加随机跳变,像信号噪点
                if (d.jitter) {
                    const step = Math.floor(t * d.speed * 2 + d.phase)
                    twinkle *= 0.3 + 0.7 * pseudoRandom(step + d.phase)
                }
                ctx!.fillStyle = `rgba(235,240,245,${Math.max(0, b * twinkle * 1.35)})`  // 更亮
                ctx!.beginPath()
                ctx!.arc(d.x, d.y, r, 0, Math.PI * 2)
                ctx!.fill()
            }
            raf = requestAnimationFrame(frame)
        }

        build()
        raf = requestAnimationFrame(frame)
        const onResize = () => build()
        window.addEventListener('resize', onResize)
        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener('resize', onResize)
        }
    }, [])

    return <canvas ref={canvasRef} className="dot-canvas" />
}

export default DotField
