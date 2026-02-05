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
