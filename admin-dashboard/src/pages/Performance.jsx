import React, { useState, useEffect, useCallback } from 'react';
import { getTelecallerSummary } from '../services/analyticsService';
import { RefreshCw, Calendar } from 'lucide-react';
import { formatDuration } from '../utils/formatters';
import { getTodayRange, getWeeklyRange, getMonthlyRange } from '../utils/dateUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
const TelecallerPerformance = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [error, setError] = useState(null);

    // Default to Today
    const [activeFilter, setActiveFilter] = useState('today');
    const [dateRange, setDateRange] = useState(() => getTodayRange());

    const fetchData = useCallback(async () => {
        const range = dateRange ?? getTodayRange();
        const dateFrom = range.dateFrom ?? range.date_from;
        const dateTo = range.dateTo ?? range.date_to;
        if (!dateFrom || !dateTo) return;

        setLoading(true);
        setError(null);
        try {
            const params = { dateFrom, dateTo };
            const result = await getTelecallerSummary(params);

            const raw = result?.data;
            const arr = Array.isArray(raw) ? raw : [];
            const processed = arr.map((item) => {
                const totalCalls = Number(item.totalCalls) || 0;
                const totalCallDuration = Number(item.totalCallDuration) || 0;
                const totalComplaints = Number(item.totalComplaints) || 0;
                return {
                    ...item,
                    name: item?.telecaller?.name || 'Unknown',
                    calls: totalCalls,
                    complaints: totalComplaints,
                    totalCallDuration,
                    durationHours: parseFloat((totalCallDuration / 3600).toFixed(1))
                };
            });
            setData(processed);
        } catch (err) {
            console.error('Performance fetch error:', err);
            setError(err?.message || 'Failed to load data');
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFilterChange = (filterType) => {
        setActiveFilter(filterType);
        let newRange;
        switch (filterType) {
            case 'today':
                newRange = getTodayRange();
                break;
            case 'weekly':
                newRange = getWeeklyRange();
                break;
            case 'monthly':
                newRange = getMonthlyRange();
                break;
            default:
                return;
        }
        setDateRange(newRange);
    };

    const handleCustomDateChange = (field, value) => {
        setActiveFilter('custom');
        setDateRange(prev => ({ ...prev, [field]: value }));
    };

    const range = dateRange ?? getTodayRange();
    const dateFrom = range.dateFrom ?? range.date_from ?? '';
    const dateTo = range.dateTo ?? range.date_to ?? '';
    const chartData = Array.isArray(data) ? data : [];
    const sortedData = [...chartData].sort((a, b) => (b.calls ?? 0) - (a.calls ?? 0));

    return (
        <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold text-gray-800">Telecaller Performance</h1>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Time Toggles */}
                        <div className="bg-gray-100 p-1 rounded-lg flex text-sm">
                            {['today', 'weekly', 'monthly'].map((filter) => (
                                <button
                                    key={filter}
                                    type="button"
                                    onClick={() => handleFilterChange(filter)}
                                    disabled={loading}
                                    className={`px-3 py-1.5 rounded-md capitalize transition-all ${activeFilter === filter
                                        ? 'bg-white text-blue-600 shadow-sm font-medium'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>

                        {/* Custom Date Inputs */}
                        <div className={`flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border transition-colors ${activeFilter === 'custom' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
                            }`}>
                            <Calendar size={16} className="text-gray-400" />
                            <input
                                type="date"
                                className="text-sm border-none outline-none text-gray-600 w-32"
                                value={dateFrom}
                                onChange={(e) => handleCustomDateChange('dateFrom', e.target.value)}
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                className="text-sm border-none outline-none text-gray-600 w-32"
                                value={dateTo}
                                onChange={(e) => handleCustomDateChange('dateTo', e.target.value)}
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => fetchData()}
                            disabled={loading}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-50"
                            title="Refresh Data"
                        >
                            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {/* Charts Row */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-gray-700 font-semibold">Calls vs Complaints</h3>
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                            {dateFrom} to {dateTo}
                        </span>
                    </div>

                    {loading ? (
                        <div className="h-[300px] flex items-center justify-center text-gray-400">
                            Loading performance data...
                        </div>
                    ) : chartData.length === 0 ? (
                        <div className="h-[300px] flex items-center justify-center text-gray-400">
                            No performance data for this period
                        </div>
                    ) : (
                        <div className="w-full" style={{ minWidth: 300, height: 350 }}>
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart
                                    key={activeFilter}
                                    data={chartData}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    barSize={40}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                    <YAxis yAxisId="right" orientation="right" stroke="#ff8042" />
                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="calls" name="Total Calls" fill="#8884d8" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="complaints" name="Complaints" fill="#ff8042" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Leaderboard Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-700 flex justify-between items-center">
                        <span>Leaderboard</span>
                        <span className="text-xs font-normal text-gray-500">Ranked by Total Calls</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Rank</th>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3 text-right">Calls</th>
                                    <th className="px-6 py-3 text-right">Duration</th>
                                    <th className="px-6 py-3 text-right">Complaints</th>
                                    <th className="px-6 py-3 text-right">Efficiency</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sortedData.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-400">No data found</td>
                                    </tr>
                                ) : (
                                    sortedData.map((row, i) => (
                                        <tr key={row.telecaller?.id ?? row.name ?? i} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 text-gray-400 font-medium">#{i + 1}</td>
                                            <td className="px-6 py-3 font-medium text-gray-900">
                                                {row.name ?? 'Unknown'}
                                                <span className="block text-xs text-gray-400 font-normal">{row.telecaller?.employeeId ?? ''}</span>
                                            </td>
                                            <td className="px-6 py-3 text-right font-bold text-blue-600">{row.calls ?? 0}</td>
                                            <td className="px-6 py-3 text-right text-gray-600">{formatDuration(row.totalCallDuration)}</td>
                                            <td className="px-6 py-3 text-right text-red-500">{row.complaints ?? 0}</td>
                                            <td className="px-6 py-3 text-right text-gray-500">
                                                {(row.calls ?? 0) > 0 ? Math.round((row.totalCallDuration ?? 0) / row.calls) + 's/call' : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
    );
};

export default TelecallerPerformance;
