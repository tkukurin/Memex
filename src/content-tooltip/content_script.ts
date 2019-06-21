import { bodyLoader } from '../util/loader'
import { setupRPC, insertTooltip, removeTooltip } from './interactions'
import ToolbarNotifications from '../toolbar-notification/content_script'
import { conditionallyShowOnboardingNotifications } from './onboarding-interactions'
import { getTooltipState, runOnScriptShutdown } from './utils'

export default async function init({
    toolbarNotifications,
    setupKeyboardShortcuts,
}: {
    toolbarNotifications: ToolbarNotifications
    setupKeyboardShortcuts?: () => Promise<void>
}) {
    runOnScriptShutdown(() => removeTooltip())
    // Set up the RPC calls even if the tooltip is enabled or not.
    setupRPC({ toolbarNotifications })
    await conditionallyShowOnboardingNotifications({
        toolbarNotifications,
    })
    const isTooltipEnabled = await getTooltipState()

    await setupKeyboardShortcuts()

    if (!isTooltipEnabled) {
        return
    }

    await bodyLoader()
    await insertTooltip({ toolbarNotifications })
}
