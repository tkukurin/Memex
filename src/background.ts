import 'babel-polyfill'
import 'core-js/es7/symbol'
import { registerModuleMapCollections } from '@worldbrain/storex-pattern-modules'

import { browser } from 'webextension-polyfill-ts'
import initStorex from './search/memex-storex'
import getDb, { setStorex } from './search/get-db'
import internalAnalytics from './analytics/internal'
import initSentry from './util/raven'
import {
    makeRemotelyCallable,
    setupRemoteFunctionsImplementations,
} from 'src/util/webextensionRPC'

// Features that require manual instantiation to setup
import DirectLinkingBackground from './direct-linking/background'
import EventLogBackground from './analytics/internal/background'
import CustomListBackground from './custom-lists/background'
import NotificationBackground from './notifications/background'
import SearchBackground from './search/background'
import * as backup from './backup/background'
import * as backupStorage from './backup/background/storage'
import BackgroundScript from './background-script'
import alarms from './background-script/alarms'
import createNotification from 'src/util/notifications'

// Features that auto-setup
import './analytics/background'
import './imports/background'
import './omnibar'
import analytics from './analytics'
import {
    createBackgroundModules,
    setupBackgroundModules,
    registerBackgroundModuleCollections,
} from './background-script/setup'

initSentry()

const storageManager = initStorex()
const backgroundModules = createBackgroundModules({ storageManager })

// TODO: There's still some evil code around that imports this entry point
const { tags, customList } = backgroundModules
export { tags, customList }

setupBackgroundModules(backgroundModules)
registerBackgroundModuleCollections(storageManager, backgroundModules)

let bgScript: BackgroundScript

storageManager.finishInitialization().then(() => {
    setStorex(storageManager)
    internalAnalytics.registerOperations(backgroundModules.eventLog)
    backgroundModules.backupModule.storage.setupChangeTracking()

    bgScript = new BackgroundScript({
        storageManager,
        notifsBackground: backgroundModules.notifications,
        loggerBackground: backgroundModules.activityLogger,
    })
    bgScript.setupRemoteFunctions()
    bgScript.setupWebExtAPIHandlers()
    bgScript.setupAlarms(alarms)
})

// Gradually moving all remote function registrations here
setupRemoteFunctionsImplementations({
    notifications: { createNotification },
    bookmarks: {
        addPageBookmark:
            backgroundModules.search.remoteFunctions.addPageBookmark,
        delPageBookmark:
            backgroundModules.search.remoteFunctions.delPageBookmark,
    },
})

// Attach interesting features onto global window scope for interested users
window['getDb'] = getDb
window['storageMan'] = storageManager
window['bgScript'] = bgScript
window['bgModules'] = backgroundModules
window['analytics'] = analytics
window['tabMan'] = backgroundModules.activityLogger.tabManager
