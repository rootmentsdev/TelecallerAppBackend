/**
 * @swagger
 * /api/pages/leads:
 *   get:
 *     summary: Fetch leads with optional filters (leadType, store, etc.)
 *     tags:
 *       - Leads
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns leads filtered by optional parameters. If leadType is not provided, returns leads of all types.
 *       
 *       **Filtering Options:**
 *       - **Store Filtering**: Supports "Brand - Location" format (e.g., "Suitor Guy - Edappally")
 *       - **Date Filtering**: Multiple date fields available with both range and single-day options
 *       - **Status Filtering**: Filter by callStatus, leadStatus, source
 *       - **Sorting**: Sort by createdAt, enquiryDate, functionDate, visitDate, name, or store (asc/desc)
 *       - **Pagination**: Control page size and navigation
 *       
 *       **Store Filter Examples:**
 *       - Get all leads for a store: `/api/pages/leads?store=Suitor Guy - Edappally`
 *       - Get specific lead type: `/api/pages/leads?leadType=return&store=Zorucci - Kottayam`
 *       
 *       **Date Filter Examples:**
 *       - Filter by enquiry date: `/api/pages/leads?enquiryDateFrom=2024-01-01&enquiryDateTo=2024-12-31`
 *       - Filter by function date: `/api/pages/leads?functionDateFrom=2024-03-01&functionDateTo=2024-03-31`
 *       - Filter by visit date: `/api/pages/leads?leadType=lossOfSale&visitDateFrom=2024-02-01&visitDateTo=2024-02-28`
 *       - Filter by creation date range: `/api/pages/leads?createdAtFrom=2024-01-01&createdAtTo=2024-12-31`
 *       - Filter by creation date (single day): `/api/pages/leads?createdAt=2024-12-08` (perfect for date pickers)
 *       - Generic date range: `/api/pages/leads?dateFrom=2024-01-01&dateTo=2024-12-31&dateField=enquiryDate`
 *       
 *       **Date Filtering Options:**
 *       - **Enquiry Date**: `enquiryDateFrom`, `enquiryDateTo` - Filter by when the enquiry was made
 *       - **Function Date**: `functionDateFrom`, `functionDateTo` - Filter by event/function date
 *       - **Visit Date**: `visitDateFrom`, `visitDateTo` - Filter by visit date (mainly for Loss of Sale)
 *       - **Creation Date Range**: `createdAtFrom`, `createdAtTo` - Filter by when leads were added to system (date range)
 *       - **Creation Date (Single Day)**: `createdAt` - Filter by specific creation date (single day, perfect for frontend date pickers)
 *       - **Generic Date Range**: `dateFrom`, `dateTo`, `dateField` - Flexible date filtering with field selection
 *       
 *       **Combined Filter Examples:**
 *       - Store + Date: `/api/pages/leads?store=Suitor Guy - Edappally&enquiryDateFrom=2024-01-01&enquiryDateTo=2024-12-31`
 *       - Lead Type + Store + Creation Date: `/api/pages/leads?leadType=return&store=Suitor Guy - Edappally&createdAt=2024-12-08`
 *       - Lead Type + Store + Date Range: `/api/pages/leads?leadType=return&store=Suitor Guy - Kottayam&functionDateFrom=2024-03-01&functionDateTo=2024-03-31`
 *       - Today's Enquiry Leads (Newest First): `/api/pages/leads?leadType=enquiry&createdAt=2024-12-10&sortBy=createdAt&sortOrder=desc`
 *       - Sort by Name: `/api/pages/leads?leadType=lossOfSale&sortBy=name&sortOrder=asc`
 *     parameters:
 *       - in: query
 *         name: leadType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [lossOfSale, return, enquiry, booked]
 *         description: Type of lead to fetch. If omitted, returns leads of all types.
 *       - in: query
 *         name: store
 *         required: false
 *         schema:
 *           type: string
 *           example: "Suitor Guy - Edappally"
 *         description: |
 *           Filter leads by store name using "Brand - Location" format.
 *           
 *           **Supported Formats:**
 *           - **Full Format**: `"Suitor Guy - Edappally"`, `"Zorucci - Kottayam"`
 *           - **Location Only**: `"Edappally"`, `"Kottayam"`, `"Manjeri"`
 *           
 *           **Brand Abbreviations:**
 *           - `"SG"` = `"Suitor Guy"` (e.g., `"SG-Edappally"` matches `"Suitor Guy - Edappally"`)
 *           - `"Z"` = `"Zorucci"` (e.g., `"Z-Kottayam"` matches `"Zorucci - Kottayam"`)
 *           
 *           **How Filtering Works:**
 *           1. **Exact Match**: Searches for the exact store name
 *           2. **Brand + Location Match**: Finds stores containing both brand and location
 *              - `"Suitor Guy - Edappally"` matches stores with both "Suitor Guy" (or "SG") AND "Edappally"
 *           3. **Location Match**: Also matches stores with just the location name
 *              - `"Suitor Guy - Kottayam"` will also match stores named just `"Kottayam"`
 *           
 *           **Important Notes:**
 *           - **Edappal vs Edappally**: These are DIFFERENT locations (not variations)
 *             - Searching `"Suitor Guy - Edappally"` will NOT match stores with `"Edappal"`
 *             - Searching `"Suitor Guy - Edappal"` will NOT match stores with `"Edappally"`
 *           - Case-insensitive matching (e.g., `"kottayam"` matches `"Kottayam"`)
 *           - Works with all lead types (lossOfSale, return, enquiry)
 *           
 *           **Examples:**
 *           - Get all leads for a store: `?store=Suitor Guy - Edappally`
 *           - Get specific lead type: `?leadType=return&store=Suitor Guy - Edappally`
 *           - Get all leads for location: `?store=Kottayam`
 *           - Get return leads: `?leadType=return&store=Suitor Guy - Kottayam`
 *           - Get loss of sale leads: `?leadType=lossOfSale&store=Suitor Guy - Manjeri`
 *           
 *           **Use Cases:**
 *           - **Loss of Sale Area**: Filter by store for loss of sale leads
 *             - `?leadType=lossOfSale&store=Suitor Guy - Edappally`
 *           - **Return Area**: Filter by store for return leads
 *             - `?leadType=return&store=Suitor Guy - Kottayam`
 *             - `?leadType=return&store=Suitor Guy - Edappally`
 *           - **All Leads**: Get all lead types for a store
 *             - `?store=Suitor Guy - Edappally`
 *       - in: query
 *         name: callStatus
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by call status.
 *       - in: query
 *         name: leadStatus
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by lead status.
 *       - in: query
 *         name: source
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by source (e.g., "Walk-in", "Booking", "Return", "Loss of Sale").
 *       - in: query
 *         name: enquiryDateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-01-01"
 *         description: |
 *           Filter leads with enquiry date on or after this date (YYYY-MM-DD).
 *           Example: `?enquiryDateFrom=2024-01-01` returns leads with enquiry date from January 1, 2024 onwards.
 *           Can be combined with `enquiryDateTo` for a date range.
 *       - in: query
 *         name: enquiryDateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-31"
 *         description: |
 *           Filter leads with enquiry date on or before this date (YYYY-MM-DD).
 *           Example: `?enquiryDateTo=2024-12-31` returns leads with enquiry date up to December 31, 2024.
 *           The date is inclusive (includes the entire day up to 23:59:59).
 *           Use with `enquiryDateFrom` for a date range: `?enquiryDateFrom=2024-01-01&enquiryDateTo=2024-12-31`
 *       - in: query
 *         name: functionDateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-03-01"
 *         description: |
 *           Filter leads with function/event date on or after this date (YYYY-MM-DD).
 *           Example: `?functionDateFrom=2024-03-01` returns leads with function date from March 1, 2024 onwards.
 *           Useful for filtering return leads by event date.
 *           Can be combined with `functionDateTo` for a date range.
 *       - in: query
 *         name: functionDateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-03-31"
 *         description: |
 *           Filter leads with function/event date on or before this date (YYYY-MM-DD).
 *           Example: `?functionDateTo=2024-03-31` returns leads with function date up to March 31, 2024.
 *           The date is inclusive (includes the entire day up to 23:59:59).
 *           Use with `functionDateFrom` for a date range: `?functionDateFrom=2024-03-01&functionDateTo=2024-03-31`
 *       - in: query
 *         name: visitDateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-02-01"
 *         description: |
 *           Filter leads with visit date on or after this date (YYYY-MM-DD).
 *           Example: `?visitDateFrom=2024-02-01` returns leads with visit date from February 1, 2024 onwards.
 *           Mainly used for Loss of Sale leads.
 *           Can be combined with `visitDateTo` for a date range.
 *       - in: query
 *         name: visitDateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-02-28"
 *         description: |
 *           Filter leads with visit date on or before this date (YYYY-MM-DD).
 *           Example: `?visitDateTo=2024-02-28` returns leads with visit date up to February 28, 2024.
 *           The date is inclusive (includes the entire day up to 23:59:59).
 *           Use with `visitDateFrom` for a date range: `?visitDateFrom=2024-02-01&visitDateTo=2024-02-28`
 *       - in: query
 *         name: createdAtFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-01-01"
 *         description: |
 *           Filter leads created on or after this date (YYYY-MM-DD).
 *           Example: `?createdAtFrom=2024-01-01` returns leads created from January 1, 2024 onwards.
 *           Useful for filtering leads by when they were added to the system.
 *           Can be combined with `createdAtTo` for a date range.
 *       - in: query
 *         name: createdAtTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-31"
 *         description: |
 *           Filter leads created on or before this date (YYYY-MM-DD).
 *           Example: `?createdAtTo=2024-12-31` returns leads created up to December 31, 2024.
 *           The date is inclusive (includes the entire day up to 23:59:59).
 *           Use with `createdAtFrom` for a date range: `?createdAtFrom=2024-01-01&createdAtTo=2024-12-31`
 *       - in: query
 *         name: createdAt
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-08"
 *         description: |
 *           Filter leads created on a specific date (YYYY-MM-DD).
 *           Example: `?createdAt=2024-12-08` returns leads created on December 8, 2024.
 *           This is a single date filter (not a range) - perfect for frontend date pickers showing "creations for this day".
 *           The date is inclusive (includes the entire day from 00:00:00 to 23:59:59).
 *           Takes priority over `createdAtFrom`/`createdAtTo` if provided.
 *           Example: `?createdAt=2024-12-08&store=Suitor Guy - Edappally`
 *       - in: query
 *         name: dateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-01-01"
 *         description: |
 *           Generic date range start (applies to the field specified by dateField parameter, default: enquiryDate).
 *           Only used if specific date filters (enquiryDateFrom, functionDateFrom, visitDateFrom, createdAtFrom) are not provided.
 *           Example: ?dateFrom=2024-01-01&dateTo=2024-12-31&dateField=enquiryDate
 *           Priority: Specific date fields take precedence over generic date range.
 *       - in: query
 *         name: dateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-31"
 *         description: |
 *           Generic date range end (applies to the field specified by dateField parameter, default: enquiryDate).
 *           Only used if specific date filters (enquiryDateTo, functionDateTo, visitDateTo, createdAtTo) are not provided.
 *           The date is inclusive (includes the entire day up to 23:59:59).
 *           Example: ?dateFrom=2024-01-01&dateTo=2024-12-31&dateField=functionDate
 *           Priority: Specific date fields take precedence over generic date range.
 *       - in: query
 *         name: dateField
 *         required: false
 *         schema:
 *           type: string
 *           enum: [enquiryDate, functionDate, visitDate, createdAt]
 *           default: enquiryDate
 *         description: |
 *           Which date field to use with `dateFrom`/`dateTo` parameters.
 *           Only used if specific date filters are not provided.
 *           Options:
 *           - `enquiryDate` (default) - Filter by enquiry date
 *           - `functionDate` - Filter by function/event date
 *           - `visitDate` - Filter by visit date
 *           - `createdAt` - Filter by lead creation date
 *           Example: `?dateFrom=2024-03-01&dateTo=2024-03-31&dateField=functionDate`
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (1-indexed).
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of records per page.
 *       - in: query
 *         name: sortBy
 *         required: false
 *         schema:
 *           type: string
 *           enum: [createdAt, enquiryDate, functionDate, visitDate, name, store]
 *           default: createdAt
 *         description: |
 *           Field to sort results by.
 *           Options:
 *           - `createdAt` (default) - Sort by creation date
 *           - `enquiryDate` - Sort by enquiry date
 *           - `functionDate` - Sort by function/event date
 *           - `visitDate` - Sort by visit date
 *           - `name` - Sort by lead name
 *           - `store` - Sort by store name
 *           Example: `?sortBy=createdAt&sortOrder=desc`
 *       - in: query
 *         name: sortOrder
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: |
 *           "Sort order: ascending (asc) or descending (desc)."
 *           Default is desc (newest first for dates).
 *           Example: ?sortBy=createdAt&sortOrder=desc (newest first)
 *           Example: ?sortBy=createdAt&sortOrder=asc (oldest first)
 *
 *     responses:
 *       200:
 *         description: Returns a list of leads and pagination info.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 leads:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       lead_name:
 *                         type: string
 *                       phone_number:
 *                         type: string
 *                       store:
 *                         type: string
 *                       lead_type:
 *                         type: string
 *                       call_status:
 *                         type: string
 *                       lead_status:
 *                         type: string
 *                       enquiry_date:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       function_date:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       visit_date:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       booking_number:
 *                         type: string
 *                         nullable: true
 *                       return_date:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       reason_collected_from_store:
 *                         type: string
 *                         nullable: true
 *                       attended_by:
 *                         type: string
 *                         nullable: true
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       assigned_to:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           employee_id:
 *                             type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *             examples:
 *               storeFiltering:
 *                 summary: Store filtering examples
 *                 value:
 *                   leads: []
 *                   pagination:
 *                     page: 1
 *                     limit: 100
 *                     total: 0
 *                     pages: 0
 *                 description: |
 *                   **Store Filtering API Endpoints:**
 *                   
 *                   1. Get all leads for a store (all lead types):
 *                      `GET /api/pages/leads?store=Suitor Guy - Edappally`
 *                   
 *                   2. Get Loss of Sale leads for a store:
 *                      `GET /api/pages/leads?leadType=lossOfSale&store=Suitor Guy - Edappally`
 *                   
 *                   3. Get Return leads for a store:
 *                      `GET /api/pages/leads?leadType=return&store=Suitor Guy - Kottayam`
 *                   
                     
 *                   4. Get leads for location only:
 *                      `GET /api/pages/leads?store=Kottayam`
 *                   
 *                   6. Get leads for brand only:
 *                      `GET /api/pages/leads?store=Suitor Guy`
 *               dateFiltering:
 *                 summary: Date filtering examples
 *                 value:
 *                   leads: []
 *                   pagination:
 *                     page: 1
 *                     limit: 100
 *                     total: 0
 *                     pages: 0
 *                 description: |
 *                   **Date Filtering API Endpoints:**
 *                   
 *                   1. Filter by enquiry date range:
 *                      `GET /api/pages/leads?enquiryDateFrom=2024-01-01&enquiryDateTo=2024-12-31`
 *                   
 *                   2. Filter by function date range:
 *                      `GET /api/pages/leads?functionDateFrom=2024-03-01&functionDateTo=2024-03-31`
 *                   
 *                   3. Filter by visit date (Loss of Sale):
 *                      `GET /api/pages/leads?leadType=lossOfSale&visitDateFrom=2024-02-01&visitDateTo=2024-02-28`
 *                   
 *                   4. Filter by creation date (single day):
 *                      `GET /api/pages/leads?createdAt=2024-12-08`
 *                   
 *                   5. Filter by creation date range:
 *                      `GET /api/pages/leads?createdAtFrom=2024-01-01&createdAtTo=2024-12-31`
 *                   
 *                   6. Generic date range (enquiry date):
 *                      `GET /api/pages/leads?dateFrom=2024-01-01&dateTo=2024-12-31&dateField=enquiryDate`
 *                   
 *                   7. Generic date range (function date):
 *                      `GET /api/pages/leads?dateFrom=2024-03-01&dateTo=2024-03-31&dateField=functionDate`
 *               combinedFilters:
 *                 summary: Combined store and date filtering examples
 *                 value:
 *                   leads: []
 *                   pagination:
 *                     page: 1
 *                     limit: 100
 *                     total: 0
 *                     pages: 0
 *                 description: |
 *                   **Combined Store + Date Filtering API Endpoints:**
 *                   
 *                   1. Store + Enquiry Date:
 *                      `GET /api/pages/leads?store=Suitor Guy - Edappally&enquiryDateFrom=2024-01-01&enquiryDateTo=2024-12-31`
 *                   
 *                   2. Lead Type + Store + Creation Date (single day):
 *                      `GET /api/pages/leads?leadType=return&store=Suitor Guy - Edappally&createdAt=2024-12-08`
 *                   
 *                   3. Lead Type + Store + Function Date:
 *                      `GET /api/pages/leads?leadType=return&store=Suitor Guy - Kottayam&functionDateFrom=2024-03-01&functionDateTo=2024-03-31`
 *                   
 *                   4. Loss of Sale + Store + Visit Date:
 *                      `GET /api/pages/leads?leadType=lossOfSale&store=Suitor Guy - Manjeri&visitDateFrom=2024-02-01&visitDateTo=2024-02-28`
 *                   
 *                   5. Store + Creation Date Range:
 *                      `GET /api/pages/leads?store=Suitor Guy - Edappally&createdAtFrom=2024-01-01&createdAtTo=2024-12-31`
 *       401:
 *         description: Unauthorized. Token missing or invalid.
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /api/pages/loss-of-sale/{id}:
 *   get:
 *     summary: Get Loss of Sale lead details
 *     tags:
 *       - Loss of Sale
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the lead
 *     responses:
 *       200:
 *         description: Loss of Sale lead details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lead_name: { type: string }
 *                 phone_number: { type: string }
 *                 visit_date: { type: string, format: date-time }
 *                 function_date: { type: string, format: date-time }
 *                 attended_by: { type: string }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/pages/loss-of-sale/{id}:
 *   post:
 *     summary: Update Loss of Sale lead
 *     tags:
 *       - Loss of Sale
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               call_status: { type: string }
 *               lead_status: { type: string }
 *               follow_up_date: 
 *                 type: string
 *                 format: date-time
 *                 description: "Follow-up date selected by telecaller. When provided, automatically sets followUpFlag=true and moves lead to FollowUps collection (not Reports). Date must come from frontend, not auto-generated."
 *               reason_collected_from_store: { type: string }
 *               subCategory: { type: string }
 *               sub_category: { type: string, description: "Alias for subCategory (snake_case)" }
 *               itemCategory: { type: string }
 *               closingAction: { type: string }
 *
 *               functionDate: { type: string, format: date-time }
 *               leadType: { type: string, enum: [lossOfSale, return, enquiry, booked], default: lossOfSale }
 *               remarks: { type: string }
 *               subCategory: { type: string }
 *               itemCategory: { type: string }
 *               closingAction: { type: string }

 *               functionDate: { type: string, format: date-time }
 *               leadType: { type: string, enum: [lossOfSale, return, enquiry, booked], default: lossOfSale }
 *               remarks: { type: string, nullable: true }
 *               call_duration: { type: number, description: "Call duration in seconds" }
 *               mark_as_complaint:
 *                 type: boolean
 *                 description: "Mark lead as complaint (highest priority). If true, lead moves to Complaints collection. Cannot be true if follow_up_flag is true."
 *               follow_up_flag:
 *                 type: boolean
 *                 description: "Mark for follow-up. If true and follow_up_date is provided, lead moves to FollowUps collection. Cannot be true if mark_as_complaint is true."
 *     responses:
 *       200:
 *         description: |
 *           Loss of Sale lead updated successfully. 
 *           Priority order: mark_as_complaint > follow_up_flag > default to Reports.
 *           - If mark_as_complaint=true → moves to Complaints collection
 *           - If follow_up_flag=true and follow_up_date provided → moves to FollowUps collection
 *           - Otherwise → moves to Reports collection
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 report: { type: object }
 *                 followUp: { type: object }
 *                 complaint: { type: object }
 *             examples:
 *               movedToReport:
 *                 summary: Moved to Reports (Default)
 *                 value:
 *                   message: "Loss of Sale lead updated and moved to reports"
 *                   report: { _id: "65a123...", lead_name: "John Doe", lead_type: "lossOfSale" }
 *               movedToFollowUp:
 *                 summary: Moved to FollowUps
 *                 value:
 *                   message: "Loss of Sale lead updated and moved to follow-ups"
 *                   followUp: { _id: "65b456...", lead_name: "John Doe", follow_up_date: "2024-03-01T10:00:00Z" }
 *               movedToComplaint:
 *                 summary: Moved to Complaints
 *                 value:
 *                   message: "Loss of Sale lead updated and moved to complaints"
 *                   complaint: { _id: "65c789...", lead_name: "John Doe", remarks: "Serious issue reported" }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/pages/return/{id}:
 *   get:
 *     summary: Get Return lead details
 *     tags:
 *       - Return
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Return lead details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lead_name: { type: string }
 *                 phone_number: { type: string }
 *                 booking_number: { type: string }
 *                 return_date: { type: string, format: date-time }
 *                 attended_by: { type: string }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/pages/return/{id}:
 *   post:
 *     summary: Update Return lead
 *     tags:
 *       - Return
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               call_status: { type: string }
 *               lead_status: { type: string }
 *               follow_up_flag: 
 *                 type: boolean
 *                 description: "Optional. If follow_up_date is provided, this is automatically set to true. Only set this explicitly if you want to mark for follow-up without providing a date."
 *               follow_up_date: 
 *                 type: string
 *                 format: date-time
 *                 description: "Follow-up date selected by telecaller. When provided, automatically sets followUpFlag=true and moves lead to FollowUps collection (not Reports). Date must come from frontend, not auto-generated."
 *               remarks: { type: string }
 *               subCategory: { type: string }
 *               sub_category: { type: string, description: "Alias for subCategory (snake_case)" }
 *               itemCategory: { type: string }
 *               closingAction: { type: string }
 *
 *               functionDate: { type: string, format: date-time }
 *               leadType: { type: string, enum: [lossOfSale, return, enquiry, booked], default: return }
 *               call_duration: { type: number, description: "Call duration in seconds" }
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: "Star rating (1-5) for return leads. Optional."
 *                 example: 4
 *               mark_as_complaint:
 *                 type: boolean
 *                 description: "Mark lead as complaint (highest priority). If true, lead moves to Complaints collection. Cannot be true if follow_up_flag is true."
 *               securityamount:
 *                 type: string
 *                 description: "Security amount deposit (String or Number)"
 *               sectionAmount:
 *                 type: string
 *                 description: "Alias for securityamount (String or Number)"
 *               service:
 *                 type: string
 *                 description: "Type of service provided"
 *               nooffunction:
 *                 type: number
 *                 description: "Number of functions"
 *               noofattires:
 *                 type: number
 *                 description: "Number of attires"
 *               competitor:
 *                 type: string
 *                 description: "Competitor name"
 *     responses:
 *       200:
 *         description: |
 *           Return lead updated successfully. 
 *           Priority order: mark_as_complaint > follow_up_flag > default to Reports.
 *           - If mark_as_complaint=true → moves to Complaints collection
 *           - If follow_up_flag=true and follow_up_date provided → moves to FollowUps collection
 *           - Otherwise → moves to Reports collection
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 report: { type: object }
 *                 followUp: { type: object }
 *                 complaint: { type: object }
 *             examples:
 *               movedToReport:
 *                 summary: Moved to Reports (Default)
 *                 value:
 *                   message: "Return lead updated and moved to reports"
 *                   report: { _id: "65a123...", lead_name: "John Doe", lead_type: "return" }
 *               movedToFollowUp:
 *                 summary: Moved to FollowUps
 *                 value:
 *                   message: "Return lead updated and moved to follow-ups"
 *                   followUp: { _id: "65b456...", lead_name: "John Doe", follow_up_date: "2024-03-01T10:00:00Z" }
 *               movedToComplaint:
 *                 summary: Moved to Complaints
 *                 value:
 *                   message: "Return lead updated and moved to complaints"
 *                   complaint: { _id: "65c789...", lead_name: "John Doe", remarks: "Item damaged on return" }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */





