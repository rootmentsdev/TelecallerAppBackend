import { readCSV } from '../sync/utils/csvReader.js';
import { mapLossOfSale } from '../sync/utils/dataMapper.js';
import fs from 'fs';

async function test() {
    try {
        const files = fs.readdirSync('data').filter(f => f.toLowerCase().includes('lossofsale') && f.endsWith('.csv'));
        if (files.length === 0) {
            console.log('No Loss of Sale CSV files found in data/');
            return;
        }

        const data = await readCSV('data/' + files[0]);
        console.log('Sample Row from CSV:', data[0]);
        console.log('\nMapped Row:', mapLossOfSale(data[0]));
    } catch (err) {
        console.error(err);
    }
}
test();
