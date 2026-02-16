import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Filter } from 'lucide-react';
import { getComplaintPivot } from '../services/analyticsService';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Distinct colors for pie slices (avoid similar shades)
const COLORS = [
    '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
    '#a855f7', '#06b6d4'
];

const Complaints = () => {
    const [loading, setLoading] = useState(false);
    const [rawData, setRawData] = useState([]);
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        store: ''
    });

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        setLoading(true);
        try {
            const params = {
                groupBy: 'store,subCategory', // Critical for pivot construction
                store: filters.store || undefined,
                dateFrom: filters.dateFrom || undefined,
                dateTo: filters.dateTo || undefined
            };
            const result = await getComplaintPivot(params);
            setRawData(result.rows || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- PIVOT LOGIC ---
    const { pivotData, columns, categories, grandTotal, categoryTotals } = useMemo(() => {
        if (!rawData.length) {
            return { pivotData: {}, columns: [], categories: [], grandTotal: 0, categoryTotals: [] };
        }

        const stores = new Set();
        const cats = new Set();
        const pivot = {}; // { "Category": { "Store": count } }
        const rowTotals = {}; // { "Category": count }
        const colTotals = {}; // { "Store": count }
        let total = 0;

        rawData.forEach(row => {
            const store = row.store || 'Unknown Store';
            const cat = row.subCategory || 'Uncategorized';
            const count = row.count || 0;

            stores.add(store);
            cats.add(cat);

            if (!pivot[cat]) pivot[cat] = {};
            pivot[cat][store] = (pivot[cat][store] || 0) + count;

            rowTotals[cat] = (rowTotals[cat] || 0) + count;
            colTotals[store] = (colTotals[store] || 0) + count;
            total += count;
        });

        // Convert Sets to sorted Arrays
        const sortedStores = Array.from(stores).sort();
        const sortedCats = Array.from(cats).sort();

        // Build chart data with percentages that sum to 100% (largest-remainder method)
        const categoryTotalsRaw = Object.entries(rowTotals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
        const chartTotal = categoryTotalsRaw.reduce((s, d) => s + d.value, 0);
        const categoryTotals = chartTotal === 0
            ? categoryTotalsRaw.map(d => ({ ...d, percent: 0 }))
            : (() => {
                const withFrac = categoryTotalsRaw.map(d => ({
                    ...d,
                    percentFrac: (d.value / chartTotal) * 100
                }));
                const rounded = withFrac.map(d => ({
                    ...d,
                    percent: Math.floor(d.percentFrac)
                }));
                let remainder = 100 - rounded.reduce((s, d) => s + d.percent, 0);
                const byRemainder = withFrac
                    .map((d, i) => ({ i, rem: d.percentFrac - Math.floor(d.percentFrac) }))
                    .sort((a, b) => b.rem - a.rem);
                for (let k = 0; remainder > 0 && k < byRemainder.length; k++) {
                    rounded[byRemainder[k].i].percent += 1;
                    remainder -= 1;
                }
                return rounded.map(({ name, value, percent }) => ({ name, value, percent }));
            })();

        return {
            pivotData: pivot,
            columns: sortedStores,
            categories: sortedCats,
            grandTotal: total,
            colTotals,
            rowTotals: rowTotals,
            categoryTotals
        };
    }, [rawData]);


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Complaints Pivot</h1>
                <button onClick={fetchComplaints} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
                    <input
                        type="date"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        value={filters.dateFrom}
                        onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value }))}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
                    <input
                        type="date"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        value={filters.dateTo}
                        onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value }))}
                    />
                </div>
                <button
                    onClick={fetchComplaints}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <Filter size={18} /> Apply
                </button>
            </div>

            {/* Pivot Table View */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-700 flex justify-between">
                    <span>Store Breakdown (Pivot)</span>
                    <span className="text-sm font-normal text-gray-500">Total: {grandTotal}</span>
                </div>

                <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 border-b border-r min-w-[200px] sticky left-0 bg-gray-50 z-20">Category \ Store</th>
                                {columns.map(store => (
                                    <th key={store} className="px-4 py-3 border-b text-center min-w-[120px] whitespace-nowrap">
                                        {store}
                                    </th>
                                ))}
                                <th className="px-4 py-3 border-b border-l font-bold text-center bg-gray-100">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={columns.length + 2} className="p-8 text-center text-gray-500">Loading matrix...</td></tr>
                            ) : categories.length === 0 ? (
                                <tr><td colSpan={columns.length + 2} className="p-8 text-center text-gray-400">No data found</td></tr>
                            ) : (
                                categories.map((cat, i) => (
                                    <tr key={cat} className="hover:bg-gray-50 group">
                                        <td className="px-4 py-3 border-r font-medium text-gray-800 sticky left-0 bg-white group-hover:bg-gray-50 border-gray-100">
                                            {cat}
                                        </td>
                                        {columns.map(store => {
                                            const val = pivotData[cat]?.[store] || 0;
                                            return (
                                                <td key={store} className={`px-4 py-3 text-center border-gray-50 ${val > 0 ? 'text-gray-900 font-medium' : 'text-gray-300'}`}>
                                                    {val > 0 ? val : '-'}
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-3 border-l font-bold text-center bg-gray-50 text-blue-600">
                                            {pivotData[cat] ? Object.values(pivotData[cat]).reduce((a, b) => a + b, 0) : 0}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                    </table>
                </div>
            </div>

            {/* Pie chart card: no horizontal scroll, bigger chart, vertical legend */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-x-hidden min-w-0">
                <h3 className="text-gray-700 font-semibold mb-2">Complaints by Category (Total)</h3>
                <p className="text-sm text-gray-500 mb-6">Total: {grandTotal} complaints · Percentages sum to 100%</p>
                <div className="min-h-[520px] w-full" style={{ maxWidth: '100%' }}>
                    <ResponsiveContainer width="100%" height={520}>
                        <PieChart margin={{ top: 20, right: 220, bottom: 20, left: 20 }}>
                            <Pie
                                data={categoryTotals}
                                cx="35%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={160}
                                paddingAngle={2}
                                dataKey="value"
                                label={({ percent }) => (percent > 0 ? `${percent}%` : '')}
                                labelLine={false}
                            >
                                {categoryTotals?.map((entry, index) => (
                                    <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} stroke="#fff" strokeWidth={1} />
                                ))}
                            </Pie>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm">
                                            <div className="font-medium text-gray-900">{d.name}</div>
                                            <div className="text-gray-600">{d.value} complaints · {d.percent}%</div>
                                        </div>
                                    );
                                }}
                            />
                            <Legend
                                layout="vertical"
                                align="right"
                                verticalAlign="middle"
                                wrapperStyle={{ paddingLeft: 24 }}
                                formatter={(value) => {
                                    const item = categoryTotals.find(c => c.name === value);
                                    const pct = item ? item.percent : 0;
                                    return <span className="text-sm text-gray-700">{value} ({pct}%)</span>;
                                }}
                                iconSize={10}
                                iconType="circle"
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Complaints;
