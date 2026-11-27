import React, { useState, useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
} from 'recharts';
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  PieChart as PieChartIcon, 
  Award,
  CreditCard 
} from 'lucide-react';
import { Order } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  buildCategorySpendData,
  buildMonthlySpendingData,
  buildOrderStatusData,
  type AnalyticsTimeRange,
} from './spendingAnalytics';

interface SpendingAnalyticsDashboardProps {
  orders: Order[];
  currencySymbol?: string;
}

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const SpendingAnalyticsDashboard: React.FC<SpendingAnalyticsDashboardProps> = ({
  orders,
  currencySymbol = '৳'
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('6M');
  const monthlyTrendsData = useMemo(
    () => buildMonthlySpendingData(orders, timeRange, isBn),
    [orders, timeRange, isBn],
  );
  const categoryData = useMemo(() => buildCategorySpendData(orders, isBn), [orders, isBn]);
  const statusData = useMemo(() => buildOrderStatusData(orders, isBn), [orders, isBn]);
  const totalSpend = useMemo(
    () => orders.reduce((sum, order) => sum + (Number.isFinite(order.total) ? order.total : 0), 0),
    [orders],
  );
  const totalOrderCount = orders.length;
  const avgOrderValue = totalOrderCount > 0 ? Math.round(totalSpend / totalOrderCount) : 0;
  const topCategory = categoryData[0];
  const hasOrdersInSelectedRange = monthlyTrendsData.some((month) => month.spend > 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[var(--pm-card)] border border-[var(--pm-border)] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--pm-accent)] bg-[var(--pm-accent-soft)] px-2 py-0.5 rounded-full border border-[var(--pm-accent-border)]">
              {isBn ? 'আপনার অর্ডার' : 'Your orders'}
            </span>
          </div>
          <h3 className="text-lg font-black text-[var(--pm-text)] tracking-tight mt-1">
            {isBn ? 'খরচ ও অর্ডারের সারাংশ' : 'Spending and order summary'}
          </h3>
          <p className="text-xs text-[var(--pm-muted)]">
            {isBn ? 'আপনার সংরক্ষিত অর্ডারের ভিত্তিতে' : 'Based on the orders saved to your account'}
          </p>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] self-start sm:self-auto">
          {(['3M', '6M', '1Y'] as const).map((rng) => (
            <button
              key={rng}
              type="button"
              onClick={() => setTimeRange(rng)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeRange === rng
                  ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] shadow-xs'
                  : 'text-[var(--pm-muted)] hover:text-[var(--pm-text)]'
              }`}
            >
              {rng === '3M' ? (isBn ? '৩ মাস' : '3 Months') : rng === '6M' ? (isBn ? '৬ মাস' : '6 Months') : (isBn ? '১ বছর' : '1 Year')}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--pm-card)] border border-[var(--pm-border)] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--pm-muted)]">
              {isBn ? 'অর্ডারের মোট মূল্য' : 'Total order value'}
            </span>
            <div className="p-2 rounded-xl bg-[var(--pm-accent-soft)] text-[var(--pm-accent)]">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-mono font-black text-[var(--pm-text)]">
            {currencySymbol}{totalSpend.toLocaleString()}
          </p>
          <span className="text-[10px] text-[var(--pm-success)] font-bold bg-[var(--pm-success-soft)] px-2 py-0.5 rounded-full inline-block">
            {isBn ? 'আপনার অর্ডার থেকে' : 'From your orders'}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--pm-card)] border border-[var(--pm-border)] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--pm-muted)]">
              {isBn ? 'অর্ডারের সংখ্যা' : 'Orders'}
            </span>
            <div className="p-2 rounded-xl bg-[var(--pm-success-soft)] text-[var(--pm-success)]">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-mono font-black text-[var(--pm-text)]">
            {totalOrderCount}
          </p>
          <span className="text-[10px] text-[var(--pm-accent)] font-bold bg-[var(--pm-accent-soft)] px-2 py-0.5 rounded-full inline-block">
            {isBn ? 'সংরক্ষিত অর্ডার' : 'Saved orders'}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--pm-card)] border border-[var(--pm-border)] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--pm-muted)]">
              {isBn ? 'গড় অর্ডার মূল্য' : 'Average Order Value'}
            </span>
            <div className="p-2 rounded-xl bg-[var(--pm-accent-soft)] text-[var(--pm-accent)]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-mono font-black text-[var(--pm-text)]">
            {currencySymbol}{avgOrderValue.toLocaleString()}
          </p>
          <span className="text-[10px] text-[var(--pm-accent)] font-bold bg-[var(--pm-accent-soft)] px-2 py-0.5 rounded-full inline-block">
            {isBn ? 'অর্ডারের মোট মূল্য ÷ অর্ডার' : 'Total order value ÷ orders'}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--pm-card)] border border-[var(--pm-border)] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--pm-muted)]">
              {isBn ? 'শীর্ষ ক্যাটাগরি' : 'Top Category Spend'}
            </span>
            <div className="p-2 rounded-xl bg-[var(--pm-warning-soft)] text-[var(--pm-warning)]">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-[var(--pm-text)] truncate">
            {topCategory?.name || (isBn ? 'কোনো অর্ডার নেই' : 'No orders yet')}
          </p>
          <span className="text-[10px] text-[var(--pm-warning)] font-bold bg-[var(--pm-warning-soft)] px-2 py-0.5 rounded-full inline-block">
            {currencySymbol}{(topCategory?.value || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1: Monthly Spending Curve (Area Chart) */}
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-[var(--pm-card)] border border-[var(--pm-border)] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-[var(--pm-text)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--pm-accent)]" />
                {isBn ? 'মাসিক খরচের ট্রেন্ড (টাকা)' : 'Monthly Expenditure Dynamics'}
              </h4>
              <p className="text-xs text-[var(--pm-muted)]">
                {isBn ? 'নির্বাচিত সময়ে প্রতি মাসের অর্ডার মূল্য' : 'Order totals for each month in the selected period'}
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold text-[var(--pm-muted)]">
              {currencySymbol} BDT
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            {hasOrdersInSelectedRange ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--pm-accent)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--pm-accent)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--pm-border)" />
                  <XAxis dataKey="month" stroke="var(--pm-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--pm-muted)" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--pm-card)',
                      borderColor: 'var(--pm-border)',
                      borderRadius: '16px',
                      color: 'var(--pm-text)',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                    }}
                    formatter={(value: any) => [`${currencySymbol}${value}`, isBn ? 'অর্ডারের মূল্য' : 'Order value']}
                  />
                  <Area type="monotone" dataKey="spend" name={isBn ? 'অর্ডারের মূল্য' : 'Order value'} stroke="var(--pm-accent)" strokeWidth={3} fillOpacity={1} fill="url(#spendGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div role="status" className="flex h-full items-center justify-center text-sm text-[var(--pm-muted)]">
                {totalOrderCount === 0
                  ? (isBn ? 'এখনও কোনো অর্ডার নেই। অর্ডার করলে এখানে দেখা যাবে।' : 'No orders yet. Your monthly totals will appear here after your first order.')
                  : (isBn ? 'নির্বাচিত সময়ে কোনো অর্ডার নেই।' : 'No orders in the selected period.')}
              </div>
            )}
          </div>
        </div>

        {/* CHART 2: Order Status Donut Chart */}
        <div className="lg:col-span-4 p-5 sm:p-6 rounded-3xl bg-[var(--pm-card)] border border-[var(--pm-border)] shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-black text-[var(--pm-text)] flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-[var(--pm-success)]" />
              {isBn ? 'অর্ডার স্ট্যাটাস অনুপাত' : 'Order Status Distribution'}
            </h4>
            <p className="text-xs text-[var(--pm-muted)]">
              {isBn ? 'ডেলিভার্ড, প্রসেসিং ও পেন্ডিং স্ট্যাটাস' : 'Breakdown of completed vs ongoing orders'}
            </p>
          </div>

          <div className="h-48 sm:h-52 w-full relative">
            {statusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--pm-card)',
                        borderColor: 'var(--pm-border)',
                        borderRadius: '12px',
                        color: 'var(--pm-text)',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-black text-[var(--pm-text)]">{totalOrderCount}</span>
                  <span className="text-[10px] text-[var(--pm-muted)] font-bold uppercase">{isBn ? 'অর্ডার' : 'Orders'}</span>
                </div>
              </>
            ) : (
              <div role="status" className="flex h-full items-center justify-center text-sm text-[var(--pm-muted)]">
                {isBn ? 'কোনো অর্ডার নেই' : 'No orders yet'}
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[var(--pm-border)]">
            {statusData.map((st) => (
              <div key={st.key} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.color }} />
                  <span className="text-[var(--pm-muted)] font-medium">{st.name}</span>
                </div>
                <span className="font-mono font-bold text-[var(--pm-text)]">{st.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 3: Category Spend Distribution (Bar Chart) */}
        <div className="lg:col-span-12 p-5 sm:p-6 rounded-3xl bg-[var(--pm-card)] border border-[var(--pm-border)] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-[var(--pm-text)] flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[var(--pm-accent)]" />
                {isBn ? 'ক্যাটাগরি ভিত্তিক খরচের পরিমাণ' : 'Category-Wise Expense Allocation'}
              </h4>
              <p className="text-xs text-[var(--pm-muted)]">
                {isBn ? 'আপনার অর্ডারের পণ্যের ক্যাটাগরি অনুযায়ী' : 'Based on item categories in your orders'}
              </p>
            </div>
          </div>

          <div className="h-56 sm:h-64 w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--pm-border)" />
                  <XAxis dataKey="name" stroke="var(--pm-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--pm-muted)" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--pm-card)',
                      borderColor: 'var(--pm-border)',
                      borderRadius: '16px',
                      color: 'var(--pm-text)',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${currencySymbol}${value}`, isBn ? 'মোট মূল্য' : 'Item value']}
                  />
                  <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-bar-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div role="status" className="flex h-full items-center justify-center text-sm text-[var(--pm-muted)]">
                {isBn ? 'ক্যাটাগরি দেখানোর মতো অর্ডার নেই' : 'Category totals will appear after your first order.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
