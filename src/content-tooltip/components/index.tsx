import React from 'react'
import ReactDOM from 'react-dom'

import TooltipContainer from './container'
import { Position } from '../types'

export function setupUIContainer(
    target: HTMLElement,
    { createAndCopyDirectLink, openSettings, destroyTooltip, createAnnotation },
) {
    return new Promise<(p: Position) => void>(async resolve => {
        ReactDOM.render(
            <TooltipContainer
                onInit={showTooltip => resolve(showTooltip)}
                destroy={destroyTooltip}
                createAndCopyDirectLink={createAndCopyDirectLink}
                createAnnotation={createAnnotation}
                openSettings={openSettings}
            />,
            target,
        )
    })
}

export function destroyUIContainer(target: HTMLElement) {
    ReactDOM.unmountComponentAtNode(target)
}