/**
 * @swagger
 * /api/pages/add-lead:
 *   post:
 *     summary: Create a new lead (Lead, FollowUp, or Complaint)
 *     tags:
 *       - Add Lead
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:

 *               - phone_number
 *               - store_location
 *             properties:
 *               customer_name:
 *                 type: string
 *                 nullable: true
 *                 description: "Optional. If not provided, stored as null."
 *               phone_number:
 *                 type: string
 *                 description: "Must be exactly 10 digits"
 *               brand:
 *                 type: string
 *               store_location:
 *                 type: string
 *               lead_status:
 *                 type: string
 *               call_status:
 *                 type: string
 *               subCategory:
 *                 type: string
 *               sub_category:
 *                 type: string
 *                 description: "Alias for subCategory (snake_case)"
 *               itemCategory:
 *                 type: string
 *               closingAction:
 *                 type: string

 *               remarks:
 *                 type: string
 *               call_duration:
 *                 type: number
 *                 description: "Call duration in seconds"
 *               leadType:
 *                 type: string
 *                 description: "Default: enquiry. Other values: lossOfSale, return, booked."
 *               functionDate:
 *                 type: string
 *                 format: date-time
 *               function_date:
 *                 type: string
 *                 format: date-time
 *                 description: "Alias for functionDate (snake_case)"
 *               mark_as_complaint:
 *                 type: boolean
 *                 description: "Priority 1. If true, creates a Complaint directly (bypassing Leads/FollowUps). Cannot be used with follow_up_flag."
 *               follow_up_flag:
 *                 type: boolean
 *                 description: "Priority 2. If true, creates a FollowUp directly (bypassing Leads). Requires follow_up_date."
 *               follow_up_date:
 *                 type: string
 *                 format: date-time
 *                 description: "Required if follow_up_flag is true."
 *     responses:
 *       201:
 *         description: |
 *           Resource created successfully. The response body contains one of 'report', 'followUp', or 'complaint' depending on routing:
 *           - If mark_as_complaint=true → returns { message, complaint }
 *           - If follow_up_flag=true → returns { message, followUp }
 *           - Otherwise (Default) → returns { message, report } (Saved directly to Reports)
 *       400:
 *         description: Validation error (invalid phone, missing date, conflicting flags)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin/Team Lead only)
 *       500:
 *         description: Internal server error
 */

