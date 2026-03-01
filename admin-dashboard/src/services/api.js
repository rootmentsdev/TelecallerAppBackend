import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://telecallerappbackend.onrender.com';
console.log("API Base URL:", BASE_URL);

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`; // Matches backend "protect" middleware
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle 401 (Token expiry)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Clear token and redirect to login if not already there
            localStorage.removeItem('adminToken');
            if (window.location.pathname !== '/admin/login') {
                window.location.href = '/admin/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
