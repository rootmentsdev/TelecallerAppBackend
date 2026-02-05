import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, isAuthenticated, logout as performLogout } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage on mount
        const storedUser = getCurrentUser();
        if (storedUser && isAuthenticated()) {
            setUser(storedUser);
        }
        setLoading(false);
    }, []);

    const loginHelper = (userData) => {
        setUser(userData);
    };

    const logoutHelper = () => {
        performLogout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login: loginHelper, logout: logoutHelper, loading, isAuthenticated: isAuthenticated() }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
