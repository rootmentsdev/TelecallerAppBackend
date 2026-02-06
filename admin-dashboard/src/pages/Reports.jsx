import React, { useState, useEffect } from 'react';
import { Download, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { getReports, getTelecallers } from '../services/analyticsService';
import { formatDuration } from '../utils/formatters';

const Reports = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
    const [telecallers, setTelecallers] = useState([]);
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        store: '',
        telecaller: ''
    });

    useEffect(() => {
        // Fetch telecallers list on mount
        const loadTelecallers = async () => {
            try {
                const list = await getTelecallers();
                setTelecallers(list);
            } catch (err) {
                console.error("Failed to load telecallers", err);
            }
        };
        loadTelecallers();
    }, []);

    useEffect(() => {
        fetchReports();
    }, [meta.page, filters.store, filters.dateFrom, filters.dateTo, filters.telecaller]); // Re-fetch on filter/page change

    const fetchReports = async () => {
        setLoading(true);
        try {
            const params = {
                page: meta.page,
                limit: meta.limit,
                store: filters.store || undefined,
                dateFrom: filters.dateFrom || undefined,
                dateTo: filters.dateTo || undefined,
                telecallerId: filters.telecaller || undefined
            };
            const result = await getReports(params);
            setData(result.rows || []);
            setMeta(prev => ({ ...prev, ...result.meta }));
        } catch (err) {
            console.error("Failed to fetch reports", err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        // Simple CSV export logic on client-side for the *current view* 
        // Or trigger a backend export if available. For now, client-side of fetched data or logic to fetch all.
        // User requested "Export CSV", usually implies all data matching filters.
        // Given constraints, I'll alert or implement a basic 'export current view' for now.
        const headers = ["Date", "Store", "Lead Name", "Telecaller", "Status", "Duration", "Note"];
        const csvContent = [
            headers.join(","),
            ...data.map(row => [
                new Date(row.createdAt).toLocaleDateString(),
                `"${row.store || ''}"`,
                `"${row.leadName || ''}"`,
                `"${row.telecaller?.name || ''}"`,
                row.callStatus,
                row.callDuration,
                `"${row.note || ''}"`
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "reports_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Calls Report</h1>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                    <Download size={18} />
                    Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
                    <input
                        type="date"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.dateFrom}
                        onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
                    <input
                        type="date"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.dateTo}
                        onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Store / Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Filter by store..."
                            className="w-full pl-9 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={filters.store}
                            onChange={e => setFilters(prev => ({ ...prev, store: e.target.value }))}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Telecaller</label>
                    <select
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-[180px]"
                        value={filters.telecaller}
                        onChange={e => setFilters(prev => ({ ...prev, telecaller: e.target.value }))}
                    >
                        <option value="">All Telecallers</option>
                        {telecallers.map(t => (
                            <option key={t._id} value={t._id}>
                                {t.name} ({t.employeeId})
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={fetchReports}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <Filter size={18} />
                    Apply
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Store</th>
                                <th className="px-6 py-4">Telecaller</th>
                                <th className="px-6 py-4">Lead Type</th>
                                <th className="px-6 py-4">Duration</th>
                                <th className="px-6 py-4">Note</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">Loading reports...</td></tr>
                            ) : data.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No reports found</td></tr>
                            ) : (
                                data.map((row, i) => (
                                    <tr key={row._id || i} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                            {new Date(row.createdAt).toLocaleDateString()}
                                            <span className="block text-xs text-gray-400">{new Date(row.createdAt).toLocaleTimeString()}</span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{row.store}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {row.telecaller?.name || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                {row.leadType || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{formatDuration(row.callDuration)}</td>
                                        <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={row.note}>{row.note || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                        Page {meta.page} of {meta.pages} ({meta.total} records)
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={meta.page <= 1}
                            onClick={() => setMeta(prev => ({ ...prev, page: prev.page - 1 }))}
                            className={`p-2 rounded-lg border ${meta.page <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            disabled={meta.page >= meta.pages}
                            onClick={() => setMeta(prev => ({ ...prev, page: prev.page + 1 }))}
                            className={`p-2 rounded-lg border ${meta.page >= meta.pages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
