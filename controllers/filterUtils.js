import mongoose from 'mongoose';

/* ----------------------------------------
   DATE PARSING (UNCHANGED)
----------------------------------------- */
export const parseQueryDate = (dateStr) => {
    if (!dateStr) return null;

    const parts = dateStr.split('-');
    if (parts.length === 3) {
        if (parts[0].length === 4) {
            return {
                year: parseInt(parts[0], 10),
                month: parseInt(parts[1], 10) - 1,
                day: parseInt(parts[2], 10)
            };
        }
        if (parts[2].length === 4) {
            return {
                year: parseInt(parts[2], 10),
                month: parseInt(parts[1], 10) - 1,
                day: parseInt(parts[0], 10)
            };
        }
    }

    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        return {
            year: d.getUTCFullYear(),
            month: d.getUTCMonth(),
            day: d.getUTCDate()
        };
    }
    return null;
};

/* ----------------------------------------
   QUERY NORMALIZATION (UNCHANGED)
----------------------------------------- */
export const normalizeQueryParams = (query, aliases = {}) => {
    const normalized = { ...query };
    const defaultAliases = {
        'lead_type': 'leadType',
        'call_status': 'callStatus',
        'lead_status': 'leadStatus',
        'enquiry_date_from': 'enquiryDateFrom',
        'enquiry_date_to': 'enquiryDateTo',
        'function_date_from': 'functionDateFrom',
        'function_date_to': 'functionDateTo',
        'visit_date_from': 'visitDateFrom',
        'visit_date_to': 'visitDateTo',
        'created_at_from': 'createdAtFrom',
        'created_at_to': 'createdAtTo',
        'date_from': 'dateFrom',
        'date_to': 'dateTo',
        'date_field': 'dateField',
        'sort_by': 'sortBy',
        'sort_order': 'sortOrder'
    };

    const finalAliases = { ...defaultAliases, ...aliases };

    Object.keys(finalAliases).forEach(snakeKey => {
        const camelKey = finalAliases[snakeKey];
        if (normalized[snakeKey] !== undefined && normalized[camelKey] === undefined) {
            normalized[camelKey] = normalized[snakeKey];
        }
    });

    return normalized;
};

/* ----------------------------------------
   STORE FILTER (FINAL, FIXED)
----------------------------------------- */
export const buildStoreFilter = (storeQuery) => {
    if (!storeQuery) return null;

    const lowerQuery = storeQuery.toLowerCase();

    /* -------------------------------
       BRAND VARIANTS
    -------------------------------- */
    const getBrandVariants = (text) => {
        const lower = text.toLowerCase();
        if (lower === 'sg' || lower === 'suitor guy' || lower === 'suitorguy') {
            return ['Suitor Guy', 'SG'];
        }
        if (lower === 'z' || lower.includes('zorucci') || lower.includes('zurocci')) {
            return ['Zorucci', 'Zurocci', 'Z'];
        }
        return [text];
    };

    /* -------------------------------
       LOCATION VARIANTS (STRICT)
    -------------------------------- */
    const getLocationVariant = (text) => {
        const lower = text.toLowerCase();

        // 🔒 ABSOLUTE SEPARATION
        if (lower === 'edappal') return 'EDAPPAL';
        if (lower === 'edappally' || lower === 'edapally') return 'EDAPPALLY';

        if (lower.includes('kottakkal') || lower.includes('kottakal')) return 'KOTTAKKAL';
        if (lower.includes('manjeri') || lower.includes('manjery')) return 'MANJERI';
        if (lower.includes('perinthalmanna') || lower === 'pmna') return 'PMNA';
        if (lower.includes('trivandrum') || lower === 'tvm') return 'TVM';
        if (lower.includes('vadakara') || lower.includes('vatakara')) return 'VADAKARA';
        if (lower.includes('calicut') || lower.includes('kozhikode')) return 'CALICUT';

        return text;
    };

    /* -------------------------------
       LOCATION REGEX (STRICT)
    -------------------------------- */
    const buildLocationRegex = (locationKey) => {
        switch (locationKey) {
            case 'EDAPPAL':
                return /(^|[^a-zA-Z])Edappal([^a-zA-Z]|$)/i;
            case 'EDAPPALLY':
                return /(^|[^a-zA-Z])Edappally([^a-zA-Z]|$)/i;
            case 'KOTTAKKAL':
                return /Kottakkal|Kottakal/i;
            case 'MANJERI':
                return /Manjeri/i;
            case 'PMNA':
                return /Perinthalmanna|PMNA/i;
            case 'TVM':
                return /Trivandrum|Thiruvananthapuram|TVM/i;
            case 'VADAKARA':
                return /Vadakara|Vatakara/i;
            case 'CALICUT':
                return /Calicut|Kozhikode/i;
            default:
                return new RegExp(locationKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        }
    };

    /* -------------------------------
       BRAND + LOCATION SPLIT
    -------------------------------- */
    const parts = storeQuery.split('-').map(p => p.trim()).filter(Boolean);
    const brandPart = parts.length > 1 ? parts[0] : null;
    const locationPart = parts.length > 1 ? parts[parts.length - 1] : storeQuery;

    const brandVariants = brandPart ? getBrandVariants(brandPart) : [];
    const locationKey = getLocationVariant(locationPart);
    const locationRegex = buildLocationRegex(locationKey);

    /* -------------------------------
       FINAL QUERY (NO OR LEAKAGE)
    -------------------------------- */
    if (brandVariants.length) {
        return {
            $and: [
                { store: { $regex: locationRegex } },
                {
                    $or: brandVariants.map(b => ({
                        store: { $regex: new RegExp(`(^|[^a-zA-Z])${b}([^a-zA-Z]|$)`, 'i') }
                    }))
                }
            ]
        };
    }

    return { store: { $regex: locationRegex } };
};