import express from "express";
import { protect } from "../middlewares/auth.js";
import { allowRoles } from "../middlewares/roles.js";
import { handleValidation } from "../middlewares/validate.js";
import {
  getLeads,
  getLossOfSaleLead,
  updateLossOfSaleLead,
  getReturnLead,
  updateReturnLead,
  createAddLead,
  updateGenericLead,
  getLeadById,
  updateLead, // Assuming generic updateLead is used
  getFollowUps,
  getFollowUpById,
  updateFollowUp,
  getComplaints,
  getComplaintById,
} from "../controllers/pageController.js";
import {
  lossOfSaleGetValidator,
  lossOfSalePostValidator,
  returnGetValidator,
  returnPostValidator,
  addLeadPostValidator,
  leadUpdateValidator,
  leadGetValidator,
  leadsListValidator,
} from "../validators/pageValidators.js";

const router = express.Router();

// ==================== Leads Listing ====================
// GET /api/pages/leads - Fetch list of leads (with filters)
router.get("/leads", protect, leadsListValidator, handleValidation, getLeads);

/**
 * @swagger
 * /api/pages/leads/{id}:
 *   patch:
 *     summary: Generic update for any lead (including 'enquiry') and move it to reports
 *     tags:
 *       - Leads
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead id to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               call_status:
 *                 type: string
 *               lead_status:
 *                 type: string
 *               follow_up_flag:
 *                 type: boolean
 *                 description: "Optional. If follow_up_date is provided, this is automatically set to true. Only set this explicitly if you want to mark for follow-up without providing a date."
 *               follow_up_date:
 *                 type: string
 *                 format: date-time
 *                 description: "Follow-up date selected by telecaller. When provided, automatically sets followUpFlag=true and moves lead to FollowUps collection (not Reports). Date must come from frontend, not auto-generated."
 *               call_date:
 *                 type: string
 *                 format: date-time
 *               reason_collected_from_store:
 *                 type: string
 *               remarks:
 *                 type: string
 *               closing_status:
 *                 type: string
 *               rating:
 *                 type: integer
 *               call_duration:
 *                 type: number
 *                 description: "Call duration in seconds"
 *               subCategory:
 *                 type: string
 *               sub_category:
 *                 type: string
 *                 description: "Alias for subCategory (snake_case)"
 *               itemCategory:
 *                 type: string
 *               closingAction:
 *                 type: string

 *               mark_as_complaint:
 *                 type: boolean
 *                 description: "Mark lead as complaint (highest priority). If true, lead moves to Complaints collection. Cannot be true if follow_up_flag is true."
 *     responses:
 *       200:
 *         description: |
 *           Lead updated. 
 *           Priority order: mark_as_complaint > follow_up_flag > default to Reports.
 *           - If mark_as_complaint=true → moves to Complaints collection
 *           - If follow_up_flag=true and follow_up_date provided → moves to FollowUps collection
 *           - Otherwise → moves to Reports collection. Returns created report/complaint/followUp object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 report:
 *                   type: object
 */
