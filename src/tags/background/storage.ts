import {
    StorageModule,
    StorageModuleConfig,
} from '@worldbrain/storex-pattern-modules'
import {
    COLLECTION_DEFINITIONS,
    COLLECTION_NAMES,
} from '@worldbrain/memex-storage/lib/tags/constants'
import { COLLECTION_NAMES as PAGE_COLL_NAMES } from '@worldbrain/memex-storage/lib/pages/constants'

export default class TagStorage extends StorageModule {
    static TAGS_COLL = COLLECTION_NAMES.tag

    getConfig = (): StorageModuleConfig => ({
        collections: {
            ...COLLECTION_DEFINITIONS,
        },
        operations: {
            findAllTagsOfPage: {
                collection: TagStorage.TAGS_COLL,
                operation: 'findObjects',
                args: { url: '$url:string' },
            },
            createTag: {
                collection: TagStorage.TAGS_COLL,
                operation: 'createObject',
            },
            deleteTag: {
                collection: TagStorage.TAGS_COLL,
                operation: 'deleteObjects',
                args: { name: '$name:string', url: '$url:string' },
            },
            findPage: {
                collection: PAGE_COLL_NAMES.page,
                operation: 'findObject',
                args: { url: '$url:pk' },
            },
        },
    })

    async fetchPageTags({ url }: { url: string }): Promise<string[]> {
        const tags = await this.operation('findAllTagsOfPage', { url })
        return tags.map(({ name }) => name)
    }

    async addTag({ name, url }: { name: string; url: string }) {
        return this.operation('createTag', { name, url })
    }

    async delTag({ name, url }: { name: string; url: string }) {
        return this.operation('deleteTag', { name, url })
    }

    async addTagsToOpenTabs({
        name,
        urls,
    }: {
        name: string
        urls: Array<string>
    }) {
        await Promise.all(urls.map(url => this.addTag({ name, url })))
    }

    async delTagsFromOpenTabs({
        name,
        urls,
    }: {
        name: string
        urls: Array<string>
    }) {
        await Promise.all(urls.map(url => this.delTag({ name, url })))
    }

    async checkExistingPage({ url }: { url: string }): Promise<boolean> {
        const page = await this.operation('findPage', { url })

        return page != null
    }
}
