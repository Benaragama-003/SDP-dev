const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const ExcelJS = require('exceljs');
const { notifyAllAdmins } = require('../utils/notificationHelper');

// Helper: Record inventory movement (audit trail)
const recordInventoryMovement = async (connection, {
    product_id,
    product_type,
    movement_type,
    quantity_change,
    quantity_before,
    quantity_after,
    reference_id,
    created_by
}) => {
    const movement_id = `MV${Date.now()}${Math.random().toString(36).substr(2, 4)}`;
    await connection.execute(
        `INSERT INTO inventory_movements 
         (movement_id, product_id, product_type, movement_type, quantity_change, quantity_before, quantity_after, reference_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [movement_id, product_id, product_type, movement_type, quantity_change, quantity_before, quantity_after, reference_id, created_by]
    );
    return movement_id;
};

// Inventory summary grouped by size (FOR ADMIN - shows all products)
const getInventorySummary = async (req, res, next) => {
    try {
        const pool = await getConnection();
        // Show ALL products in inventory (including DISCONTINUED) so we can track existing stock
        const [rows] = await pool.execute(`
            SELECT 
                p.product_id,
                p.cylinder_size,
                p.status,
                MAX(CASE WHEN i.product_type = 'FILLED' THEN i.quantity ELSE 0 END) as filled,
                MAX(CASE WHEN i.product_type = 'EMPTY' THEN i.quantity ELSE 0 END) as \`empty\`,
                MAX(CASE WHEN i.product_type = 'DAMAGED' THEN i.quantity ELSE 0 END) as damaged
            FROM products p
            LEFT JOIN inventory i ON p.product_id = i.product_id
            GROUP BY p.product_id, p.cylinder_size, p.status
            ORDER BY CAST(REGEXP_REPLACE(p.cylinder_size, '[^0-9.]', '') AS DECIMAL(10,2))
        `);
        return successResponse(res, 200, 'Inventory summary retrieved', rows);
    } catch (error) {
        next(error);
    }
};

// ✅ NEW FUNCTION - Inventory summary for SUPERVISORS (ACTIVE products only)
const getInventorySummaryForSupervisor = async (req, res, next) => {
    try {
        const pool = await getConnection();
        // Show ONLY ACTIVE products for supervisors
        const [rows] = await pool.execute(`
            SELECT 
                p.product_id,
                p.cylinder_size,
                MAX(CASE WHEN i.product_type = 'FILLED' THEN i.quantity ELSE 0 END) as filled,
                MAX(CASE WHEN i.product_type = 'EMPTY' THEN i.quantity ELSE 0 END) as \`empty\`,
                MAX(CASE WHEN i.product_type = 'DAMAGED' THEN i.quantity ELSE 0 END) as damaged
            FROM products p
            LEFT JOIN inventory i ON p.product_id = i.product_id
            WHERE p.status = 'ACTIVE'
            GROUP BY p.product_id, p.cylinder_size
            ORDER BY CAST(REGEXP_REPLACE(p.cylinder_size, '[^0-9.]', '') AS DECIMAL(10,2))
        `);
        return successResponse(res, 200, 'Inventory summary retrieved', rows);
    } catch (error) {
        next(error);
    }
};

// Get all standardized products (includes DISCONTINUED for viewing/reactivating)
const getAllProducts = async (req, res, next) => {
    try {
        const pool = await getConnection();
        // Show ALL products so admin can view and reactivate discontinued ones
        const [products] = await pool.execute(
            'SELECT * FROM products ORDER BY cylinder_size'
        );
        return successResponse(res, 200, 'Products retrieved successfully', products);
    } catch (error) {
        next(error);
    }
};

// Get only ACTIVE products (for dropdowns in Dispatch, Purchase Orders)
const getActiveProducts = async (req, res, next) => {
    try {
        const pool = await getConnection();
        const [products] = await pool.execute(`
            SELECT 
                p.*,
                COALESCE(empty_inv.quantity, 0) as empty_stock
            FROM products p
            LEFT JOIN inventory empty_inv ON p.product_id = empty_inv.product_id 
                AND empty_inv.product_type = 'EMPTY'
            WHERE p.status = 'ACTIVE' 
            ORDER BY cylinder_size
        `);
        return successResponse(res, 200, 'Active products retrieved successfully', products);
    } catch (error) {
        next(error);
    }
};

