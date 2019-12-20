import Storex from '@worldbrain/storex'
import { normalizeUrl } from '@worldbrain/memex-url-utils'
import { Browser, Bookmarks } from 'webextension-polyfill-ts'

import { TabManager } from 'src/activity-logger/background'
import { createPageViaBmTagActs } from 'src/search/on-demand-indexing'
import BookmarksStorage from './storage'
import { BookmarksInterface } from './types'

export default class BookmarksBackground {
    storage: BookmarksStorage
    remoteFunctions: {
        bookmarks: BookmarksInterface
    }

    constructor(
        private props: {
            storageManager: Storex
            browserAPIs: Pick<Browser, 'bookmarks'>
            tabManager: TabManager
        },
    ) {
        this.storage = new BookmarksStorage({
            storageManager: props.storageManager,
        })

        this.addBookmark = this.addBookmark.bind(this)
        this.delBookmark = this.delBookmark.bind(this)

        // Handle any new browser bookmark actions (bookmark mananger or bookmark btn in URL bar)
        this.props.browserAPIs.bookmarks.onCreated.addListener(
            this.handleBookmarkCreationEvent,
        )
        this.props.browserAPIs.bookmarks.onRemoved.addListener(
            this.handleBookmarkRemovalEvent,
        )

        this.initRemoteFunctions()
    }

    private getDb = async () => this.props.storageManager

    private initRemoteFunctions() {
        this.remoteFunctions = {
            bookmarks: {
                addPageBookmark: this.addBookmark,
                delPageBookmark: this.delBookmark,
            },
        }
    }

    private handleBookmarkCreationEvent = async (
        id: string,
        node: Bookmarks.BookmarkTreeNode,
    ) => {
        // Created folders won't have `url`; ignore these
        if (!node.url) {
            return
        }

        let tabId
        const activeTab = this.props.tabManager.getActiveTab()

        if (activeTab != null && activeTab.url === node.url) {
            tabId = activeTab.id
        }

        return this.addBookmark({ url: node.url, tabId })
    }

    private handleBookmarkRemovalEvent = async (
        id: string,
        { node }: Bookmarks.OnRemovedRemoveInfoType,
    ) => {
        // Removed folders won't have `url`; ignore these
        if (!node.url) {
            return
        }

        return this.delBookmark({ url: node.url })
    }

    async addBookmark({
        url,
        time,
        tabId,
    }: {
        url: string
        time?: number
        tabId?: number
    }) {
        url = normalizeUrl(url)

        const pageExists = await this.storage.checkExistingPage({ url })
        if (!pageExists) {
            await createPageViaBmTagActs(this.getDb)({ url, tabId })
        }

        return this.storage.addBookmark({ url, time })
    }

    async delBookmark({ url }: { url: string }) {
        return this.storage.delBookmark({ url: normalizeUrl(url) })
    }

    async checkPageHasBookmark({ url }: { url: string }): Promise<boolean> {
        return this.storage.checkBookmarkExists({ url })
    }
}
