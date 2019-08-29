import { UILogic, UIEvent, IncomingUIEvent, UIMutation } from 'ui-logic-core'
import { remoteFunction } from 'src/util/webextensionRPC'
import { EVENT_NAMES } from 'src/analytics/internal/constants'

export interface OwnProps {
    /** Required to decide how to go to an annotation when it's clicked. */
    env: 'inpage' | 'overview'
    url: string
    className?: string
    isActive?: boolean
    isHovered?: boolean
    createdWhen: number
    lastEdited: number
    body?: string
    comment?: string
    tags: string[]
    hasBookmark?: boolean
    handleGoToAnnotation: (e: React.MouseEvent<HTMLElement>) => void
    handleMouseEnter?: (e: Event) => void
    handleMouseLeave?: (e: Event) => void
    handleEditAnnotation: (url: string, comment: string, tags: string[]) => void
    handleDeleteAnnotation: (url: string) => void
    handleBookmarkToggle: (url: string) => void
}

export interface DispatchProps {
    handleTagClick: (tag: string) => void
}

export type Props = OwnProps & DispatchProps

export interface State {
    mode: 'default' | 'edit' | 'delete'
    displayCrowdfunding: boolean
}

export type LogicEvent = UIEvent<{
    onCrowdfundingBoxClose: {}
    onBookmarkToggle: {}
    onDeleteAnnotation: {}
    onCancelOperation: {}
    onReplyIconClick: {}
    onShareIconClick: {}
    onTrashIconClick: {}
    onEditIconClick: {}
    onEditAnnotation: {
        commentText: string
        tagsInput: string[]
    }

    setDisplayCrowdfunding: {
        value: boolean
        source?: 'clickReplyButton' | 'clickShareButton'
    }
}>

export default class Logic extends UILogic<State, LogicEvent> {
    processEventRPC = remoteFunction('processEvent')

    constructor(private options: { props: Props }) {
        super()
    }

    getInitialState(): State {
        return {
            mode: 'default',
            displayCrowdfunding: false,
        }
    }

    async setDisplayCrowdfunding(
        incoming: IncomingUIEvent<State, LogicEvent, 'setDisplayCrowdfunding'>,
    ) {
        if (incoming) {
            // Call RPC to process the event.
            const type =
                incoming.event.source === 'clickReplyButton'
                    ? EVENT_NAMES.CLICK_REPLY_BUTTON
                    : EVENT_NAMES.CLICK_SHARE_BUTTON
            await this.processEventRPC({ type })
        }
        return { displayCrowdfunding: { $set: incoming.event.value } }
    }

    onCrowdfundingBoxClose(
        incoming: IncomingUIEvent<State, LogicEvent, 'onCrowdfundingBoxClose'>,
    ) {
        return this.setDisplayCrowdfunding({
            ...incoming,
            event: { value: false },
        })
    }

    onEditAnnotation(
        incoming: IncomingUIEvent<State, LogicEvent, 'onEditAnnotation'>,
    ) {
        const { url } = this.options.props
        this.options.props.handleEditAnnotation(
            url,
            incoming.event.commentText.trim(),
            incoming.event.tagsInput,
        )
        return { mode: { $set: 'default' } }
    }

    onDeleteAnnotation(
        incoming: IncomingUIEvent<State, LogicEvent, 'onDeleteAnnotation'>,
    ) {
        this.options.props.handleDeleteAnnotation(this.options.props.url)
    }

    onEditIconClick(
        incoming: IncomingUIEvent<State, LogicEvent, 'onEditIconClick'>,
    ) {
        return { mode: { $set: 'edit' } }
    }

    onTrashIconClick(
        incoming: IncomingUIEvent<State, LogicEvent, 'onTrashIconClick'>,
    ) {
        return { mode: { $set: 'delete' } }
    }

    onShareIconClick(
        incoming: IncomingUIEvent<State, LogicEvent, 'onShareIconClick'>,
    ) {
        return this.setDisplayCrowdfunding({
            ...incoming,
            event: { value: true, source: 'clickShareButton' },
        })
    }

    onReplyIconClick(
        incoming: IncomingUIEvent<State, LogicEvent, 'onReplyIconClick'>,
    ) {
        return this.setDisplayCrowdfunding({
            ...incoming,
            event: { value: true, source: 'clickReplyButton' },
        })
    }

    onCancelOperation(
        incoming: IncomingUIEvent<State, LogicEvent, 'onCancelOperation'>,
    ) {
        return { mode: { $set: 'default' } }
    }

    onBookmarkToggle() {
        this.options.props.handleBookmarkToggle(this.options.props.url)
    }
}

export function getTruncatedTextObject(
    text: string,
): { isTextTooLong: boolean; text: string } {
    if (text.length > 280) {
        const truncatedText = text.slice(0, 280)
        return {
            isTextTooLong: true,
            text: truncatedText,
        }
    }

    for (let i = 0, newlineCount = 0; i < text.length; ++i) {
        if (text[i] === '\n') {
            newlineCount++
            if (newlineCount > 4) {
                const truncatedText = text.slice(0, i)
                return {
                    isTextTooLong: true,
                    text: truncatedText,
                }
            }
        }
    }

    return {
        isTextTooLong: false,
        text,
    }
}
