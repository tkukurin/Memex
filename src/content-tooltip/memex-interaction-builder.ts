// Sets up an instance of `TooltipInteractions` for use within memex
import { browser } from 'webextension-polyfill-ts'
import onClickOutside from 'react-onclickoutside'

import { makeRemotelyCallable } from 'src/util/webextensionRPC'
import { TooltipInteractions } from './interactions'
import loadStyles from './load-styles'
import calcTooltipPosition from './calculate-tooltip-position'
import {
    conditionallyShowHighlightNotification,
    conditionallyRemoveSelectOption,
} from './onboarding-interactions'
import {
    createAndCopyDirectLink,
    createAnnotation,
} from 'src/direct-linking/content_script/interactions'
import { STAGES } from 'src/overview/onboarding/constants'
import { getTooltipState, getPositionState } from './utils'

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

function containerAugmenter(container) {
    return onClickOutside(container, {
        handleClickOutside: instance => {
            // Remove onboarding select option notification if it's present
            conditionallyRemoveSelectOption(
                STAGES.annotation.notifiedHighlightText,
            )

            return instance.hideTooltip
        },
    })
}

export default ({ toolbarNotifications }) =>
    new TooltipInteractions({
        triggerEventName: 'mouseup',
        createAndCopyDirectLink,
        makeRemotelyCallable,
        calcTooltipPosition: calcTooltipPosition(getPositionState),
        containerAugmenter,
        loadStyles,
        isTooltipEnabled: getTooltipState,
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
        async createAnnotation() {
            await createAnnotation()

            // Remove onboarding select option notification if it's present
            await conditionallyRemoveSelectOption(
                STAGES.annotation.annotationCreated,
            )
        },
    })
