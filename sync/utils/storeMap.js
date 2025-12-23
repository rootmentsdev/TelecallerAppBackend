/**
 * Canonical Store Names
 * Format: "Brand - Location"
 * 
 * Brands:
 * - "Suitor Guy" (SG)
 * - "Zorucci" (Z)
 */

export const LEAD_API_ID_MAP = {
    '1': 'Zorucci - Edappally',   // Was Z- Edapally
    '3': 'Suitor Guy - Edappally', // Was SG-Edappally
    '5': 'Suitor Guy - Trivandrum', // Was Trivandrum (inferred SG)
    '6': 'Zorucci - Edappally',   // Alt ID
    '7': 'Suitor Guy - Perinthalmanna', // Was PMNA (inferred SG - older ID)
    '8': 'Zorucci - Kottakkal',   // Was Z.Kottakkal
    '9': 'Suitor Guy - Kottayam', // Was Kottayam (inferred SG)
    '10': 'Suitor Guy - Perumbavoor', // Was Perumbavoor
    '11': 'Suitor Guy - Thrissur', // Was Trissur
    '12': 'Suitor Guy - Chavakkad', // Was Chavakkad
    '13': 'Suitor Guy - Calicut', // Was CALICUT
    '14': 'Suitor Guy - Vatakara', // Was VATAKARA
    '15': 'Suitor Guy - Edappally', // Alt ID
    '16': 'Zorucci - Perinthalmanna', // Was PMNA (inferred Z - newer ID)
    '17': 'Suitor Guy - Kottakkal', // Was KOTTAKAL
    '18': 'Suitor Guy - Manjeri', // Was MANJERY
    '19': 'Suitor Guy - Palakkad', // Was Palakkad
    '20': 'Suitor Guy - Kalpetta', // Was KALPETTA
    '21': 'Suitor Guy - Kannur', // Was KANNUR

    // --- New IDs from LocationList API (to ensure coverage) ---
    '100': 'Zorucci - Edappal',
    '122': 'Zorucci - Kottakkal',
    '133': 'Zorucci - Perinthalmanna',
    '144': 'Zorucci - Edappally',
    '700': 'Suitor Guy - Trivandrum',
    '701': 'Suitor Guy - Kottayam',
    '702': 'Suitor Guy - Edappally',
    '703': 'Suitor Guy - Perumbavoor',
    '704': 'Suitor Guy - Thrissur',
    '705': 'Suitor Guy - Palakkad',
    '706': 'Suitor Guy - Chavakkad',
    '707': 'Suitor Guy - Edappal',
    '708': 'Suitor Guy - Vatakara',
    '709': 'Suitor Guy - Perinthalmanna',
    '710': 'Suitor Guy - Manjeri',
    '711': 'Suitor Guy - Kottakkal',
    '712': 'Suitor Guy - Calicut',
    '716': 'Suitor Guy - Kannur',
    '717': 'Suitor Guy - Kalpetta',
    '718': 'Suitor Guy - MG Road'
};

/**
 * Normalizes raw store names to the canonical format.
 * Used for syncing Store Lists and CSV imports.
 * @param {string} rawName 
 * @returns {string} Normalized name
 */
export const normalizeStoreName = (rawName) => {
    if (!rawName) return "";
    const name = rawName.trim();
    const lower = name.toLowerCase();

    // 1. Check strict known mappings first
    const knownMappings = {
        'z- edapally': 'Zorucci - Edappally',
        'z- edappal': 'Zorucci - Edappal',
        'z.perinthalmanna': 'Zorucci - Perinthalmanna',
        'z.kottakkal': 'Zorucci - Kottakkal',
        'sg-edappally': 'Suitor Guy - Edappally',
        'sg-trivandrum': 'Suitor Guy - Trivandrum',
        'sg.kottayam': 'Suitor Guy - Kottayam',
        'sg.perumbavoor': 'Suitor Guy - Perumbavoor',
        'sg.thrissur': 'Suitor Guy - Thrissur',
        'sg.chavakkad': 'Suitor Guy - Chavakkad',
        'sg.calicut': 'Suitor Guy - Calicut',
        'sg.vadakara': 'Suitor Guy - Vatakara',
        'sg.edappal': 'Suitor Guy - Edappal',
        'sg.perinthalmanna': 'Suitor Guy - Perinthalmanna',
        'sg.kottakkal': 'Suitor Guy - Kottakkal',
        'sg.manjeri': 'Suitor Guy - Manjeri',
        'sg.palakkad': 'Suitor Guy - Palakkad',
        'sg.kalpetta': 'Suitor Guy - Kalpetta',
        'sg.kannur': 'Suitor Guy - Kannur',
        'sg.mg road': 'Suitor Guy - MG Road',
        // Legacy / Ambiguous mappings (assuming defaults if brand missing)
        'kottayam': 'Suitor Guy - Kottayam',
        'trivandrum': 'Suitor Guy - Trivandrum',
        'trissur': 'Suitor Guy - Thrissur',
        'chavakkad': 'Suitor Guy - Chavakkad',
        'calicut': 'Suitor Guy - Calicut',
        'vatakara': 'Suitor Guy - Vatakara',
        'manjery': 'Suitor Guy - Manjeri',
        'palakkad': 'Suitor Guy - Palakkad',
        'kalpetta': 'Suitor Guy - Kalpetta',
        'kannur': 'Suitor Guy - Kannur',
        'perumbavoor': 'Suitor Guy - Perumbavoor'
    };

    if (knownMappings[lower]) {
        return knownMappings[lower];
    }

    // 2. Heuristic normalization
    let brand = "";
    let location = name;

    // Detect Brand
    if (lower.startsWith('z-') || lower.startsWith('z.') || lower.includes('zorucci') || lower.includes('zurocci')) {
        brand = "Zorucci";
        location = name.replace(/description|zorucci|zurocci|z-|z\./gi, "").trim();
    } else if (lower.startsWith('sg') || lower.includes('suitor guy')) {
        brand = "Suitor Guy";
        location = name.replace(/suitor guy|sg-|sg\./gi, "").trim();
    } else {
        // Default to Suitor Guy if no brand detected? Or keep as is?
        // User said "suitor guy short form is sg and zorucci is z"
        // Safe to leave as is if we can't detect, OR default to Suitor Guy for known legacy names not in map.
        // For now, return as-is properly formatted if possible.
        return name; // Return original if no pattern matched
    }

    // Cleanup location
    location = location.replace(/^[-.]/, "").trim(); // Remove leading dash/dot

    // Title case location
    location = location.charAt(0).toUpperCase() + location.slice(1).toLowerCase();

    // Fix specific location spellings
    const locationCorrections = {
        'edapally': 'Edappally',
        'manjery': 'Manjeri',
        'pmna': 'Perinthalmanna',
        'trissur': 'Thrissur',
        'kottakal': 'Kottakkal'
    };
    if (locationCorrections[location.toLowerCase()]) {
        location = locationCorrections[location.toLowerCase()];
    }

    return `${brand} - ${location}`;
};