router.patch(
  "/leads/:id",
  protect,
  leadUpdateValidator,
  handleValidation,
  updateLead
);

/**
 * @swagger
 * /api/pages/leads/{id}:
 *   post:
 *     summary: Generic update (POST) for any lead — same behavior as PATCH; moves lead to reports
 *     tags:
 *       - Leads
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead id to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               call_status: { type: string }
 *               lead_status: { type: string }
 *               follow_up_flag: { type: boolean }
 *               follow_up_date: { type: string, format: date-time }
 *               call_date: { type: string, format: date-time }
 *               reason_collected_from_store: { type: string }
 *               remarks: { type: string }
 *               closing_status: { type: string }
 *               rating: { type: integer }
 *               call_duration: { type: number, description: "Call duration in seconds" }
 *               subCategory: { type: string }
 *               sub_category: { type: string, description: "Alias for subCategory (snake_case)" }
 *               itemCategory: { type: string }
 *               closingAction: { type: string }
 *
 *               mark_as_complaint:
 *                 type: boolean
 *                 description: "Mark lead as complaint (highest priority). If true, lead moves to Complaints collection. Cannot be true if follow_up_flag is true."
 *     responses:
 *       200:
 *         description: |
 *           Lead updated. 
 *           Priority order: mark_as_complaint > follow_up_flag > default to Reports.
 *           - If mark_as_complaint=true → moves to Complaints collection
 *           - If follow_up_flag=true and follow_up_date provided → moves to FollowUps collection
 *           - Otherwise → moves to Reports collection
 */
