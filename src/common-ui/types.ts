import { UIElement } from 'ui-logic-react'

export abstract class StatefulUIElement<Props, State, Event> extends UIElement<
    Props,
    State,
    Event
> {
    constructor(props, logic) {
        super(props, logic)
    }
}
