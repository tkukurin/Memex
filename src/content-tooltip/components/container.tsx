import React from 'react'

import Tooltip from './tooltip'
import {
    InitialComponent,
    CreatingLinkComponent,
    CopiedComponent,
    ErrorComponent,
    DoneComponent,
} from './tooltip-states'
import { Position, TooltipState } from '../types'

export type Props = OwnProps & InjectedProps

export interface OwnProps {
    onInit: (cb: (pos: Position) => void) => void
}

export interface InjectedProps {
    createAndCopyDirectLink: () => Promise<{ url: string }>
    createAnnotation: () => Promise<void>
    destroyTooltip: () => Promise<void>
}

interface State {
    showTooltip: boolean
    tooltipState: TooltipState
    position: Position
}

class TooltipContainer extends React.Component<Props, State> {
    static DEF_POSITION: Position = { x: null, y: null }

    state = {
        showTooltip: false,
        position: TooltipContainer.DEF_POSITION,
        tooltipState: 'copied' as TooltipState,
    }

    componentDidMount() {
        this.props.onInit(this.showTooltipAtPosition)
    }

    showTooltipAtPosition = (position: Position) => {
        if (!this.state.showTooltip && this.state.tooltipState !== 'running') {
            this.setState({
                position,
                showTooltip: true,
                tooltipState: 'pristine',
            })
        }
    }

    hideTooltip = () => {
        this.setState({
            showTooltip: false,
            position: TooltipContainer.DEF_POSITION,
        })
    }

    closeTooltip: React.MouseEventHandler = event => {
        event.preventDefault()
        event.stopPropagation()

        this.props.destroyTooltip()
    }

    createLink = async () => {
        this.setState({
            tooltipState: 'running',
        })
        await this.props.createAndCopyDirectLink()
        this.setState({
            tooltipState: 'copied',
        })
    }

    createAnnotation: React.MouseEventHandler = async e => {
        e.preventDefault()
        e.stopPropagation()
        await this.props.createAnnotation()

        // quick hack, to prevent the tooltip from popping again
        setTimeout(() => {
            this.setState({
                tooltipState: 'runnning' as TooltipState,
                showTooltip: false,
                position: TooltipContainer.DEF_POSITION,
            })
        }, 400)
    }

    renderTooltipComponent() {
        switch (this.state.tooltipState) {
            case 'pristine':
                return (
                    <InitialComponent
                        createLink={this.createLink}
                        createAnnotation={this.createAnnotation}
                    />
                )
            case 'running':
                return <CreatingLinkComponent />
            case 'copied':
                return <CopiedComponent />
            case 'done':
                return <DoneComponent />
            default:
                return <ErrorComponent />
        }
    }

    render() {
        return (
            <div className="memex-tooltip-container">
                {this.state.showTooltip && (
                    <Tooltip
                        {...this.state.position}
                        state={this.state.tooltipState}
                        tooltipComponent={this.renderTooltipComponent()}
                        closeTooltip={this.closeTooltip}
                    />
                )}
            </div>
        )
    }
}

export default TooltipContainer
