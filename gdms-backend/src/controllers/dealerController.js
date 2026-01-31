const { getConnection } = require('../config/database');
const { generateId } = require('../utils/generateId');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const ExcelJS = require('exceljs');


// Fetch all dealers 
const getAllDealers = async (req, res, next) => {
  try {
    const pool = await getConnection();

    // Get search and status parameters from query string
    // Example: /dealers?search=ABC Stores&status=ACTIVE
    const { search, status } = req.query;

    // Build SQL query
    let query = `
      SELECT 
        dealer_id,
        dealer_name,
        contact_number,
        alternative_contact,
        email,
        route,
        credit_limit,
        current_credit,
        (credit_limit - current_credit) as available_credit,
        status,
        address,
        created_at
      FROM dealers 
      WHERE 1=1
    `;

    const params = [];
    
    // Filter by status if provided
    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    
    if (search) {
      query += ` AND (
        dealer_name LIKE ? OR 
        contact_number LIKE ? OR 
        email LIKE ? OR
        dealer_id LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Order by creation date (newest first)
    query += ' ORDER BY created_at DESC';

    // Execute query
    const [dealers] = await pool.execute(query, params);

    // Return success with dealers data
    return successResponse(res, 200, 'Dealers retrieved successfully', dealers);

  } catch (error) {
    next(error);
  }
};

//get dealer by ID
const getDealerById = async (req, res, next) => {
  try {
    const pool = await getConnection();
    const { id } = req.params;

    // Query for specific dealer
    const [dealers] = await pool.execute(
      `SELECT 
        dealer_id,
        dealer_name,
        address,
        contact_number,
        alternative_contact,
        email,
        route,
        credit_limit,
        current_credit,
        (credit_limit - current_credit) as available_credit,
        payment_terms_days,
        status,
        created_at,
        updated_at
      FROM dealers 
      WHERE dealer_id = ?`,
      [id]
    );

    // Check if dealer exists
    if (dealers.length === 0) {
      return errorResponse(res, 404, 'Dealer not found');
    }

    // Return dealer data
    return successResponse(res, 200, 'Dealer retrieved successfully', dealers[0]);

  } catch (error) {
    next(error);
  }
};

// Add new dealer to system
const createDealer = async (req, res, next) => {
  // Extract data from form submission
  const {
    dealer_name,
    contact_number,
    alternative_contact,
    email,
    route,
    credit_limit,
    address,
    payment_terms_days
  } = req.body;

  try {
    const pool = await getConnection();

    // Step 1: Check if contact number already exists
    // This prevents duplicate dealers
    const [existingDealer] = await pool.execute(
      'SELECT dealer_id FROM dealers WHERE contact_number = ?',
      [contact_number]
    );

    if (existingDealer.length > 0) {
      return errorResponse(res, 409, 'Dealer with this contact number already exists');
    }

    // Step 2: Generate unique dealer ID
    // Format: D001, D002, etc.
    // Get the latest dealer ID
    const [lastDealer] = await pool.execute(
      'SELECT dealer_id FROM dealers ORDER BY created_at DESC LIMIT 1'
    );

    let dealer_id;
    if (lastDealer.length > 0) {
      const lastId = lastDealer[0].dealer_id;
      const lastNumber = parseInt(lastId.substring(1));
      const nextNumber = lastNumber + 1;
      dealer_id = `D${String(nextNumber).padStart(3, '0')}`;
    } else {
      dealer_id = 'D001';
    }

    // Step 3: Get current user ID (who is creating this dealer)
    // This comes from JWT token (set by authenticateToken middleware)
    const created_by = req.user.userId;

    // Step 4: Insert new dealer into database
    await pool.execute(
      `INSERT INTO dealers (
        dealer_id, 
        dealer_name, 
        address, 
        contact_number,
        alternative_contact,
        email, 
        route, 
        credit_limit,
        current_credit,
        payment_terms_days,
        status,
        created_by
      )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'ACTIVE', ?)`,
      [
        dealer_id,
        dealer_name,
        address,
        contact_number,
        alternative_contact || null,
        email || null,
        route || null,
        credit_limit || 0,
        payment_terms_days || 30,
        created_by
      ]
    );

    // Audit logging removed due to table structure issues

    // Step 6: Return success with new dealer ID
    return successResponse(res, 201, 'Dealer created successfully', {
      dealer_id,
      dealer_name,
      contact_number,
      route,
      credit_limit
    });

  } catch (error) {
    // Handle duplicate entry errors
    if (error.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, 409, 'Dealer with this contact number already exists');
    }
    next(error);
  }
};
// UPDATE EXISTING DEALER INFORMATION
const updateDealer = async (req, res, next) => {
  const { id } = req.params;  // Get dealer_id from URL
  const updateData = req.body; // Get changed data from form

  try {
    const pool = await getConnection();

    // Step 1: Check if dealer exists
    const [existingDealer] = await pool.execute(
      'SELECT dealer_id, dealer_name, status FROM dealers WHERE dealer_id = ?',
      [id]
    );

    if (existingDealer.length === 0) {
      return errorResponse(res, 404, 'Dealer not found');
    }

    // Step 2: Build dynamic UPDATE query
    // Only update fields that were provided in the request
    const updateFields = [];
    const params = [];

    // Check each possible field and add to update if provided
    if (updateData.dealer_name !== undefined) {
      updateFields.push('dealer_name = ?');
      params.push(updateData.dealer_name);
    }
    if (updateData.address !== undefined) {
      updateFields.push('address = ?');
      params.push(updateData.address);
    }
    if (updateData.contact_number !== undefined) {
      updateFields.push('contact_number = ?');
      params.push(updateData.contact_number);
    }
    if (updateData.alternative_contact !== undefined) {
      updateFields.push('alternative_contact = ?');
      params.push(updateData.alternative_contact);
    }
    if (updateData.email !== undefined) {
      updateFields.push('email = ?');
      params.push(updateData.email);
    }
    if (updateData.route !== undefined) {
      updateFields.push('route = ?');
      params.push(updateData.route);
    }
    if (updateData.credit_limit !== undefined) {
      updateFields.push('credit_limit = ?');
      params.push(updateData.credit_limit);
    }
    if (updateData.payment_terms_days !== undefined) {
      updateFields.push('payment_terms_days = ?');
      params.push(updateData.payment_terms_days);
    }
    if (updateData.status !== undefined) {
      updateFields.push('status = ?');
      params.push(updateData.status);
    }

    // Step 3: If no fields to update, return error
    if (updateFields.length === 0) {
      return errorResponse(res, 400, 'No fields to update');
    }

    // Step 4: Add updated_at timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    // Step 5: Add dealer_id to params for WHERE clause
    params.push(id);

    // Step 6: Execute update query
    const query = `UPDATE dealers SET ${updateFields.join(', ')} WHERE dealer_id = ?`;
    await pool.execute(query, params);

    // Audit logging removed due to table structure issues

    // Step 8: Return success
    return successResponse(res, 200, 'Dealer updated successfully');

  } catch (error) {
    // Handle duplicate contact number
    if (error.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, 409, 'Contact number already exists');
    }
    next(error);
  }
};

// Mark dealer as INACTIVE
const deleteDealer = async (req, res, next) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();

    // Step 1: Check if dealer exists
    const [existingDealer] = await pool.execute(
      'SELECT dealer_id, dealer_name, status FROM dealers WHERE dealer_id = ?',
      [id]
    );

    if (existingDealer.length === 0) {
      return errorResponse(res, 404, 'Dealer not found');
    }

    // Step 2: Check if dealer has active credits
    // Don't allow deletion if dealer owes money
    const [activeCredits] = await pool.execute(
      `SELECT COUNT(*) as count, SUM(remaining_balance) as total_outstanding
       FROM credit_transactions 
       WHERE dealer_id = ? AND status IN ('ACTIVE', 'PARTIAL', 'OVERDUE')`,
      [id]
    );

    if (activeCredits[0].count > 0 && activeCredits[0].total_outstanding > 0) {
      return errorResponse(
        res,
        400,
        `Cannot delete dealer with outstanding credit balance of Rs. ${activeCredits[0].total_outstanding}`
      );
    }

    // Step 3: Soft delete - Set status to INACTIVE
    // This preserves historical data (invoices, transactions, etc.)
    await pool.execute(
      'UPDATE dealers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE dealer_id = ?',
      ['INACTIVE', id]
    );

    // Audit logging removed due to table structure issues

    // Step 5: Return success
    return successResponse(res, 200, 'Dealer deleted successfully');

  } catch (error) {
    next(error);
  }
};

// ============================================
// TOGGLE DEALER STATUS
// ============================================
// Purpose: Toggle dealer between ACTIVE and INACTIVE
// Route: PATCH /api/v1/dealers/:id/toggle-status
const toggleDealerStatus = async (req, res, next) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();

    // Step 1: Check if dealer exists and get current status
    const [existingDealer] = await pool.execute(
      'SELECT dealer_id, dealer_name, status FROM dealers WHERE dealer_id = ?',
      [id]
    );

    if (existingDealer.length === 0) {
      return errorResponse(res, 404, 'Dealer not found');
    }

    const currentStatus = existingDealer[0].status;
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    // Step 2: Update status
    // Admin can deactivate for various reasons:
    // - Dealer not operating anymore
    // - Credit limit exceeded and not paying
    // - Admin wants to prevent supervisor from invoicing to this dealer
    await pool.execute(
      'UPDATE dealers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE dealer_id = ?',
      [newStatus, id]
    );

    // Step 3: Return success with new status
    const action = newStatus === 'ACTIVE' ? 'activated' : 'inactivated';
    return successResponse(res, 200, `Dealer ${action} successfully`, {
      dealer_id: id,
      dealer_name: existingDealer[0].dealer_name,
      previous_status: currentStatus,
      new_status: newStatus
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// GET DEALER STATISTICS
// ============================================
// Purpose: Get dealer summary for dashboard
// Route: GET /api/v1/dealers/stats
const getDealerStats = async (req, res, next) => {
  try {
    const pool = await getConnection();

    // Get counts by status
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_dealers,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_dealers,
        SUM(CASE WHEN status = 'INACTIVE' THEN 1 ELSE 0 END) as inactive_dealers,
        SUM(CASE WHEN status = 'BLACKLISTED' THEN 1 ELSE 0 END) as blacklisted_dealers,
        SUM(credit_limit) as total_credit_limit,
        SUM(current_credit) as total_outstanding_credit,
        AVG(credit_limit) as avg_credit_limit
      FROM dealers
    `);

    return successResponse(res, 200, 'Dealer statistics retrieved successfully', stats[0]);

  } catch (error) {
    next(error);
  }
};

