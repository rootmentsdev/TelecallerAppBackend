import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Filter } from 'lucide-react';
import { getComplaintPivot } from '../services/analyticsService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

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
            return { pivotData: {}, columns: [], categories: [], grandTotal: 0, categoryTotals: {} };
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

        return {
            pivotData: pivot,
            columns: sortedStores,
            categories: sortedCats,
            grandTotal: total,
            colTotals,
            rowTotals: rowTotals,
            categoryTotals: Object.entries(rowTotals).map(([name, value]) => ({ name, value })) // For chart
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
                        {/* Grand Total Footer Row */}
                        {!loading && categories.length > 0 && (
                            <tfoot className="bg-gray-100 text-gray-700 font-bold sticky bottom-0 z-10">
                                <tr>
                                    <td className="px-4 py-3 border-r sticky left-0 bg-gray-100 z-20">Grand Total</td>
                                    {columns.map(store => {
                                        // Calculate column sum
                                        let colSum = 0;
                                        categories.forEach(cat => {
                                            colSum += pivotData[cat]?.[store] || 0;
                                        });
                                        return (
                                            <td key={store} className="px-4 py-3 text-center">
                                                {colSum}
                                            </td>
                                        );
                                    })}
                                    <td className="px-4 py-3 border-l text-center text-blue-700">{grandTotal}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Category Chart (Below Table) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-gray-700 font-semibold mb-6">Complaints by Category (Total)</h3>
                <div className="min-h-[300px]">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={categoryTotals}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" name="Complaints" fill="#8884d8">
                                {categoryTotals?.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Complaints;
