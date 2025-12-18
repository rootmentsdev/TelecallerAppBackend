import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const buildStrictRegex = (text) => {
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return `(^|[\\s-])${escaped}([\\s-]|$)`;
};

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

const runReproduction = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const storeQuery = "Zorucci Edappally";
        console.log(`Simulating query: "${storeQuery}" (no dash)`);

        // Replicating the new corrected logic
        const brandVars = getVariants(storeQuery, 'brand');
        const locVars = getVariants(storeQuery, 'location');

        const hasSpecificBrand = brandVars.some(v => v.toLowerCase() !== storeQuery.toLowerCase());
        const hasSpecificLoc = locVars.some(v => v.toLowerCase() !== storeQuery.toLowerCase());

        let filters;

        if (hasSpecificBrand && hasSpecificLoc) {
            console.log("Detected both Brand and Location in query. Using intersection logic (AND).");
            const bVars = brandVars.filter(v => v.toLowerCase() !== storeQuery.toLowerCase());
            const lVars = locVars.filter(v => v.toLowerCase() !== storeQuery.toLowerCase());

            const orConditions = [];
            for (const b of bVars) {
                for (const l of lVars) {
                    orConditions.push({
                        $and: [
                            { store: { $regex: buildStrictRegex(b), $options: 'i' } },
                            { store: { $regex: buildStrictRegex(l), $options: 'i' } }
                        ]
                    });
                }
            }
            filters = { $or: orConditions };
        } else {
            console.log("Only one type detected. Using union logic (OR).");
            const allVars = [...new Set([...brandVars, ...locVars])];
            filters = {
                $or: allVars.map(v => ({
                    store: { $regex: buildStrictRegex(v), $options: 'i' }
                }))
            };
        }

        const results = await Lead.find(filters).limit(50).select("store");
        console.log(`Found ${results.length} results.`);

        const uniqueStoresRes = [...new Set(results.map(r => r.store))];
        console.log("Unique stores matched:", uniqueStoresRes);

        const brandsFound = [...new Set(results.map(r => {
            if (r.store.toLowerCase().includes('suitor') || r.store.toLowerCase().includes('sg')) return 'Suitor Guy';
            if (r.store.toLowerCase().includes('zurocci') || r.store.toLowerCase().includes('zorucci') || r.store.startsWith('Z-') || r.store === 'Z.Kottakkal') return 'Zurocci';
            return 'Other';
        }))];

        console.log("Brands found in results:", brandsFound);

        if (brandsFound.includes('Suitor Guy') && brandsFound.includes('Zurocci')) {
            console.log("\n❌ STILL BUGGY: Search for 'Zorucci Edappally' returned both brands!");
        } else if (brandsFound.length === 1 && brandsFound[0] === 'Zurocci') {
            console.log("\n✅ FIXED: Search for 'Zorucci Edappally' only returned Zurocci leads!");
        } else {
            console.log("\n⚠️ Results unexpected:", brandsFound);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

runReproduction();
