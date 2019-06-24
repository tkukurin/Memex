import * as Mousetrap from 'mousetrap'

import { remoteFunction } from 'src/util/webextensionRPC'
import {
    highlightAnnotations,
    removeHighlights,
} from 'src/sidebar-overlay/content_script/highlight-interactions'
import { STAGES } from 'src/overview/onboarding/constants'
import {
    toggleSidebarOverlay,
    createAnnotation as createAnnotationAct,
    createAndCopyDirectLink,
    createHighlight,
} from 'src/direct-linking/content_script/interactions'
import { userSelectedText } from './calculate-tooltip-position'
import { conditionallyRemoveSelectOption } from './onboarding-interactions'
import {
    getKeyboardShortcutsState,
    convertKeyboardEventToKeyString,
} from './utils'
import { KeyboardShortcuts } from './types'

const defaultAnnotCreatedHandler = () =>
    conditionallyRemoveSelectOption(STAGES.annotation.annotationCreated)

let highlightsOn = false

export default async () => {
    const { shortcutsEnabled, ...shortcuts } = await getKeyboardShortcutsState()

    if (!shortcutsEnabled) {
        return
    }

    const shortcutMan = new KeyboardShortcutManager({})

    Mousetrap.bind(
        Object.values(shortcuts).map(val => val.shortcut),
        shortcutMan.initKeyboardShortcutHandler(shortcuts),
    )
}

export interface Props {
    createAnnotation?: typeof createAnnotationAct
    createDirectLink?: typeof createAndCopyDirectLink
    createHighlight?: typeof createHighlight
    highlightAnnotations?: typeof highlightAnnotations
    removeHighlights?: typeof removeHighlights
    toggleSidebar?: typeof toggleSidebarOverlay
    userSelectedText?: typeof userSelectedText
    convertEventToKeyString?: typeof convertKeyboardEventToKeyString
    onAnnotationCreated?: () => Promise<void>
}

export class KeyboardShortcutManager {
    private createAnnotation: typeof createAnnotationAct
    private createDirectLink: typeof createAndCopyDirectLink
    private createHighlight: typeof createHighlight
    private highlightAnnotations: typeof highlightAnnotations
    private removeHighlights: typeof removeHighlights
    private toggleSidebar: typeof toggleSidebarOverlay
    private userSelectedText: typeof userSelectedText
    private convertEventToKeyString: typeof convertKeyboardEventToKeyString
    private onAnnotationCreated: () => Promise<void>

    constructor(props: Props) {
        this.createAnnotation = props.createAnnotation || createAnnotationAct
        this.createDirectLink =
            props.createDirectLink || createAndCopyDirectLink
        this.createHighlight = props.createHighlight || createHighlight
        this.highlightAnnotations =
            props.highlightAnnotations || highlightAnnotations
        this.removeHighlights = props.removeHighlights || removeHighlights
        this.toggleSidebar = props.toggleSidebar || toggleSidebarOverlay
        this.userSelectedText = props.userSelectedText || userSelectedText
        this.convertEventToKeyString =
            props.convertEventToKeyString || convertKeyboardEventToKeyString
        this.onAnnotationCreated =
            props.onAnnotationCreated || defaultAnnotCreatedHandler
    }

    initKeyboardShortcutHandler = (shortcuts: KeyboardShortcuts) => async e => {
        e.preventDefault()
        e.stopPropagation()
        const keyString = this.convertEventToKeyString(e)

        if (this.userSelectedText()) {
            this.handleSelectedTextShortcuts(keyString, shortcuts)
        } else {
            this.handleRegularShortcuts(keyString, shortcuts)
        }
    }

    private async handleSelectedTextShortcuts(
        keyString: string,
        { createAnnotation, highlight, link }: KeyboardShortcuts,
    ) {
        switch (keyString) {
            case link.shortcut:
                link.enabled && (await this.createLink())
                break
            case highlight.shortcut:
                if (highlight.enabled) {
                    await this.createHighlight()
                    this.toggleHighlightsAct()
                }
                break
            case createAnnotation.shortcut:
                createAnnotation.enabled && (await this.createNewAnnotation())
                break
            default:
        }
    }

    private async handleRegularShortcuts(
        keyString: string,
        {
            addComment,
            addTag,
            addToCollection,
            createBookmark,
            toggleHighlights,
            toggleSidebar,
        }: KeyboardShortcuts,
    ) {
        switch (keyString) {
            case toggleSidebar.shortcut:
                toggleSidebar.enabled &&
                    this.toggleSidebar({
                        override: true,
                        openSidebar: true,
                    })
                break
            case toggleHighlights.shortcut:
                toggleHighlights.enabled && this.toggleHighlightsAct()
                break
            case addTag.shortcut:
                addTag.enabled &&
                    this.toggleSidebar({
                        override: true,
                        openToTags: true,
                    })
                break
            case addToCollection.shortcut:
                addToCollection.enabled &&
                    this.toggleSidebar({
                        override: true,
                        openToCollections: true,
                    })
                break
            case addComment.shortcut:
                addComment.enabled &&
                    this.toggleSidebar({
                        override: true,
                        openToComment: true,
                    })
                break
            case createBookmark.shortcut:
                createBookmark.enabled &&
                    this.toggleSidebar({
                        override: true,
                        openToBookmark: true,
                    })
                break
            default:
        }
    }

    private toggleHighlightsAct() {
        highlightsOn
            ? this.removeHighlights()
            : this.fetchAndHighlightAnnotations()
        highlightsOn = !highlightsOn
    }

    private async fetchAndHighlightAnnotations() {
        let annotations = await remoteFunction('getAllAnnotationsByUrl')(
            window.location.href,
        )

        annotations = annotations.filter(annotation => annotation.selector)

        this.highlightAnnotations(annotations, this.toggleSidebar)
    }

    private async createNewAnnotation() {
        await this.createAnnotation()
        await this.onAnnotationCreated()
    }

    private async createLink() {
        await this.createDirectLink()
    }
}
