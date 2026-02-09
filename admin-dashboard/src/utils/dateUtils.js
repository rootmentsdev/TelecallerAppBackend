export const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};

export const getTodayRange = () => {
    const today = new Date();
    const str = formatDate(today);
    return { dateFrom: str, dateTo: str };
};

export const getWeeklyRange = () => {
    const today = new Date();
    const day = today.getDay(); // 0 (Sun) to 6 (Sat)
    // Start of week (Monday)
    // If today is Sunday (0), Monday is -6 days away. If Mon (1), 0 days away.
    // Logic: diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);

    return {
        dateFrom: formatDate(monday),
        dateTo: formatDate(today)
    };
};

export const getMonthlyRange = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    return {
        dateFrom: formatDate(firstDay),
        dateTo: formatDate(today)
    };
};
