const { getConnection } = require('../config/database');
const { generateId } = require('../utils/generateId');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { createNotification, notifyAllAdmins } = require('../utils/notificationHelper');

// Helper function to generate next sequential INV number
const getNextINVNumber = async (connection) => {
    const [lastINV] = await connection.execute(
        `SELECT invoice_number FROM invoices 
         ORDER BY created_at DESC, invoice_number DESC LIMIT 1`
    );
    
    let nextNumber = 1;
    
    if (lastINV.length > 0) {
        const lastInvoiceNumber = lastINV[0].invoice_number;
        const match = lastInvoiceNumber.match(/INV-(\d+)/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }
    
    // Format: INV-01, INV-02, ..., INV-99, INV-100, INV-1000
    const formattedNumber = nextNumber.toString().padStart(2, '0');
    
    return `INV-${formattedNumber}`;
};

const createInvoice = async (req, res, next) => {
    const { dealer_id, dispatch_id, items, payment_method, paid_amount, cheque_details } = req.body;
    const collected_by = req.user.userId;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Get dispatch details to verify and get supervisor_id
            console.log('Creating invoice for dispatch_id:', dispatch_id);
            const [dispatchRows] = await connection.execute(
                'SELECT supervisor_id, lorry_id, status FROM dispatches WHERE dispatch_id = ?',
                [dispatch_id]
            );
            console.log('Dispatch query result:', dispatchRows);
            
            if (!dispatchRows.length || dispatchRows[0].status !== 'IN_PROGRESS') {
                console.log('Dispatch status check failed. Status:', dispatchRows[0]?.status);
                throw new Error('Dispatch must be IN_PROGRESS to create invoices');
            }
                        
            const { supervisor_id, lorry_id } = dispatchRows[0];
            
            const invoice_id = generateId('INV');
            let total_amount = 0;
            // generate invoice number once and reuse (avoid calling getNextINVNumber twice)
            const invoice_number = await getNextINVNumber(connection);

        // First calculate total amount
        for (const item of items) {
            const itemTotal = item.quantity * item.unit_price;
            total_amount += itemTotal;
        }

        // Step B: Insert Invoice Header FIRST (before items due to FK constraint)
        await connection.execute(
            `INSERT INTO invoices (invoice_id, invoice_number, dealer_id, dispatch_id, subtotal, total_amount, payment_type, due_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [invoice_id, invoice_number, dealer_id, dispatch_id, total_amount, total_amount, payment_method, payment_method === 'CREDIT' ? new Date(Date.now() + 30*24*60*60*1000) : null]
        );

        // Step A: Process Items - Track sold_filled, sold_new, empty_collected
        for (const item of items) {
            const sale_type = item.sale_type || 'FILLED';
            const quantity = parseInt(item.quantity);
            
            // FILLED = refill sale (dealer returns empty), NEW = new cylinder sale
            const is_refill = sale_type === 'FILLED';
            const empty_returned = is_refill ? quantity : 0;

            // Update lorry_stock
            if (is_refill) {
                const [stockUpdate] = await connection.execute(
                    `UPDATE lorry_stock 
                    SET sold_filled = sold_filled + ?,
                        empty_collected = empty_collected + ?
                    WHERE dispatch_id = ? AND product_id = ? AND product_type = 'FILLED' 
                    AND (loaded_quantity - COALESCE(sold_filled,0) - COALESCE(sold_new,0) - damaged_quantity) >= ?`,
                    [quantity, empty_returned, dispatch_id, item.product_id, quantity]
                );
                if (stockUpdate.affectedRows === 0) {
                    throw new Error(`Insufficient stock for Product ${item.product_id}`);
                }
            } else {
                const [stockUpdate] = await connection.execute(
                    `UPDATE lorry_stock 
                    SET sold_new = sold_new + ?
                    WHERE dispatch_id = ? AND product_id = ? AND product_type = 'FILLED' 
                    AND (loaded_quantity - COALESCE(sold_filled,0) - COALESCE(sold_new,0) - damaged_quantity) >= ?`,
                    [quantity, dispatch_id, item.product_id, quantity]
                );
                if (stockUpdate.affectedRows === 0) {
                    throw new Error(`Insufficient stock for Product ${item.product_id}`);
                }
            }

            // Update dispatch_items
            if (is_refill) {
                await connection.execute(
                    `UPDATE dispatch_items 
                    SET sold_filled = COALESCE(sold_filled,0) + ?, 
                        empty_collected = COALESCE(empty_collected,0) + ?
                    WHERE dispatch_id = ? AND product_id = ? AND product_type = 'FILLED'`,
                    [quantity, empty_returned, dispatch_id, item.product_id]
                );
            } else {
                await connection.execute(
                    `UPDATE dispatch_items 
                    SET sold_new = COALESCE(sold_new,0) + ?
                    WHERE dispatch_id = ? AND product_id = ? AND product_type = 'FILLED'`,
                    [quantity, dispatch_id, item.product_id]
                );
            }

            // Insert into invoice_items
            await connection.execute(
                `INSERT INTO invoice_items (invoice_item_id, invoice_id, product_id, sale_type, quantity, unit_price, total_price, empty_returned)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [generateId('II'), invoice_id, item.product_id, sale_type, item.quantity, item.unit_price, item.quantity * item.unit_price, empty_returned]
            );
        }

            // Step C: Handle Payments
            const actualPaidAmount = parseFloat(paid_amount) || 0;

            if (payment_method === 'CASH') {
                const paidNow = Math.min(actualPaidAmount, total_amount);
                const remainingCredit = total_amount - paidNow;
                
                if (paidNow > 0) {
                    const payment_id = generateId('PAY');
                    await connection.execute(
                        `INSERT INTO payments (payment_id, payment_number, invoice_id, amount, payment_method, status, collected_by)
                         VALUES (?, ?, ?, ?, 'CASH', 'COMPLETED', ?)`,
                        [payment_id, `PAY-${Date.now().toString().slice(-6)}`, invoice_id, paidNow, collected_by]
                    );
                }
                
                if (remainingCredit > 0) {
                    const [dealerRows] = await connection.execute(
                        'SELECT payment_terms_days FROM dealers WHERE dealer_id = ?', [dealer_id]
                    );
                    const paymentTerms = dealerRows[0]?.payment_terms_days || 30;
                    
                    await connection.execute(
                        `INSERT INTO credit_transactions (credit_id, dealer_id, invoice_id, credit_amount, remaining_balance, due_date, status)
                         VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), 'PENDING')`,
                        [generateId('CRD'), dealer_id, invoice_id, remainingCredit, remainingCredit, paymentTerms]
                    );
                    await connection.execute(
                        'UPDATE dealers SET current_credit = current_credit + ? WHERE dealer_id = ?', 
                        [remainingCredit, dealer_id]
                    );
                }
            } else if (payment_method === 'CREDIT') {
                const [dealerRows] = await connection.execute(
                    'SELECT payment_terms_days FROM dealers WHERE dealer_id = ?',
                    [dealer_id]
                );
                const paymentTerms = dealerRows[0]?.payment_terms_days || 30;
                
                await connection.execute(
                    `INSERT INTO credit_transactions (credit_id, dealer_id, invoice_id, credit_amount, remaining_balance, due_date, status)
                     VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), 'PENDING')`,
                    [generateId('CRD'), dealer_id, invoice_id, total_amount, total_amount, paymentTerms]
                );
                await connection.execute('UPDATE dealers SET current_credit = current_credit + ? WHERE dealer_id = ?', [total_amount, dealer_id]);
            } else if (payment_method === 'CHEQUE') {
                if (!cheque_details || !cheque_details.number || !cheque_details.date || !cheque_details.bank || !cheque_details.branch) {
                    await connection.rollback();
                    return errorResponse(res, 400, 'All cheque details are required');
                }
                
                if (!/^\d{6}$/.test(cheque_details.number)) {
                    await connection.rollback();
                    return errorResponse(res, 400, 'Cheque number must be exactly 6 digits');
                }

                const [existingCheque] = await connection.execute(
                    `SELECT cheque_number FROM cheque_payments 
                     WHERE bank_name = ? AND cheque_number = ? 
                     AND clearance_status NOT IN ('RETURNED', 'CANCELLED')`,
                    [cheque_details.bank, cheque_details.number]
                );
                
                if (existingCheque.length > 0) {
                    await connection.rollback();
                    return errorResponse(res, 400, `Cheque number ${cheque_details.number} already exists for ${cheque_details.bank} and has not been returned or cancelled.`);
                }

                const chequeAmount = Math.min(actualPaidAmount || total_amount, total_amount);
                const remainingCredit = total_amount - chequeAmount;
                const payment_id = generateId('PAY');
                
                // Insert payment with actual cheque amount (not total)
                await connection.execute(
                    `INSERT INTO payments (payment_id, payment_number, invoice_id, amount, payment_method, status, collected_by)
                     VALUES (?, ?, ?, ?, 'CHEQUE', 'PENDING', ?)`,
                    [payment_id, `PAY-${Date.now().toString().slice(-6)}`, invoice_id, chequeAmount, collected_by]
                );

                await connection.execute(
                    `INSERT INTO cheque_payments (cheque_payment_id, cheque_number, cheque_date, bank_name, branch_name) VALUES (?, ?, ?, ?, ?)`,
                    [payment_id, cheque_details.number, cheque_details.date, cheque_details.bank, cheque_details.branch]
                );
                
                // If partial cheque payment, create credit transaction for the remainder
                if (remainingCredit > 0) {
                    const [dealerRows] = await connection.execute(
                        'SELECT payment_terms_days FROM dealers WHERE dealer_id = ?', [dealer_id]
                    );
                    const paymentTerms = dealerRows[0]?.payment_terms_days || 30;
                    
                    await connection.execute(
                        `INSERT INTO credit_transactions (credit_id, dealer_id, invoice_id, credit_amount, remaining_balance, due_date, status)
                         VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), 'PENDING')`,
                        [generateId('CRD'), dealer_id, invoice_id, remainingCredit, remainingCredit, paymentTerms]
                    );
                    await connection.execute(
                        'UPDATE dealers SET current_credit = current_credit + ? WHERE dealer_id = ?', 
                        [remainingCredit, dealer_id]
                    );
                }
            }

            // Step D: Update Supervisor Performance
            await connection.execute('UPDATE supervisors SET achieved_sales = achieved_sales + ? WHERE supervisor_id = ?', [total_amount, supervisor_id]);

            // Notify admins about new invoice
            await notifyAllAdmins(connection, {
                title: 'Invoice Created',
                message: `Invoice ${invoice_number} created for dispatch ${dispatch_id} (Rs. ${total_amount.toLocaleString()}).`,
                type: 'INVOICE_CREATED',
                reference_id: invoice_id
            });
            // Notify the supervisor who created it
            await createNotification(connection, {
                user_id: collected_by,
                title: 'Invoice Created',
                message: `Your invoice ${invoice_number} has been created successfully (Rs. ${total_amount.toLocaleString()}).`,
                type: 'INVOICE_CREATED',
                reference_id: invoice_id
            });

            await connection.commit();
            return successResponse(res, 201, 'Invoice created successfully', { invoice_number });
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

// 2. REPORT DAMAGE (Supervisor)
const reportDamage = async (req, res, next) => {
    const { dispatch_id, product_id, quantity, damage_reason } = req.body;
    const reported_by = req.user.userId;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Update lorry_stock damaged_quantity
            const [deduct] = await connection.execute(
                `UPDATE lorry_stock 
                 SET damaged_quantity = damaged_quantity + ? 
                 WHERE dispatch_id = ? AND product_id = ? AND product_type = 'FILLED'
                 AND (loaded_quantity - COALESCE(sold_filled,0) - COALESCE(sold_new,0) - damaged_quantity) >= ?`,
                [quantity, dispatch_id, product_id, quantity]
            );

            if (deduct.affectedRows === 0) throw new Error('Insufficient filled stock in lorry to report damage');

            // 2. Update dispatch items
            await connection.execute(
                `UPDATE dispatch_items 
                 SET damaged_quantity = damaged_quantity + ? 
                 WHERE dispatch_id = ? AND product_id = ? AND product_type = 'FILLED'`,
                [quantity, dispatch_id, product_id]
            );

            // 3. Record in damage_inventory table
            await connection.execute(
                `INSERT INTO damage_inventory (damage_id, product_id, quantity_damaged, dispatch_id, damage_reason, reported_by)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [generateId('DMG'), product_id, quantity, dispatch_id, damage_reason || 'Damage during dispatch', reported_by]
            );

            await connection.commit();

            // Notify admins about damage reported by supervisor
            const [prodInfo] = await pool.execute('SELECT cylinder_size FROM products WHERE product_id = ?', [product_id]);
            await notifyAllAdmins(pool, {
                title: 'Damage Reported (Dispatch)',
                message: `${quantity} x ${prodInfo[0]?.cylinder_size || product_id} damaged during dispatch ${dispatch_id}.`,
                type: 'DAMAGE_REPORTED',
                reference_id: dispatch_id
            });

            return successResponse(res, 200, 'Damage reported and stock adjusted');
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

const softDeleteInvoice = async (req, res, next) => {
    const { id } = req.params;
    const deletedBy = req.user.userId; // Get the user ID from the authenticated request

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Get the invoice and verify it exists and isn't already deleted
            const [invoiceRows] = await connection.execute(
                'SELECT * FROM invoices WHERE invoice_id = ? AND is_deleted = FALSE', [id]
            );
            if (!invoiceRows.length) throw new Error('Invoice not found or already deleted');

            const invoice = invoiceRows[0];

            // 1.5 Verify the dispatch is still active
            const [dispatchRows] = await connection.execute(
                'SELECT status FROM dispatches WHERE dispatch_id = ?', [invoice.dispatch_id]
            );
            if (dispatchRows.length === 0 || dispatchRows[0].status !== 'IN PROGRESS') {
                await connection.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: `Cannot delete invoice: The associated dispatch is ${dispatchRows.length ? dispatchRows[0].status.toLowerCase() : 'deleted'} and no longer active.` 
                });
            }

            // 2. Get invoice items to reverse stock changes
            const [items] = await connection.execute(
                'SELECT * FROM invoice_items WHERE invoice_id = ?', [id]
            );

            // 3. Reverse lorry_stock and dispatch_items for each item
            for (const item of items) {
                const is_refill = item.sale_type === 'FILLED';
                if (is_refill) {
                    await connection.execute(
                        `UPDATE lorry_stock 
                         SET sold_filled = sold_filled - ?, empty_collected = empty_collected - ?
                         WHERE dispatch_id = ? AND product_id = ? AND product_type = 'FILLED'`,
                        [item.quantity, item.empty_returned, invoice.dispatch_id, item.product_id]
                    );
                    await connection.execute(
                        `UPDATE dispatch_items 
                         SET sold_filled = sold_filled - ?, empty_collected = empty_collected - ?
                         WHERE dispatch_id = ? AND product_id = ? AND product_type = 'FILLED'`,
                        [item.quantity, item.empty_returned, invoice.dispatch_id, item.product_id]
                    );
                } else {
                    await connection.execute(
                        `UPDATE lorry_stock SET sold_new = sold_new - ?
                         WHERE dispatch_id = ? AND product_id = ? AND product_type = 'FILLED'`,
                        [item.quantity, invoice.dispatch_id, item.product_id]
                    );
                    await connection.execute(
                        `UPDATE dispatch_items SET sold_new = sold_new - ?
                         WHERE dispatch_id = ? AND product_id = ? AND product_type = 'FILLED'`,
                        [item.quantity, invoice.dispatch_id, item.product_id]
                    );
                }
            }

            // 4. Reverse credit if applicable
            const [creditRows] = await connection.execute(
                'SELECT * FROM credit_transactions WHERE invoice_id = ?', [id]
            );
            if (creditRows.length > 0) {
                const credit = creditRows[0];
                await connection.execute(
                    'UPDATE dealers SET current_credit = current_credit - ? WHERE dealer_id = ?',
                    [credit.remaining_balance, invoice.dealer_id]
                );
                await connection.execute(
                    'DELETE FROM credit_settlements WHERE credit_id = ?', [credit.credit_id]
                );
                await connection.execute(
                    'DELETE FROM credit_transactions WHERE invoice_id = ?', [id]
                );
            }

            // 5. Delete payments (and cheque_payments via CASCADE)
            await connection.execute('DELETE FROM payments WHERE invoice_id = ?', [id]);

            // 6. Reverse supervisor achieved_sales
            const [dispRows] = await connection.execute(
                'SELECT supervisor_id FROM dispatches WHERE dispatch_id = ?', [invoice.dispatch_id]
            );
            if (dispRows.length > 0) {
                await connection.execute(
                    'UPDATE supervisors SET achieved_sales = achieved_sales - ? WHERE supervisor_id = ?',
                    [invoice.total_amount, dispRows[0].supervisor_id]
                );
            }

            // 7. Soft delete the invoice with deleted_by and deleted_at
            await connection.execute(
                `UPDATE invoices 
                 SET is_deleted = TRUE, 
                     deleted_by = ?, 
                     deleted_at = NOW() 
                 WHERE invoice_id = ?`, 
                [deletedBy, id]
            );

            // Notify admins about invoice cancellation
            await notifyAllAdmins(connection, {
                title: 'Invoice Cancelled',
                message: `Invoice ${invoice.invoice_number || id} has been cancelled and all references reversed.`,
                type: 'INVOICE_CANCELLED',
                reference_id: id
            });

            await connection.commit();
            return successResponse(res, 200, 'Invoice soft deleted and references reversed');
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

// 6. GET ALL INVOICES (Admin/Supervisor)
const getAllInvoices = async (req, res, next) => {
    try {
        const pool = await getConnection();
        const userRole = req.user.role;
        const userId = req.user.userId;

        // Base query (exclude soft-deleted invoices)
        let query = `
            SELECT i.*, 
                   d.dealer_name, 
                   CONCAT(u.first_name, ' ', u.last_name) as supervisor_name,
                   disp.lorry_id,
                   disp.dispatch_number,
                   l.vehicle_number,
                   COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id AND status = 'COMPLETED'), 0) as total_paid,
                   COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id AND status = 'PENDING'), 0) as pending_paid,
                   COALESCE((SELECT SUM(remaining_balance) FROM credit_transactions WHERE invoice_id = i.invoice_id), 0) as credit_balance
            FROM invoices i 
            JOIN dealers d ON i.dealer_id = d.dealer_id 
            JOIN dispatches disp ON i.dispatch_id = disp.dispatch_id
            JOIN users u ON disp.supervisor_id = u.user_id
            LEFT JOIN lorries l ON disp.lorry_id = l.lorry_id
            WHERE i.is_deleted = FALSE
        `;
        const params = [];

        // If requester is a SUPERVISOR, limit to invoices for their dispatches
        if (userRole === 'SUPERVISOR') {
            query += ' AND disp.supervisor_id = ?';
            params.push(userId);
        }

        query += ' ORDER BY i.created_at DESC';

        const [invoices] = await pool.execute(query, params);

        // attach items as before
        for (const invoice of invoices) {
            const [items] = await pool.execute(`
                SELECT ii.*, p.cylinder_size, p.product_code
                FROM invoice_items ii
                JOIN products p ON ii.product_id = p.product_id
                WHERE ii.invoice_id = ?
            `, [invoice.invoice_id]);
            invoice.items = items;
        }

        return successResponse(res, 200, 'Invoices retrieved', invoices);
    } catch (error) {
        next(error);
    }
};

// 7. DOWNLOAD INVOICE PDF
const downloadInvoicePDF = async (req, res, next) => {
    const { id } = req.params;
    const PDFDocument = require('pdfkit');
    
    try {
        const pool = await getConnection();
        
        // Fetch invoice with dealer info
        const [invoices] = await pool.execute(`
            SELECT i.*, d.dealer_name, d.address, d.contact_number,
                COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id AND status = 'COMPLETED'), 0) as total_paid,
                COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id AND status = 'PENDING'), 0) as pending_paid,
                COALESCE((SELECT SUM(remaining_balance) FROM credit_transactions WHERE invoice_id = i.invoice_id), 0) as credit_balance
            FROM invoices i
            JOIN dealers d ON i.dealer_id = d.dealer_id
            WHERE i.invoice_id = ?
        `, [id]);
        
        if (invoices.length === 0) {
            return errorResponse(res, 404, 'Invoice not found');
        }
        
        const invoice = invoices[0];
        
        // Fetch invoice items
        const [items] = await pool.execute(`
            SELECT ii.*, p.cylinder_size, p.product_code
            FROM invoice_items ii
            JOIN products p ON ii.product_id = p.product_id
            WHERE ii.invoice_id = ?
        `, [id]);
        
        // Create PDF
        const doc = new PDFDocument({ margin: 50 });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_number}.pdf`);
        
        doc.pipe(res);
        
        // Company Header
        doc.fontSize(24).font('Helvetica-Bold').text('Hidellana Distributors', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('Gas Distribution Management System', { align: 'center' });
        doc.moveDown();
        
        // Invoice Title
        doc.fontSize(18).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
        doc.moveDown();
        
        // Invoice Details
        doc.fontSize(10).font('Helvetica');
        doc.text(`Invoice Number: ${invoice.invoice_number}`);
        doc.text(`Date: ${new Date(invoice.invoice_date || invoice.created_at).toLocaleDateString()}`);
        doc.text(`Payment Type: ${invoice.payment_type}`);
        doc.moveDown();
        
        // Dealer Info
        doc.font('Helvetica-Bold').text('Bill To:');
        doc.font('Helvetica').text(invoice.dealer_name);
        doc.text(invoice.address || 'N/A');
        doc.text(`Phone: ${invoice.contact_number || 'N/A'}`);
        doc.moveDown();
        
        // Items Table Header
        const tableTop = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('Product', 50, tableTop);
        doc.text('Type', 180, tableTop);
        doc.text('Qty', 280, tableTop, { width: 50, align: 'center' });
        doc.text('Rate', 350, tableTop, { width: 80, align: 'right' });
        doc.text('Total', 450, tableTop, { width: 80, align: 'right' });
        
        // Draw line
        doc.moveTo(50, tableTop + 15).lineTo(530, tableTop + 15).stroke();
        
        // Items
        let y = tableTop + 25;
        doc.font('Helvetica');
        items.forEach(item => {
            doc.text(item.cylinder_size, 50, y);
            doc.text(item.sale_type, 180, y);
            doc.text(item.quantity.toString(), 280, y, { width: 50, align: 'center' });
            doc.text(`Rs. ${parseFloat(item.unit_price).toLocaleString()}`, 350, y, { width: 80, align: 'right' });
            doc.text(`Rs. ${parseFloat(item.total_price).toLocaleString()}`, 450, y, { width: 80, align: 'right' });
            y += 20;
        });
        
        // Draw line
        doc.moveTo(50, y + 5).lineTo(530, y + 5).stroke();
        
        // Totals
        y += 20;
        doc.font('Helvetica-Bold');
        doc.text('Grand Total:', 350, y, { width: 80, align: 'right' });
        doc.fontSize(14).text(`Rs. ${parseFloat(invoice.total_amount).toLocaleString()}`, 450, y - 2, { width: 80, align: 'right' });
        
        // Payment Summary
        y += 30;
        doc.fontSize(10);
        const totalPaid = parseFloat(invoice.total_paid) || 0;
        const pendingPaid = parseFloat(invoice.pending_paid) || 0;
        const creditBalance = parseFloat(invoice.credit_balance) || 0;
        
        if (totalPaid > 0) {
            doc.font('Helvetica').text('Paid (Cleared):', 350, y, { width: 80, align: 'right' });
            doc.text(`Rs. ${totalPaid.toLocaleString()}`, 450, y, { width: 80, align: 'right' });
            y += 15;
        }
        if (pendingPaid > 0) {
            doc.font('Helvetica').text('Cheque Pending:', 350, y, { width: 80, align: 'right' });
            doc.text(`Rs. ${pendingPaid.toLocaleString()}`, 450, y, { width: 80, align: 'right' });
            y += 15;
        }
        if (creditBalance > 0) {
            doc.font('Helvetica').text('Credit Balance:', 350, y, { width: 80, align: 'right' });
            doc.font('Helvetica-Bold').fillColor('red').text(`Rs. ${creditBalance.toLocaleString()}`, 450, y, { width: 80, align: 'right' });
            doc.fillColor('black');
            y += 15;
        }
        
        // Footer
        doc.fontSize(10).font('Helvetica');
        doc.text('Thank you for your business!', 50, 700, { align: 'center' });
        
        doc.end();
    } catch (error) {
        next(error);
    }
};




