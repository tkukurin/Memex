import Storex from '@worldbrain/storex'
import { normalizeUrl } from '@worldbrain/memex-url-utils'
import { Windows } from 'webextension-polyfill-ts'

import TagStorage from './storage'
import { createPageViaBmTagActs } from 'src/search/on-demand-indexing'
import { TabManager } from 'src/activity-logger/background/tab-manager'
import { makeRemotelyCallable } from 'src/util/webextensionRPC'
import { SearchIndex } from 'src/search'

interface Tabs {
    tabId: number
    url: string
}

export default class TagsBackground {
    storage: TagStorage

    constructor(
        private props: {
            storageManager: Storex
            searchIndex: SearchIndex
            tabManager?: TabManager
            windows?: Windows.Static
        },
    ) {
        this.storage = new TagStorage({ storageManager: props.storageManager })
    }

    private getDb = async () => this.props.storageManager

    setupRemoteFunctions() {
        makeRemotelyCallable({
            addTag: this.addTag.bind(this),
            delTag: this.delTag.bind(this),
            addPageTag: this.addTagForPage.bind(this),
            addTagsToOpenTabs: this.addTagsToOpenTabs.bind(this),
            delTagsFromOpenTabs: this.delTagsFromOpenTabs.bind(this),
            fetchPageTags: this.fetchPageTags.bind(this),
        })
    }

    async addTagsToOpenTabs({ tag, tabs }: { tag: string; tabs?: Tabs[] }) {
        if (!tabs) {
            const currentWindow = await this.props.windows.getCurrent()
            tabs = this.props.tabManager.getTabUrls(currentWindow.id)
        }

        const time = Date.now()

        tabs.forEach(async tab => {
            let page = await this.props.searchIndex.getPage(tab.url)

            if (page == null || page.isStub) {
                page = await this.props.searchIndex.createPageFromTab({
                    tabId: tab.tabId,
                    url: tab.url,
                    allowScreenshot: false,
                })
            }

            // Add new visit if none, else page won't appear in results
            if (!page.visits.length) {
                page.addVisit(time)
            }

            await page.save()
        })

        return this.storage.addTagsToOpenTabs({
            name,
            urls: tabs.map(tab => normalizeUrl(tab.url)),
        })
    }

    async delTagsFromOpenTabs({ name, tabs }: { name: string; tabs?: Tabs[] }) {
        if (!tabs) {
            const currentWindow = await this.props.windows.getCurrent()
            tabs = this.props.tabManager.getTabUrls(currentWindow.id)
        }

        return this.storage.delTagsFromOpenTabs({
            name,
            urls: tabs.map(tab => normalizeUrl(tab.url)),
        })
    }

    async fetchPageTags({ url }: { url: string }) {
        return this.storage.fetchPageTags({ url: normalizeUrl(url) })
    }

    async addTagForPage({
        tag,
        url,
        tabId,
    }: {
        tag: string
        url: string
        tabId?: number
    }) {
        url = normalizeUrl(url)

        const pageExists = await this.storage.checkExistingPage({ url })
        if (!pageExists) {
            await createPageViaBmTagActs(this.getDb)({ url, tabId })
        }

        return this.storage.addTag({ name: tag, url })
    }

    async addTag({ tag, url }: { tag: string; url: string }) {
        return this.storage.addTag({ name: tag, url: normalizeUrl(url) })
    }

    async delTag({ tag, url }: { tag: string; url: string }) {
        return this.storage.delTag({ name: tag, url: normalizeUrl(url) })
    }
}
