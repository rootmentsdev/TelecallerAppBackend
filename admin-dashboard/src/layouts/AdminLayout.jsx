import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    AlertOctagon,
    PhoneCall,
    TrendingUp,
    LogOut,
    Menu,
    X,
    User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

const SidebarItem = ({ to, icon: Icon, label, collapsed }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors mb-1",
                isActive
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )
        }
    >
        <Icon size={20} />
        {!collapsed && <span>{label}</span>}
    </NavLink>
);

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    // Close mobile menu on route change logic could go here

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
                    mobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
                    collapsed ? "lg:w-16" : "lg:w-64"
                )}
            >
                <div className="h-16 flex items-center px-4 border-b border-gray-100">
                    {/* Logo / Brand */}
                    <div className="flex items-center gap-2 font-bold text-xl text-gray-800 overflow-hidden whitespace-nowrap">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            A
                        </div>
                        {!collapsed && <span>Admin</span>}
                    </div>

                    {/* Mobile Close */}
                    <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden ml-auto p-1 text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 p-3 overflow-y-auto">
                    <div className="space-y-1">
                        <SidebarItem to="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />
                        <SidebarItem to="/admin/reports" icon={FileText} label="Reports" collapsed={collapsed} />
                        <SidebarItem to="/admin/complaints" icon={AlertOctagon} label="Complaints" collapsed={collapsed} />
                        <SidebarItem to="/admin/telecaller-performance" icon={TrendingUp} label="Performance" collapsed={collapsed} />
                    </div>
                </nav>

                <div className="p-3 border-t border-gray-100">
                    <button
                        onClick={logout}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors",
                            collapsed && "justify-center"
                        )}
                    >
                        <LogOut size={20} />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className={cn(
                "flex-1 flex flex-col min-h-screen transition-all duration-300",
                collapsed ? "lg:ml-16" : "lg:ml-64"
            )}>
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            <Menu size={20} />
                        </button>

                        {/* Desktop Collapse Toggle (Optional, usually implied or explicit) */}
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="hidden lg:flex p-1.5 text-gray-400 hover:bg-gray-100 rounded-md hover:text-gray-600"
                        >
                            <Menu size={18} />
                        </button>

                        <h2 className="text-lg font-semibold text-gray-800 hidden sm:block">
                            {/* Could be dynamic breadcrumb */}
                            Overview
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* User Profile */}
                        <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-gray-900">{user?.username || 'Admin'}</p>
                                <p className="text-xs text-gray-500">{user?.role || 'Logged In'}</p>
                            </div>
                            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                <User size={20} />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 p-4 sm:p-6 overflow-x-hidden">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
