import React, { useState, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, Filter, RefreshCw } from 'lucide-react';
import { getReports, getReportFilters } from '../services/analyticsService';
import { formatDuration } from '../utils/formatters';

const Reports = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: 50, total: 0, pages: 1 });

    // Filter Options State
    const [telecallerOptions, setTelecallerOptions] = useState([]);
    const [storeOptions, setStoreOptions] = useState([]);
    const [refundStatusOptions, setRefundStatusOptions] = useState([]);
    const [filtersLoading, setFiltersLoading] = useState(false);

    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        store: '',
        telecaller: '', // Stores EmpId
        leadType: '',
        refundStatus: ''
    });

    useEffect(() => {
        // Fetch metadata for filters on mount
        const loadFilters = async () => {
            setFiltersLoading(true);
            try {
                const { telecallers, stores, refundStatuses } = await getReportFilters();
                setTelecallerOptions(telecallers || []);
                setStoreOptions(stores || []);
                setRefundStatusOptions(refundStatuses || []);
            } catch (err) {
                console.error("Failed to load report filters", err);
            } finally {
                setFiltersLoading(false);
            }
        };
        loadFilters();
    }, []);

    useEffect(() => {
        fetchReports();
    }, [meta.page]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const params = {
                page: meta.page,
                limit: meta.limit,
                store: filters.store || undefined,
                dateFrom: filters.dateFrom || undefined,
                dateTo: filters.dateTo || undefined,
                telecaller: filters.telecaller || undefined, // Send EmpId
                leadType: filters.leadType || undefined,
                refund_status: filters.leadType === 'return' && filters.refundStatus ? filters.refundStatus : undefined,
                dateField: 'createdAt' // Forces filtering by createdAt as requested
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

    const handleApplyFilters = () => {
        setMeta(prev => ({ ...prev, page: 1 })); // Reset to page 1
        fetchReports();
    };

    const handleResetAndFetch = async () => {
        const emptyFilters = { dateFrom: '', dateTo: '', store: '', telecaller: '', leadType: '', refundStatus: '' };
        setFilters(emptyFilters);
        setMeta(prev => ({ ...prev, page: 1 }));
        setLoading(true);
        try {
            const params = {
                page: 1,
                limit: meta.limit,
                dateField: 'createdAt'
            };
            const result = await getReports(params);
            setData(result.rows || []);
            setMeta(prev => ({ ...prev, ...result.meta }));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const headers = ["Created Date", "Store", "Lead Name", "Phone", "Created By", "Duration", "Lead Type", "Refund Status", "Note"];
        const csvContent = [
            headers.join(","),
            ...data.map(row => [
                new Date(row.createdAt).toLocaleDateString(),
                `"${row.store || ''}"`,
                `"${row.leadName || ''}"`,
                `"${row.phone || ''}"`,
                `"${row.createdByName || ''}"`,   // Created By
                row.callDuration,
                `"${row.leadType || row.lead_type || ''}"`,
                (row.leadType || row.lead_type) === 'return' ? `"${row.refund_status || ''}"` : '"-"',
                `"${row.remarks || ''}"`
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
                <div className='flex gap-2'>
                    <button
                        onClick={handleResetAndFetch}
                        className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <RefreshCw size={18} />
                        Reset
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
                    <input
                        type="date"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.dateFrom}
                        onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
                    <input
                        type="date"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.dateTo}
                        onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    />
                </div>

                {/* Store Filter */}
                <div className="min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Store</label>
                    <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.store}
                        onChange={e => setFilters(prev => ({ ...prev, store: e.target.value }))}
                        disabled={filtersLoading}
                    >
                        <option value="">All Stores</option>
                        {storeOptions.map(store => (
                            <option key={store} value={store}>
                                {store}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Lead Type Filter - NEW */}
                <div className="min-w-[150px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Lead Type</label>
                    <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.leadType}
                        onChange={e => setFilters(prev => ({ ...prev, leadType: e.target.value, refundStatus: e.target.value !== 'return' ? '' : prev.refundStatus }))}
                    >
                        <option value="">All Types</option>
                        <option value="enquiry">Enquiry</option>
                        <option value="booked">Booked</option>
                        <option value="return">Return</option>
                    </select>
                </div>

                {/* Refund Status Filter - only when leadType = return */}
                {filters.leadType === 'return' && (
                    <div className="min-w-[150px]">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Refund Status</label>
                        <select
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={filters.refundStatus}
                            onChange={e => setFilters(prev => ({ ...prev, refundStatus: e.target.value }))}
                        >
                            <option value="">All</option>
                            {refundStatusOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Telecaller Filter */}
                <div className="min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Telecaller (Creator)</label>
                    <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.telecaller}
                        onChange={e => setFilters(prev => ({ ...prev, telecaller: e.target.value }))}
                        disabled={filtersLoading}
                    >
                        <option value="">All Telecallers</option>
                        {telecallerOptions.map(t => (
                            <option key={t.empId} value={t.empId}>
                                {t.name} ({t.empId})
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleApplyFilters}
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
                                <th className="px-6 py-4">Created Date</th>
                                <th className="px-6 py-4">Store</th>
                                <th className="px-6 py-4">Lead Name</th>
                                <th className="px-6 py-4">Phone</th>
                                <th className="px-6 py-4">Created By</th>
                                <th className="px-6 py-4">Duration</th>
                                <th className="px-6 py-4">Lead Type</th>
                                <th className="px-6 py-4">Refund Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">Loading reports...</td></tr>
                            ) : data.length === 0 ? (
                                <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">No reports found</td></tr>
                            ) : (
                                data.map((row, i) => (
                                    <tr key={row.reportId || i} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                            {new Date(row.createdAt).toLocaleDateString()}
                                            <span className="block text-xs text-gray-400">{new Date(row.createdAt).toLocaleTimeString()}</span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{row.store}</td>
                                        <td className="px-6 py-4 text-gray-900">{row.leadName}</td>
                                        <td className="px-6 py-4 text-gray-600">{row.phone}</td>

                                        {/* Created By */}
                                        <td className="px-6 py-4 text-gray-600">
                                            {row.createdByName ? (
                                                <>
                                                    {row.createdByName}
                                                    <span className="block text-xs text-gray-400">({row.createdByEmpId})</span>
                                                </>
                                            ) : '-'}
                                        </td>

                                        <td className="px-6 py-4 text-gray-600">{formatDuration(row.callDuration)}</td>

                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 capitalize">
                                                {row.leadType || row.lead_type || '-'}
                                            </span>
                                        </td>

                                        {/* Refund Status: only meaningful for return type */}
                                        <td className="px-6 py-4 text-gray-600">
                                            {(row.leadType || row.lead_type) === 'return' ? (row.refund_status || '-') : '-'}
                                        </td>
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
