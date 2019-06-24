import { bodyLoader } from '../util/loader'
import initTooltipInteractions from './memex-interaction-builder'
import { getTooltipState, runOnScriptShutdown } from './utils'
import ToolbarNotifications from 'src/toolbar-notification/content_script'

export default async function init({
    setupKeyboardShortcuts,
    toolbarNotifications,
}: {
    setupKeyboardShortcuts?: () => Promise<void>
    toolbarNotifications: ToolbarNotifications
}) {
    const interactions = initTooltipInteractions({ toolbarNotifications })
    runOnScriptShutdown(() => interactions.removeTooltip())

    // Set up the RPC calls even if the tooltip is enabled or not.
    interactions.setupRemoteFunctions()

    const isTooltipEnabled = await getTooltipState()

    await setupKeyboardShortcuts()

    if (!isTooltipEnabled) {
        return
    }

    await bodyLoader()
    await interactions.insertTooltip()
}
