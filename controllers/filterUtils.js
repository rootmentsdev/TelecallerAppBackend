import mongoose from 'mongoose';

// Helper to robustly parse date strings (YYYY-MM-DD or DD-MM-YYYY)
export const parseQueryDate = (dateStr) => {
    if (!dateStr) return null;

    const parts = dateStr.split('-');
    if (parts.length === 3) {
        // Check for YYYY-MM-DD
        if (parts[0].length === 4) {
            return {
                year: parseInt(parts[0], 10),
                month: parseInt(parts[1], 10) - 1,
                day: parseInt(parts[2], 10)
            };
        }
        // Check for DD-MM-YYYY
        if (parts[2].length === 4) {
            return {
                year: parseInt(parts[2], 10),
                month: parseInt(parts[1], 10) - 1,
                day: parseInt(parts[0], 10)
            };
        }
    }
    // Fallback for unexpected formats
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

// Helper to normalize query parameters (snake_case -> camelCase)
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

// Advanced Store Filtering Logic
export const buildStoreFilter = (storeQuery) => {
    if (!storeQuery) return null;

    // Helper to get all variants of a brand or location
    const getVariants = (text, type) => {
        const variants = [text];
        const lower = text.toLowerCase();

        if (type === 'brand') {
            if (lower === 'suitor guy' || lower === 'suitorguy' || lower === 'sg') {
                variants.push('Suitor Guy', 'SG');
            }
            if (lower.includes('zorucci') || lower.includes('zurocci') || lower === 'z') {
                variants.push('Zurocci', 'Zorucci', 'Z');
            }
        } else if (type === 'location') {
            if (lower.includes('kottakkal') || lower.includes('kottakal')) {
                variants.push('Kottakkal', 'Kottakal', 'Z.Kottakkal');
            }
            if (lower.includes('manjeri') || lower.includes('manjery')) {
                variants.push('Manjeri', 'MANJERY');
            }
            if (lower.includes('perinthalmanna') || lower.includes('perinathalmann') || lower === 'pmna') {
                variants.push('Perinthalmanna', 'PMNA');
            }
            // Strict check for Edappally vs Edappal
            if (lower.includes('edappally') || lower.includes('edapally') || lower.includes('edappall')) {
                variants.push('Edappally', 'Edapally');
            } else if (lower.includes('edappal') && !lower.includes('edappally')) {
                // Only match Edappal if it's NOT Edappally
                variants.push('Edappal');
            }

            if (lower.includes('trivandrum') || lower.includes('thiruvananthapuram') || lower === 'tvm') {
                variants.push('Trivandrum', 'Thiruvananthapuram', 'TVM');
            }

            if (lower.includes('vadakara') || lower.includes('vatakara')) {
                variants.push('Vatakara', 'Vadakara');
            }
            if (lower.includes('calicut') || lower.includes('kozhikode')) {
                variants.push('Calicut', 'Kozhikode');
            }
        }
        return [...new Set(variants)];
    };

    // Helper to escape and build a "word-boundary" regex pattern
    const buildStrictRegex = (text) => {
        const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return `(^|[\\s-])${escaped}([\\s-]|$)`;
    };

    // Split by dash to handle Brand - Location format
    const hasDash = storeQuery.includes('-') || storeQuery.includes(' - ');

    if (hasDash) {
        const parts = storeQuery.split(/[\s-]*[-][\s-]*/).map(p => p.trim()).filter(p => p.length > 0);

        if (parts.length >= 2) {
            const brandPart = parts[0];
            const locationPart = parts[parts.length - 1];

            const brandVariations = getVariants(brandPart, 'brand');
            const locationVariations = getVariants(locationPart, 'location');

            const orConditions = [];

            // Check if this is a Suitor Guy query
            const isSuitorGuy = brandVariations.some(v => ['Suitor Guy', 'SG'].includes(v));

            for (const brandVar of brandVariations) {
                for (const locVar of locationVariations) {
                    orConditions.push({
                        $and: [
                            { store: { $regex: buildStrictRegex(brandVar), $options: 'i' } },
                            { store: { $regex: buildStrictRegex(locVar), $options: 'i' } }
                        ]
                    });
                }
            }

            // Special handling for implicit Suitor Guy stores
            if (isSuitorGuy) {
                for (const locVar of locationVariations) {
                    orConditions.push({
                        $and: [
                            { store: { $regex: buildStrictRegex(locVar), $options: 'i' } },
                            { store: { $not: { $regex: /(^|[\s.-])(Z|Zorucci|Zurocci)([\s.-]|$)/i } } }
                        ]
                    });
                }
            }

            return { $or: orConditions };
        } else {
            // Fallback for weirdly formatted dash query
            return { store: { $regex: buildStrictRegex(storeQuery), $options: 'i' } };
        }
    } else {
        // No dash - could be just brand OR just location OR both combined without dash
        const brandVars = getVariants(storeQuery, 'brand');
        const locVars = getVariants(storeQuery, 'location');

        const hasSpecificBrand = brandVars.some(v => v.toLowerCase() !== storeQuery.toLowerCase());
        const hasSpecificLoc = locVars.some(v => v.toLowerCase() !== storeQuery.toLowerCase());

        if (hasSpecificBrand && hasSpecificLoc) {
            const bVars = brandVars.filter(v => v.toLowerCase() !== storeQuery.toLowerCase());
            const lVars = locVars.filter(v => v.toLowerCase() !== storeQuery.toLowerCase());

            const orConditions = [];
            for (const brandVar of bVars) {
                for (const locVar of lVars) {
                    orConditions.push({
                        $and: [
                            { store: { $regex: buildStrictRegex(brandVar), $options: 'i' } },
                            { store: { $regex: buildStrictRegex(locVar), $options: 'i' } }
                        ]
                    });
                }
            }
            return { $or: orConditions };
        } else {
            const allVars = [...new Set([...brandVars, ...locVars])];
            if (allVars.length > 1) {
                return {
                    $or: allVars.map(v => ({
                        store: { $regex: buildStrictRegex(v), $options: 'i' }
                    }))
                };
            } else {
                return { store: { $regex: buildStrictRegex(storeQuery), $options: 'i' } };
            }
        }
    }
};
