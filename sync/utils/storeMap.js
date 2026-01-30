/**
 * Canonical Store Names
 * Format: "Brand - Location"
 * 
 * Brands:
 * - "Suitor Guy" (SG)
 * - "Zorucci" (Z)
 */

export const LEAD_API_ID_MAP = {
    '1': 'Zorucci - Edappally',
    '3': 'Suitor Guy - Edappally',
    '5': 'Suitor Guy - Trivandrum',
    '6': 'Zorucci - Edappal',
    '7': 'Zorucci - Perinthalmanna',
    '8': 'Zorucci - Kottakkal',
    '9': 'Suitor Guy - Kottayam',
    '10': 'Suitor Guy - Perumbavoor',
    '11': 'Suitor Guy - Thrissur',
    '12': 'Suitor Guy - Chavakkad',
    '13': 'Suitor Guy - Calicut',
    '14': 'Suitor Guy - Vatakara',
    '15': 'Suitor Guy - Edappal',
    '16': 'Suitor Guy - Perinthalmanna',
    '17': 'Suitor Guy - Kottakkal',
    '18': 'Suitor Guy - Manjeri',
    '19': 'Suitor Guy - Palakkad',
    '20': 'Suitor Guy - Kalpetta',
    '21': 'Suitor Guy - Kannur',
    '23': 'Suitor Guy - MG Road'
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
        'z edappally': 'Zorucci - Edappally', // Added variant
        'z edapally': 'Zorucci - Edappally', // Added variant
        'z- edappal': 'Zorucci - Edappal',
        'z edappal': 'Zorucci - Edappal', // Added variant
        'z edapal': 'Zorucci - Edappal', // Added variant
        'z.perinthalmanna': 'Zorucci - Perinthalmanna',
        'z perinthalmanna': 'Zorucci - Perinthalmanna', // Added variant
        'z.kottakkal': 'Zorucci - Kottakkal',
        'z kottakal': 'Zorucci - Kottakkal', // Added variant
        'sg-edappally': 'Suitor Guy - Edappally',
        'sg edappally': 'Suitor Guy - Edappally', // Added variant
        'sg edapally': 'Suitor Guy - Edappally', // Added variant
        // ... existing SG mappings ...
        'sg-trivandrum': 'Suitor Guy - Trivandrum',
        'sg trivandrum': 'Suitor Guy - Trivandrum', // Added variant
        'sg.kottayam': 'Suitor Guy - Kottayam',
        'sg.perumbavoor': 'Suitor Guy - Perumbavoor',
        'sg perumbavoor': 'Suitor Guy - Perumbavoor', // Added variant
        'sg.thrissur': 'Suitor Guy - Thrissur',
        'sg trissur': 'Suitor Guy - Thrissur', // Added variant
        'sg.chavakkad': 'Suitor Guy - Chavakkad',
        'sg chavakkad': 'Suitor Guy - Chavakkad', // Added variant
        'sg.calicut': 'Suitor Guy - Calicut',
        'sg calicut': 'Suitor Guy - Calicut', // Added variant
        'sg.vadakara': 'Suitor Guy - Vatakara',
        'sg vadakara': 'Suitor Guy - Vatakara', // Added variant
        'sg.edappal': 'Suitor Guy - Edappal',
        'sg edappal': 'Suitor Guy - Edappal', // Added variant
        'sg edapal': 'Suitor Guy - Edappal', // Added variant
        'sg.perinthalmanna': 'Suitor Guy - Perinthalmanna',
        'sg perinthalmanna': 'Suitor Guy - Perinthalmanna', // Added variant
        'sg.kottakkal': 'Suitor Guy - Kottakkal',
        'sg kottakkal': 'Suitor Guy - Kottakkal', // Added variant
        'sg kottkal': 'Suitor Guy - Kottakkal', // Added variant
        'sg.manjeri': 'Suitor Guy - Manjeri',
        'sg manjeri': 'Suitor Guy - Manjeri', // Added variant
        'sg.palakkad': 'Suitor Guy - Palakkad',
        'sg palakkad': 'Suitor Guy - Palakkad', // Added variant
        'sg.kalpetta': 'Suitor Guy - Kalpetta',
        'sg kalpetta': 'Suitor Guy - Kalpetta', // Added variant
        'sg kalpatta': 'Suitor Guy - Kalpetta', // Added variant
        'sg.kannur': 'Suitor Guy - Kannur',
        'sg kannur': 'Suitor Guy - Kannur', // Added variant
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
