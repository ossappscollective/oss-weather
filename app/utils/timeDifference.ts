// "+7 h" / "−6 h": time zone of a location compared to the selected one (offsets in hours)
export function timeDifferenceLabel(offsetHours: number, currentOffsetHours: number) {
    if (!Number.isFinite(offsetHours) || !Number.isFinite(currentOffsetHours) || offsetHours === currentOffsetHours) {
        return '';
    }
    const difference = offsetHours - currentOffsetHours;
    return `${difference > 0 ? '+' : '−'}${Math.abs(difference)} h`;
}
