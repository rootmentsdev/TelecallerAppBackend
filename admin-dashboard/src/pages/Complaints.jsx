import React, { useState, useEffect } from 'react';
import { RefreshCw, Filter } from 'lucide-react';
import { getComplaintPivot } from '../services/analyticsService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Complaints = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
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
                groupBy: 'store,subCategory', // Default grouping
                store: filters.store || undefined,
                dateFrom: filters.dateFrom || undefined,
                dateTo: filters.dateTo || undefined
            };
            const result = await getComplaintPivot(params);
            setData(result.rows || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Complaints Analytics</h1>
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

            {/* Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Table View */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-700">
                        Detailed Breakdown
                    </div>
                    <div className="overflow-x-auto max-h-[500px]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0">
                                <tr>
                                    <th className="px-6 py-3">Store</th>
                                    <th className="px-6 py-3">Category</th>
                                    <th className="px-6 py-3 text-right">Count</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="3" className="p-4 text-center">Loading...</td></tr>
                                ) : data.length === 0 ? (
                                    <tr><td colSpan="3" className="p-4 text-center text-gray-400">No data found</td></tr>
                                ) : (
                                    data.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium text-gray-800">{row.store || 'Unknown'}</td>
                                            <td className="px-6 py-3 text-gray-600">{row.subCategory || 'General'}</td>
                                            <td className="px-6 py-3 text-right font-bold text-red-600">{row.count}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Chart View */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <h3 className="text-gray-700 font-semibold mb-6">Distribution by Category</h3>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={data}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="subCategory" hide />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" name="Complaints" fill="#8884d8">
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Complaints;
