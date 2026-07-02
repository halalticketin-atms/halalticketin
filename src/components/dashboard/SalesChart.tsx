'use client';

import { useMemo } from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface WeeklySalesData {
    weekStart: string;
    ticketsSold: number;
    revenue: number;
}

interface SalesChartProps {
    data: WeeklySalesData[];
    currency: string;
}

const formatCurrency = (amount: number, currency: string) => {
    try {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
    } catch {
        return `£${amount.toFixed(0)}`;
    }
};

export function SalesChart({ data, currency }: SalesChartProps) {
    const chartData = useMemo(() => {
        const orderedData = data
            .map((week, index) => ({
                week,
                index,
                time: Date.parse(week.weekStart)
            }))
            .sort((a, b) => {
                const aValid = Number.isFinite(a.time);
                const bValid = Number.isFinite(b.time);
                if (aValid && bValid) {
                    return a.time - b.time;
                }
                if (aValid) return -1;
                if (bValid) return 1;
                return a.index - b.index;
            })
            .map(({ week }) => week);

        return orderedData.map((week, index) => {
            const date = new Date(week.weekStart);
            const weekLabel = `W${index + 1}`;
            const dateLabel = date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });

            return {
                week: weekLabel,
                dateLabel,
                sales: week.ticketsSold,
                revenue: week.revenue
            };
        });
    }, [data]);

    const maxSales = Math.max(...chartData.map(d => d.sales), 1);

    return (
        <div className="w-full mt-2">
            <div className="h-[160px] sm:h-[200px]">
                {/* initialDimension avoids the width(-1)/height(-1) warning while the
                    container is measured on first mount; the real size takes over after. */}
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height: 160 }}>
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                    // Reverse data to show oldest to newest (left to right) if not already
                    >
                        <defs>
                            {/* Gradient fill for area under line - brand colors (cyan to teal) */}
                            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="oklch(0.72 0.15 185)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="oklch(0.65 0.16 192)" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>

                        {/* Grid with subtle styling */}
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                            opacity={0.2}
                            vertical={false}
                        />

                        {/* X-axis - auto-thin labels so all weeks fit without horizontal scroll */}
                        <XAxis
                            dataKey="week"
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={{ stroke: 'oklch(0.72 0.15 185 / 0.2)', strokeWidth: 1 }}
                            tickLine={false}
                            interval="preserveStartEnd"
                            minTickGap={16}
                        />

                        {/* Y-axis */}
                        <YAxis
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, maxSales + 2]}
                            allowDecimals={false}
                            width={28}
                        />

                        {/* Tooltip */}
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg">
                                            <p className="text-xs font-medium text-muted-foreground mb-1">{data.dateLabel}</p>
                                            <p className="text-sm font-bold text-foreground">{data.sales} tickets</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(data.revenue, currency)}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                            cursor={{ stroke: 'oklch(0.72 0.15 185)', strokeWidth: 1, strokeDasharray: '5 5' }}
                        />

                        {/* Area fill */}
                        <Area
                            type="monotone"
                            dataKey="sales"
                            stroke="none"
                            fill="url(#salesGradient)"
                        />

                        {/* Line with dots */}
                        <Line
                            type="monotone"
                            dataKey="sales"
                            stroke="oklch(0.72 0.15 185)"
                            strokeWidth={2.5}
                            dot={{
                                fill: 'oklch(0.72 0.15 185)',
                                r: 4,
                                strokeWidth: 2,
                                stroke: 'hsl(var(--background))'
                            }}
                            activeDot={{
                                r: 6,
                                stroke: 'oklch(0.72 0.15 185)',
                                strokeWidth: 2,
                                fill: 'hsl(var(--background))'
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
