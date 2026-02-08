const { getConnection } = require('../config/database');

// GET /api/v1/sales/my-sales?date=2026-02-06
const getMySales = async (req, res) => {
    const connection = await getConnection();
    try {
        const supervisorId = req.user.userId;
        const { date } = req.query; // optional, defaults to today
        const targetDate = date || new Date().toISOString().split('T')[0];
        // Summary stats for the supervisor on that date
        const [stats] = await connection.query(`
            SELECT 
                (SELECT COUNT(*) FROM invoices i
                 JOIN dispatches d ON d.dispatch_id = i.dispatch_id
                 WHERE d.supervisor_id = ? AND DATE(i.invoice_date) = ? AND i.is_deleted = FALSE) AS total_invoices,
                (SELECT COALESCE(SUM(i.total_amount), 0) FROM invoices i
                 JOIN dispatches d ON d.dispatch_id = i.dispatch_id
                 WHERE d.supervisor_id = ? AND DATE(i.invoice_date) = ? AND i.is_deleted = FALSE
                ) AS total_revenue,
                (SELECT COALESCE(SUM(ii.quantity), 0) 
                 FROM invoice_items ii 
                 JOIN invoices inv ON inv.invoice_id = ii.invoice_id
                 JOIN dispatches disp ON disp.dispatch_id = inv.dispatch_id
                 WHERE disp.supervisor_id = ? AND DATE(inv.invoice_date) = ? AND inv.is_deleted = FALSE) AS total_cylinders
        `, [supervisorId, targetDate, supervisorId, targetDate, supervisorId, targetDate]);

        // Payment breakdown
        const [payments] = await connection.query(`
            SELECT 
                p.payment_method,
                COALESCE(SUM(p.amount), 0) AS total
            FROM payments p
            JOIN invoices i ON i.invoice_id = p.invoice_id
            JOIN dispatches d ON d.dispatch_id = i.dispatch_id
            WHERE d.supervisor_id = ? AND DATE(i.invoice_date) = ? AND i.is_deleted = FALSE
                AND p.status != 'CANCELLED'
            GROUP BY p.payment_method
        `, [supervisorId, targetDate]);

        // Per-dispatch breakdown (the table rows)
        const [salesRows] = await connection.query(`
            SELECT 
                d.dispatch_id,
                d.dispatch_date,
                l.vehicle_number AS lorry,
                COALESCE(inv_totals.invoice_count, 0) AS invoice_count,
                COALESCE(item_agg.cylinders_sold, 0) AS cylinders_sold,
                COALESCE(inv_totals.total_amount, 0) AS total_amount,
                COALESCE(pay_agg.cash, 0) AS cash,
                COALESCE(pay_agg.cheque, 0) AS cheque,
                GREATEST(COALESCE(inv_totals.total_amount, 0) - COALESCE(pay_agg.cash, 0) - COALESCE(pay_agg.cheque, 0), 0) AS credit
            FROM dispatches d
            JOIN lorries l ON l.lorry_id = d.lorry_id
            LEFT JOIN (
                SELECT i.dispatch_id,
                       COUNT(*) AS invoice_count,
                       SUM(i.total_amount) AS total_amount
                FROM invoices i
                WHERE DATE(i.invoice_date) = ? AND i.is_deleted = FALSE
                GROUP BY i.dispatch_id
            ) inv_totals ON inv_totals.dispatch_id = d.dispatch_id
            LEFT JOIN (
                SELECT i.dispatch_id,
                       SUM(ii.quantity) AS cylinders_sold
                FROM invoice_items ii
                JOIN invoices i ON i.invoice_id = ii.invoice_id
                WHERE DATE(i.invoice_date) = ? AND i.is_deleted = FALSE
                GROUP BY i.dispatch_id
            ) item_agg ON item_agg.dispatch_id = d.dispatch_id
            LEFT JOIN (
                SELECT i.dispatch_id,
                       SUM(CASE WHEN p.payment_method = 'CASH' THEN p.amount ELSE 0 END) AS cash,
                       SUM(CASE WHEN p.payment_method = 'CHEQUE' THEN p.amount ELSE 0 END) AS cheque
                FROM payments p
                JOIN invoices i ON i.invoice_id = p.invoice_id
                WHERE p.status != 'CANCELLED' AND DATE(i.invoice_date) = ? AND i.is_deleted = FALSE
                GROUP BY i.dispatch_id
            ) pay_agg ON pay_agg.dispatch_id = d.dispatch_id
            WHERE d.supervisor_id = ? AND DATE(d.dispatch_date) = ?
            GROUP BY d.dispatch_id, d.dispatch_date, l.vehicle_number
        `, [targetDate, targetDate, targetDate, supervisorId, targetDate]);

        // Fetch items for each dispatch
        for (let sale of salesRows) {
            const [items] = await connection.query(`
                SELECT 
                    p.cylinder_size AS size,
                    ii.sale_type AS type,
                    SUM(ii.quantity) AS quantity,
                    SUM(ii.total_price) AS amount
                FROM invoice_items ii
                JOIN invoices i ON i.invoice_id = ii.invoice_id
                JOIN products p ON p.product_id = ii.product_id
                WHERE i.dispatch_id = ? AND DATE(i.invoice_date) = ? AND i.is_deleted = FALSE
                GROUP BY p.cylinder_size, ii.sale_type
            `, [sale.dispatch_id, targetDate]);
            sale.items = items;
            sale.amount = sale.total_amount; // Add alias for modal
        }

        const paymentBreakdown = { cash: 0, cheque: 0, credit: 0 };
        payments.forEach(row => {
            const method = row.payment_method.toLowerCase();
            if (method === 'cash' || method === 'cheque') {
                paymentBreakdown[method] = parseFloat(row.total);
            }
        });
        // Credit = total revenue minus cash and cheque collected
        const totalRevenue = parseFloat(stats[0].total_revenue);
        paymentBreakdown.credit = Math.max(totalRevenue - paymentBreakdown.cash - paymentBreakdown.cheque, 0);

        res.json({
            success: true,
            data: {
                stats: {
                    revenue: parseFloat(stats[0].total_revenue),
                    orders: stats[0].total_invoices,
                    cylinders: stats[0].total_cylinders
                },
                paymentBreakdown,
                sales: salesRows
            }
        });
    } catch (error) {
        console.error('getMySales error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch sales data' });
    }
};

