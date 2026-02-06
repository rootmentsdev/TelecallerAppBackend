import React, { useEffect, useState, useMemo } from 'react';
import { Phone, CheckCircle, Clock, AlertOctagon, RefreshCw } from 'lucide-react';
import { nFormatter, formatDuration } from '../utils/formatters';
import { getTelecallerSummary } from '../services/analyticsService';

const KpiCard = ({ title, value, subtext, icon: Icon, colorClass }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
        <div>
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            {subtext && <p className="text-xs text-text-400 mt-2">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClass}`}>
            <Icon size={24} className="opacity-80" />
        </div>
    </div>
);

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [summaryData, setSummaryData] = useState([]);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: ''
    });

    useEffect(() => {
        fetchData();
    }, [filters]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                dateFrom: filters.dateFrom || undefined,
                dateTo: filters.dateTo || undefined
            };
            const result = await getTelecallerSummary(params);
            setSummaryData(result.data || []);
        } catch (err) {
            console.error(err);
            setError("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const handleToday = () => {
        const today = new Date().toISOString().split('T')[0];
        setFilters({
            dateFrom: today,
            dateTo: today
        });
    };

    // Aggregate metrics on frontend from the telecaller summary
    const stats = useMemo(() => {
        return summaryData.reduce((acc, curr) => ({
            totalCalls: acc.totalCalls + (curr.totalCalls || 0),
            totalDuration: acc.totalDuration + (curr.totalCallDuration || 0), // Fix: use totalCallDuration
            totalComplaints: acc.totalComplaints + (curr.totalComplaints || 0)
        }), { totalCalls: 0, totalDuration: 0, totalComplaints: 0 });
    }, [summaryData]);

    if (loading) return <div className="p-10 text-center text-gray-500">Loading metrics...</div>;
    if (error) return (
        <div className="p-10 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={fetchData} className="px-4 py-2 bg-blue-50 text-blue-600 rounded">Retry</button>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleToday}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filters.dateFrom === new Date().toISOString().split('T')[0] &&
                                filters.dateTo === new Date().toISOString().split('T')[0]
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-transparent text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        Today
                    </button>
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-gray-200">
                        <input
                            type="date"
                            className="text-sm border-none outline-none text-gray-600"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            className="text-sm border-none outline-none text-gray-600"
                            value={filters.dateTo}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                        />
                    </div>
                    <button onClick={fetchData} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                    title="Total Calls"
                    value={nFormatter(stats.totalCalls, 1)}
                    icon={Phone}
                    colorClass="bg-blue-50 text-blue-600"
                />

                {/* Note: 'Completed' isn't explicitly in summary yet, showing duration instead for now */}
                <KpiCard
                    title="Total Duration"
                    value={formatDuration(stats.totalDuration)}
                    icon={Clock}
                    colorClass="bg-purple-50 text-purple-600"
                />

                <KpiCard
                    title="Avg Call Duration"
                    value={stats.totalCalls > 0 ? formatDuration(stats.totalDuration / stats.totalCalls) : "0s"}
                    icon={CheckCircle}
                    colorClass="bg-green-50 text-green-600"
                />

                <KpiCard
                    title="Complaints"
                    value={stats.totalComplaints}
                    icon={AlertOctagon}
                    colorClass="bg-red-50 text-red-600"
                />
            </div>

            {/* Simple Telecaller Table Preview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-700">
                    Telecaller Performance
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Telecaller</th>
                                <th className="px-6 py-3 text-right">Calls</th>
                                <th className="px-6 py-3 text-right">Duration</th>
                                <th className="px-6 py-3 text-right">Complaints</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {summaryData.map((row, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 font-medium text-gray-900">
                                        {row.telecaller?.name || 'Unknown'}
                                        <span className="block text-xs text-gray-400 font-normal">{row.telecaller?.employeeId}</span>
                                    </td>
                                    <td className="px-6 py-3 text-right">{row.totalCalls}</td>
                                    <td className="px-6 py-3 text-right">{formatDuration(row.totalCallDuration || 0)}</td>
                                    <td className="px-6 py-3 text-right text-red-600">{row.totalComplaints}</td>
                                </tr>
                            ))}
                            {summaryData.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400">No data found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