// Add new product with 4 price points
const createProduct = async (req, res, next) => {
    const {
        cylinder_size,
        filled_purchase_price,
        new_purchase_price,
        filled_selling_price,
        new_selling_price
    } = req.body;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const product_id = `P${Date.now().toString().slice(-5)}`;
            const sizeNum = cylinder_size.replace(/[^0-9.]/g, '') || '0';
            const product_code = `CYL-${sizeNum}KG`; // e.g., CYL-5KG, CYL-12KG

            await connection.execute(
                `INSERT INTO products (product_id, product_code, cylinder_size, filled_purchase_price, new_purchase_price, filled_selling_price, new_selling_price)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    product_id, 
                    product_code, 
                    cylinder_size, 
                    parseFloat(filled_purchase_price) || 0, 
                    parseFloat(new_purchase_price) || 0, 
                    parseFloat(filled_selling_price) || 0, 
                    parseFloat(new_selling_price) || 0
                ]
            );

            // Initialize inventory for the 3 main types (FILLED, EMPTY, DAMAGED) 
            const types = ['FILLED', 'EMPTY', 'DAMAGED'];
            for (const type of types) {
                await connection.execute(
                    `INSERT INTO inventory (inventory_id, product_id, product_type, quantity, managed_by)
                     VALUES (?, ?, ?, ?, ?)`,
                    [`INV${Date.now()}${type[0]}`, product_id, type, 0, req.user.userId]
                );
            }

            await connection.commit();
            return successResponse(res, 201, 'Product definition created successfully', { product_id, product_code });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        next(error);
    }
};

// Update product prices
const updateProduct = async (req, res, next) => {
    const { id } = req.params;
    const {
        filled_purchase_price,
        new_purchase_price,
        filled_selling_price,
        new_selling_price,
    } = req.body;

    try {
        const pool = await getConnection();

        // Verify product exists
        const [existing] = await pool.execute(
            'SELECT * FROM products WHERE product_id = ?',
            [id]
        );

        if (existing.length === 0) {
            return errorResponse(res, 404, 'Product not found');
        }

        // Helper: treat empty string/null/undefined as "not provided" and parse numbers safely
        const tryParseNumber = (v) => {
            if (v === '' || v === null || v === undefined) return null;
            // Accept numbers or numeric strings
            const n = Number(v);
            if (Number.isFinite(n)) return n;
            // fallback to parseFloat for loose input
            const p = parseFloat(String(v));
            return Number.isFinite(p) ? p : null;
        };

        const updates = [];
        const values = [];

        const mapping = [
            ['filled_purchase_price', filled_purchase_price],
            ['new_purchase_price', new_purchase_price],
            ['filled_selling_price', filled_selling_price],
            ['new_selling_price', new_selling_price],
        ];

        for (const [column, rawValue] of mapping) {
            const parsed = tryParseNumber(rawValue);
            if (parsed !== null) {
                updates.push(`${column} = ?`);
                values.push(parsed);
            }
        }

        // No valid numeric fields provided
        if (updates.length === 0) {
            return successResponse(res, 200, 'No changes to update');
        }

        // Add product id for WHERE clause
        values.push(id);

        // Execute update and inspect result to ensure rows were affected
        const [result] = await pool.execute(
            `UPDATE products SET ${updates.join(', ')} WHERE product_id = ?`,
            values
        );

        // result.affectedRows should indicate whether DB changed
        if (result && result.affectedRows === 0) {
            // No rows updated - possibly same values or concurrency issue
            return successResponse(res, 200, 'Request processed but no rows were changed');
        }

        return successResponse(res, 200, 'Product updated successfully');
    } catch (error) {
        next(error);
    }
};

// Toggle product status (ACTIVE/INACTIVE)
const toggleProductStatus = async (req, res, next) => {
    const { id } = req.params;

    try {
        const pool = await getConnection();
        
        // Get current status
        const [existing] = await pool.execute(
            'SELECT status FROM products WHERE product_id = ?',
            [id]
        );
        
        if (existing.length === 0) {
            return errorResponse(res, 404, 'Product not found');
        }

        const newStatus = existing[0].status === 'ACTIVE' ? 'DISCONTINUED' : 'ACTIVE';

        await pool.execute(
            'UPDATE products SET status = ? WHERE product_id = ?',
            [newStatus, id]
        );

        return successResponse(res, 200, `Product ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`, { status: newStatus });
    } catch (error) {
        next(error);
    }
};

// Report damage (Admin - warehouse damage from FILLED stock)
const reportDamage = async (req, res, next) => {
    const { product_id, quantity_damaged, damage_reason } = req.body;

    if (!product_id || !quantity_damaged || !damage_reason) {
        return errorResponse(res, 400, 'Product ID, quantity, and damage reason are required');
    }

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Get current FILLED and DAMAGED quantities
            const [filledInv] = await connection.execute(
                'SELECT quantity FROM inventory WHERE product_id = ? AND product_type = ?',
                [product_id, 'FILLED']
            );
            const [damagedInv] = await connection.execute(
                'SELECT quantity FROM inventory WHERE product_id = ? AND product_type = ?',
                [product_id, 'DAMAGED']
            );

            if (filledInv.length === 0) {
                await connection.rollback();
                return errorResponse(res, 404, 'Product inventory not found');
            }

            const filledBefore = filledInv[0].quantity;
            const damagedBefore = damagedInv[0]?.quantity || 0;

            if (filledBefore < quantity_damaged) {
                await connection.rollback();
                return errorResponse(res, 400, 'Insufficient filled stock to report damage');
            }

            // Create damage record
            const damage_id = `DMG${Date.now()}`;
            await connection.execute(
                `INSERT INTO damage_inventory (damage_id, product_id, quantity_damaged, damage_reason, reported_by)
                 VALUES (?, ?, ?, ?, ?)`,
                [damage_id, product_id, quantity_damaged, damage_reason, req.user.userId]
            );

            // Update FILLED inventory (-quantity)
            await connection.execute(
                'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND product_type = ?',
                [quantity_damaged, product_id, 'FILLED']
            );

            // Update DAMAGED inventory (+quantity)
            await connection.execute(
                'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND product_type = ?',
                [quantity_damaged, product_id, 'DAMAGED']
            );

            // Record movement for FILLED (deduct)
            await recordInventoryMovement(connection, {
                product_id,
                product_type: 'FILLED',
                movement_type: 'DAMAGE_REPORTED',
                quantity_change: -quantity_damaged,
                quantity_before: filledBefore,
                quantity_after: filledBefore - quantity_damaged,
                reference_id: damage_id,
                created_by: req.user.userId
            });

            // Record movement for DAMAGED (add)
            await recordInventoryMovement(connection, {
                product_id,
                product_type: 'DAMAGED',
                movement_type: 'DAMAGE_REPORTED',
                quantity_change: quantity_damaged,
                quantity_before: damagedBefore,
                quantity_after: damagedBefore + quantity_damaged,
                reference_id: damage_id,
                created_by: req.user.userId
            });

            await connection.commit();

            // Notify all admins about warehouse damage
            const [dmgProd] = await pool.execute('SELECT cylinder_size FROM products WHERE product_id = ?', [product_id]);
            await notifyAllAdmins(pool, {
                title: 'Damage Reported (Warehouse)',
                message: `${quantity_damaged} x ${dmgProd[0]?.cylinder_size || product_id} damaged in warehouse. Reason: ${damage_reason}.`,
                type: 'DAMAGE_REPORTED',
                reference_id: damage_id
            });

            return successResponse(res, 201, 'Damage reported successfully', { damage_id });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        next(error);
    }
};

// Get inventory movements (for history/export)
const getInventoryMovements = async (req, res, next) => {
    const { product_id, movement_type, start_date, end_date } = req.query;

    try {
        const pool = await getConnection();
        
        let query = `
            SELECT 
                im.movement_id,
                im.product_id,
                p.cylinder_size,
                im.product_type,
                im.movement_type,
                im.quantity_change,
                im.quantity_before,
                im.quantity_after,
                im.reference_id,
                im.created_by,
                CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
                im.created_at
            FROM inventory_movements im
            JOIN products p ON im.product_id = p.product_id
            LEFT JOIN users u ON im.created_by = u.user_id
            WHERE 1=1
        `;
        const params = [];

        if (product_id) {
            query += ' AND im.product_id = ?';
            params.push(product_id);
        }
        if (movement_type) {
            query += ' AND im.movement_type = ?';
            params.push(movement_type);
        }
        if (start_date) {
            query += ' AND DATE(im.created_at) >= ?';
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND DATE(im.created_at) <= ?';
            params.push(end_date);
        }

        query += ' ORDER BY im.created_at DESC';

        const [movements] = await pool.execute(query, params);
        return successResponse(res, 200, 'Inventory movements retrieved', movements);
    } catch (error) {
        next(error);
    }
};

// Export inventory with movement history to Excel
const exportInventoryToExcel = async (req, res, next) => {
    const { start_date, end_date } = req.query;

    try {
        const pool = await getConnection();

        // Get current inventory summary
        const [inventory] = await pool.execute(`
            SELECT 
                p.product_id,
                p.cylinder_size,
                p.product_code,
                MAX(CASE WHEN i.product_type = 'FILLED' THEN i.quantity ELSE 0 END) as filled,
                MAX(CASE WHEN i.product_type = 'EMPTY' THEN i.quantity ELSE 0 END) as \`empty\`,
                MAX(CASE WHEN i.product_type = 'DAMAGED' THEN i.quantity ELSE 0 END) as damaged
            FROM products p
            LEFT JOIN inventory i ON p.product_id = i.product_id
            WHERE p.status = 'ACTIVE'
            GROUP BY p.product_id, p.cylinder_size, p.product_code
            ORDER BY CAST(REGEXP_REPLACE(p.cylinder_size, '[^0-9.]', '') AS DECIMAL(10,2))
        `);

        // Get movement history grouped by product and type, ordered by date ASC (oldest first)
        let movementQuery = `
            SELECT 
                im.created_at,
                p.cylinder_size,
                p.product_code,
                im.product_type,
                im.movement_type,
                im.quantity_change,
                im.quantity_before,
                im.quantity_after,
                im.reference_id,
                CONCAT(u.first_name, ' ', u.last_name) as created_by_name
            FROM inventory_movements im
            JOIN products p ON im.product_id = p.product_id
            LEFT JOIN users u ON im.created_by = u.user_id
            WHERE 1=1
        `;
        const params = [];

        if (start_date) {
            movementQuery += ' AND DATE(im.created_at) >= ?';
            params.push(start_date);
        }
        if (end_date) {
            movementQuery += ' AND DATE(im.created_at) <= ?';
            params.push(end_date);
        }

        // Order by cylinder size (numeric), then product_type, then date ASC
        movementQuery += ` ORDER BY 
            CAST(REGEXP_REPLACE(p.cylinder_size, '[^0-9.]', '') AS DECIMAL(10,2)),
            im.product_type,
            im.created_at ASC`;
        const [movements] = await pool.execute(movementQuery, params);

        // Create workbook
        const workbook = new ExcelJS.Workbook();

        // ===== SHEET 1: Current Inventory =====
        const invSheet = workbook.addWorksheet('Current Inventory');

        // Company Header
        const companyHeaders = [
            'HIDELLANA DISTRIBUTORS (PVT) LTD',
            'No. 164, Kudagama Road, Hidellana, Ratnapura',
            'Tel: 045-2222865 | Reg No: PV 113085',
            `Inventory Report - Generated: ${new Date().toLocaleDateString()}`
        ];

        companyHeaders.forEach((text, idx) => {
            invSheet.mergeCells(`A${idx + 1}:F${idx + 1}`);
            const row = invSheet.getRow(idx + 1);
            row.getCell(1).value = text;
            row.getCell(1).alignment = { horizontal: 'center' };
            row.getCell(1).font = idx === 0 ? { bold: true, size: 14 } : { size: 11 };
        });

        // Table headers at row 6
        invSheet.getRow(6).values = ['Cylinder Size', 'Product Code', 'Filled', 'Empty', 'Damaged', 'Total'];
        invSheet.getRow(6).eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center' };
        });

        // Data rows
        inventory.forEach((item, idx) => {
            const row = invSheet.getRow(7 + idx);
            row.values = [
                item.cylinder_size,
                item.product_code,
                item.filled,
                item.empty,
                item.damaged,
                item.filled + item.empty + item.damaged
            ];
            row.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin' },
                    bottom: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        invSheet.columns = [
            { width: 15 }, { width: 15 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }
        ];

        // ===== SHEET 2: Stock Movements (Grouped by Product & Type) =====
        const movSheet = workbook.addWorksheet('Stock Movements');

        // Company Header
        companyHeaders.forEach((text, idx) => {
            movSheet.mergeCells(`A${idx + 1}:E${idx + 1}`);
            const row = movSheet.getRow(idx + 1);
            row.getCell(1).value = text;
            row.getCell(1).alignment = { horizontal: 'center' };
            row.getCell(1).font = idx === 0 ? { bold: true, size: 14 } : { size: 11 };
        });

        // Group movements by cylinder_size and product_type
        const groupedMovements = {};
        movements.forEach(mov => {
            const key = `${mov.cylinder_size}|${mov.product_type}`;
            if (!groupedMovements[key]) {
                groupedMovements[key] = {
                    cylinder_size: mov.cylinder_size,
                    product_code: mov.product_code,
                    product_type: mov.product_type,
                    movements: []
                };
            }
            groupedMovements[key].movements.push(mov);
        });

        let currentRow = 6;

        // Iterate through each product group
        Object.values(groupedMovements).forEach(group => {
            // Product header row
            const headerRow = movSheet.getRow(currentRow);
            movSheet.mergeCells(`A${currentRow}:E${currentRow}`);
            headerRow.getCell(1).value = `${group.cylinder_size} (${group.product_code}) - ${group.product_type}`;
            headerRow.getCell(1).font = { bold: true, size: 12 };
            headerRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
            headerRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
            currentRow++;

            // Column headers for this group
            const colHeaderRow = movSheet.getRow(currentRow);
            colHeaderRow.values = ['Date', 'Movement Type', 'Change', 'Balance', 'Reference'];
            colHeaderRow.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } };
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.alignment = { horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    bottom: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            currentRow++;

            // Movement rows for this group
            group.movements.forEach(mov => {
                const row = movSheet.getRow(currentRow);
                const changeText = mov.quantity_change > 0 ? `+${mov.quantity_change}` : `${mov.quantity_change}`;
                row.values = [
                    new Date(mov.created_at).toLocaleDateString(),
                    mov.movement_type.replace(/_/g, ' '),
                    changeText,
                    mov.quantity_after,
                    mov.reference_id || '-'
                ];
                row.eachCell((cell, colNumber) => {
                    cell.border = {
                        top: { style: 'thin' },
                        bottom: { style: 'thin' },
                        left: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    // Color code change column: green for positive, red for negative
                    if (colNumber === 3) {
                        cell.font = { color: { argb: mov.quantity_change > 0 ? 'FF16A34A' : 'FFDC2626' }, bold: true };
                    }
                });
                currentRow++;
            });

            // Add empty row between groups
            currentRow++;
        });

        movSheet.columns = [
            { width: 15 }, { width: 20 }, { width: 12 }, { width: 12 }, { width: 15 }
        ];

        // ===== SHEET 3: Empty Stock Analysis =====
        const emptySheet = workbook.addWorksheet('Empty Stock Analysis');

        // Company Header
        companyHeaders.forEach((text, idx) => {
            emptySheet.mergeCells(`A${idx + 1}:G${idx + 1}`);
            const row = emptySheet.getRow(idx + 1);
            row.getCell(1).value = text;
            row.getCell(1).alignment = { horizontal: 'center' };
            row.getCell(1).font = idx === 0 ? { bold: true, size: 14 } : { size: 11 };
        });

        // Summary section
        emptySheet.getRow(6).getCell(1).value = 'Empty Stock Summary';
        emptySheet.getRow(6).getCell(1).font = { bold: true, size: 12 };

        // Table headers at row 7
        emptySheet.getRow(7).values = ['Cylinder Size', 'Product Code', 'Current Empty', 'Current Filled', 'Exchange Ratio', 'Status', 'Notes'];
        emptySheet.getRow(7).eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center' };
        });

        // Data rows with empty stock insights
        inventory.forEach((item, idx) => {
            const row = emptySheet.getRow(8 + idx);
            const ratio = item.filled > 0 ? (item.empty / item.filled * 100).toFixed(1) : 'N/A';
            const status = item.empty < 50 ? 'LOW' : item.empty < 100 ? 'MODERATE' : 'GOOD';
            const notes = item.empty < 50 
                ? 'May need to collect empties or limit refill orders' 
                : item.empty < item.filled 
                    ? 'Sufficient for current refill capacity' 
                    : 'Good empty stock for exchanges';
            
            row.values = [
                item.cylinder_size,
                item.product_code,
                item.empty,
                item.filled,
                ratio + '%',
                status,
                notes
            ];
            row.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin' },
                    bottom: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' }
                };
                // Color code status column
                if (colNumber === 6) {
                    const statusColors = {
                        'LOW': 'FFDC2626',
                        'MODERATE': 'FFD97706',
                        'GOOD': 'FF16A34A'
                    };
                    cell.font = { bold: true, color: { argb: statusColors[status] || 'FF000000' } };
                }
            });
        });

        // Empty movements summary section
        let emptyMovRow = 9 + inventory.length;
        emptySheet.getRow(emptyMovRow).getCell(1).value = 'Recent Empty Stock Movements';
        emptySheet.getRow(emptyMovRow).getCell(1).font = { bold: true, size: 12 };
        emptyMovRow++;

        // Filter only EMPTY type movements
        const emptyMovements = movements.filter(m => m.product_type === 'EMPTY');
        
        if (emptyMovements.length > 0) {
            emptySheet.getRow(emptyMovRow).values = ['Date', 'Cylinder Size', 'Movement Type', 'Change', 'Before', 'After', 'Reference'];
            emptySheet.getRow(emptyMovRow).eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } };
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.alignment = { horizontal: 'center' };
            });
            emptyMovRow++;

            emptyMovements.slice(0, 50).forEach(mov => {  // Limit to 50 recent movements
                const row = emptySheet.getRow(emptyMovRow);
                const changeText = mov.quantity_change > 0 ? `+${mov.quantity_change}` : `${mov.quantity_change}`;
                row.values = [
                    new Date(mov.created_at).toLocaleDateString(),
                    mov.cylinder_size,
                    mov.movement_type.replace(/_/g, ' '),
                    changeText,
                    mov.quantity_before,
                    mov.quantity_after,
                    mov.reference_id || '-'
                ];
                row.eachCell((cell, colNumber) => {
                    cell.border = {
                        top: { style: 'thin' },
                        bottom: { style: 'thin' },
                        left: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    if (colNumber === 4) {
                        cell.font = { color: { argb: mov.quantity_change > 0 ? 'FF16A34A' : 'FFDC2626' }, bold: true };
                    }
                });
                emptyMovRow++;
            });
        } else {
            emptySheet.getRow(emptyMovRow).getCell(1).value = 'No empty stock movements found for the selected period';
            emptySheet.getRow(emptyMovRow).getCell(1).font = { italic: true, color: { argb: 'FF666666' } };
        }

        emptySheet.columns = [
            { width: 12 }, { width: 14 }, { width: 20 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 35 }
        ];

        // Send file
        const fileName = `inventory_report_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getInventorySummary,
    getInventorySummaryForSupervisor, 
    getAllProducts,
    getActiveProducts,
    createProduct,
    updateProduct,
    toggleProductStatus,
    reportDamage,
    getInventoryMovements,
    exportInventoryToExcel
};