import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import './ModelLoader.css'

type ModelLoaderProps = {
    progress: number
    visible: boolean
}

type ProgressStyle = CSSProperties & {
    '--progress': String
}

function ModelLoader({
    progress,
    visible,
}: ModelLoaderProps) {
    const safeProgress = Math.min(
        100, Math.max(0, progress)
    )

    const progressStyle = {
        '--progress': `${safeProgress}%`,
    } as ProgressStyle

    const className = visible ? 'model-loader' : 'model-loader model-loader-hidden'

    return createPortal(
        <div className={className}
        role='progressbar'
        aria-label="Loading 3D scene"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(safeProgress)}
        aria-hidden={!visible}
        >
            <div className="model-loader-artboard">
                <img
                    className="model-loader-image"
                    src='/images/model-loader.svg'
                    alt=""
                    draggable={false}
                />
                <div className="model-loader-progress">
                    <div
                    className="model-loader-progress-fill"
                    style={progressStyle}
                    >
                    </div>
                </div>

                <span className="model-loader-percent">
                    {Math.round(safeProgress).toString()}
                    %
                </span>
            </div>
        </div>, document.body,
    )    
}

export default ModelLoader