import http from './utils/http'

export interface IAnalyticsKpi {
  value: number
  prev: number | null
  change_pct: number | null
}

export interface IRevenueTrend {
  month: string
  year: number
  billed: number
  collected: number
}

export interface ITopClient {
  name: string
  revenue: number
  invoice_count: number
}

export interface IStatusBreakdown {
  paid:    { count: number; amount: number }
  sent:    { count: number; amount: number }
  overdue: { count: number; amount: number }
  draft:   { count: number; amount: number }
  void:    { count: number; amount: number }
}

export interface IMonthlyVolume {
  month: string
  year: number
  count: number
}

export interface IReceiptStats {
  total: number
  breakdown: {
    finalized: { count: number }
    draft:     { count: number }
    void:      { count: number }
  }
}

export interface IAnalyticsData {
  period:    string
  date_from: string | null
  date_to:   string | null
  kpis: {
    total_revenue:     IAnalyticsKpi
    outstanding:       IAnalyticsKpi
    total_invoices:    IAnalyticsKpi
    collection_rate:   IAnalyticsKpi
    avg_invoice_value: IAnalyticsKpi
    avg_days_to_pay:   IAnalyticsKpi
  }
  revenue_trend:           IRevenueTrend[]
  top_clients:             ITopClient[]
  status_breakdown:        IStatusBreakdown
  monthly_volume:          IMonthlyVolume[]
  receipt_stats:           IReceiptStats
  monthly_receipt_volume:  IMonthlyVolume[]
}

export const AnalyticsService = {
  get(orgId: string, period: string = '30d') {
    return http.get<{ data: IAnalyticsData }>(
      `/api/v1/orgs/${orgId}/analytics`,
      { params: { period } },
    )
  },
}
