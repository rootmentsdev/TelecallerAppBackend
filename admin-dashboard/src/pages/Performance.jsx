import React, { useState, useEffect } from 'react';
import { getTelecallerSummary } from '../services/analyticsService';
import { RefreshCw, Calendar } from 'lucide-react';
import { formatDuration } from '../utils/formatters';
import { getTodayRange, getWeeklyRange, getMonthlyRange } from '../utils/dateUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TelecallerPerformance = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);

    // Default to Today
    const [activeFilter, setActiveFilter] = useState('today');
    const [dateRange, setDateRange] = useState(getTodayRange());

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {
                dateFrom: dateRange.dateFrom,
                dateTo: dateRange.dateTo
            };
            const result = await getTelecallerSummary(params);

            // Transform for charts: flatten nested objects if necessary or ensuring names are present
            const processed = (result.data || []).map(item => ({
                ...item,
                name: item.telecaller?.name || 'Unknown',
                calls: item.totalCalls,
                complaints: item.totalComplaints,
                durationHours: parseFloat((item.totalCallDuration / 3600).toFixed(1))
            }));
            setData(processed);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (filterType) => {
        setActiveFilter(filterType);
        let newRange;
        switch (filterType) {
            case 'today':
                newRange = getTodayRange();
                break;
            case 'weekly':
                newRange = getWeeklyRange(); // Mon -> Today
                break;
            case 'monthly':
                newRange = getMonthlyRange(); // 1st -> Today
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
                                onClick={() => handleFilterChange(filter)}
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
                            value={dateRange.dateFrom}
                            onChange={(e) => handleCustomDateChange('dateFrom', e.target.value)}
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            className="text-sm border-none outline-none text-gray-600 w-32"
                            value={dateRange.dateTo}
                            onChange={(e) => handleCustomDateChange('dateTo', e.target.value)}
                        />
                    </div>

                    <button
                        onClick={fetchData}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors bg-white border border-gray-200 rounded-lg shadow-sm"
                        title="Refresh Data"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Charts Row */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-gray-700 font-semibold">Calls vs Complaints</h3>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                        {dateRange.dateFrom} to {dateRange.dateTo}
                    </span>
                </div>

                {loading ? (
                    <div className="h-[300px] flex items-center justify-center text-gray-400">
                        Loading performance data...
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-gray-400">
                        No performance data for this period
                    </div>
                ) : (
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                            <BarChart
                                data={data}
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
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">No data found</td>
                                </tr>
                            ) : (
                                data
                                    .sort((a, b) => b.calls - a.calls)
                                    .map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 text-gray-400 font-medium">#{i + 1}</td>
                                            <td className="px-6 py-3 font-medium text-gray-900">
                                                {row.name}
                                                <span className="block text-xs text-gray-400 font-normal">{row.telecaller?.employeeId}</span>
                                            </td>
                                            <td className="px-6 py-3 text-right font-bold text-blue-600">{row.calls}</td>
                                            <td className="px-6 py-3 text-right text-gray-600">{formatDuration(row.totalCallDuration)}</td>
                                            <td className="px-6 py-3 text-right text-red-500">{row.complaints}</td>
                                            <td className="px-6 py-3 text-right text-gray-500">
                                                {row.calls > 0 ? (row.totalCallDuration / row.calls).toFixed(0) + 's/call' : '-'}
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