//Export dealers data to Excel file with optional route filter

const exportDealersToExcel = async (req, res, next) => {
  try {
    const pool = await getConnection();
    const { route } = req.query;

    // Build query with optional route filter
    let query = `
      SELECT 
        dealer_id,
        dealer_name,
        contact_number,
        alternative_contact,
        email,
        route,
        address,
        credit_limit,
        current_credit,
        (credit_limit - current_credit) as available_credit,
        status,
        created_at
      FROM dealers 
      WHERE 1=1
    `;

    const params = [];
    if (route && route !== 'all') {
      query += ` AND route = ?`;
      params.push(route);
    }

    query += ' ORDER BY route, dealer_name';

    const [dealers] = await pool.execute(query, params);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GDMS - Hidellana Distributors';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Dealers');

    // ============ COMPANY HEADER (Rows 1-4) ============
    worksheet.mergeCells('A1:K1');
    worksheet.getCell('A1').value = 'HIDELLANA DISTRIBUTORS (PVT) LTD';
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:K2');
    worksheet.getCell('A2').value = 'Company Registration No PV 113085';
    worksheet.getCell('A2').font = { size: 11 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A3:K3');
    worksheet.getCell('A3').value = 'Registered Office Address: No.343/10, Rajasinghe Mawatha, Hewagama, Kaduwela.';
    worksheet.getCell('A3').font = { size: 10 };
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A4:K4');
    worksheet.getCell('A4').value = 'Warehouse: Kahangama Road, Edandawala, Kuruwita.';
    worksheet.getCell('A4').font = { size: 10 };
    worksheet.getCell('A4').alignment = { horizontal: 'center' };

    // ============ SET COLUMN WIDTHS ============
    worksheet.getColumn('A').width = 12;  // Dealer ID
    worksheet.getColumn('B').width = 25;  // Name
    worksheet.getColumn('C').width = 15;  // Contact
    worksheet.getColumn('D').width = 15;  // Alt Contact
    worksheet.getColumn('E').width = 25;  // Email
    worksheet.getColumn('F').width = 15;  // Route
    worksheet.getColumn('G').width = 30;  // Address
    worksheet.getColumn('H').width = 15;  // Credit Limit
    worksheet.getColumn('I').width = 15;  // Current Credit
    worksheet.getColumn('J').width = 15;  // Available Credit
    worksheet.getColumn('K').width = 12;  // Status

    // ============ TABLE HEADER (Row 6) ============
    const headerRow = worksheet.getRow(6);
    headerRow.values = ['Dealer ID', 'Name', 'Contact', 'Alt. Contact', 'Email', 'Route', 'Address', 'Credit Limit', 'Current Credit', 'Available Credit', 'Status'];
    
    // Style table header (row 6, columns A-K only)
    for (let col = 1; col <= 11; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4F46E5' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // ============ DATA ROWS (Starting Row 7) ============
    let rowNumber = 7;
    dealers.forEach(dealer => {
      const row = worksheet.getRow(rowNumber);
      row.values = [
        dealer.dealer_id,
        dealer.dealer_name,
        dealer.contact_number,
        dealer.alternative_contact || '-',
        dealer.email || '-',
        dealer.route || '-',
        dealer.address || '-',
        Number(dealer.credit_limit || 0),
        Number(dealer.current_credit || 0),
        Number(dealer.available_credit || 0),
        dealer.status
      ];
      rowNumber++;
    });

    // ============ FORMAT CURRENCY COLUMNS ============
    worksheet.getColumn('H').numFmt = '#,##0.00';
    worksheet.getColumn('I').numFmt = '#,##0.00';
    worksheet.getColumn('J').numFmt = '#,##0.00';

    // ============ ADD BORDERS (Only to table area: Row 6 to last row, Columns A-K) ============
    for (let r = 6; r < rowNumber; r++) {
      for (let c = 1; c <= 11; c++) {
        worksheet.getRow(r).getCell(c).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }

    // Set response headers for file download
    const filename = route && route !== 'all' 
      ? `dealers_${route.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
      : `dealers_all_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    // Write to response
    await workbook.xlsx.write(res);

  } catch (error) {
    console.error('Export error:', error);
    // If headers haven't been sent, send error response
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Failed to export dealers' });
    }
    next(error);
  }
};

// ============================================
// GET UNIQUE ROUTES
// ============================================
// Purpose: Get list of unique routes for filter dropdown
// Route: GET /api/v1/dealers/routes
const getUniqueRoutes = async (req, res, next) => {
  try {
    const pool = await getConnection();

    const [routes] = await pool.execute(`
      SELECT DISTINCT route 
      FROM dealers 
      WHERE route IS NOT NULL AND route != ''
      ORDER BY route
    `);

    const routeList = routes.map(r => r.route);
    return successResponse(res, 200, 'Routes retrieved successfully', routeList);

  } catch (error) {
    next(error);
  }
};

// Export all functions
module.exports = {
  getAllDealers,
  getDealerById,
  createDealer,
  updateDealer,
  deleteDealer,
  toggleDealerStatus,
  getDealerStats,
  exportDealersToExcel,
  getUniqueRoutes
};