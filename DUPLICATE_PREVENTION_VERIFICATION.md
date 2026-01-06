# Duplicate Prevention Verification

## ✅ Duplicate Check Implementation

### **Duplicate Check Criteria (ENFORCED)**
During every sync, the system checks for duplicates using these fields:
1. **name** (lead name)
2. **phone** (phone number)
3. **leadType** (lead type: bookingConfirmation, return, lossOfSale, general, justDial)
4. **store** (store name)
5. **bookingNo** (id) - if exists for booking/return leads

### **Implementation Details**

#### **For Booking Confirmation & Return Leads:**
- **Duplicate Check**: `name + phone + leadType + store + bookingNo` (if bookingNo exists)
- **If bookingNo is empty**: `name + phone + leadType + store`
- **Action**: **SKIP** if duplicate found (don't update to preserve user edits)
- **Location**: `sync/utils/saveToMongo.js` (lines 233-265)

#### **For Loss of Sale & General Leads:**
- **Duplicate Check**: `name + phone + leadType + store` (+ optional date fields)
- **Action**: **UPDATE** if duplicate found (upsert - allows CSV re-imports to update data)
- **Location**: `sync/utils/saveToMongo.js` (lines 267-341)

#### **For Bulk Operations:**
- **Duplicate Check**: Same criteria as above
- **Location**: `sync/utils/saveToMongo.js` (lines 87-125)

### **Sync Functions Using Duplicate Check**

1. **Booking Sync** (`sync/api/sync_booking.js`)
   - Uses: `saveToMongo()` function
   - Line: 408
   - ✅ Duplicate check is active

2. **Return Sync** (`sync/api/sync_return.js`)
   - Uses: `saveToMongo()` function
   - Line: 234
   - ✅ Duplicate check is active

3. **Bulk Operations** (if used)
   - Uses: `bulkSaveToMongo()` function
   - ✅ Duplicate check is active

### **Duplicate Check Flow**

```
1. Validate required fields (name, phone, store)
   ↓
2. Check if lead exists in Reports collection (skip if moved)
   ↓
3. Check if lead exists in FollowUps collection (skip if moved)
   ↓
4. DUPLICATE CHECK IN LEADS COLLECTION:
   - Build query: name + phone + leadType + store + bookingNo (if exists)
   - Query database for existing lead
   ↓
5a. If Booking/Return: SKIP if duplicate found
5b. If LossOfSale/General: UPDATE if duplicate found
5c. If new: CREATE new lead
```

### **Logging**

Duplicate detections are logged with:
- Field values that matched
- Reason for skipping
- Existing lead ID

Example log:
```
⏭️  Duplicate detected (booking/return) - skipped: name="John", phone="1234567890", leadType="bookingConfirmation", store="Store Name", bookingNo="20250101001"
```

### **Verification Checklist**

- ✅ Duplicate check runs for **ALL** lead types
- ✅ Checks **name + phone + leadType + store + bookingNo** (if exists)
- ✅ Active in **booking sync** (incremental and full)
- ✅ Active in **return sync** (incremental and full)
- ✅ Active in **bulk operations**
- ✅ Logs duplicate detections for debugging
- ✅ Skips duplicates for booking/return (preserves user edits)
- ✅ Updates duplicates for lossOfSale/general (allows CSV re-imports)

### **Testing**

To verify duplicate prevention is working:

1. **Run a sync** and check logs for duplicate detections
2. **Check sync results** - should show "skipped" count for duplicates
3. **Verify database** - no new duplicates should be created

### **Next Steps**

1. ✅ Code implementation complete
2. ⏳ Test with actual sync to verify
3. ⏳ Monitor sync logs for duplicate detections
4. ⏳ Clean up existing duplicates using cleanup script
