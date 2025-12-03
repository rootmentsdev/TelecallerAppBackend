# How to Verify Data in MongoDB

## 🎯 Quick Verification Methods

---

## Method 1: Using Verification Script (Easiest)

### Run the verification script:

```bash
npm run verify:data
```

This will show:
- Total leads count
- Leads by source (Walk-in vs Loss of Sale)
- Sample leads from each type
- Field verification (which fields are stored)
- Duplicate phone numbers (for revisits)

---

## Method 2: Using MongoDB Compass (GUI Tool)

### Step 1: Install MongoDB Compass
- Download from: https://www.mongodb.com/try/download/compass
- Install and open

### Step 2: Connect to MongoDB
1. Get your MongoDB connection string from `.env` file:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   ```
2. Paste it in MongoDB Compass
3. Click "Connect"

### Step 3: Browse Data
1. Click on your database name
2. Click on `leads` collection
3. View all documents

### Step 4: Filter Data
- **Walk-in leads:** Use filter: `{ "source": "Walk-in" }`
- **Loss of Sale leads:** Use filter: `{ "source": "Loss of Sale" }`
- **By phone:** Use filter: `{ "phone": "9656683174" }`

---

## Method 3: Using MongoDB Shell (mongosh)

### Connect to MongoDB:
```bash
mongosh "your_mongodb_connection_string"
```

### Useful Commands:

```javascript
// Switch to your database
use your_database_name

// Count total leads
db.leads.countDocuments()

// Count walk-in leads
db.leads.countDocuments({ source: "Walk-in" })

// Count loss of sale leads
db.leads.countDocuments({ source: "Loss of Sale" })

// Get all walk-in leads
db.leads.find({ source: "Walk-in" })

// Get all loss of sale leads
db.leads.find({ source: "Loss of Sale" })

// Get specific lead by phone
db.leads.find({ phone: "9656683174" })

// Get leads with specific field
db.leads.find({ attendedBy: { $exists: true } })  // Walk-in specific
db.leads.find({ reason: { $exists: true } })       // Loss of Sale specific

// Get sample documents
db.leads.find().limit(5).pretty()
```

---

## Method 4: Using API Endpoints

### Get All Leads:
```bash
curl -X GET https://tele-1-ss5d.onrender.com/api/leads \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Filter by Source (in your frontend):
```javascript
// Get walk-in leads
const walkinLeads = leads.filter(lead => lead.source === "Walk-in");

// Get loss of sale leads
const lossOfSaleLeads = leads.filter(lead => lead.source === "Loss of Sale");
```

---

## Method 5: Using Node.js Script

### Create a simple script:

```javascript
import mongoose from "mongoose";
import Lead from "./models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const checkData = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Get all leads
  const leads = await Lead.find();
  console.log(`Total leads: ${leads.length}`);
  
  // Get walk-in leads
  const walkin = await Lead.find({ source: "Walk-in" });
  console.log(`Walk-in leads: ${walkin.length}`);
  
  // Get loss of sale leads
  const lossOfSale = await Lead.find({ source: "Loss of Sale" });
  console.log(`Loss of Sale leads: ${lossOfSale.length}`);
  
  // Show sample
  console.log("\nSample Walk-in Lead:", walkin[0]);
  console.log("\nSample Loss of Sale Lead:", lossOfSale[0]);
  
  await mongoose.disconnect();
};

checkData();
```

---

## ✅ What to Check

### Walk-in Leads Should Have:
- ✅ `source: "Walk-in"`
- ✅ `leadType: "general"`
- ✅ `attendedBy` field (from Staff column)
- ✅ `enquiryDate` field (from Date column)
- ✅ `functionDate` field (from Function Date column)
- ✅ `enquiryType` field (from Category + Sub Category)

### Loss of Sale Leads Should Have:
- ✅ `source: "Loss of Sale"`
- ✅ `leadType: "lossOfSale"`
- ✅ `reason` field (from reason column)
- ✅ `closingStatus` field (from closingStatus column)
- ✅ `enquiryType` field (from enquiryType column)

### Common Fields (Both Types):
- ✅ `name`
- ✅ `phone`
- ✅ `store`
- ✅ `remarks`
- ✅ `closingStatus`

---

## 🔍 Quick Verification Checklist

- [ ] Total leads count > 0
- [ ] Walk-in leads exist (`source: "Walk-in"`)
- [ ] Loss of Sale leads exist (`source: "Loss of Sale"`)
- [ ] Walk-in leads have `attendedBy` field
- [ ] Loss of Sale leads have `reason` field
- [ ] Phone numbers are stored correctly
- [ ] Dates are stored correctly
- [ ] All CSV fields are mapped

---

## 🚀 Recommended: Use Verification Script

The easiest way is to run:
```bash
npm run verify:data
```

This will show you everything you need to verify!

