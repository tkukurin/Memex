import { TooltipInteractions } from 'src/content-tooltip/interactions'
import calcTooltipPosition from 'src/content-tooltip/calculate-tooltip-position'

export default () =>
    new TooltipInteractions({
        triggerEventName: 'touchend',
        calcTooltipPosition: calcTooltipPosition(async () => 'mouse'),
        isTooltipEnabled: async () => true,
        makeRemotelyCallable: a => console.log(a),
        createAndCopyDirectLink: async () => console.log('create direct link'),
        createAnnotation: async () => console.log('creat annot'),
    })
