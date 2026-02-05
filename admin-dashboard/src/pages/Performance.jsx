import React, { useState, useEffect } from 'react';
import { getTelecallerSummary } from '../services/analyticsService';
import { RefreshCw } from 'lucide-react';
import { formatDuration } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TelecallerPerformance = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await getTelecallerSummary({});
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Telecaller Performance</h1>
                <button onClick={fetchData} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* Charts Row */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
                <h3 className="text-gray-700 font-semibold mb-6">Calls vs Complaints</h3>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                        data={data}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        barSize={40}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#ff8042" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="calls" name="Total Calls" fill="#8884d8" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="complaints" name="Complaints" fill="#ff8042" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-700">
                    Leaderboard
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Rank</th>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3 text-right">Calls</th>
                                <th className="px-6 py-3 text-right">Seconds</th>
                                <th className="px-6 py-3 text-right">Complaints</th>
                                <th className="px-6 py-3 text-right">Efficiency</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data
                                .sort((a, b) => b.calls - a.calls)
                                .map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 text-gray-400 font-medium">#{i + 1}</td>
                                        <td className="px-6 py-3 font-medium text-gray-900">{row.name}</td>
                                        <td className="px-6 py-3 text-right font-bold text-blue-600">{row.calls}</td>
                                        <td className="px-6 py-3 text-right text-gray-600">{formatDuration(row.totalCallDuration)}</td>
                                        <td className="px-6 py-3 text-right text-red-500">{row.complaints}</td>
                                        <td className="px-6 py-3 text-right text-gray-500">
                                            {row.calls > 0 ? (row.totalCallDuration / row.calls).toFixed(0) + 's/call' : '-'}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TelecallerPerformance;
