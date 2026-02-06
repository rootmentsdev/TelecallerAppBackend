import api from './api';

export const getTelecallerSummary = async (params) => {
    // params: { dateFrom, dateTo, store }
    const response = await api.get('/admin/telecaller-summary', { params });
    return response.data; // { data: [...] }
};

export const getReports = async (params) => {
    const response = await api.get('/admin/reports', { params });
    return response.data; // { meta: {..}, rows: [...] }
};

export const getComplaintPivot = async (params) => {
    const response = await api.get('/admin/complaints/pivot', { params });
    return response.data; // { meta: {..}, rows: [...] }
};

export const getTelecallers = async () => {
    // Fetch users with role "telecaller" (or let UI decide if they want team leads too)
    // For now, fetching "telecaller" role specifically.
    // If we want both, we can make two calls or remove role param to get all users.
    // Let's modify backend to allow multiple roles or just fetch 'telecaller' for now as requested.
    const response = await api.get('/admin/users', { params: { role: 'telecaller' } });
    return response.data; // [ { _id, name, ... }, ... ]
};
