import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const testStores = [
    "Suitor Guy - Kottakkal",
    "SG - Kottakal",
    "Zorucci - Manjeri",
    "Zurocci - MANJERY",
    "Z - PERINTHALMANNA",
    "Perinthalmanna - PMNA",
    "Edappally",
    "Suitor Guy - CALICUT"
];

const testQueries = [
    "Suitor Guy - Kottakkal",
    "SG - Kottakal",
    "Zurocci - Kottakkal",
    "Z - PERINTHALMANNA",
    "Manjeri",
    "Kottakkal",
    "PMNA", // Does this match Perinthalmanna?
    "Perinthalmanna", // Does this match PMNA?
    "Edappally",
    "Edappal"
];

const runTest = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // Clean up old test data if any (optional, but let's just use existing data or add uniquely)
        // For testing purpose, it's better to use existing data if possible, 
        // but to be sure about the logic we can run it against a set of known values.

        console.log("\n--- Testing Store Filtering Logic ---\n");

        for (const queryStore of testQueries) {
            console.log(`Testing query: "${queryStore}"`);

            const filters = {};
            const store = queryStore;

            const getVariants = (text, type) => {
                const variants = [text];
                const lower = text.toLowerCase();
                if (type === 'brand') {
                    if (lower.includes('suitor guy') || lower === 'sg') {
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
                    if (lower.includes('perinthalmanna') || lower === 'pmna') {
                        variants.push('Perinthalmanna', 'PMNA');
                    }
                    if (lower.includes('edappally') || lower === 'edapally') {
                        variants.push('Edappally', 'Edapally');
                    }
                }
                return [...new Set(variants)];
            };

            const buildStrictRegex = (text) => {
                const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                return `(^|[\\s-])${escaped}([\\s-]|$)`;
            };

            const hasDash = store.includes('-') || store.includes(' - ');

            if (hasDash) {
                const parts = store.split(/[\s-]*[-][\s-]*/).map(p => p.trim()).filter(p => p.length > 0);
                if (parts.length >= 2) {
                    const brandPart = parts[0];
                    const locationPart = parts[parts.length - 1];
                    const brandVariations = getVariants(brandPart, 'brand');
                    const locationVariations = getVariants(locationPart, 'location');
                    const orConditions = [];
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
                    filters.$or = orConditions;
                } else {
                    filters.store = { $regex: buildStrictRegex(store), $options: 'i' };
                }
            } else {
                const brandVars = getVariants(store, 'brand');
                const locVars = getVariants(store, 'location');
                const allVars = [...new Set([...brandVars, ...locVars])];
                if (allVars.length > 1) {
                    filters.$or = allVars.map(v => ({
                        store: { $regex: buildStrictRegex(v), $options: 'i' }
                    }));
                } else {
                    filters.store = { $regex: buildStrictRegex(store), $options: 'i' };
                }
            }

            // Execute query
            const results = await Lead.find(filters).limit(10).select("store");
            console.log(`Found ${results.length} results. Matches:`);
            const uniqueMatches = [...new Set(results.map(r => r.store))];
            uniqueMatches.forEach(m => console.log(`  - ${m}`));
            console.log("-----------------------------------\n");
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
};

runTest();
