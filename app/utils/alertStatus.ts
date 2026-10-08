// alerts sheet chip: an alert is upcoming until its start
export function alertStatus(alert: { start: number; end: number }, now: number): 'active' | 'upcoming' {
    return alert.start > now ? 'upcoming' : 'active';
}
