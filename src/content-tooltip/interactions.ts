import { delayed, getTooltipState } from './utils'
import { makeRemotelyCallable } from 'src/util/webextensionRPC'
import { setupUIContainer, destroyUIContainer } from './components'
import { Position, PositionCalculator } from './types'

export interface Props {
    triggerEventName: string
    calcTooltipPosition: PositionCalculator
    createAndCopyDirectLink: () => Promise<{ url: string }>
    createAnnotation: () => Promise<void>
    loadStyles: () => void
    containerAugmenter?: (container: any) => any
    onDestroy?: () => void
    onTrigger?: () => void
}

export class TooltipInteractions {
    /** Target container for the Tooltip. */
    private target: HTMLElement
    /* Denotes whether the user inserted/removed tooltip by his/her own self. */
    private manualOverride = false
    private triggerEventName: string
    private calcTooltipPosition: PositionCalculator
    private triggerListener = null
    private createAndCopyDirectLink: () => Promise<{ url: string }>
    private containerAugmenter: (container: any) => any
    private createAnnotation: () => Promise<void>
    private showTooltip: (p: Position) => void
    private loadStyles: () => void
    private onDestroy: () => void
    private onTrigger: () => void

    constructor(props: Props) {
        this.triggerEventName = props.triggerEventName
        this.calcTooltipPosition = delayed<Position>(
            props.calcTooltipPosition,
            300,
        )
        this.loadStyles = props.loadStyles
        this.createAndCopyDirectLink = props.createAndCopyDirectLink
        this.createAnnotation = props.createAnnotation

        const noop = () => undefined
        this.onDestroy = props.onDestroy || noop
        this.onTrigger = props.onTrigger || noop
        this.containerAugmenter = props.containerAugmenter || noop
    }

    setupTooltipTrigger({ callback }: { callback: (e: Event) => void }) {
        this.triggerListener = callback
        document.body.addEventListener(
            this.triggerEventName,
            this.triggerListener,
        )
    }

    destroyTooltipTrigger() {
        document.body.removeEventListener(
            this.triggerEventName,
            this.triggerListener,
        )
        this.triggerListener = null
    }

    setupRemoteFunctions() {
        makeRemotelyCallable({
            showContentTooltip: ({ override } = {}) => {
                this.manualOverride = !!override
                return this.insertTooltip()
            },
            removeTooltip: ({ override } = {}) => {
                this.manualOverride = !!override
                return this.removeTooltip()
            },
            insertOrRemoveTooltip: () => {
                return this.insertOrRemoveTooltip()
            },
        })
    }

    /**
     * Creates target container for Tooltip.
     * Injects content_script.css.
     * Mounts Tooltip React component.
     * Sets up Container <---> webpage Remote functions.
     */
    async insertTooltip() {
        // If target is set, Tooltip has already been injected.
        if (this.target) {
            return
        }

        this.target = document.createElement('div')
        this.target.setAttribute('id', 'memex-direct-linking-tooltip')
        document.body.appendChild(this.target)

        this.loadStyles()

        this.showTooltip = await setupUIContainer(this.target, {
            createAndCopyDirectLink: this.createAndCopyDirectLink,
            createAnnotation: this.createAnnotation,
            containerAugmenter: this.containerAugmenter,
            destroyTooltip: async () => {
                this.manualOverride = true
                this.removeTooltip()
                this.onDestroy()
            },
        })

        this.setupTooltipTrigger({
            callback: async event => {
                await this.conditionallyShowTooltip(event)
                this.onTrigger()
            },
        })
        await this.conditionallyShowTooltip()
    }

    async conditionallyShowTooltip(event?) {
        const position = await this.calcTooltipPosition(event)

        if (position != null) {
            this.showTooltip(position)
        }
    }

    async removeTooltip() {
        if (!this.target) {
            return
        }
        this.destroyTooltipTrigger()
        destroyUIContainer(this.target)
        this.target.remove()

        this.target = null
        this.showTooltip = null
    }

    /**
     * Inserts or removes tooltip from the page (if not overridden manually).
     * Should either be called through the RPC, or pass the `toolbarNotifications`
     * wrapped in an object.
     */
    insertOrRemoveTooltip = async () => {
        if (this.manualOverride) {
            return
        }

        const isTooltipEnabled = await getTooltipState()
        const isTooltipPresent = !!this.target

        if (isTooltipEnabled && !isTooltipPresent) {
            await this.insertTooltip()
        } else if (!isTooltipEnabled && isTooltipPresent) {
            await this.removeTooltip()
        }
    }
}