router.post(
  "/leads/:id",
  protect,
  leadUpdateValidator,
  handleValidation,
  updateLead
);

/**
 * @swagger
 * /api/pages/leads/{id}:
 *   get:
 *     summary: Fetch any lead by id (no leadType required)
 *     tags:
 *       - Leads
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead id to fetch
 *     responses:
 *       200:
 *         description: Lead object in listing format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get(
  "/leads/:id",
  protect,
  leadGetValidator,
  handleValidation,
  getLeadById
);

// ==================== Loss of Sale Page Routes ====================
// GET /api/pages/loss-of-sale/:id - Fetch Loss of Sale lead data
router.get(
  "/loss-of-sale/:id",
  protect,
  lossOfSaleGetValidator,
  handleValidation,
  getLossOfSaleLead
);

// POST /api/pages/loss-of-sale/:id - Update Loss of Sale lead data
router.post(
  "/loss-of-sale/:id",
  protect,
  lossOfSalePostValidator,
  handleValidation,
  updateLossOfSaleLead
);

// ==================== Return Page Routes ====================
// GET /api/pages/return/:id - Fetch Return lead data
router.get(
  "/return/:id",
  protect,
  returnGetValidator,
  handleValidation,
  getReturnLead
);

// POST /api/pages/return/:id - Update Return lead data
router.post(
  "/return/:id",
  protect,
  returnPostValidator,
  handleValidation,
  updateReturnLead
);

// ==================== Add Lead Page Routes ====================
// POST /api/pages/add-lead - Create new lead (Admin/Team Lead only)
router.post(
  "/add-lead",
  protect,
  allowRoles("admin", "teamLead"),
  addLeadPostValidator,
  handleValidation,
  createAddLead
);

// ==================== Follow-Up Page Routes ====================
/**
 * @swagger
 * /api/pages/follow-ups:
 *   get:
 *     summary: Fetch FollowUp leads with optional filters
 *     tags:
 *       - Follow-Up
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns FollowUp leads filtered by optional parameters. FollowUp leads are leads that were moved from the Leads collection with `followUpFlag=true`.
 *       
 *       **3-Stage Lifecycle:**
 *       - **Leads** → Edited with `followUpFlag=true` → **FollowUps**
 *       - **FollowUps** → Edited → **Reports** (final state)
 *       
 *       **Filtering Options:**
 *       - **Store Filtering**: Supports "Brand - Location" format (e.g., "Suitor Guy - Edappally")
 *       - **Date Filtering**: Multiple date fields available with both range and single-day options
 *       - **Status Filtering**: Filter by callStatus, leadStatus, source
 *       - **Sorting**: Sort by createdAt, enquiryDate, functionDate, visitDate, name, or store (asc/desc)
 *       - **Pagination**: Control page size and navigation
 *       
 *       **Store Filter Examples:**
 *       - Get all FollowUp leads for a store: `/api/pages/follow-ups?store=Suitor Guy - Edappally`
 *       - Get specific lead type: `/api/pages/follow-ups?leadType=return&store=Zorucci - Kottayam`
 *       
 *       **Date Filter Examples:**
 *       - Filter by enquiry date: `/api/pages/follow-ups?enquiryDateFrom=2024-01-01&enquiryDateTo=2024-12-31`
 *       - Filter by function date: `/api/pages/follow-ups?functionDateFrom=2024-03-01&functionDateTo=2024-03-31`
 *       - Filter by creation date range: `/api/pages/follow-ups?createdAtFrom=2024-01-01&createdAtTo=2024-12-31`
 *     parameters:
 *       - in: query
 *         name: leadType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [lossOfSale, return, enquiry]
 *         description: Type of FollowUp lead to fetch. If omitted, returns FollowUp leads of all types.
 *       - in: query
 *         name: store
 *         required: false
 *         schema:
 *           type: string
 *           example: "Suitor Guy - Edappally"
 *         description: Filter FollowUp leads by store name using "Brand - Location" format.
 *       - in: query
 *         name: callStatus
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by call status.
 *       - in: query
 *         name: leadStatus
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by lead status.
 *       - in: query
 *         name: source
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by source (e.g., "Walk-in", "Booking", "Return", "Loss of Sale").
 *       - in: query
 *         name: enquiryDateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-01-01"
 *         description: Filter FollowUp leads with enquiry date on or after this date (YYYY-MM-DD).
 *       - in: query
 *         name: enquiryDateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-31"
 *         description: Filter FollowUp leads with enquiry date on or before this date (YYYY-MM-DD).
 *       - in: query
 *         name: functionDateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-03-01"
 *         description: Filter FollowUp leads with function/event date on or after this date (YYYY-MM-DD).
 *       - in: query
 *         name: functionDateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-03-31"
 *         description: Filter FollowUp leads with function/event date on or before this date (YYYY-MM-DD).
 *       - in: query
 *         name: visitDateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-02-01"
 *         description: Filter FollowUp leads with visit date on or after this date (YYYY-MM-DD).
 *       - in: query
 *         name: visitDateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-02-28"
 *         description: Filter FollowUp leads with visit date on or before this date (YYYY-MM-DD).
 *       - in: query
 *         name: createdAtFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-01-01"
 *         description: Filter FollowUp leads created on or after this date (YYYY-MM-DD).
 *       - in: query
 *         name: createdAtTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-31"
 *         description: Filter FollowUp leads created on or before this date (YYYY-MM-DD).
 *       - in: query
 *         name: createdAt
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-08"
 *         description: Filter FollowUp leads created on a specific date (YYYY-MM-DD).
 *       - in: query
 *         name: dateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-01-01"
 *         description: |
 *           Generic date range start (applies to the field specified by dateField parameter, default: enquiryDate).
 *       - in: query
 *         name: dateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-31"
 *         description: |
 *           Generic date range end (applies to the field specified by dateField parameter, default: enquiryDate).
 *       - in: query
 *         name: dateField
 *         required: false
 *         schema:
 *           type: string
 *           enum: [enquiryDate, functionDate, visitDate, createdAt]
 *           default: enquiryDate
 *         description: Which date field to use with `dateFrom`/`dateTo` parameters.
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (1-indexed).
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of records per page.
 *       - in: query
 *         name: sortBy
 *         required: false
 *         schema:
 *           type: string
 *           enum: [createdAt, enquiryDate, functionDate, visitDate, name, store]
 *           default: createdAt
 *         description: Field to sort results by.
 *       - in: query
 *         name: sortOrder
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: "Sort order: ascending (asc) or descending (desc)."
 *     responses:
 *       200:
 *         description: Returns a list of FollowUp leads and pagination info.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 leads:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       lead_name:
 *                         type: string
 *                       phone_number:
 *                         type: string
 *                       store:
 *                         type: string
 *                       lead_type:
 *                         type: string
 *                       call_status:
 *                         type: string
 *                       lead_status:
 *                         type: string
 *                       enquiry_date:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       function_date:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       visit_date:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       booking_number:
 *                         type: string
 *                         nullable: true
 *                       return_date:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       call_duration:
 *                         type: number
 *                         description: "Call duration in seconds"
 *                       remarks:
 *                         type: string
 *                       follow_up_date:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       assigned_to:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           employee_id:
 *                             type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *             examples:
 *               allFollowUps:
 *                 summary: Get all FollowUp leads
 *                 value:
 *                   leads: []
 *                   pagination:
 *                     page: 1
 *                     limit: 100
 *                     total: 0
 *                     pages: 0
 *               filteredByStore:
 *                 summary: Get FollowUp leads for a specific store
 *                 value:
 *                   leads: []
 *                   pagination:
 *                     page: 1
 *                     limit: 100
 *                     total: 0
 *                     pages: 0
 *       401:
 *         description: Unauthorized. Token missing or invalid.
 *       500:
 *         description: Internal server error.
 */
