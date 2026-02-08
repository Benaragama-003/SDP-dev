const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { generateId } = require('../utils/generateId');
const ExcelJS = require('exceljs');

// Helper function to record inventory movement
const recordInventoryMovement = async (connection, data) => {
    const movement_id = generateId('MOV');
    await connection.execute(
        `INSERT INTO inventory_movements 
         (movement_id, product_id, product_type, movement_type, quantity_change, quantity_before, quantity_after, reference_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [movement_id, data.product_id, data.product_type, data.movement_type, data.quantity_change, data.quantity_before, data.quantity_after, data.reference_id, data.created_by]
    );
};

// Helper function to generate next sequential PO number
const getNextPONumber = async (connection) => {
    const [lastPO] = await connection.execute(
        `SELECT order_number FROM purchase_orders 
         ORDER BY created_at DESC, order_number DESC LIMIT 1`
    );
    
    let nextNumber = 1;
    
    if (lastPO.length > 0) {
        const lastOrderNumber = lastPO[0].order_number;
        const match = lastOrderNumber.match(/PO-(\d+)/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }
    
    // Format: PO-01, PO-02, ..., PO-99, PO-100, PO-1000
    const formattedNumber = nextNumber.toString().padStart(2, '0');
    
    return `PO-${formattedNumber}`;
};

// Get all purchase orders
const getAllPurchaseOrders = async (req, res, next) => {
    const { status, start_date, end_date } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    try {
        const pool = await getConnection();
        
        let query = `
            SELECT 
                po.*,
                CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
                CONCAT(a.first_name, ' ', a.last_name) as approved_by_name,
                CONCAT(r.first_name, ' ', r.last_name) as received_by_name
            FROM purchase_orders po
            LEFT JOIN users u ON po.created_by = u.user_id
            LEFT JOIN users a ON po.approved_by = a.user_id
            LEFT JOIN users r ON po.received_by = r.user_id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND po.status = ?';
            params.push(status);
        }
        if (start_date) {
            query += ' AND po.order_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND po.order_date <= ?';
            params.push(end_date);
        }

        // Get total count
        const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await pool.execute(countQuery, params);
        const total = countResult[0].total;

        // Add ordering and pagination
        query += ' ORDER BY po.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        // Use query() instead of execute() for LIMIT/OFFSET compatibility with MySQL2
        const [orders] = await pool.query(query, params);

        return successResponse(res, 200, 'Purchase orders retrieved', {
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get single purchase order with items
const getPurchaseOrderById = async (req, res, next) => {
    const { id } = req.params;

    try {
        const pool = await getConnection();

        const [orders] = await pool.execute(`
            SELECT 
                po.*,
                CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
                CONCAT(a.first_name, ' ', a.last_name) as approved_by_name,
                CONCAT(r.first_name, ' ', r.last_name) as received_by_name
            FROM purchase_orders po
            LEFT JOIN users u ON po.created_by = u.user_id
            LEFT JOIN users a ON po.approved_by = a.user_id
            LEFT JOIN users r ON po.received_by = r.user_id
            WHERE po.order_id = ?
        `, [id]);

        if (orders.length === 0) {
            return errorResponse(res, 404, 'Purchase order not found');
        }

        const [items] = await pool.execute(`
            SELECT 
                poi.*,
                p.cylinder_size,
                p.product_code
            FROM PO_items poi
            JOIN products p ON poi.product_id = p.product_id
            WHERE poi.order_id = ?
        `, [id]);

        return successResponse(res, 200, 'Purchase order retrieved', {
            ...orders[0],
            items
        });
    } catch (error) {
        next(error);
    }
};

// Create a new purchase order
const createPurchaseOrder = async (req, res, next) => {
    const { expected_date, items, supplier_contact, notes } = req.body;
    const created_by = req.user.userId;

    if (!items || items.length === 0) {
        return errorResponse(res, 400, 'At least one item is required');
    }

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            //VALIDATE: Only ACTIVE products can be ordered
            for (const item of items) {
                const [productCheck] = await connection.execute(
                    'SELECT status, cylinder_size FROM products WHERE product_id = ?',
                    [item.product_id]
                );
                
                if (productCheck.length === 0) {
                    await connection.rollback();
                    return errorResponse(res, 400, `Product ${item.product_id} not found`);
                }
                
                if (productCheck[0].status !== 'ACTIVE') {
                    await connection.rollback();
                    return errorResponse(res, 400, `Cannot order discontinued product: ${productCheck[0].cylinder_size}. This product is no longer active.`);
                }
            }

            const order_id = generateId('PO');
            
            // Generate sequential PO number (PO-01, PO-02, etc.)
            const order_number = await getNextPONumber(connection);
            
            const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

            await connection.execute(
                `INSERT INTO purchase_orders 
                 (order_id, order_number, expected_delivery_date, subtotal, total_amount, status, supplier_contact, created_by)
                 VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
                [order_id, order_number, expected_date, subtotal, subtotal, supplier_contact || null, created_by]
            );

            for (const item of items) {
                await connection.execute(
                    `INSERT INTO PO_items 
                     (order_item_id, order_id, product_id, purchase_type, ordered_quantity, unit_price, total_price)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        generateId('POI'), 
                        order_id, 
                        item.product_id, 
                        item.purchase_type || 'FILLED', 
                        item.quantity, 
                        item.unit_price, 
                        item.quantity * item.unit_price
                    ]
                );
            }

            await connection.commit();
            return successResponse(res, 201, 'Purchase Order created successfully', { order_id, order_number });
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

// Approve a purchase order
const approvePurchaseOrder = async (req, res, next) => {
    const { id } = req.params;
    const approved_by = req.user.userId;

    try {
        const pool = await getConnection();

        // Check current status
        const [orders] = await pool.execute(
            'SELECT status FROM purchase_orders WHERE order_id = ?',
            [id]
        );

        if (orders.length === 0) {
            return errorResponse(res, 404, 'Purchase order not found');
        }

        if (orders[0].status !== 'PENDING') {
            return errorResponse(res, 400, `Cannot approve order with status: ${orders[0].status}`);
        }

        await pool.execute(
            `UPDATE purchase_orders 
             SET status = 'APPROVED', approved_by = ?, updated_at = NOW()
             WHERE order_id = ?`,
            [approved_by, id]
        );

        return successResponse(res, 200, 'Purchase order approved successfully');
    } catch (error) {
        next(error);
    }
};

// Receive a purchase order (updates inventory)
const receivePurchaseOrder = async (req, res, next) => {
    const { id } = req.params;
    const { received_items, supplier_invoice_number } = req.body;
    const received_by = req.user.userId;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Get order and verify status
            const [orders] = await connection.execute(
                'SELECT * FROM purchase_orders WHERE order_id = ?',
                [id]
            );

            if (orders.length === 0) {
                await connection.rollback();
                return errorResponse(res, 404, 'Purchase order not found');
            }

            if (orders[0].status !== 'APPROVED') {
                await connection.rollback();
                return errorResponse(res, 400, `Cannot receive order with status: ${orders[0].status}. Must be APPROVED first.`);
            }

            // Get PO items with product info
            const [poItems] = await connection.execute(
                `SELECT poi.*, p.cylinder_size FROM PO_items poi 
                 JOIN products p ON poi.product_id = p.product_id 
                 WHERE poi.order_id = ?`,
                [id]
            );

            // First pass: Validate empty stock for FILLED (refill) items
            for (const poItem of poItems) {
                if (poItem.purchase_type === 'FILLED') {
                    const receivedData = received_items?.find(ri => ri.order_item_id === poItem.order_item_id);
                    const receivedQty = receivedData?.received_quantity ?? poItem.ordered_quantity;
                    
                    if (receivedQty > 0) {
                        // Check available empty stock
                        const [emptyRows] = await connection.execute(
                            'SELECT quantity FROM inventory WHERE product_id = ? AND product_type = ?',
                            [poItem.product_id, 'EMPTY']
                        );
                        const availableEmpty = emptyRows.length > 0 ? emptyRows[0].quantity : 0;
                        
                        if (receivedQty > availableEmpty) {
                            await connection.rollback();
                            return errorResponse(res, 400, 
                                `Cannot receive ${receivedQty} refills for ${poItem.cylinder_size}. Only ${availableEmpty} empty cylinders available. ` +
                                `Refills require empty cylinders for exchange.`
                            );
                        }
                    }
                }
            }

            // Second pass: Process each item
            for (const poItem of poItems) {
                const receivedData = received_items?.find(ri => ri.order_item_id === poItem.order_item_id);
                const receivedQty = receivedData?.received_quantity ?? poItem.ordered_quantity;

                // Update PO_items with received quantity
                await connection.execute(
                    'UPDATE PO_items SET received_quantity = ? WHERE order_item_id = ?',
                    [receivedQty, poItem.order_item_id]
                );

                if (receivedQty > 0) {
                    // For FILLED (refill) orders: Deduct from EMPTY stock first
                    if (poItem.purchase_type === 'FILLED') {
                        const [emptyRows] = await connection.execute(
                            'SELECT inventory_id, quantity FROM inventory WHERE product_id = ? AND product_type = ?',
                            [poItem.product_id, 'EMPTY']
                        );
                        
                        const currentEmptyQty = emptyRows[0].quantity;
                        const newEmptyQty = currentEmptyQty - receivedQty;
                        
                        // Deduct from EMPTY inventory
                        await connection.execute(
                            'UPDATE inventory SET quantity = ?, last_updated = NOW() WHERE product_id = ? AND product_type = ?',
                            [newEmptyQty, poItem.product_id, 'EMPTY']
                        );
                        
                        // Record movement for EMPTY deduction
                        await recordInventoryMovement(connection, {
                            product_id: poItem.product_id,
                            product_type: 'EMPTY',
                            movement_type: 'PURCHASE_RECEIVED',
                            quantity_change: -receivedQty,
                            quantity_before: currentEmptyQty,
                            quantity_after: newEmptyQty,
                            reference_id: id,
                            created_by: received_by
                        });
                    }

                    // Add to FILLED inventory
                    const [invRows] = await connection.execute(
                        'SELECT inventory_id, quantity FROM inventory WHERE product_id = ? AND product_type = ?',
                        [poItem.product_id, 'FILLED']
                    );

                    const currentQty = invRows.length > 0 ? invRows[0].quantity : 0;
                    const newQty = currentQty + receivedQty;

                    // Update or insert FILLED inventory
                    if (invRows.length > 0) {
                        await connection.execute(
                            'UPDATE inventory SET quantity = ?, last_updated = NOW() WHERE product_id = ? AND product_type = ?',
                            [newQty, poItem.product_id, 'FILLED']
                        );
                    } else {
                        // Insert new inventory record if it doesn't exist
                        const inventory_id = generateId('INV');
                        await connection.execute(
                            `INSERT INTO inventory (inventory_id, product_id, product_type, quantity, managed_by) 
                             VALUES (?, ?, 'FILLED', ?, ?)`,
                            [inventory_id, poItem.product_id, newQty, received_by]
                        );
                    }

                    // Record inventory movement for FILLED
                    await recordInventoryMovement(connection, {
                        product_id: poItem.product_id,
                        product_type: 'FILLED',
                        movement_type: 'PURCHASE_RECEIVED',
                        quantity_change: receivedQty,
                        quantity_before: currentQty,
                        quantity_after: newQty,
                        reference_id: id,
                        created_by: received_by
                    });
                }
            }

            // Calculate actual received total amount
            const [updatedItems] = await connection.execute(
                'SELECT received_quantity, unit_price FROM PO_items WHERE order_id = ?',
                [id]
            );
            const actualTotal = updatedItems.reduce((sum, item) => 
                sum + (item.received_quantity * parseFloat(item.unit_price)), 0
            );

            // Update purchase order status and actual total
            await connection.execute(
                `UPDATE purchase_orders 
                 SET status = 'RECEIVED', 
                     actual_delivery_date = CURDATE(), 
                     received_by = ?,
                     supplier_invoice_number = ?,
                     subtotal = ?,
                     total_amount = ?,
                     updated_at = NOW()
                 WHERE order_id = ?`,
                [received_by, supplier_invoice_number || null, actualTotal, actualTotal, id]
            );

            await connection.commit();
            return successResponse(res, 200, 'Purchase order received and inventory updated successfully');
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

// Cancel a purchase order
const cancelPurchaseOrder = async (req, res, next) => {
    const { id } = req.params;

    try {
        const pool = await getConnection();

        const [orders] = await pool.execute(
            'SELECT status FROM purchase_orders WHERE order_id = ?',
            [id]
        );

        if (orders.length === 0) {
            return errorResponse(res, 404, 'Purchase order not found');
        }

        if (orders[0].status === 'RECEIVED') {
            return errorResponse(res, 400, 'Cannot cancel a received order');
        }

        await pool.execute(
            `UPDATE purchase_orders SET status = 'CANCELLED', updated_at = NOW() WHERE order_id = ?`,
            [id]
        );

        return successResponse(res, 200, 'Purchase order cancelled successfully');
    } catch (error) {
        next(error);
    }
};

// Get available empty stock for refill validation
const getEmptyStock = async (req, res, next) => {
    try {
        const pool = await getConnection();
        
        const [rows] = await pool.execute(`
            SELECT 
                p.product_id,
                p.cylinder_size,
                p.product_code,
                COALESCE(i.quantity, 0) as empty_quantity
            FROM products p
            LEFT JOIN inventory i ON p.product_id = i.product_id AND i.product_type = 'EMPTY'
            WHERE p.status = 'ACTIVE'
            ORDER BY CAST(REGEXP_REPLACE(p.cylinder_size, '[^0-9.]', '') AS DECIMAL(10,2))
        `);
        
        return successResponse(res, 200, 'Empty stock retrieved', rows);
    } catch (error) {
        next(error);
    }
};

const exportPurchaseOrdersToExcel = async (req, res, next) => {
    const { start_date, end_date, status, supplier } = req.query;

    try {
        const pool = await getConnection();

        // Get purchase orders with items and user details
        let query = `
            SELECT 
                po.order_date,
                po.order_number,
                po.supplier_invoice_number,
                po.supplier,
                po.status as order_status,
                po.total_amount as order_total,
                p.product_code,
                poi.purchase_type,
                poi.ordered_quantity,
                poi.received_quantity,
                poi.unit_price,
                poi.total_price,
                u.username as created_by_username,
                CONCAT(u.first_name, ' ', u.last_name) as created_by_name
            FROM purchase_orders po
            JOIN po_items poi ON po.order_id = poi.order_id
            JOIN products p ON poi.product_id = p.product_id
            LEFT JOIN users u ON po.created_by = u.user_id
            WHERE 1=1
        `;
        const params = [];

        if (start_date) {
            query += ' AND DATE(po.order_date) >= ?';
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND DATE(po.order_date) <= ?';
            params.push(end_date);
        }
        if (status && status !== 'All Statuses' && status !== '') {
            query += ' AND po.status = ?';
            params.push(status);
        }
        if (supplier) {
            query += ' AND po.supplier LIKE ?';
            params.push(`%${supplier}%`);
        }

        query += ' ORDER BY po.order_date DESC, po.order_number DESC, p.product_code';
        
        const [orders] = await pool.execute(query, params);

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Purchase Orders');

        // Company Header
        const companyHeaders = [
            'HIDELLANA DISTRIBUTORS (PVT) LTD',
            'No. 164, Kudagama Road, Hidellana, Ratnapura',
            'Tel: 045-2222865 | Reg No: PV 113085',
            `Purchase Orders Report - Generated: ${new Date().toLocaleDateString()}`
        ];

        companyHeaders.forEach((text, idx) => {
            sheet.mergeCells(`A${idx + 1}:K${idx + 1}`);
            const row = sheet.getRow(idx + 1);
            row.getCell(1).value = text;
            row.getCell(1).alignment = { horizontal: 'center' };
            row.getCell(1).font = idx === 0 ? { bold: true, size: 14 } : { size: 11 };
        });

        // Table headers at row 6
        sheet.getRow(6).values = [
            'Order Date',
            'Order No',
            'Invoice No',
            'Product Code',
            'Purchase Type',
            'Ordered Qty',
            'Received Qty',
            'Unit Price (Rs)',
            'Item Total (Rs)',
            'Order Total (Rs)',
            'Created By'
        ];
        
        sheet.getRow(6).eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Group orders by order_number to handle merging
        const orderGroups = {};
        orders.forEach(order => {
            if (!orderGroups[order.order_number]) {
                orderGroups[order.order_number] = [];
            }
            orderGroups[order.order_number].push(order);
        });

        // Track current row
        let currentRow = 7;

        // Data rows with merging
        Object.keys(orderGroups).forEach(orderNumber => {
            const orderItems = orderGroups[orderNumber];
            const startRow = currentRow;
            const itemCount = orderItems.length;
            
            orderItems.forEach((order, index) => {
                const row = sheet.getRow(currentRow);
                
                row.values = [
                    new Date(order.order_date).toLocaleDateString(),
                    order.order_number,
                    order.supplier_invoice_number || '-',
                    order.product_code,
                    order.purchase_type,
                    order.ordered_quantity,
                    order.received_quantity || 0,
                    parseFloat(order.unit_price).toFixed(2),
                    parseFloat(order.total_price).toFixed(2),
                    parseFloat(order.order_total).toFixed(2),
                    order.created_by_username
                ];

                row.eachCell((cell, colNumber) => {
                    cell.border = {
                        top: { style: 'thin' },
                        bottom: { style: 'thin' },
                        left: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    
                    cell.alignment = { vertical: 'middle' };

                    // Highlight received quantity if doesn't match ordered
                    if (colNumber === 7 && order.received_quantity !== order.ordered_quantity) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
                        cell.font = { bold: true, color: { argb: 'FFD97706' } };
                    }

                    // Format currency columns (right align)
                    if (colNumber >= 8 && colNumber <= 10) {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    }

                    // Add background color for order info columns
                    if (colNumber <= 3) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
                    }
                });

                currentRow++;
            });

            // Merge cells for orders with multiple items
            if (itemCount > 1) {
                const endRow = currentRow - 1;
                
                // Merge Order Date (Column A)
                sheet.mergeCells(`A${startRow}:A${endRow}`);
                sheet.getCell(`A${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                
                // Merge Order No (Column B)
                sheet.mergeCells(`B${startRow}:B${endRow}`);
                sheet.getCell(`B${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                
                // Merge Invoice No (Column C)
                sheet.mergeCells(`C${startRow}:C${endRow}`);
                sheet.getCell(`C${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                
                // Merge Order Total (Column J)
                sheet.mergeCells(`J${startRow}:J${endRow}`);
                sheet.getCell(`J${startRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
                
                // Merge Created By (Column K)
                sheet.mergeCells(`K${startRow}:K${endRow}`);
                sheet.getCell(`K${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
            }
        });

        // Add summary totals at the bottom
        if (orders.length > 0) {
            currentRow++; // Empty row
            const summaryRow = sheet.getRow(currentRow);
            
            // Calculate unique order totals (to avoid counting same order multiple times)
            const uniqueOrders = {};
            orders.forEach(order => {
                uniqueOrders[order.order_number] = parseFloat(order.order_total);
            });
            const grandTotal = Object.values(uniqueOrders).reduce((sum, total) => sum + total, 0);
            const totalItems = orders.reduce((sum, order) => sum + parseFloat(order.total_price), 0);

            summaryRow.values = [
                '', '', '', '', '', '', '', 'TOTALS:',
                totalItems.toFixed(2),
                grandTotal.toFixed(2),
                ''
            ];
            
            summaryRow.eachCell((cell, colNumber) => {
                cell.font = { bold: true, size: 12 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
                cell.border = {
                    top: { style: 'double' },
                    bottom: { style: 'double' },
                    left: { style: 'thin' },
                    right: { style: 'thin' }
                };
                if (colNumber >= 8) {
                    cell.alignment = { horizontal: 'right' };
                }
            });
        }

        // Set column widths
        sheet.columns = [
            { width: 12 },  // Order Date
            { width: 14 },  // Order No
            { width: 15 },  // Invoice No
            { width: 14 },  // Product Code
            { width: 14 },  // Purchase Type
            { width: 12 },  // Ordered Qty
            { width: 12 },  // Received Qty
            { width: 14 },  // Unit Price
            { width: 14 },  // Item Total
            { width: 14 },  // Order Total
            { width: 15 }   // Created By
        ];

        // Send file
        const fileName = `purchase_orders_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    approvePurchaseOrder,
    receivePurchaseOrder,
    cancelPurchaseOrder,
    getEmptyStock,
    exportPurchaseOrdersToExcel
};