export const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};

export const getTodayRange = () => {
    const today = new Date();
    const str = formatDate(today);
    return { dateFrom: str, dateTo: str };
};

// Last 7 days including today
export const getWeeklyRange = () => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 6); // Today + 6 days back = 7 days

    return {
        dateFrom: formatDate(lastWeek),
        dateTo: formatDate(today)
    };
};

// Last 30 days including today
export const getMonthlyRange = () => {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setDate(today.getDate() - 29); // Today + 29 days back = 30 days

    return {
        dateFrom: formatDate(lastMonth),
        dateTo: formatDate(today)
    };
};
