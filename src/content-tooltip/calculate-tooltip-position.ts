import { getPositionState } from './utils'
import { Position, PositionCalculator } from './types'

/**
 * Checks for certain conditions before returning the tooltip position.
 * i) Whether the selection made by the user is just text.
 * ii) Whether the selected target is not inside the tooltip itself.
 *
 * Event is undefined in the scenario of user selecting the text before the
 * page has loaded. So we don't need to check for condition ii) since the
 * tooltip wouldn't have popped up yet.
 */
const calcTooltipPosition: PositionCalculator = async event => {
    if (!userSelectedText() || (event && isTargetInsideTooltip(event))) {
        return null
    }

    /*
    If all the conditions passed, then this returns the position to anchor the
    tooltip. The positioning is based on the user's preferred method. But in the
    case of tooltip popping up before page load, it resorts to text based method
    */
    const positioning = await getPositionState()
    let position: Position
    if (positioning === 'text' || !event) {
        position = calcTextPosition()
    } else if (positioning === 'mouse' && event) {
        position = { x: event.pageX, y: event.pageY }
    }
    return position
}

export default calcTooltipPosition

function calcTextPosition(): Position {
    const range = document.getSelection().getRangeAt(0)
    const boundingRect = range.getBoundingClientRect()
    // x = position of element from the left + half of it's width
    const x = boundingRect.left + boundingRect.width / 2
    // y = scroll height from top + pixels from top + height of element - offset
    const y = window.pageYOffset + boundingRect.top + boundingRect.height - 10
    return {
        x,
        y,
    }
}

function isTargetInsideTooltip(event) {
    const $tooltipContainer = document.querySelector(
        '#memex-direct-linking-tooltip',
    )
    if (!$tooltipContainer) {
        // edge case, where the destroy() is called
        return true
    }
    return $tooltipContainer.contains(event.target)
}

export function userSelectedText() {
    const selection = document.getSelection()
    if (selection.type === 'None') {
        return false
    }

    const selectedString = selection.toString().trim()
    const container = selection.getRangeAt(0).commonAncestorContainer
    const extras = isAnchorOrContentEditable(container)

    return !!selection && !selection.isCollapsed && !!selectedString && !extras
}

function isAnchorOrContentEditable(selected) {
    // Returns true if the any of the parent is an anchor element
    // or is content editable.
    let parent = selected.parentElement
    while (parent) {
        if (parent.contentEditable === 'true' || parent.nodeName === 'A') {
            return true
        }
        parent = parent.parentElement
    }
    return false
}
