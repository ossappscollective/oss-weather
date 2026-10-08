import type { GroupPosition } from './settingsGroups';

const POSITION_CLASSES: Record<GroupPosition, string> = {
    single: 'modernGroupSingle',
    first: 'modernGroupFirst',
    middle: 'modernGroupMiddle',
    last: 'modernGroupLast'
};

// css classes of a row grouped in a card (see app/_modern.scss)
export function groupRowClass(position: GroupPosition | undefined | null) {
    return position ? `modernGroupRow ${POSITION_CLASSES[position]}` : '';
}
