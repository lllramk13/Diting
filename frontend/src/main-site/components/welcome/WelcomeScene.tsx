import * as THREE from 'three'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import ModelLoader from '../loading/ModelLoader'
import './WelcomeScene.css'

let hasPlayedLoader = false

const interactiveLetters = 'interactive'.split('')
type LetterStyle = CSSProperties & {
    '--enter-delay':string
    '--leave-delay':string
}

type WelcomeSceneProps = {
    active: boolean
}

function WelcomeScene({ active }:WelcomeSceneProps) {
    const shouldShowLoader = !hasPlayedLoader
    const [loadProgress, setLoadProgress] = useState(
        shouldShowLoader ? 0 : 100,
    )
    const [sceneReady, setScanReady] = useState(
        !shouldShowLoader,
    )
    const containerRef = useRef<HTMLDivElement>(null)
        const activeRef = useRef(active)

    useEffect(() => {
        activeRef.current = active
    }, [active])

    useEffect(() => {
        const minimumLoaderDuration = 800
        const loadingStartedAt = performance.now()

        let hideLoaderTimer: number | undefined

        const container = containerRef.current
        if (!container) return
        const sceneContainer = container

        // A restrained charcoal palette keeps the model feeling like the focus.
        const palette = {
            background: 0x010203,
            floor: 0x1a1815,
            warm: 0xffd6a3,
            cool: 0xa9bfd8,
        }

        // scene and background
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(palette.background)
        scene.fog = new THREE.Fog(palette.background, 9, 24)

        // camera
        const camera = new THREE.PerspectiveCamera(
            34,
            sceneContainer.clientWidth / sceneContainer.clientHeight,
            0.1,
            100,
        )

        camera.position.set(3, 0.7, 5.7)
        camera.lookAt(0, 1.15, 0)

        // renderer
        const renderer = new THREE.WebGLRenderer(
            {
                antialias: true,
                powerPreference: 'high-performance',
            }
        )

        sceneContainer.appendChild(renderer.domElement)

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 0.85

        // glb loader
        const loader = new GLTFLoader()
        const dracoLoader = new DRACOLoader()

        dracoLoader.setDecoderPath('/draco/')
        loader.setDRACOLoader(dracoLoader)

        let loadedModel: THREE.Object3D | null = null
        let cancelled = false

        loader.load(
            '/models/main-optimized.glb',

            (gltf) => {
                if (cancelled) return

                const model = gltf.scene
                loadedModel = model

                model.scale.setScalar(2.7)
                model.position.set(
                    sceneContainer.clientWidth >= 900 ? 0.67 : 0,
                    -0.02,
                    0,
                )
                model.rotation.y = THREE.MathUtils.degToRad(-6)

                model.traverse((object) => {
                    if (object instanceof THREE.Mesh) {
                        object.castShadow = true
                        object.receiveShadow = true
                    }
                })

                scene.add(model)
                 
                if (!shouldShowLoader) return

                setLoadProgress(100)

                const elapsed = performance.now() - loadingStartedAt
                const remaining = Math.max(0, minimumLoaderDuration - elapsed)

                hideLoaderTimer = window.setTimeout(() => {
                    if (!cancelled) {
                        hasPlayedLoader = true
                        setScanReady(true)
                    }
                }, remaining)
            },

            (event) => {
                if (!event.lengthComputable || event.total <= 0) return

                const percent = Math.min(
                    100,
                    (event.loaded / event.total) * 100,
                )

                setLoadProgress(percent)
            },

            (error) => {
                console.error('Failed:', error)
            },

        )

        // ribbons
        type FlowItem = {
            sprite: THREE.Sprite
            curve: THREE.CatmullRomCurve3
            offset: number
            speed: number
            direction: 1 | -1
            surfaceOffset: number
        }

        type FloatingRibbon = {
            group: THREE.Group
            amplitude: number
            frequency: number
            phase: number
        }

        type RibbonOptions = {
            points: THREE.Vector3[]
            direction?: 1 | -1
            width?: number
            speed?: number
            amount?: number
            symbols?: string[]
            floatAmplitude?: number
            floatFrequency?: number
        }

        const flowItems: FlowItem[] = []
        const floatingRibbons: FloatingRibbon[] = []

        const dataFlowGroup = new THREE.Group()
        scene.add(dataFlowGroup)

        const glyphMaterials = new Map<
            string,
            THREE.SpriteMaterial
        >()

        function getGlyphMaterial(symbol: string) {
            const existing = glyphMaterials.get(symbol)
            if (existing) return existing

            const canvas = document.createElement('canvas')
            canvas.width = 128
            canvas.height = 128

            const context = canvas.getContext('2d')

            if (!context) {
                throw new Error('Canvas 2D is unavailable')
            }

            context.clearRect(0, 0, 128, 128)

            context.font =
                '600 58px "JetBrains Mono", "Microsoft YaHei", monospace'

            context.textAlign = 'center'
            context.textBaseline = 'middle'

            context.fillStyle = '#cbbfae'
            context.shadowColor = 'rgba(203, 191, 174, 0.45)'
            context.shadowBlur = 6

            context.fillText(symbol, 64, 66)

            const texture = new THREE.CanvasTexture(canvas)

            texture.colorSpace = THREE.SRGBColorSpace
            texture.minFilter = THREE.LinearFilter
            texture.generateMipmaps = false

            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0.82,
                depthWrite: false,
                depthTest: true,
                toneMapped: false,
            })

            glyphMaterials.set(symbol, material)

            return material
        }

        function createDataRibbon({
            points,
            direction = 1,
            width = 0.22,
            speed = 0.05,
            amount = 12,
            symbols = ['0', '1'],
            floatAmplitude = 0.035,
            floatFrequency = 0.5,
        }: RibbonOptions) {
            const ribbonGroup = new THREE.Group()
            dataFlowGroup.add(ribbonGroup)

            const curve = new THREE.CatmullRomCurve3(
                points,
                false,
                'catmullrom',
                0.35,
            )

            const thickness = 0.015

            const profile = new THREE.Shape()

            profile.moveTo(-width / 2, -thickness / 2)
            profile.lineTo(width / 2, -thickness / 2)
            profile.lineTo(width / 2, thickness / 2)
            profile.lineTo(-width / 2, thickness / 2)
            profile.closePath()

            const ribbonGeometry = new THREE.ExtrudeGeometry(
                profile,
                {
                    steps: 120,
                    bevelEnabled: false,
                    extrudePath: curve,
                },
            )

            const ribbonMaterial =
                new THREE.MeshPhysicalMaterial({
                    color: 0x080808,
                    roughness: 0.4,
                    metalness: 0.25,
                    clearcoat: 0.35,
                    clearcoatRoughness: 0.5,
                })

            const ribbon = new THREE.Mesh(
                ribbonGeometry,
                ribbonMaterial,
            )

            ribbon.castShadow = true
            ribbon.receiveShadow = true

            ribbonGroup.add(ribbon)

            for (let index = 0; index < amount; index++) {
                const symbol =
                    symbols[index % symbols.length]

                const sprite = new THREE.Sprite(
                    getGlyphMaterial(symbol),
                )

                const symbolWidth =
                    symbol.length > 1
                        ? 0.07 * symbol.length
                        : 0.075

                sprite.scale.set(
                    symbolWidth,
                    0.095,
                    1,
                )

                ribbonGroup.add(sprite)

                flowItems.push({
                    sprite,
                    curve,
                    offset: index / amount,
                    speed,
                    direction,
                    surfaceOffset: 0.025,
                })
            }

            floatingRibbons.push({
                group: ribbonGroup,
                amplitude: floatAmplitude,
                frequency: floatFrequency,
                phase: Math.random() * Math.PI * 2,
            })
        }
        
        createDataRibbon({
            points: [
                new THREE.Vector3(-6, 2.4, -0.8),
                new THREE.Vector3(-3.5, 2.1, 0.4),
                new THREE.Vector3(-1.4, 2.7, -0.2),
                new THREE.Vector3(0.8, 1.6, 0),
            ],
            direction: 1,
            width: 0.2,
            speed: 0.045,
            amount: 14,
            symbols: ['0', '1', '1', '0', '1', '0'],
            floatAmplitude: 0.035,
            floatFrequency: 0.5,
        })

        createDataRibbon({
            points: [
                new THREE.Vector3(-2.5, 5.5, -1.4),
                new THREE.Vector3(-2, 4, -0.7),
                new THREE.Vector3(-0.3, 3.2, 0.2),
                new THREE.Vector3(1.2, 1.65, 0),
            ],
            direction: 1,
            width: 0.14,
            speed: 0.035,
            amount: 10,
            symbols: ['1', '0'],
            floatAmplitude: 0.025,
            floatFrequency: 0.4,
        })

        createDataRibbon({
            points: [
                new THREE.Vector3(1.1, 1.75, 0),

                new THREE.Vector3(2.4, 1.55, -0.3),
                new THREE.Vector3(3.6, 2.15, -0.55),
                new THREE.Vector3(4.4, 2.85, -0.7),

                new THREE.Vector3(6.5, 2.75, -0.9),
            ],

            direction: -1,
            width: 0.09,
            speed: 0.032,
            amount: 9,

            symbols: ['1', '0'],

            floatAmplitude: 0.025,
            floatFrequency: 0.3,
        })

        createDataRibbon({
            points: [
                new THREE.Vector3(-8, 0.25, -0.45),

                new THREE.Vector3(-4.5, 0.15, -0.2),

                new THREE.Vector3(-2.6, 1.5, -0.15),
                new THREE.Vector3(-1.5, 1.7, -0.3),

                new THREE.Vector3(-0.2, 1.2, 0.25),

                new THREE.Vector3(0.5, 1.4, 0.25)
            ],

            direction: 1,
            width: 0.3,
            speed: 0.038,
            amount: 10,

            symbols: ['0', '1'],

            floatAmplitude: 0.03,
            floatFrequency: 0.42,
        })

        createDataRibbon({
            points: [
                new THREE.Vector3(1.3,1.5,-0.2,),
                new THREE.Vector3(1.8,2.45,0.3,),
                new THREE.Vector3(4,2.72,0.55,),
            ],

            direction: -1,
            width: 0.11,
            speed: 0.032,
            amount: 12,

            symbols: [
                '0',
                '1',
                '0',
                '1',
            ],

            floatAmplitude: 0.02,
            floatFrequency: 0.3,
        })

        createDataRibbon({
            points: [
                new THREE.Vector3(1.5,1,-1),
                new THREE.Vector3(6.5, -0.5, 1),
            ],

            direction: -1,
            width: 0.2,
            speed: 0.032,
            amount: 8,

            symbols: ['1', '0'],

            floatAmplitude: 0.02,
            floatFrequency: 0.26,
        })

        createDataRibbon({
            points: [
                new THREE.Vector3(-1, 0, 4.15),
                new THREE.Vector3(0.45, 0.35, 3.1),
                new THREE.Vector3(-0.25, 0.1, 2.1),
                new THREE.Vector3(-0.65, 0.035, 1.25),
                new THREE.Vector3(-0.35, 0.5, 0.65),
            ],

            direction: 1,
            width: 0.3,
            speed: 0.038,
            amount: 10,

            symbols: ['0', '1'],

            floatAmplitude: 0.03,
            floatFrequency: 0.42,
        })


        // room texture
        const roomMaterial = new THREE.MeshStandardMaterial({
            color: palette.floor,
            roughness: 0.82,
            metalness: 0.02,
        })

        // ground
        const floorGeometry = new THREE.PlaneGeometry(60, 60)
        const floor = new THREE.Mesh(floorGeometry, roomMaterial)

        floor.rotation.x = -Math.PI / 2
        floor.position.y = -0.015
        floor.receiveShadow = true

        scene.add(floor)

        // Soft neutral ambience preserves detail in the shadows.
        const ambientLight = new THREE.HemisphereLight(
            0x8b91a0,
            0x17110d,
            0.55,
        )
        scene.add(ambientLight)

        // Warm key light from above and to the left. Directional light keeps
        // the intended subject visible even though the GLB contains huge geometry.
        const mainLight = new THREE.DirectionalLight(palette.warm, 2.8)
        mainLight.position.set(-4.5, 7, 5)
        mainLight.target.position.set(1, 1.2, 0)
        mainLight.castShadow = true
        mainLight.shadow.mapSize.set(2048, 2048)
        mainLight.shadow.bias = -0.00015
        mainLight.shadow.normalBias = 0.02
        mainLight.shadow.camera.left = -5
        mainLight.shadow.camera.right = 5
        mainLight.shadow.camera.top = 6
        mainLight.shadow.camera.bottom = -3
        mainLight.shadow.camera.near = 0.5
        mainLight.shadow.camera.far = 25
        scene.add(mainLight, mainLight.target)

        // A restrained neutral fill keeps material detail out of pure black.
        const fillLight = new THREE.DirectionalLight(0xd9e1eb, 0.65)
        fillLight.position.set(4, 3, 4)
        fillLight.target.position.set(1, 1.1, 0)
        scene.add(fillLight, fillLight.target)

        // Desaturated cool rim light separates the silhouette from the backdrop.
        const rimLight = new THREE.DirectionalLight(palette.cool, 1.35)
        rimLight.position.set(4.5, 5, -4)
        rimLight.target.position.set(1, 1.4, 0)
        scene.add(rimLight, rimLight.target)

        // resize scene
        function resizeScene() {
            const width = sceneContainer.clientWidth
            const height = sceneContainer.clientHeight

            if (width == 0 || height == 0) return

            camera.aspect = width / height
            camera.updateProjectionMatrix()

            renderer.setSize(width, height, false)

            if (loadedModel) {
                loadedModel.position.x = width >= 900 ? 0.67 : 0
            }
        }

        const resizeObSERVER = new ResizeObserver(resizeScene)
        resizeObSERVER.observe(container)

        resizeScene()

        const timer = new THREE.Timer()

        timer.connect(document)

        // animation
        const flowPosition = new THREE.Vector3()

        function animate(timestamp: number) {
            if (!activeRef.current) return

            timer.update(timestamp)

            const elapsed = timer.getElapsed()

            for (const item of flowItems) {
                const progress =
                    item.offset +
                    elapsed * item.speed * item.direction

                const t = ((progress % 1) + 1) % 1

                item.curve.getPointAt(t, flowPosition)

                item.sprite.position.copy(flowPosition)

                item.sprite.position.z +=
                    item.surfaceOffset
            }

            for (const ribbon of floatingRibbons) {
                ribbon.group.position.y =
                    Math.sin(
                        elapsed * ribbon.frequency +
                        ribbon.phase,
                    ) * ribbon.amplitude

                ribbon.group.rotation.z =
                    Math.sin(
                        elapsed *
                            ribbon.frequency *
                            0.7 +
                        ribbon.phase,
                    ) * 0.008
            }

            renderer.render(scene, camera)
        }

        renderer.setAnimationLoop(animate)

        return () => {
            cancelled = true

            if (hideLoaderTimer !== undefined) {
                window.clearTimeout(hideLoaderTimer)
}

            renderer.setAnimationLoop(null)
            resizeObSERVER.disconnect()
            timer.dispose()

            if (loadedModel) {
                scene.remove(loadedModel)

                loadedModel.traverse((object) => {
                    if (!(object instanceof THREE.Mesh)) return
                    object.geometry.dispose()
                    const materials = Array.isArray(object.material)
                        ? object.material
                        : [object.material]

                    for (const material of materials) {
                        material.dispose()
                    }
                })
            }

            floorGeometry.dispose()
            scene.remove(dataFlowGroup)

            dataFlowGroup.traverse((object) => {
                if (!(object instanceof THREE.Mesh)) return

                object.geometry.dispose()

                const materials = Array.isArray(object.material)
                    ? object.material
                    : [object.material]

                for (const material of materials) {
                    material.dispose()
                }
            })

            for (const material of glyphMaterials.values()) {
                material.map?.dispose()
                material.dispose()
            }
            dracoLoader.dispose()

            glyphMaterials.clear()
            dataFlowGroup.clear()

            roomMaterial.dispose()
            renderer.dispose()

            renderer.domElement.remove()
        }
    }, [])

    return (
        <section className="welcome-scene">
            <ModelLoader
                progress={loadProgress}
                visible={active && shouldShowLoader && !sceneReady}
            />
            
            <div
                ref={containerRef}
                className="welcome-scene-canvas"
            />

            <div className="welcome-scene-copy">
                <h1 className="welcome-scene-title">
                    <span>Interfaces, tools</span>

                    <span>
                        and{' '}

                        <span
                            className="interactive-word"
                            aria-label="interactive"
                        >
                            {interactiveLetters.map((letter, index) => {
                                const delayStep = 60

                                const style = {
                                    '--enter-delay':
                                        `${index * delayStep}ms`,

                                    '--leave-delay':
                                        `${(
                                            interactiveLetters.length -
                                            index -
                                            1
                                        ) * delayStep}ms`,
                                } as LetterStyle

                                return (
                                    <span
                                        key={index}
                                        aria-hidden="true"
                                        className="interactive-letter"
                                        style={style}
                                    >
                                        {letter}
                                    </span>
                                )
                            })}
                        </span>
                    </span>

                    <span>experiments.</span>

                    <span className="title-section-start">
                        Built with
                    </span>

                    <span>
                        <span className="curiosity-word">
                            curiosity
                        </span>
                        {' '}and
                    </span>

                    <span>care.</span>
                </h1>

                <a className="welcome-scene-link" href="#work">
                    View selected work
                </a>
            </div>
        </section>
    )
}

export default WelcomeScene