// GET /api/pages/follow-ups - Fetch list of FollowUp leads
router.get(
  "/follow-ups",
  protect,
  leadsListValidator,
  handleValidation,
  getFollowUps
);

/**
 * @swagger
 * /api/pages/follow-ups/{id}:
 *   get:
 *     summary: Get FollowUp lead details by ID
 *     tags:
 *       - Follow-Up
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns a single FollowUp lead by its ID. FollowUp leads are leads that were moved from the Leads collection with `followUpFlag=true` and are awaiting final follow-up before being moved to Reports.
 *       
 *       **Access Control:**
 *       - Admin: Can access all FollowUp leads
 *       - Team Lead: Can access FollowUp leads in their store
 *       - Telecaller: Can access only FollowUp leads assigned to them
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: FollowUp lead ID
 *     responses:
 *       200:
 *         description: FollowUp lead details in listing format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 lead_name:
 *                   type: string
 *                 phone_number:
 *                   type: string
 *                 store:
 *                   type: string
 *                 lead_type:
 *                   type: string
 *                 call_status:
 *                   type: string
 *                 lead_status:
 *                   type: string
 *                 enquiry_date:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 function_date:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 visit_date:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 booking_number:
 *                   type: string
 *                   nullable: true
 *                 return_date:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 call_duration:
 *                   type: number
 *                   description: "Call duration in seconds"
 *                 remarks:
 *                   type: string
 *                 follow_up_date:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 assigned_to:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     employee_id:
 *                       type: string
 *       401:
 *         description: Unauthorized. Token missing or invalid.
 *       403:
 *         description: Access denied. User doesn't have permission to access this FollowUp lead.
 *       404:
 *         description: FollowUp lead not found.
 *       500:
 *         description: Internal server error.
 */
