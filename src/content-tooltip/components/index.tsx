import React from 'react'
import ReactDOM from 'react-dom'

import TooltipContainer, { InjectedProps } from './container'
import { Position } from '../types'

export interface Props extends InjectedProps {
    containerAugmenter?: (container: any) => any
}

export function setupUIContainer(
    target: HTMLElement,
    { containerAugmenter = f => f, ...props }: Props,
) {
    const AugTooltipContainer = containerAugmenter(TooltipContainer)

    return new Promise<(p: Position) => void>(async resolve => {
        ReactDOM.render(
            <AugTooltipContainer
                onInit={showTooltip => resolve(showTooltip)}
                {...props}
            />,
            target,
        )
    })
}

export function destroyUIContainer(target: HTMLElement) {
    ReactDOM.unmountComponentAtNode(target)
}
