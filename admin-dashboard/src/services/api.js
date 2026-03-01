import axios from 'axios';

const api = axios.create({
    baseURL: "https://telecallerappbackend.onrender.com/api",
    withCredentials: true
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

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
