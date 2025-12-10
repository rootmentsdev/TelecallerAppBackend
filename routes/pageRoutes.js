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
 *       - Get specific lead type: `/api/pages/leads?leadType=bookingConfirmation&store=Zorucci - Kottayam`
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
 *       - Lead Type + Store + Creation Date: `/api/pages/leads?leadType=bookingConfirmation&store=Suitor Guy - Edappally&createdAt=2024-12-08`
 *       - Lead Type + Store + Date Range: `/api/pages/leads?leadType=bookingConfirmation&store=Suitor Guy - Kottayam&functionDateFrom=2024-03-01&functionDateTo=2024-03-31`
 *       - Today's General Leads (Newest First): `/api/pages/leads?leadType=general&createdAt=2024-12-10&sortBy=createdAt&sortOrder=desc`
 *       - Sort by Name: `/api/pages/leads?leadType=lossOfSale&sortBy=name&sortOrder=asc`
 *     parameters:
 *       - in: query
 *         name: leadType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [lossOfSale, general, bookingConfirmation, rentOutFeedback, justDial]
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
 *           - Works with all lead types (lossOfSale, rentOutFeedback, bookingConfirmation, general, justDial)
 *           
 *           **Examples:**
 *           - Get all leads for a store: `?store=Suitor Guy - Edappally`
 *           - Get specific lead type: `?leadType=bookingConfirmation&store=Suitor Guy - Edappally`
 *           - Get all leads for location: `?store=Kottayam`
 *           - Get rent-out leads: `?leadType=rentOutFeedback&store=Suitor Guy - Kottayam`
 *           - Get loss of sale leads: `?leadType=lossOfSale&store=Suitor Guy - Manjeri`
 *           
 *           **Use Cases:**
 *           - **Loss of Sale Area**: Filter by store for loss of sale leads
 *             - `?leadType=lossOfSale&store=Suitor Guy - Edappally`
 *           - **Rent Out Area**: Filter by store for rent-out leads
 *             - `?leadType=rentOutFeedback&store=Suitor Guy - Kottayam`
 *           - **Booking Confirmation Area**: Filter by store for booking confirmation leads
 *             - `?leadType=bookingConfirmation&store=Suitor Guy - Edappally`
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
 *         description: Filter by source (e.g., "Walk-in", "Booking", "Rent-out", "Loss of Sale").
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
 *           Useful for filtering booking confirmation and rent-out leads by event date.
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
 *           Generic date range start (applies to the field specified by `dateField`, default: `enquiryDate`).
 *           Only used if specific date filters (`enquiryDateFrom`, `functionDateFrom`, `visitDateFrom`, `createdAtFrom`) are not provided.
 *           Example: `?dateFrom=2024-01-01&dateTo=2024-12-31&dateField=enquiryDate`
 *           Priority: Specific date fields take precedence over generic date range.
 *       - in: query
 *         name: dateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-31"
 *         description: |
 *           Generic date range end (applies to the field specified by `dateField`, default: `enquiryDate`).
 *           Only used if specific date filters (`enquiryDateTo`, `functionDateTo`, `visitDateTo`, `createdAtTo`) are not provided.
 *           The date is inclusive (includes the entire day up to 23:59:59).
 *           Example: `?dateFrom=2024-01-01&dateTo=2024-12-31&dateField=functionDate`
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
 *           Sort order: ascending (`asc`) or descending (`desc`).
 *           Default is `desc` (newest first for dates).
 *           Example: `?sortBy=createdAt&sortOrder=desc` (newest first)
 *           Example: `?sortBy=createdAt&sortOrder=asc` (oldest first)
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
 *                   3. Get Rent Out leads for a store:
 *                      `GET /api/pages/leads?leadType=rentOutFeedback&store=Suitor Guy - Kottayam`
 *                   
 *                   4. Get Booking Confirmation leads for a store:
 *                      `GET /api/pages/leads?leadType=bookingConfirmation&store=Suitor Guy - Edappally`
 *                   
 *                   5. Get leads for location only:
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
 *                      `GET /api/pages/leads?leadType=bookingConfirmation&store=Suitor Guy - Edappally&createdAt=2024-12-08`
 *                   
 *                   3. Lead Type + Store + Function Date:
 *                      `GET /api/pages/leads?leadType=rentOutFeedback&store=Suitor Guy - Kottayam&functionDateFrom=2024-03-01&functionDateTo=2024-03-31`
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
 *               follow_up_date: { type: string, format: date-time }
 *               reason_collected_from_store: { type: string }
 *               remarks: { type: string }
 *     responses:
 *       200:
 *         description: Loss of Sale lead updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/pages/rent-out/{id}:
 *   get:
 *     summary: Get Rent-Out lead details
 *     tags:
 *       - Rent Out
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
 *         description: Rent-Out lead details
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
 *                 security_amount: { type: string }
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
 * /api/pages/rent-out/{id}:
 *   post:
 *     summary: Update Rent-Out lead
 *     tags:
 *       - Rent Out
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
 *               follow_up_flag: { type: boolean }
 *               call_date: { type: string, format: date-time }
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               remarks: { type: string }
 *     responses:
 *       200:
 *         description: Rent-Out lead updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/pages/booking-confirmation/{id}:
 *   get:
 *     summary: Get Booking Confirmation lead
 *     tags:
 *       - Booking Confirmation
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
 *         description: Booking confirmation lead details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lead_name: { type: string }
 *                 phone_number: { type: string }
 *                 enquiry_date: { type: string, format: date-time }
 *                 function_date: { type: string, format: date-time }
 *                 booking_number: { type: string }
 *                 security_amount: { type: string }
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
 * /api/pages/booking-confirmation/{id}:
 *   post:
 *     summary: Update Booking Confirmation lead
 *     tags:
 *       - Booking Confirmation
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
 *               follow_up_flag: { type: boolean }
 *               call_date: { type: string, format: date-time }
 *               remarks: { type: string }
 *     responses:
 *       200:
 *         description: Booking Confirmation lead updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/pages/just-dial/{id}:
 *   get:
 *     summary: Get Just Dial lead details
 *     tags:
 *       - Just Dial
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
 *         description: Just Dial lead details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lead_name: { type: string }
 *                 phone_number: { type: string }
 *                 enquiry_date: { type: string, format: date-time }
 *                 function_date: { type: string, format: date-time }
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
 * /api/pages/just-dial/{id}:
 *   post:
 *     summary: Update Just Dial lead
 *     tags:
 *       - Just Dial
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
 *               closing_status: { type: string }
 *               reason: { type: string }
 *               follow_up_flag: { type: boolean }
 *               call_date: { type: string, format: date-time }
 *               remarks: { type: string }
 *     responses:
 *       200:
 *         description: Just Dial lead updated
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
 *     summary: Create a new lead
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
 *             properties:
 *               customer_name: { type: string }
 *               phone_number: { type: string }
 *               brand: { type: string }
 *               store_location: { type: string }
 *               lead_status: { type: string }
 *               call_status: { type: string }
 *               follow_up_date: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Lead created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only admin or teamLead can add leads
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
  getRentOutLead,
  updateRentOutLead,
  getBookingConfirmationLead,
  updateBookingConfirmationLead,
  getJustDialLead,
  updateJustDialLead,
  createAddLead,
  updateGenericLead,
  getLeadById,
} from "../controllers/pageController.js";
import {
  lossOfSaleGetValidator,
  lossOfSalePostValidator,
  rentOutGetValidator,
  rentOutPostValidator,
  bookingConfirmationGetValidator,
  bookingConfirmationPostValidator,
  justDialGetValidator,
  justDialPostValidator,
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
 *     summary: Generic update for any lead (including 'general') and move it to reports
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
 *               follow_up_date:
 *                 type: string
 *                 format: date-time
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
 *     responses:
 *       200:
 *         description: Lead updated and moved to reports. Returns created report object.
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
  updateGenericLead
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
 *     responses:
 *       200:
 *         description: Lead updated and moved to reports
 */
router.post(
  "/leads/:id",
  protect,
  leadUpdateValidator,
  handleValidation,
  updateGenericLead
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

// ==================== Rent-Out Page Routes ====================
// GET /api/pages/rent-out/:id - Fetch Rent-Out lead data
router.get(
  "/rent-out/:id",
  protect,
  rentOutGetValidator,
  handleValidation,
  getRentOutLead
);

// POST /api/pages/rent-out/:id - Update Rent-Out lead data
router.post(
  "/rent-out/:id",
  protect,
  rentOutPostValidator,
  handleValidation,
  updateRentOutLead
);

// ==================== Booking Confirmation Page Routes ====================
// GET /api/pages/booking-confirmation/:id - Fetch Booking Confirmation lead data
router.get(
  "/booking-confirmation/:id",
  protect,
  bookingConfirmationGetValidator,
  handleValidation,
  getBookingConfirmationLead
);

// POST /api/pages/booking-confirmation/:id - Update Booking Confirmation lead data
router.post(
  "/booking-confirmation/:id",
  protect,
  bookingConfirmationPostValidator,
  handleValidation,
  updateBookingConfirmationLead
);

// ==================== Just Dial Page Routes ====================
// GET /api/pages/just-dial/:id - Fetch Just Dial lead data
router.get(
  "/just-dial/:id",
  protect,
  justDialGetValidator,
  handleValidation,
  getJustDialLead
);

// POST /api/pages/just-dial/:id - Update Just Dial lead data
router.post(
  "/just-dial/:id",
  protect,
  justDialPostValidator,
  handleValidation,
  updateJustDialLead
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

// Simple test route (for Swagger sanity check)
router.get("/test", (req, res) => {
  res.json({ message: "Swagger is working!" });
});

export default router;
