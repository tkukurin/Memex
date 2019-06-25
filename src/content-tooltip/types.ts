export interface Shortcut {
    enabled: boolean
    shortcut: string
}

export interface KeyboardShortcuts {
    shortcutsEnabled?: boolean
    createAnnotation: Shortcut
    toggleHighlights: Shortcut
    addToCollection: Shortcut
    createBookmark: Shortcut
    toggleSidebar: Shortcut
    addComment: Shortcut
    highlight: Shortcut
    addTag: Shortcut
    link: Shortcut
}

export interface Position {
    x: number
    y: number
}

export type PositionState = 'text' | 'mouse'

export type PositionCalculator = (event?) => Promise<Position>

export type TooltipState = 'running' | 'copied' | 'pristine' | 'done'
