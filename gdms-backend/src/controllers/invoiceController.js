const { getConnection } = require('../config/database');
const { generateId } = require('../utils/generateId');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const PDFDocument = require('pdfkit');

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

        // First calculate total amount
        for (const item of items) {
            const itemTotal = item.quantity * item.unit_price;
            total_amount += itemTotal;
        }

        // Step B: Insert Invoice Header FIRST (before items due to FK constraint)
        await connection.execute(
            `INSERT INTO invoices (invoice_id, invoice_number, dealer_id, dispatch_id, subtotal, total_amount, payment_type, due_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [invoice_id, `INV-${Date.now().toString().slice(-6)}`, dealer_id, dispatch_id, total_amount, total_amount, payment_method, payment_method === 'CREDIT' ? new Date(Date.now() + 30*24*60*60*1000) : null]
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

            await connection.commit();
            return successResponse(res, 201, 'Invoice created successfully', { invoice_id, total_amount });
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

// 3. COMPLETE TRIP (Supervisor)
const completeTrip = async (req, res, next) => {
    const { dispatch_id } = req.params;
    try {
        const pool = await getConnection();
        await pool.execute('UPDATE dispatches SET status = "AWAITING_UNLOAD" WHERE dispatch_id = ?', [dispatch_id]);
        return successResponse(res, 200, 'Trip marked as completed. Awaiting admin unloading.');
    } catch (error) {
        next(error);
    }
};

const acceptUnload = async (req, res, next) => {
    const { dispatch_id } = req.body;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Get lorry stock with new columns
            const [lorryStock] = await connection.execute(
                `SELECT ls.*, p.cylinder_size 
                 FROM lorry_stock ls
                 JOIN products p ON ls.product_id = p.product_id
                 WHERE ls.dispatch_id = ?`,
                [dispatch_id]
            );

            // Return stock to inventory
            for (const stock of lorryStock) {
                // Calculate what's returning
                const remaining_filled = stock.loaded_quantity - (stock.sold_filled || 0) - (stock.sold_new || 0) - stock.damaged_quantity;
                const empty_returning = stock.empty_collected || 0;
                
                // Return remaining FILLED cylinders to inventory
                if (remaining_filled > 0) {
                    await connection.execute(
                        `UPDATE inventory 
                         SET quantity = quantity + ? 
                         WHERE product_id = ? AND product_type = 'FILLED'`,
                        [remaining_filled, stock.product_id]
                    );
                }
                
                // Return EMPTY cylinders to inventory
                if (empty_returning > 0) {
                    await connection.execute(
                        `UPDATE inventory 
                         SET quantity = quantity + ? 
                         WHERE product_id = ? AND product_type = 'EMPTY'`,
                        [empty_returning, stock.product_id]
                    );
                }
                
                // Add DAMAGED to damaged inventory
                if (stock.damaged_quantity > 0) {
                    await connection.execute(
                        `UPDATE inventory 
                         SET quantity = quantity + ? 
                         WHERE product_id = ? AND product_type = 'DAMAGED'`,
                        [stock.damaged_quantity, stock.product_id]
                    );
                }
            }

            // Update dispatch status
            await connection.execute(
                `UPDATE dispatches SET status = 'UNLOADED' WHERE dispatch_id = ?`,
                [dispatch_id]
            );

            // Update lorry status
            const [dispatch] = await connection.execute(
                'SELECT lorry_id, supervisor_id FROM dispatches WHERE dispatch_id = ?',
                [dispatch_id]
            );
            
            await connection.execute(
                `UPDATE lorries SET status = 'AVAILABLE' WHERE lorry_id = ?`,
                [dispatch[0].lorry_id]
            );
            
            await connection.execute(
                `UPDATE supervisors SET status = 'AVAILABLE' WHERE supervisor_id = ?`,
                [dispatch[0].supervisor_id]
            );

            await connection.commit();
            return successResponse(res, 200, 'Dispatch unloaded successfully');
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

// 5. CANCEL PENDING DISPATCH (Admin)
const cancelDispatch = async (req, res, next) => {
    const { dispatch_id } = req.body;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [dispatch] = await connection.execute(
                'SELECT status, supervisor_id, lorry_id FROM dispatches WHERE dispatch_id = ?', 
                [dispatch_id]
            );
            
            if (!dispatch.length || dispatch[0].status !== 'SCHEDULED') {
                return errorResponse(res, 400, 'Only scheduled dispatches can be cancelled');
            }
            
            const { supervisor_id, lorry_id } = dispatch[0];

            // 1. Revert Lorry Stock back to Warehouse Inventory
            const [truckItems] = await connection.execute(
                'SELECT product_id, product_type, loaded_quantity FROM lorry_stock WHERE dispatch_id = ?', 
                [dispatch_id]
            );
            
            for (const item of truckItems) {
                await connection.execute(
                    'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND product_type = ?', 
                    [item.loaded_quantity, item.product_id, item.product_type]
                );
            }
            
            // 2. Delete lorry_stock records for this dispatch
            await connection.execute('DELETE FROM lorry_stock WHERE dispatch_id = ?', [dispatch_id]);

            // 3. Reset Statuses
            await connection.execute('UPDATE dispatches SET status = "CANCELLED" WHERE dispatch_id = ?', [dispatch_id]);
            await connection.execute('UPDATE lorries SET status = "AVAILABLE" WHERE lorry_id = ?', [lorry_id]);
            await connection.execute('UPDATE supervisors SET status = "AVAILABLE" WHERE supervisor_id = ?', [supervisor_id]);

            await connection.commit();
            return successResponse(res, 200, 'Dispatch cancelled and materials returned to warehouse');
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
        const [invoices] = await pool.execute(`
            SELECT i.*, 
                   d.dealer_name, 
                   CONCAT(u.first_name, ' ', u.last_name) as supervisor_name,
                   disp.lorry_id,
                   l.vehicle_number,
                   COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id AND status = 'COMPLETED'), 0) as total_paid,
                   COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id AND status = 'PENDING'), 0) as pending_paid,
                   COALESCE((SELECT SUM(remaining_balance) FROM credit_transactions WHERE invoice_id = i.invoice_id), 0) as credit_balance
            FROM invoices i 
            JOIN dealers d ON i.dealer_id = d.dealer_id 
            JOIN dispatches disp ON i.dispatch_id = disp.dispatch_id
            JOIN users u ON disp.supervisor_id = u.user_id
            LEFT JOIN lorries l ON disp.lorry_id = l.lorry_id
            ORDER BY i.created_at DESC
        `);
        
        // Fetch items for each invoice
        for (const invoice of invoices) {
            const [items] = await pool.execute(`
                SELECT 
                    ii.*, 
                    p.cylinder_size,
                    p.product_code
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
            SELECT ii.*, p.cylinder_size
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

module.exports = {
    createInvoice,
    reportDamage,
    completeTrip,
    acceptUnload,
    cancelDispatch,
    getAllInvoices,
    downloadInvoicePDF

};
