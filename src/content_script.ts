import 'babel-polyfill'

import { RemoteFunctionRegistry } from './util/webextensionRPC'
import 'src/activity-logger/content_script'
import 'src/page-analysis/content_script'
import 'src/search-injection/content_script'
import AnnotationsManager from 'src/sidebar-overlay/annotations-manager'
import initContentTooltip, {
    loadStyles,
    setupKeyboardShortcuts,
} from 'src/content-tooltip'
import 'src/direct-linking/content_script'
import initRibbonAndSidebar from './sidebar-overlay/content_script'
import 'src/backup/content_script'
import ToolbarNotifications from 'src/toolbar-notification/content_script'
import initSocialIntegration from 'src/social-integration/content_script'

const remoteFunctionRegistry = new RemoteFunctionRegistry()

const toolbarNotifications = new ToolbarNotifications()
toolbarNotifications.registerRemoteFunctions(remoteFunctionRegistry)
// toolbarNotifications.showToolbarNotification('tooltip-first-close')
window['toolbarNotifications'] = toolbarNotifications

const annotationsManager = new AnnotationsManager()

initContentTooltip({
    triggerEventName: 'mouseup',
    setupKeyboardShortcuts,
    toolbarNotifications,
    loadStyles,
})

initRibbonAndSidebar({ annotationsManager, toolbarNotifications })

initSocialIntegration({ annotationsManager })
