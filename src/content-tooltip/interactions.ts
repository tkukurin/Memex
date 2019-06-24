import { delayed, getTooltipState } from './utils'
import {
    createAndCopyDirectLink,
    createAnnotation,
} from 'src/direct-linking/content_script/interactions'
import { remoteFunction, makeRemotelyCallable } from 'src/util/webextensionRPC'
import { setupUIContainer, destroyUIContainer } from './components'
import { Position, PositionCalculator } from './types'

export class TooltipInteractions {
    /** Target container for the Tooltip. */
    private target: HTMLElement
    /* Denotes whether the user inserted/removed tooltip by his/her own self. */
    private manualOverride = false
    private triggerEventName: string
    private calcTooltipPosition: PositionCalculator
    private openOptionsRPC = remoteFunction('openOptionsTab')
    private triggerListener = null
    private showTooltip: (p: Position) => void
    private loadStyles: () => void
    private onDestroy: () => void
    private onTrigger: () => void

    constructor(props: {
        triggerEventName: string
        calcTooltipPosition: PositionCalculator
        loadStyles: () => void
        onDestroy?: () => void
        onTrigger?: () => void
    }) {
        this.triggerEventName = props.triggerEventName
        this.calcTooltipPosition = delayed<Position>(
            props.calcTooltipPosition,
            300,
        )
        this.loadStyles = props.loadStyles

        const noop = () => undefined
        this.onDestroy = props.onDestroy || noop
        this.onTrigger = props.onTrigger || noop
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
            showContentTooltip: () => {
                return this.insertTooltip()
            },
            insertTooltip: ({ override } = {}) => {
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
            createAndCopyDirectLink,
            createAnnotation,
            openSettings: () => this.openOptionsRPC('settings'),
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
