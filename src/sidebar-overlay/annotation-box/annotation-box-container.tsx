import * as React from 'react'
import cx from 'classnames'
import noop from 'lodash/fp/noop'
import { connect } from 'react-redux'

import { MapDispatchToProps } from '../types'
import DefaultDeleteModeContent from './default-delete-mode-content'
import EditModeContent from './edit-mode-content'
import { TruncatedTextRenderer } from '../components'
import { CrowdfundingBox } from 'src/common-ui/crowdfunding'
import { actions as filterActs } from 'src/search-filters'
import { StatefulUIElement } from 'src/common-ui/types'

import Logic, {
    State,
    LogicEvent,
    Props,
    getTruncatedTextObject,
    DispatchProps,
    OwnProps,
} from './annotation-box-container.logic'
import niceTime from 'src/util/nice-time'
const styles = require('./annotation-box-container.css')
const footerStyles = require('./default-footer.css')

class AnnotationBoxContainer extends StatefulUIElement<
    Props,
    State,
    LogicEvent
> {
    static defaultProps = {
        handleMouseEnter: () => undefined,
        handleMouseLeave: () => undefined,
        handleTagClick: () => undefined,
    }

    private _boxRef: HTMLDivElement = null

    constructor(props: Props) {
        super(
            props,
            new Logic({
                props: new Proxy(
                    {},
                    {
                        get: (target, key) => {
                            return this.props[key]
                        },
                    },
                ) as Props,
            }),
        )
    }

    componentDidMount() {
        this._setupEventListeners()
    }

    componentWillUnmount() {
        this._removeEventListeners()
    }

    private _setupEventListeners = () => {
        if (this._boxRef) {
            this._boxRef.addEventListener(
                'mouseenter',
                this.props.handleMouseEnter,
            )
            this._boxRef.addEventListener(
                'mouseleave',
                this.props.handleMouseLeave,
            )
        }
    }

    private _removeEventListeners = () => {
        if (this._boxRef) {
            this._boxRef.addEventListener(
                'mouseenter',
                this.props.handleMouseEnter,
            )
            this._boxRef.addEventListener(
                'mouseleave',
                this.props.handleMouseLeave,
            )
        }
    }

    private _setBoxRef = (ref: HTMLDivElement) => {
        this._boxRef = ref
    }

    _getFormattedTimestamp(timestamp: number) {
        return niceTime(timestamp)
    }

    private get _isEdited() {
        return this.props.lastEdited !== this.props.createdWhen
    }

    render() {
        const { mode, displayCrowdfunding } = this.state
        if (displayCrowdfunding) {
            return (
                <CrowdfundingBox
                    onClose={() =>
                        this.processEvent('onCrowdfundingBoxClose', {})
                    }
                />
            )
        }

        const timestamp = this.props.lastEdited
            ? this._getFormattedTimestamp(this.props.lastEdited)
            : this._getFormattedTimestamp(this.props.createdWhen)

        const isClickable = this.props.body && this.props.env !== 'overview'

        return (
            <div
                id={this.props.url} // Focusing on annotation relies on this ID.
                className={cx(styles.container, this.props.className, {
                    [styles.isActive]: this.props.isActive,
                    [styles.isHovered]: this.props.isHovered,
                    [footerStyles.isHovered]: this.props.isHovered,
                    [styles.isClickable]: isClickable,
                    [styles.isJustComment]: mode !== 'edit' && !this.props.body,
                    [styles.isEdit]: mode === 'edit',
                })}
                onClick={isClickable ? this.props.handleGoToAnnotation : noop}
                ref={this._setBoxRef}
            >
                {/* Highlighted text for the annotation. If available, shown in
                every mode. */}
                {this.props.body && (
                    <div className={styles.highlight}>
                        <span className={styles.highlightText}>
                            <TruncatedTextRenderer
                                text={this.props.body}
                                getTruncatedTextObject={getTruncatedTextObject}
                            />
                        </span>
                    </div>
                )}

                {mode !== 'edit' ? (
                    <DefaultDeleteModeContent
                        env={this.props.env}
                        mode={mode}
                        body={this.props.body}
                        comment={this.props.comment}
                        tags={this.props.tags}
                        isEdited={this._isEdited}
                        timestamp={timestamp}
                        hasBookmark={this.props.hasBookmark}
                        handleGoToAnnotation={this.props.handleGoToAnnotation}
                        handleDeleteAnnotation={() =>
                            this.processEvent('onDeleteAnnotation', {})
                        }
                        handleCancelOperation={() =>
                            this.processEvent('onCancelOperation', {})
                        }
                        handleTagClick={this.props.handleTagClick}
                        editIconClickHandler={() =>
                            this.processEvent('onEditIconClick', {})
                        }
                        trashIconClickHandler={() =>
                            this.processEvent('onTrashIconClick', {})
                        }
                        shareIconClickHandler={() =>
                            this.processEvent('onShareIconClick', {})
                        }
                        getTruncatedTextObject={getTruncatedTextObject}
                        handleBookmarkToggle={() =>
                            this.processEvent('onBookmarkToggle', {})
                        }
                    />
                ) : (
                    <EditModeContent
                        env={this.props.env}
                        comment={this.props.comment}
                        tags={this.props.tags}
                        handleCancelOperation={() =>
                            this.processEvent('onCancelOperation', {})
                        }
                        handleEditAnnotation={(commentText, tagsInput) => {
                            this.processEvent('onEditAnnotation', {
                                commentText,
                                tagsInput,
                            })
                        }}
                    />
                )}
            </div>
        )
    }
}

const mapDispatchToProps: MapDispatchToProps<
    DispatchProps,
    OwnProps
> = dispatch => ({
    handleTagClick: tag => dispatch(filterActs.toggleTagFilter(tag)),
})

export default connect(
    null,
    mapDispatchToProps,
)(AnnotationBoxContainer)
