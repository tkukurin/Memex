import React from 'react'
import cx from 'classnames'

import ButtonTooltip from '../../common-ui/components/button-tooltip'
import { TooltipState } from '../types'

const styles = require('./tooltip.css')

const deriveTooltipClass = ({ state }: TooltipBtnsProps) =>
    cx(styles.tooltip, {
        [styles.statePristine]: state === 'pristine',
        [styles.stateCopied]: state === 'copied',
    })

const Tooltip = ({ x, y, tooltipComponent, ...props }: TooltipProps) => (
    <div
        className={deriveTooltipClass(props)}
        style={{ left: x, top: y }}
        id="memex-tooltip"
    >
        {tooltipComponent}
        <TooltipBtns {...props} />
    </div>
)

export interface TooltipProps extends TooltipBtnsProps {
    x: number
    y: number
    tooltipComponent: JSX.Element
}

export default Tooltip

export function TooltipBtns({ closeTooltip, state }: TooltipBtnsProps) {
    return (
        <ButtonTooltip
            tooltipText="Close. Disable in Toolbar (R)"
            position="rightContentTooltip"
        >
            <span
                className={cx(styles.buttons, {
                    [styles.noShow]: state === 'running',
                    [styles.noShow]: state === 'copied',
                })}
            >
                <a className={styles.imgCross} onClick={closeTooltip} />
            </span>
        </ButtonTooltip>
    )
}

export interface TooltipBtnsProps {
    closeTooltip: React.MouseEventHandler
    state: TooltipState
}