// GET /api/v1/sales/all?range=today  (or week/month/custom&from=...&to=...)
const getAllSales = async (req, res) => {
    const connection = await getConnection();
    try {
        let dateCondition;
        const { range = 'today', from, to, date } = req.query;

        if (date) {
            // If specific date is provided, use it
            dateCondition = `DATE(i.invoice_date) = '${date}' AND i.is_deleted = FALSE`;
        } else if (range === 'today') {
            dateCondition = 'DATE(i.invoice_date) = CURDATE() AND i.is_deleted = FALSE';
        } else if (range === 'week') {
            dateCondition = 'i.invoice_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND i.is_deleted = FALSE';
        } else if (range === 'month') {
            dateCondition = 'i.invoice_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND i.is_deleted = FALSE';
        } else if (range === 'custom' && from && to) {
            dateCondition = `DATE(i.invoice_date) BETWEEN '${from}' AND '${to}' AND i.is_deleted = FALSE`;
        } else {
            dateCondition = 'DATE(i.invoice_date) = CURDATE() AND i.is_deleted = FALSE';
        }

        // Summary stats (separate aggregations to avoid cartesian product)
        const [stats] = await connection.query(`
            SELECT 
                (SELECT COUNT(*) FROM invoices i WHERE ${dateCondition}) AS total_invoices,
                (SELECT COALESCE(SUM(i.total_amount), 0) FROM invoices i WHERE ${dateCondition}) AS total_revenue,
                (SELECT COALESCE(SUM(ii.quantity), 0) FROM invoice_items ii JOIN invoices i ON i.invoice_id = ii.invoice_id WHERE ${dateCondition}) AS total_cylinders
        `);

        // Per-supervisor/dispatch breakdown using subqueries to avoid row multiplication
        const [salesRows] = await connection.query(`
            SELECT 
                DATE(inv_totals.first_invoice_date) AS sale_date,
                d.dispatch_id,
                l.vehicle_number AS lorry,
                CONCAT(u.first_name, ' ', u.last_name) AS supervisor,
                COALESCE(inv_totals.invoice_count, 0) AS invoice_count,
                COALESCE(item_agg.cylinders_sold, 0) AS cylinders_sold,
                COALESCE(inv_totals.total_amount, 0) AS total_amount,
                COALESCE(pay_agg.cash, 0) AS cash,
                COALESCE(pay_agg.cheque, 0) AS cheque,
                GREATEST(COALESCE(inv_totals.total_amount, 0) - COALESCE(pay_agg.cash, 0) - COALESCE(pay_agg.cheque, 0), 0) AS credit
            FROM dispatches d
            JOIN lorries l ON l.lorry_id = d.lorry_id
            JOIN users u ON u.user_id = d.supervisor_id
            INNER JOIN (
                SELECT i.dispatch_id,
                       COUNT(*) AS invoice_count,
                       SUM(i.total_amount) AS total_amount,
                       MIN(i.invoice_date) AS first_invoice_date
                FROM invoices i
                WHERE ${dateCondition}
                GROUP BY i.dispatch_id
            ) inv_totals ON inv_totals.dispatch_id = d.dispatch_id
            LEFT JOIN (
                SELECT i.dispatch_id,
                       SUM(ii.quantity) AS cylinders_sold
                FROM invoice_items ii
                JOIN invoices i ON i.invoice_id = ii.invoice_id
                WHERE ${dateCondition}
                GROUP BY i.dispatch_id
            ) item_agg ON item_agg.dispatch_id = d.dispatch_id
            LEFT JOIN (
                SELECT i.dispatch_id,
                       SUM(CASE WHEN p.payment_method = 'CASH' THEN p.amount ELSE 0 END) AS cash,
                       SUM(CASE WHEN p.payment_method = 'CHEQUE' THEN p.amount ELSE 0 END) AS cheque
                FROM payments p
                JOIN invoices i ON i.invoice_id = p.invoice_id
                WHERE p.status != 'CANCELLED' AND ${dateCondition}
                GROUP BY i.dispatch_id
            ) pay_agg ON pay_agg.dispatch_id = d.dispatch_id
            ORDER BY sale_date DESC
        `);

        res.json({
            success: true,
            data: {
                stats: {
                    revenue: parseFloat(stats[0].total_revenue),
                    orders: stats[0].total_invoices,
                    cylinders: stats[0].total_cylinders
                },
                sales: salesRows
            }
        });
    } catch (error) {
        console.error('getAllSales error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch sales data' });
    }
};

module.exports = { getMySales, getAllSales };