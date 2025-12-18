import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../models/Lead.js';

dotenv.config();

/**
 * Filter building logic copied from pageController.js for isolation testing.
 */
const buildLeadQueryInternal = (user, filters = {}) => {
    const query = { ...filters };

    if (user.role === 'admin') {
        // Admin can see all leads
    } else if (user.role === 'teamLead') {
        const escapeRegex = (s) => (s || '').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const userStoreRegex = { $regex: escapeRegex(user.store), $options: 'i' };

        if (query.$or) {
            const updatedOrConditions = query.$or.map(condition => {
                if (condition.store) {
                    return { $and: [{ store: userStoreRegex }, condition] };
                } else if (condition.$and) {
                    return { $and: [{ store: userStoreRegex }, ...condition.$and] };
                } else {
                    return { $and: [{ store: userStoreRegex }, condition] };
                }
            });
            query.$or = updatedOrConditions;
        } else if (query.store) {
            const providedStoreFilter = typeof query.store === 'string'
                ? { $regex: escapeRegex(query.store), $options: 'i' }
                : query.store;
            query.$and = [{ store: userStoreRegex }, { store: providedStoreFilter }];
            delete query.store;
        } else {
            query.store = { $regex: escapeRegex(user.store), $options: 'i' };
        }
    } else if (user.role === 'telecaller') {
        query.assignedTo = user._id;
    }

    return query;
};

const buildStoreFilters = (store) => {
    if (!store) return {};

    const filters = {};

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
    return filters;
};

async function testFiltering() {
    console.log('\n🚀 Starting Filtering Verification Tests...');
    console.log('='.repeat(60));

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Edappal vs Edappally Test
        console.log('\n🔍 TEST 1: Edappal vs Edappally Distinction');
        console.log('-'.repeat(40));

        const edappalQuery = buildStoreFilters('Edappal');
        const edappallyQuery = buildStoreFilters('Edappally');

        const countEdappal = await Lead.countDocuments(edappalQuery);
        const countEdappally = await Lead.countDocuments(edappallyQuery);

        console.log(`Leads matching "Edappal": ${countEdappal}`);
        console.log(`Leads matching "Edappally": ${countEdappally}`);

        // Verify crossover
        const crossover1 = await Lead.countDocuments({ $and: [edappalQuery, { store: /Edappally/i }] });
        const crossover2 = await Lead.countDocuments({ $and: [edappallyQuery, { store: /Edappal$/i }] });

        if (crossover1 === 0) {
            console.log('✅ PASS: "Edappal" filter does NOT match "Edappally" records.');
        } else {
            console.log(`❌ FAIL: "Edappal" filter matched ${crossover1} records that look like Edappally.`);
        }

        // 2. Team Lead Role Restriction
        console.log('\n🔍 TEST 2: Team Lead Role Restriction');
        console.log('-'.repeat(40));

        const teamLeadUser = { role: 'teamLead', store: 'Manjeri' };
        const adminUser = { role: 'admin' };

        const storeFilter = buildStoreFilters('Suitor Guy');
        const tlQuery = buildLeadQueryInternal(teamLeadUser, storeFilter);
        const adminQuery = buildLeadQueryInternal(adminUser, storeFilter);

        const tlCount = await Lead.countDocuments(tlQuery);
        const adminCount = await Lead.countDocuments(adminQuery);

        console.log(`Admin "Suitor Guy" count: ${adminCount}`);
        console.log(`Team Lead (Manjeri) "Suitor Guy" count: ${tlCount}`);

        if (tlCount < adminCount && tlCount > 0) {
            console.log('✅ PASS: Team Lead is restricted to their own store.');

            // Verify no leads from other stores in TL results
            const otherStoreLeads = await Lead.countDocuments({ ...tlQuery, store: { $not: /Manjeri/i } });
            if (otherStoreLeads === 0) {
                console.log('✅ PASS: No leads from other stores found in Team Lead results.');
            } else {
                console.log(`❌ FAIL: Found ${otherStoreLeads} leads from other stores in Team Lead results.`);
            }
        } else if (adminCount === 0) {
            console.log('⚠️  INFO: No "Suitor Guy" leads found in DB to verify restriction.');
        } else {
            console.log('❌ FAIL: Team Lead restriction logic failed or no records found.');
        }

        // 3. Date Range Test
        console.log('\n🔍 TEST 3: Date Range Filtering');
        console.log('-'.repeat(40));

        // Find a date with data
        const sampleLead = await Lead.findOne({ enquiryDate: { $exists: true } });
        if (sampleLead && sampleLead.enquiryDate) {
            const date = new Date(sampleLead.enquiryDate);
            const dateStr = date.toISOString().split('T')[0];
            console.log(`Sample lead found with date: ${dateStr}`);

            const dateFilters = {
                enquiryDate: {
                    $gte: new Date(dateStr),
                    $lte: new Date(dateStr + 'T23:59:59.999Z')
                }
            };

            const count = await Lead.countDocuments(dateFilters);
            console.log(`Leads on ${dateStr}: ${count}`);

            if (count > 0) {
                console.log('✅ PASS: Date filtering returns records.');
            } else {
                console.log('❌ FAIL: Date filtering failed to return the sample record.');
            }
        } else {
            console.log('⚠️  INFO: No leads with enquiryDate found to test.');
        }

    } catch (error) {
        console.error('\n❌ Test Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        console.log('='.repeat(60));
        console.log('🏁 Filtering Verification Finished\n');
    }
}

testFiltering();
