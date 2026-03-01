import api from './api';

export const login = async (username, password) => {
    // Call separate Admin Authentication Route
    const response = await api.post('https://telecallerappbackend.onrender.com/admin/auth/login', { username, password });

    // Response structure from adminAuth is { success: true, token, user: { username, role } }
    const { token, user } = response.data;

    // Redundant safety check (backend already validates this)
    if (user.role !== 'admin') {
        throw new Error('Access denied: Admins only');
    }

    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(user));
    return user;
};

export const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/admin/login';
};

export const getCurrentUser = () => {
    const userStr = localStorage.getItem('adminUser');
    if (!userStr) return null;
    return JSON.parse(userStr);
};

export const isAuthenticated = () => {
    return !!localStorage.getItem('adminToken');
};
