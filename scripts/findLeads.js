#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Lead from '../models/Lead.js';

async function main() {
  const [,, leadType, store] = process.argv;

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set in environment. Set it in .env or export it.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const query = {};
    if (leadType) query.leadType = leadType;
    if (store) query.store = { $regex: store, $options: 'i' };

    console.log('Running query:', JSON.stringify(query));

    const docs = await Lead.find(query)
      .limit(50)
      .select('name phone store leadType assignedTo createdAt')
      .lean();

    console.log(`Found ${docs.length} documents`);
    docs.forEach((d, i) => {
      console.log(i + 1, d);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error running query:', err);
    process.exit(2);
  }
}

main();