const exportInvoicesToExcel = async (req, res, next) => {
    const { start_date, end_date, status, dealer_name } = req.query;

    try {
        const pool = await getConnection();

        // Get invoices with items, dealer details, and payment information
        let query = `
            SELECT 
                i.invoice_number,
                DATE(i.invoice_date) as invoice_date,
                d.dealer_name,
                d.contact_number as dealer_contact,
                disp.dispatch_number,
                i.payment_type,
                i.subtotal,
                i.total_amount,
                p.product_code,
                ii.sale_type,
                ii.quantity,
                ii.unit_price,
                ii.total_price,
                ii.empty_returned,
                i.is_deleted,
                CONCAT(del_user.first_name, ' ', del_user.last_name) as deleted_by_name,
                i.deleted_at,
                i.payment_type as payment_method,
                COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id AND status = 'COMPLETED'), 0) as total_paid,
                COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id AND status = 'PENDING'), 0) as pending_paid,
                COALESCE((SELECT SUM(remaining_balance) FROM credit_transactions WHERE invoice_id = i.invoice_id), 0) as credit_balance
            FROM invoices i
            JOIN dealers d ON i.dealer_id = d.dealer_id
            JOIN dispatches disp ON i.dispatch_id = disp.dispatch_id
            JOIN invoice_items ii ON i.invoice_id = ii.invoice_id
            JOIN products p ON ii.product_id = p.product_id
            LEFT JOIN users del_user ON i.deleted_by = del_user.user_id
            WHERE 1=1
        `;
        const params = [];

        if (start_date) {
            query += ' AND DATE(i.invoice_date) >= ?';
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND DATE(i.invoice_date) <= ?';
            params.push(end_date);
        }
        if (status && status !== 'All Status' && status !== '') {
            // Updated filtering logic using exact math like frontend
            if (status === 'Paid') {
                query += ` AND COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id AND status = 'COMPLETED'), 0) >= i.total_amount`;
            } else if (status === 'Pending') {
                query += ` AND COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id AND status = 'COMPLETED'), 0) < i.total_amount
                           AND COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id AND status IN ('COMPLETED', 'PENDING')), 0) = 0`;
            } else if (status === 'Partial') {
                query += ` AND COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id AND status IN ('COMPLETED', 'PENDING')), 0) > 0 
                           AND COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id AND status = 'COMPLETED'), 0) < i.total_amount
                           AND COALESCE((SELECT SUM(remaining_balance) FROM credit_transactions WHERE invoice_id = i.invoice_id), 0) > 0`;
            }
        }
        if (dealer_name) {
            query += ' AND d.dealer_name LIKE ?';
            params.push(`%${dealer_name}%`);
        }

        query += ' ORDER BY i.invoice_date DESC, i.invoice_number DESC, p.product_code';
        
        const [invoices] = await pool.execute(query, params);

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Invoices');

        // Company Header
        const companyHeaders = [
            'HIDELLANA DISTRIBUTORS (PVT) LTD',
            'No. 164, Kudagama Road, Hidellana, Ratnapura',
            'Tel: 045-2222865 | Reg No: PV 113085',
            `Invoice Archive Report - Generated: ${new Date().toLocaleDateString()}`
        ];

        companyHeaders.forEach((text, idx) => {
            sheet.mergeCells(`A${idx + 1}:O${idx + 1}`);
            const row = sheet.getRow(idx + 1);
            row.getCell(1).value = text;
            row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(1).font = idx === 0 ? { bold: true, size: 14 } : { size: 11 };
        });

        // Table headers at row 6
        sheet.getRow(6).values = [
            'Date',
            'Invoice No',
            'Dealer Name',
            'Dispatch Ref',
            'Product Code',
            'Sale Type',
            'Quantity',
            'Empty Returned',
            'Unit Price (Rs)',
            'Item Total (Rs)',
            'Invoice Total (Rs)',
            'Paid Amount (Rs)',
            'Payment Method',
            'Status',
            'Deleted By'
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

        // Group invoices by invoice_number for merging
        const invoiceGroups = {};
        invoices.forEach(invoice => {
            if (!invoiceGroups[invoice.invoice_number]) {
                invoiceGroups[invoice.invoice_number] = [];
            }
            invoiceGroups[invoice.invoice_number].push(invoice);
        });

        let currentRow = 7;

        // Data rows with merging
        Object.keys(invoiceGroups).forEach(invoiceNumber => {
            const invoiceItems = invoiceGroups[invoiceNumber];
            const startRow = currentRow;
            const itemCount = invoiceItems.length;
            
            invoiceItems.forEach((invoice, index) => {
                const row = sheet.getRow(currentRow);
                
                // Calculate correct status and paid amount mirroring frontend
                const totalPaid = parseFloat(invoice.total_paid) || 0;
                const pendingPaid = parseFloat(invoice.pending_paid) || 0;
                const totalPayments = totalPaid + pendingPaid;
                const totalAmount = parseFloat(invoice.total_amount) || 0;
                const creditBalance = parseFloat(invoice.credit_balance) || 0;
                
                const paidAmount = totalPayments; // Or totalPaid, depending on if you want to include pending cheques in "Paid Amount". Usually frontend shows totalPayments in badge
                
                let paymentStatus = 'Pending';
                if (totalPaid >= totalAmount) {
                    paymentStatus = 'Paid';
                } else if (totalPayments > 0 && creditBalance > 0) {
                    paymentStatus = 'Partial';
                } else if (pendingPaid > 0) {
                    paymentStatus = 'Pending';
                }
                
                // Add actual payment method by checking payments (optional enhancement)
                
                row.values = [
                    new Date(invoice.invoice_date).toLocaleDateString(),
                    invoice.invoice_number,
                    invoice.dealer_name,
                    invoice.dispatch_number,
                    invoice.product_code,
                    invoice.sale_type,
                    invoice.quantity,
                    invoice.empty_returned || 0,
                    parseFloat(invoice.unit_price).toFixed(2),
                    parseFloat(invoice.total_price).toFixed(2),
                    totalAmount.toFixed(2),
                    paidAmount.toFixed(2),
                    invoice.payment_method,
                    paymentStatus,
                    invoice.is_deleted ? (invoice.deleted_by_name || 'N/A') : '-'
                ];

                row.eachCell((cell, colNumber) => {
                    cell.border = {
                        top: { style: 'thin' },
                        bottom: { style: 'thin' },
                        left: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    
                    cell.alignment = { vertical: 'middle' };

                    // Format currency columns (right align)
                    if (colNumber >= 9 && colNumber <= 12) {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    }

                    // Center align for quantities
                    if (colNumber === 7 || colNumber === 8) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }

                    // Status color coding
                    if (colNumber === 14) {
                        const statusVal = cell.value;
                        if (statusVal === 'Paid') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
                            cell.font = { bold: true, color: { argb: 'FF059669' } };
                        } else if (statusVal === 'Pending') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                            cell.font = { bold: true, color: { argb: 'FFDC2626' } };
                        } else if (statusVal === 'Partial') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
                            cell.font = { bold: true, color: { argb: 'FFD97706' } };
                        }
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }

                    // Deleted By column styling
                    if (colNumber === 15) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        if (invoice.is_deleted) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
                            cell.font = { bold: true, color: { argb: 'FF991B1B' } };
                        }
                    }

                    // Add background color for invoice header columns
                    if (colNumber <= 4) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
                    }

                    // Highlight entire row if invoice is deleted
                    if (invoice.is_deleted && colNumber >= 5 && colNumber <= 13) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
                        cell.font = { color: { argb: 'FF7F1D1D' } };
                    }
                });

                currentRow++;
            });

            // Merge cells for invoices with multiple items
            if (itemCount > 1) {
                const endRow = currentRow - 1;
                
                // Merge Date (Column A)
                sheet.mergeCells(`A${startRow}:A${endRow}`);
                sheet.getCell(`A${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                
                // Merge Invoice No (Column B)
                sheet.mergeCells(`B${startRow}:B${endRow}`);
                sheet.getCell(`B${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                
                // Merge Dealer Name (Column C)
                sheet.mergeCells(`C${startRow}:C${endRow}`);
                sheet.getCell(`C${startRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
                
                // Merge Dispatch Ref (Column D)
                sheet.mergeCells(`D${startRow}:D${endRow}`);
                sheet.getCell(`D${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                
                // Merge Invoice Total (Column K)
                sheet.mergeCells(`K${startRow}:K${endRow}`);
                sheet.getCell(`K${startRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
                
                // Merge Paid Amount (Column L)
                sheet.mergeCells(`L${startRow}:L${endRow}`);
                sheet.getCell(`L${startRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
                
                // Merge Payment Method (Column M)
                sheet.mergeCells(`M${startRow}:M${endRow}`);
                sheet.getCell(`M${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                
                // Merge Status (Column N)
                sheet.mergeCells(`N${startRow}:N${endRow}`);
                sheet.getCell(`N${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                
                // Merge Deleted By (Column O)
                sheet.mergeCells(`O${startRow}:O${endRow}`);
                sheet.getCell(`O${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
            }
        });

        // Add summary totals at the bottom
        if (invoices.length > 0) {
            currentRow++; // Empty row
            const summaryRow = sheet.getRow(currentRow);
            
            // Calculate unique invoice totals
            const uniqueInvoices = {};
            invoices.forEach(invoice => {
                if (!uniqueInvoices[invoice.invoice_number]) {
                    const totalPaid = parseFloat(invoice.total_paid) || 0;
                    const pendingPaid = parseFloat(invoice.pending_paid) || 0;
                    uniqueInvoices[invoice.invoice_number] = {
                        total: parseFloat(invoice.total_amount),
                        paid: totalPaid + pendingPaid
                    };
                }
            });
            
            const grandTotal = Object.values(uniqueInvoices).reduce((sum, inv) => sum + inv.total, 0);
            const totalPaid = Object.values(uniqueInvoices).reduce((sum, inv) => sum + inv.paid, 0);
            const totalItems = invoices.reduce((sum, invoice) => sum + parseFloat(invoice.total_price), 0);

            summaryRow.values = [
                '', '', '', '', '', '', '', '', '', 'TOTALS:',
                grandTotal.toFixed(2),
                totalPaid.toFixed(2),
                '', '', ''
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
                if (colNumber >= 10) {
                    cell.alignment = { horizontal: 'right', vertical: 'middle' };
                }
            });
        }

        // Set column widths
        sheet.columns = [
            { width: 12 },  // Date
            { width: 14 },  // Invoice No
            { width: 20 },  // Dealer Name
            { width: 14 },  // Dispatch Ref
            { width: 14 },  // Product Code
            { width: 12 },  // Sale Type
            { width: 10 },  // Quantity
            { width: 12 },  // Empty Returned
            { width: 14 },  // Unit Price
            { width: 14 },  // Item Total
            { width: 14 },  // Invoice Total
            { width: 14 },  // Paid Amount
            { width: 14 },  // Payment Method
            { width: 12 },  // Status
            { width: 18 }   // Deleted By
        ];

        // Send file
        const fileName = `invoices_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
};

module.exports = { exportInvoicesToExcel };

module.exports = { exportInvoicesToExcel };

module.exports = { exportInvoicesToExcel };

module.exports = {
    createInvoice,
    reportDamage,
    getAllInvoices,
    downloadInvoicePDF,
    softDeleteInvoice,
    exportInvoicesToExcel
};
