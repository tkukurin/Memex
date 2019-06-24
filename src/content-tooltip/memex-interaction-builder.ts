// Sets up an instance of `TooltipInteractions` for use within memex

import { browser } from 'webextension-polyfill-ts'

import { TooltipInteractions } from './interactions'
import loadStyles from './load-styles'
import calcTooltipPosition from './calculate-tooltip-position'
import { conditionallyShowHighlightNotification } from './onboarding-interactions'

const CLOSE_MESSAGESHOWN_KEY = 'tooltip.close-message-shown'

async function _setCloseMessageShown() {
    await browser.storage.local.set({
        [CLOSE_MESSAGESHOWN_KEY]: true,
    })
}

async function _getCloseMessageShown() {
    const {
        [CLOSE_MESSAGESHOWN_KEY]: closeMessageShown,
    } = await browser.storage.local.get({ [CLOSE_MESSAGESHOWN_KEY]: false })

    return closeMessageShown
}

export default ({ toolbarNotifications }) =>
    new TooltipInteractions({
        triggerEventName: 'mouseup',
        calcTooltipPosition,
        loadStyles,
        async onDestroy() {
            const closeMessageShown = await _getCloseMessageShown()
            if (!closeMessageShown) {
                toolbarNotifications.showToolbarNotification(
                    'tooltip-first-close',
                )
                _setCloseMessageShown()
            }
        },
        async onTrigger() {
            return conditionallyShowHighlightNotification({
                toolbarNotifications,
            })
        },
    })
