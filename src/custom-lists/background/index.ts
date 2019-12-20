import Storex from '@worldbrain/storex'
import { Windows } from 'webextension-polyfill-ts'
import { normalizeUrl } from '@worldbrain/memex-url-utils'

import { makeRemotelyCallable } from 'src/util/webextensionRPC'
import { createPageViaBmTagActs } from 'src/search/on-demand-indexing'
import CustomListStorage from './storage'
import internalAnalytics from '../../analytics/internal'
import { EVENT_NAMES } from '../../analytics/internal/constants'
import { TabManager } from 'src/activity-logger/background/tab-manager'
import { Tab, CustomListsInterface } from './types'

export default class CustomListBackground {
    storage: CustomListStorage
    public remoteFunctions: CustomListsInterface

    constructor(
        private props: {
            storageManager: Storex
            tabMan?: TabManager
            windows?: Windows.Static
        },
    ) {
        // Makes the custom list Table in indexed DB.
        this.storage = new CustomListStorage({
            storageManager: props.storageManager,
        })

        this.remoteFunctions = {
            createCustomList: this.createCustomList.bind(this),
            insertPageToList: this.insertPageToList.bind(this),
            updateListName: this.updateList.bind(this),
            removeList: this.removeList.bind(this),
            removePageFromList: this.removePageFromList.bind(this),
            fetchAllLists: this.fetchAllLists.bind(this),
            fetchListById: this.fetchListById.bind(this),
            fetchListPagesByUrl: this.fetchListPagesByUrl.bind(this),
            fetchListNameSuggestions: this.fetchListNameSuggestions.bind(this),
            fetchListPagesById: this.fetchListPagesById.bind(this),
            fetchListIgnoreCase: this.fetchListIgnoreCase.bind(this),
            addOpenTabsToList: this.addOpenTabsToList.bind(this),
            removeOpenTabsFromList: this.removeOpenTabsFromList.bind(this),
        }
    }

    private getDb = async () => this.props.storageManager

    setupRemoteFunctions() {
        makeRemotelyCallable(this.remoteFunctions)
    }

    generateListId() {
        return Date.now()
    }

    async fetchAllLists({ excludeIds = [], skip = 0, limit = 20 }) {
        return this.storage.fetchAllLists({
            excludedIds: excludeIds,
            limit,
            skip,
        })
    }

    async fetchListById({ id }: { id: number }) {
        return this.storage.fetchListById(id)
    }

    async fetchListByName({ name }: { name: string }) {
        return this.storage.fetchListIgnoreCase({ name })
    }

    async createCustomLists({ names }: { names: string[] }) {
        const existingLists = new Map<string, number>()

        for (const name of names) {
            const list = await this.fetchListByName({ name })

            if (list) {
                existingLists.set(list.name, list.id)
            }
        }

        const missing = names.filter(name => !existingLists.has(name))

        const missingEntries = await Promise.all(
            missing.map(async name => {
                let id: number
                try {
                    id = await this.createCustomList({ name })
                } catch (err) {
                    const list = await this.fetchListByName({ name })
                    id = list.id
                }
                return [name, id] as [string, number]
            }),
        )

        const listIds = new Map([...existingLists, ...missingEntries])

        return names.map(name => listIds.get(name))
    }

    async fetchListPagesById({ id }: { id: number }) {
        return this.storage.fetchListPagesById({
            listId: id,
        })
    }

    async fetchListPagesByUrl({ url }: { url: string }) {
        return this.storage.fetchListPagesByUrl({
            url: normalizeUrl(url),
        })
    }

    async createCustomList({ name }: { name: string }): Promise<number> {
        internalAnalytics.processEvent({
            type: EVENT_NAMES.CREATE_COLLECTION,
        })

        return this.storage.insertCustomList({
            id: this.generateListId(),
            name,
        })
    }

    async updateList({ id, name }: { id: number; name: string }) {
        return this.storage.updateListName({
            id,
            name,
        })
    }

    async insertPageToList({ id, url }: { id: number; url: string }) {
        internalAnalytics.processEvent({
            type: EVENT_NAMES.INSERT_PAGE_COLLECTION,
        })
        const fullUrl = url
        url = normalizeUrl(url)

        const pageExists = await this.storage.checkExistingPage({ url })
        if (!pageExists) {
            await createPageViaBmTagActs(this.getDb)({ url })
        }

        return this.storage.insertPageToList({
            listId: id,
            pageUrl: url,
            fullUrl,
        })
    }

    async removeList({ id }: { id: number }) {
        internalAnalytics.processEvent({
            type: EVENT_NAMES.REMOVE_COLLECTION,
        })

        return this.storage.removeList({
            id,
        })
    }

    async removePageFromList({ id, url }: { id: number; url: string }) {
        internalAnalytics.processEvent({
            type: EVENT_NAMES.REMOVE_PAGE_COLLECTION,
        })

        return this.storage.removePageFromList({
            listId: id,
            pageUrl: normalizeUrl(url),
        })
    }

    async fetchListNameSuggestions({
        name,
        url,
    }: {
        name: string
        url: string
    }) {
        return this.storage.fetchListNameSuggestions({
            name,
            url: normalizeUrl(url),
        })
    }

    async fetchListIgnoreCase({ name }: { name: string }) {
        return this.storage.fetchListIgnoreCase({
            name,
        })
    }

    async addOpenTabsToList({
        listId,
        tabs,
    }: {
        listId: number
        tabs?: Array<Tab>
    }) {
        if (!tabs) {
            const currentWindow = await this.props.windows.getCurrent()
            tabs = this.props.tabMan.getTabUrls(currentWindow.id)
        }

        for (const tab of tabs) {
            const url = normalizeUrl(tab.url)

            const pageExists = await this.storage.checkExistingPage({ url })
            if (!pageExists) {
                await createPageViaBmTagActs(this.getDb)({
                    url,
                    tabId: tab.tabId,
                })
            }

            await this.storage.insertPageToList({
                listId,
                fullUrl: tab.url,
                pageUrl: url,
            })
        }
    }

    async removeOpenTabsFromList({
        listId,
        tabs,
    }: {
        listId: number
        tabs?: Array<Tab>
    }) {
        if (!tabs) {
            const currentWindow = await this.props.windows.getCurrent()
            tabs = this.props.tabMan.getTabUrls(currentWindow.id)
        }

        await Promise.all(
            tabs.map(tab =>
                this.storage.removePageFromList({
                    listId,
                    pageUrl: normalizeUrl(tab.url),
                }),
            ),
        )
    }
}
