export type KpiDirection = "up" | "down" | "flat"

export type DashboardKpis = {
    todayPnl: number
    weekPnl: number
    winRateLast30: number
    avgPnlLast30: number
}