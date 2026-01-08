/**
 * Extract brand and location from filename
 * Reuses the same logic as import_all_lossofsale.js and import_all_walkin.js
 * Returns store name in format: "Brand - Location" (e.g., "Suitor Guy - Kannur")
 * Uses normalizeStoreName to ensure consistency with database store names
 */

import { normalizeStoreName } from "./storeMap.js";

// Known brands and locations (same as CLI import scripts)
// Note: Database uses "Zorucci" (not "Zurocci") - this matches storeMap.js normalization
const BRANDS = ["Zorucci", "Suitor Guy", "SuitorGuy"];
// IMPORTANT: Put longer location names BEFORE shorter ones to avoid substring matching issues
// e.g., "Edappally" must come before "Edappal" so "edappally" doesn't match "Edappal"
const LOCATIONS = [
  "Trivandrum", "Edappally", "Edappal", "Perumbavoor", "Kottayam", "Trissur", "Thrissur",
  "Palakkad", "Chavakkad", "MANJERY", "Manjeri", "PMNA", "Perinthalmanna",
  "Z.Kottakkal", "Kottakkal", "CALICUT", "Calicut", "VATAKARA", "Vatakara", "Vadakara",
  "KALPETTA", "Kalpetta", "KANNUR", "Kannur", "MG Road"
];

/**
 * Extract brand and location from filename
 * @param {string} filename - Original filename (e.g., "lossofsale_sg_kannur.xlsx")
 * @returns {{brand: string|null, location: string|null}} - Extracted brand and location
 */
export const extractBrandAndLocation = (filename) => {
  const lowerFilename = filename.toLowerCase();

  // Detect brand - check for patterns like "lossofsale_sg_location" or "walkin_z_location"
  let brand = null;

  // Pattern 1: lossofsale_sg_location or lossofsale_z_location or walkin_sg_location
  const pattern = /(lossofsale|walkin|walk[\s_-]?in)[_\s-]+(sg|z)[_\s-]+(.+?)(?:\.(csv|xlsx|xls))?$/i;
  const match = filename.match(pattern);

  if (match) {
    const brandCode = match[2].toLowerCase();
    if (brandCode === 'sg' || brandCode === 's') {
      brand = "Suitor Guy";
    } else if (brandCode === 'z') {
      brand = "Zorucci"; // Use "Zorucci" to match database format (not "Zurocci")
    }

    // Location is in the third group
    if (match[3]) {
      const locationStr = match[3].trim().toLowerCase();

      // First try exact match (case-insensitive) - return proper case from LOCATIONS
      for (const loc of LOCATIONS) {
        if (locationStr === loc.toLowerCase()) {
          return { brand, location: loc }; // Use exact case from LOCATIONS array
        }
      }

      // Then try checking if location matches known location (case-insensitive)
      for (const loc of LOCATIONS) {
        const locLower = loc.toLowerCase();
        if (locationStr === locLower ||
          (locationStr.startsWith(locLower) && locationStr.length === locLower.length)) {
          return { brand, location: loc }; // Use exact case from LOCATIONS array
        }
      }

      // If no match, use the extracted string (capitalize first letter of each word)
      // This handles locations not in the LOCATIONS list
      const location = match[3].trim().split(/[_\s-]+/).map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      return { brand, location };
    }
  }

  // Pattern 2: Check for full brand names
  if (lowerFilename.includes("zurocci") || lowerFilename.includes("zorucci") || lowerFilename.includes("z-")) {
    brand = "Zorucci"; // Use "Zorucci" to match database format (not "Zurocci")
  } else if (lowerFilename.includes("suitor") || lowerFilename.includes("suitorguy")) {
    brand = "Suitor Guy";
  } else if (lowerFilename.includes("_sg_") || lowerFilename.includes("-sg-") || lowerFilename.match(/\bsg\b/)) {
    brand = "Suitor Guy";
  } else if (lowerFilename.includes("_z_") || lowerFilename.includes("-z-") || lowerFilename.match(/\bz\b/)) {
    brand = "Zorucci"; // Use "Zorucci" to match database format (not "Zurocci")
  }

  // Detect location
  let location = null;
  for (const loc of LOCATIONS) {
    const locLower = loc.toLowerCase();
    // Check various formats
    if (lowerFilename.includes(locLower) ||
      lowerFilename.includes(locLower.replace(/\s+/g, "")) ||
      lowerFilename.includes(locLower.replace(/\s+/g, "_"))) {
      location = loc;
      break;
    }
  }

  // Try to extract from patterns like "brand_location" or "brand - location"
  if (!brand || !location) {
    // Pattern: "zurocci_edapally" or "zurocci-edapally" or "zurocci edapally"
    const patterns = [
      /(zurocci|suitor[\s_-]?guy|sg|z)[\s_-]+([a-z\s]+)/i,
      /([a-z\s]+)[\s_-]+(trivandrum|edapally|kottayam|trissur|palakkad|chavakkad|edappal|manjery|pmna|kottakkal|calicut|vadakara|kalpetta|kannur|mg[\s_-]?road)/i
    ];

    for (const pattern of patterns) {
      const patternMatch = filename.match(pattern);
      if (patternMatch) {
        const brandCode = patternMatch[1]?.toLowerCase();
        if (!brand) {
          if (brandCode === 'sg' || brandCode === 's') {
            brand = "Suitor Guy";
          } else if (brandCode === 'z') {
            brand = "Zorucci"; // Use "Zorucci" to match database format (not "Zurocci")
          } else if (brandCode.includes("zurocci") || brandCode.includes("zorucci") || brandCode.includes("z-")) {
            brand = "Zorucci"; // Use "Zorucci" to match database format (not "Zurocci")
          } else if (brandCode.includes("suitor")) {
            brand = "Suitor Guy";
          }
        }
        if (!location && patternMatch[2]) {
          location = patternMatch[2].trim();
        }
      }
    }
  }

  return { brand, location };
};

/**
 * Extract store name from filename
 * @param {string} filename - Original filename (e.g., "lossofsale_sg_kannur.xlsx" or "walkin_sg_kannur.xlsx")
 * @returns {string|null} - Store name in format "Brand - Location" (normalized to match database format) or null if cannot extract
 */
export const extractStoreNameFromFilename = (filename) => {
  const { brand, location } = extractBrandAndLocation(filename);
  
  if (brand && location) {
    // Build store name in format "Brand - Location"
    const rawStoreName = `${brand} - ${location}`;
    
    // Normalize using the same function used by the database to ensure consistency
    // This ensures extracted names match exactly what's stored in the database
    // and will work correctly with the store filtering logic
    const normalizedStoreName = normalizeStoreName(rawStoreName);
    
    // If normalization didn't change it (or returned original), use the normalized version
    // normalizeStoreName returns original if no pattern matched, so we use it
    return normalizedStoreName || rawStoreName;
  }
  
  return null;
};
