import type { Order } from '@/types';

export type AnalyticsTimeRange = '3M' | '6M' | '1Y';

export interface MonthlySpendDatum {
  month: string;
  spend: number;
}

export interface CategorySpendDatum {
  name: string;
  value: number;
}

export interface OrderStatusDatum {
  key: Order['status'];
  name: string;
  value: number;
  color: string;
}

const ORDER_STATUSES: Order['status'][] = ['confirmed', 'preparing', 'in_transit', 'delivered'];
const STATUS_COLORS: Record<Order['status'], string> = {
  confirmed: '#6366f1',
  preparing: '#f59e0b',
  in_transit: '#06b6d4',
  delivered: '#10b981',
};

const STATUS_LABELS: Record<Order['status'], { en: string; bn: string }> = {
  confirmed: { en: 'Confirmed', bn: 'নিশ্চিত' },
  preparing: { en: 'Preparing', bn: 'প্রস্তুত হচ্ছে' },
  in_transit: { en: 'In transit', bn: 'পথে আছে' },
  delivered: { en: 'Delivered', bn: 'ডেলিভার হয়েছে' },
};

export function buildMonthlySpendingData(
  orders: Order[],
  timeRange: AnalyticsTimeRange,
  isBn: boolean,
  now = new Date(),
): MonthlySpendDatum[] {
  const monthCount = timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : 12;
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - monthCount + 1, 1);
  const months = Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: new Intl.DateTimeFormat(isBn ? 'bn-BD' : 'en-US', { month: 'short' }).format(date),
      spend: 0,
    };
  });
  const monthIndexByKey = new Map(months.map((month, index) => [month.key, index]));

  orders.forEach((order) => {
    const createdAt = new Date(order.createdAt);
    if (Number.isNaN(createdAt.getTime())) return;
    const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
    const monthIndex = monthIndexByKey.get(key);
    if (monthIndex === undefined || !Number.isFinite(order.total)) return;
    months[monthIndex].spend += order.total;
  });

  return months.map(({ month, spend }) => ({ month, spend }));
}

export function buildCategorySpendData(orders: Order[], isBn: boolean): CategorySpendDatum[] {
  const totals = new Map<string, number>();
  const fallbackCategory = isBn ? 'অন্যান্য পণ্য' : 'Other';

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const category = item.product.category?.trim() || fallbackCategory;
      const amount = item.product.price * item.quantity;
      if (Number.isFinite(amount) && amount > 0) {
        totals.set(category, (totals.get(category) || 0) + amount);
      }
    });
  });

  return Array.from(totals, ([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value);
}

export function buildOrderStatusData(orders: Order[], isBn: boolean): OrderStatusDatum[] {
  const counts = new Map<Order['status'], number>(ORDER_STATUSES.map((status) => [status, 0]));
  orders.forEach((order) => counts.set(order.status, (counts.get(order.status) || 0) + 1));

  return ORDER_STATUSES
    .map((status) => ({
      key: status,
      name: STATUS_LABELS[status][isBn ? 'bn' : 'en'],
      value: counts.get(status) || 0,
      color: STATUS_COLORS[status],
    }))
    .filter((status) => status.value > 0);
}
