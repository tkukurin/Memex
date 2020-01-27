import {
    StorageModule,
    StorageModuleConfig,
    StorageModuleConstructorArgs,
} from '@worldbrain/storex-pattern-modules'
import { COLLECTION_DEFINITIONS as PAGE_COLLECTION_DEFINITIONS } from '@worldbrain/memex-storage/lib/pages/constants'
import { normalizeUrl } from '@worldbrain/memex-url-utils'
import { PipelineRes, VisitInteraction } from 'src/search'
import { initErrHandler } from 'src/search/storage'
import { getTermsField } from '@worldbrain/memex-common/lib/storage/utils'
import { mergeTermFields } from '@worldbrain/memex-common/lib/page-indexing/utils'

export default class PageStorage extends StorageModule {
    constructor(private options: StorageModuleConstructorArgs) {
        super(options)
    }

    getConfig = (): StorageModuleConfig => ({
        collections: {
            ...PAGE_COLLECTION_DEFINITIONS,
        },
        operations: {
            createPage: {
                operation: 'createObject',
                collection: 'pages',
            },
            updatePage: {
                operation: 'updateObject',
                collection: 'pages',
                args: [{ url: '$url:string' }, '$updates'],
            },
            findPageByUrl: {
                operation: 'findObject',
                collection: 'pages',
                args: {
                    url: '$url:string',
                },
            },
            deletePage: {
                operation: 'deletePage',
                collection: 'pages',
                args: {
                    url: '$url:string',
                },
            },
            createVisit: {
                operation: 'createObject',
                collection: 'visits',
            },
            findVisitsByUrl: {
                operation: 'findObjects',
                collection: 'visits',
                args: {
                    url: '$url:string',
                },
            },
            createFavIcon: {
                operation: 'createObject',
                collection: 'favIcons',
            },
            countFavIconByHostname: {
                operation: 'countObjects',
                collection: 'favIcons',
                args: {
                    hostname: '$hostname:string',
                },
            },
            updateFavIcon: {
                operation: 'updateObject',
                collection: 'favIcons',
                args: [
                    { hostname: '$hostname:string' },
                    { favIcon: '$favIcon' },
                ],
            },
            countBookmarksByUrl: {
                operation: 'countObjects',
                collection: 'bookmarks',
                args: {
                    url: '$url:string',
                },
            },
        },
    })

    async createPageIfNotExists(pageData: PipelineRes): Promise<void> {
        const normalizedUrl = normalizeUrl(pageData.url, {})
        const exists = await this.pageExists(normalizedUrl)
        if (!exists) {
            await this.operation('createPage', {
                ...pageData,
                url: normalizedUrl,
            })
        }
    }

    async createOrUpdatePage(pageData: PipelineRes) {
        const normalizedUrl = normalizeUrl(pageData.url, {})

        const existingPage = await this.getPage(pageData.url)
        if (!existingPage) {
            await this.operation('createPage', {
                ...pageData,
                url: normalizedUrl,
            })
            return
        }

        const updates = {}
        for (const fieldName of Object.keys(pageData)) {
            const termsField = getTermsField('pages', fieldName)
            if (termsField) {
                if (existingPage[fieldName] === pageData[fieldName]) {
                    continue
                }

                const mergedTerms = mergeTermFields(
                    termsField,
                    pageData,
                    existingPage,
                )
                updates[fieldName] = pageData[fieldName]
                updates[termsField] = mergedTerms
            } else if (
                typeof existingPage[fieldName] === 'string' ||
                typeof pageData[fieldName] === 'string'
            ) {
                if (pageData[fieldName] !== existingPage[fieldName]) {
                    updates[fieldName] = pageData[fieldName]
                }
            } else if (fieldName in PAGE_COLLECTION_DEFINITIONS.pages.fields) {
                updates[fieldName] = pageData[fieldName]
            }
        }

        await this.operation('updatePage', {
            url: normalizedUrl,
            updates,
        })
    }

    async createVisitsIfNeeded(url: string, visitTimes: number[]) {
        interface Visit {
            url: string
            time: number
        }
        const normalizedUrl = normalizeUrl(url, {})
        const existingVisits: Visit[] = await this.operation(
            'findVisitsByUrl',
            { url: normalizedUrl },
        )
        const existingVisitTimes = new Set(
            existingVisits.map(visit => visit.time),
        )
        const newVisits: Visit[] = []
        for (const visitTime of visitTimes) {
            if (!existingVisitTimes.has(visitTime)) {
                newVisits.push({ url: normalizedUrl, time: visitTime })
            }
        }
        for (const visit of newVisits) {
            await this.operation('createVisit', visit)
        }
    }

    async pageExists(url: string): Promise<boolean> {
        const normalizedUrl = normalizeUrl(url, {})
        const existingPage = await this.operation('findPageByUrl', {
            url: normalizedUrl,
        })
        return !!existingPage
    }

    async pageHasVisits(url: string): Promise<boolean> {
        const normalizedUrl = normalizeUrl(url, {})
        const visits = await this.operation('findVisitsByUrl', {
            url: normalizedUrl,
        })
        return !!visits.length
    }

    async addPageVisit(url: string, time: number) {
        const normalizedUrl = normalizeUrl(url, {})
        await this.operation('createVisit', { url: normalizedUrl, time })
    }

    async addPageVisitIfHasNone(url: string, time: number) {
        const hasVisits = await this.pageHasVisits(url)

        if (!hasVisits) {
            await this.addPageVisit(url, time)
        }
    }

    async getPage(url: string): Promise<PipelineRes | null> {
        const normalizedUrl = normalizeUrl(url, {})
        return this.operation('findPageByUrl', { url: normalizedUrl })
    }

    async updateVisitMetadata(
        visit: { url: string; time: number },
        data: Partial<VisitInteraction>,
    ) {
        const normalizedUrl = normalizeUrl(visit.url, {})

        return this.options.storageManager
            .collection('visits')
            .updateObjects(
                { time: visit.time, url: normalizedUrl },
                { $set: data },
            )
            .catch(initErrHandler())
    }

    async createFavIconIfNeeded(hostname: string, favIcon: string | Blob) {
        const exists = !!(await this.operation('countFavIconByHostname', {
            hostname,
        }))
        if (!exists) {
            await this.operation('createFavIcon', {
                hostname,
                favIcon,
            })
        }

        return { created: !exists }
    }

    async createOrUpdateFavIcon(hostname: string, favIcon: string | Blob) {
        const { created } = await this.createFavIconIfNeeded(hostname, favIcon)
        if (!created) {
            await this.operation('updateFavIcon', {
                hostname,
                favIcon,
            })
        }
    }

    async deletePageIfOrphaned(url: string) {
        const normalizedUrl = normalizeUrl(url, {})
        if (
            (await this.operation('findVisitsByUrl', { url: normalizeUrl }))
                .length
        ) {
            return
        }
        if (
            await this.operation('countBookmarksByUrl', { url: normalizeUrl })
        ) {
            return
        }

        await this.operation('deletePage', {
            url: normalizedUrl,
        })
    }
}
