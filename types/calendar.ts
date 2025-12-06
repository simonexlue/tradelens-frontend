export type CalendarDaySummary = {
    date: string; // "2025-12-01"
    pnl: number;
    tradeCount: number;
};

export type CalendarResponse = { days: CalendarDaySummary[]};