// GET /api/pages/follow-ups/:id - Fetch FollowUp lead by id
router.get(
  "/follow-ups/:id",
  protect,
  leadGetValidator,
  handleValidation,
  getFollowUpById
);

/**
 * @swagger
 * /api/pages/follow-ups/{id}:
 *   post:
 *     summary: Update FollowUp lead and move to Reports
 *     tags:
 *       - Follow-Up
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Updates a FollowUp lead with new call status, lead status, remarks, and call duration. After updating, the FollowUp lead is moved to the Reports collection (final state).
 *       
 *       **CRITICAL: This endpoint ONLY works with FollowUp model, NOT Lead model.**
 *       - Fetches lead ONLY from FollowUps collection
 *       - If lead is not found in FollowUps, returns 404 error
 *       - Does NOT touch the Leads collection
 *       
 *       **3-Stage Lifecycle (Strict Enforcement):**
 *       1. **Leads** → Edited with `followUpFlag=true` → **FollowUps** (NO Report created)
 *       2. **FollowUps** → Edited (this endpoint) → **Reports** (final state)
 *       
 *       **Important Notes:**
 *       - FollowUp leads can only be moved to Reports (final state)
 *       - All fields (callStatus, leadStatus, callDuration, remarks, leadType, store) are preserved
 *       - The FollowUp lead is removed from FollowUps collection after update
 *       - Reports are sorted by `lead_type` (lossOfSale, return, enquiry, booked)
 *       - The `lead_type` from FollowUp is explicitly preserved in the Report for proper sorting
 *       - Reports are created ONLY in this endpoint, NEVER when moving Leads → FollowUps
 *       
 *       **Access Control:**
 *       - Admin: Can update all FollowUp leads
 *       - Team Lead: Can update FollowUp leads in their store
 *       - Telecaller: Can update only FollowUp leads assigned to them
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: FollowUp lead ID to update (must exist in FollowUps collection, not Leads)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               call_status:
 *                 type: string
 *                 description: Updated call status
 *                 example: "Called"
 *               lead_status:
 *                 type: string
 *                 description: Updated lead status
 *                 example: "Interested"
 *               follow_up_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: Follow-up date (optional, preserves existing if not provided). Can be updated if needed.
 *                 example: "2024-03-15T10:00:00Z"
 *               remarks:
 *                 type: string
 *                 nullable: true
 *                 description: Updated remarks. **Only include if user provides input.** If no input, use `null` or omit the field. Max 1000 characters if provided.
 *                 example: null
 *               subCategory:
 *                 type: string
 *               sub_category:
 *                 type: string
 *                 description: "Alias for subCategory (snake_case)"
 *               itemCategory:
 *                 type: string
 *               closingAction:
 *                 type: string

 *               functionDate:
 *                 type: string
 *                 format: date-time
 *               leadType:
 *                 type: string
 *                 enum: [lossOfSale, return, enquiry, booked]
 *                 default: enquiry
 *               mark_as_complaint:
 *                 type: boolean
 *                 description: "Mark lead as complaint (highest priority). If true, lead moves to Complaints collection instead of Reports."
 *                 example: false
 *               follow_up_flag:
 *                 type: boolean
 *                 description: "Mark for follow-up. If true and follow_up_date is provided, lead stays in FollowUps collection (id may change)."
 *                 example: false
 *               call_duration:
 *                 type: number
 *                 description: Call duration in seconds
 *                 example: 300
 *                 minimum: 0
 *               sectionAmount:
 *                 type: string
 *                 description: "Alias for securityamount (String or Number)"
 *           required:
 *             - call_status
 *             - lead_status
 *     responses:
 *       200:
 *         description: Lead updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 report: { type: object }
 *                 followUp: { type: object }
 *                 complaint: { type: object }
 *             examples:
 *               movedToReport:
 *                 summary: Moved to Reports (Default)
 *                 value:
 *                   message: "Follow-up lead updated and moved to reports"
 *                   report: { _id: "65a123...", lead_name: "John Doe", lead_type: "enquiry" }
 *               rescheduledFollowUp:
 *                 summary: Rescheduled Follow-Up (Follow-up Again)
 *                 value:
 *                   message: "Follow-up lead updated and scheduled for next follow-up"
 *                   followUp: { _id: "65b456...", lead_name: "John Doe", follow_up_date: "2024-03-20T10:00:00Z", follow_up_flag: true }
 *               movedToComplaint:
 *                 summary: Moved to Complaints
 *                 value:
 *                   message: "Follow-up lead updated and moved to complaints"
 *                   complaint: { _id: "65c789...", lead_name: "John Doe", remarks: "Serious issue reported" }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: FollowUp lead not found
 *       500:
 *         description: Internal server error
 */
// POST /api/pages/follow-ups/:id - Update FollowUp lead (moves to Reports)
router.post(
  "/follow-ups/:id",
  protect,
  leadUpdateValidator,
  handleValidation,
  updateFollowUp
);

// ==================== Complaints (Issue Calls) Routes ====================

/**
 * @swagger
 * /api/pages/complaints:
 *   get:
 *     summary: Fetch complaints (leads marked as issues) with optional filters
 *     tags:
 *       - Complaints
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns complaints (leads marked as issues) filtered by optional parameters.
 *       
 *       **Filtering Options:**
 *       - **Lead Type**: Filter by leadType (lossOfSale, return, enquiry)
 *       - **Store Filtering**: Supports "Brand - Location" format (e.g., "Suitor Guy - Edappally")
 *       - **Sorting**: Sort by complaintMarkedAt, createdAt, name, or store (asc/desc)
 *       - **Pagination**: Control page size and navigation
 *     parameters:
 *       - in: query
 *         name: leadType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [lossOfSale, return, enquiry, booked]
 *         description: Type of lead to fetch. If omitted, returns complaints of all types.
 *       - in: query
 *         name: store
 *         required: false
 *         schema:
 *           type: string
 *           example: "Suitor Guy - Edappally"
 *         description: Filter by store name using "Brand - Location" format.
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (1-indexed).
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of records per page.
 *       - in: query
 *         name: sortBy
 *         required: false
 *         schema:
 *           type: string
 *           enum: [complaintMarkedAt, createdAt, name, store]
 *           default: complaintMarkedAt
 *         description: Field to sort results by. Default is complaintMarkedAt (most recently marked issues first).
 *       - in: query
 *         name: sortOrder
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: "Sort order: ascending (asc) or descending (desc). Default is desc."
 *     responses:
 *       200:
 *         description: Returns a list of complaints and pagination info.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 complaints:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Complaint'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized. Token missing or invalid.
 *       500:
 *         description: Internal server error.
 */
router.get("/complaints", protect, getComplaints);

/**
 * @swagger
 * /api/pages/complaints/{id}:
 *   get:
 *     summary: Get a single complaint by ID
 *     tags:
 *       - Complaints
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Complaint ID
 *     responses:
 *       200:
 *         description: Returns the complaint details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Complaint'
 *       404:
 *         description: Complaint not found.
 *       401:
 *         description: Unauthorized. Token missing or invalid.
 *       500:
 *         description: Internal server error.
 */
router.get("/complaints/:id", protect, getComplaintById);

/**
 * @swagger
 * components:
 *   schemas:
 *     Complaint:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Complaint ID
 *         name:
 *           type: string
 *           description: Lead name
 *         phone:
 *           type: string
 *           description: Lead phone number
 *         store:
 *           type: string
 *           description: Store name
 *         leadType:
 *           type: string
 *           enum: [lossOfSale, return, enquiry, booked]
 *           description: Lead type
 *         source:
 *           type: string
 *           description: Lead source
 *         brand:
 *           type: string
 *           description: Brand name
 *         callStatus:
 *           type: string
 *           description: Call status
 *         leadStatus:
 *           type: string
 *           description: Lead status
 *         callDuration:
 *           type: number
 *           description: Call duration in seconds
 *         remarks:
 *           type: string
 *           description: Remarks about the issue
 *         complaintMarkedBy:
 *           type: object
 *           description: User who marked the lead as issue
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             employeeId:
 *               type: string
 *         complaintMarkedAt:
 *           type: string
 *           format: date-time
 *           description: When the lead was marked as issue
 *         sourceLeadId:
 *           type: string
 *           description: Reference to original lead ID
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         sectionAmount:
 *           type: string
 *           description: "Alias for securityamount (String or Number)"
 *         # All other lead fields are also present (enquiryDate, functionDate, visitDate, returnDate, bookingNo, securityAmount, etc.)
 */

// Simple test route (for Swagger sanity check)
router.get("/test", (req, res) => {
  res.json({ message: "Swagger is working!" });
});

export default router;
