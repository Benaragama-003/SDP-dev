const { getConnection } = require('../config/database');
const ExcelJS = require('exceljs');

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
                d.dispatch_number AS dispatch_no,
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
            -- Filter by invoice activity date (not dispatch creation date),
            -- otherwise dispatches started on a previous day hide valid sales.
            WHERE d.supervisor_id = ? AND inv_totals.dispatch_id IS NOT NULL
            GROUP BY d.dispatch_id, d.dispatch_number, d.dispatch_date, l.vehicle_number
        `, [targetDate, targetDate, targetDate, supervisorId]);

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
        let dateParams = [];  // Holds the safe parameterized values
        const { range = 'today', from, to, date } = req.query;

        if (date) {
            // Parameterized: ? placeholder instead of string interpolation
            dateCondition = 'DATE(i.invoice_date) = ? AND i.is_deleted = FALSE';
            dateParams = [date];
        } else if (range === 'today') {
            dateCondition = 'DATE(i.invoice_date) = CURDATE() AND i.is_deleted = FALSE';
            dateParams = [];
        } else if (range === 'week') {
            dateCondition = 'i.invoice_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND i.is_deleted = FALSE';
            dateParams = [];
        } else if (range === 'month') {
            dateCondition = 'i.invoice_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND i.is_deleted = FALSE';
            dateParams = [];
        } else if (range === 'custom' && from && to) {
            // Parameterized: two ? placeholders for from and to
            dateCondition = 'DATE(i.invoice_date) BETWEEN ? AND ? AND i.is_deleted = FALSE';
            dateParams = [from, to];
        } else {
            dateCondition = 'DATE(i.invoice_date) = CURDATE() AND i.is_deleted = FALSE';
            dateParams = [];
        }

        // The stats query uses the dateCondition 3 times, so repeat params 3x
        const statsParams = [...dateParams, ...dateParams, ...dateParams];

        // Summary stats (separate aggregations to avoid cartesian product)
        const [stats] = await connection.query(`
            SELECT 
                (SELECT COUNT(*) FROM invoices i WHERE ${dateCondition}) AS total_invoices,
                (SELECT COALESCE(SUM(i.total_amount), 0) FROM invoices i WHERE ${dateCondition}) AS total_revenue,
                (SELECT COALESCE(SUM(ii.quantity), 0) FROM invoice_items ii JOIN invoices i ON i.invoice_id = ii.invoice_id WHERE ${dateCondition}) AS total_cylinders
        `, statsParams);

        // The sales query uses the dateCondition 4 times (inv_totals, item_agg, pay_agg x1 each + pay_agg has extra condition)
        const salesParams = [...dateParams, ...dateParams, ...dateParams];

        // Per-supervisor/dispatch breakdown using subqueries to avoid row multiplication
        const [salesRows] = await connection.query(`
            SELECT 
                DATE(inv_totals.first_invoice_date) AS sale_date,
                d.dispatch_id,
                d.dispatch_number AS dispatch_no,
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
        `, salesParams);

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

const exportSalesToExcel = async (req, res, next) => {
    try {
        const ExcelJS = require('exceljs');
        const connection = await getConnection();
        const userRole = req.user.role;
        const supervisorId = req.user.userId;
        const { start_date, end_date } = req.query;
        let dateFilter = '';
        let params = [];
        if (start_date && end_date) {
            dateFilter = 'AND DATE(i.invoice_date) BETWEEN ? AND ?';
            params.push(start_date, end_date);
            params.push(start_date, end_date);
            params.push(start_date, end_date); // Push 3 times for the 3 subqueries
        }
        let supervisorFilter = '';
        if (userRole === 'SUPERVISOR') {
            supervisorFilter = 'AND d.supervisor_id = ?';
            params.push(supervisorId); // Push for the main query
        }
        // We use the exact same logic as your getAllSales but without limit/offset
        const query = `
            SELECT 
                d.dispatch_id,
                d.dispatch_number,
                d.dispatch_date,
                l.vehicle_number AS lorry,
                CONCAT(u.first_name, ' ', u.last_name) AS supervisor_name,
                COALESCE(inv_totals.invoice_count, 0) AS invoice_count,
                COALESCE(item_agg.cylinders_sold, 0) AS cylinders_sold,
                COALESCE(inv_totals.total_amount, 0) AS total_amount,
                COALESCE(pay_agg.cash, 0) AS cash,
                COALESCE(pay_agg.cheque, 0) AS cheque,
                GREATEST(COALESCE(inv_totals.total_amount, 0) - COALESCE(pay_agg.cash, 0) - COALESCE(pay_agg.cheque, 0), 0) AS credit
            FROM dispatches d
            JOIN lorries l ON l.lorry_id = d.lorry_id
            JOIN users u ON u.user_id = d.supervisor_id
            LEFT JOIN (
                SELECT i.dispatch_id, COUNT(*) AS invoice_count, SUM(i.total_amount) AS total_amount
                FROM invoices i WHERE i.is_deleted = FALSE ${dateFilter} GROUP BY i.dispatch_id
            ) inv_totals ON inv_totals.dispatch_id = d.dispatch_id
            LEFT JOIN (
                SELECT i.dispatch_id, SUM(ii.quantity) AS cylinders_sold
                FROM invoice_items ii JOIN invoices i ON i.invoice_id = ii.invoice_id
                WHERE i.is_deleted = FALSE ${dateFilter} GROUP BY i.dispatch_id
            ) item_agg ON item_agg.dispatch_id = d.dispatch_id
            LEFT JOIN (
                SELECT i.dispatch_id,
                       SUM(CASE WHEN p.payment_method = 'CASH' THEN p.amount ELSE 0 END) AS cash,
                       SUM(CASE WHEN p.payment_method = 'CHEQUE' THEN p.amount ELSE 0 END) AS cheque
                FROM payments p JOIN invoices i ON i.invoice_id = p.invoice_id
                WHERE p.status != 'CANCELLED' AND i.is_deleted = FALSE ${dateFilter} GROUP BY i.dispatch_id
            ) pay_agg ON pay_agg.dispatch_id = d.dispatch_id
                WHERE inv_totals.dispatch_id IS NOT NULL ${supervisorFilter}
            ORDER BY d.dispatch_date DESC
        `;
        const [sales] = await connection.execute(query, params);

        if (sales.length === 0) {
            return res.status(404).json({ success: false, message: 'No sales data found for the selected criteria' });
        }

        // Fetch SKU breakdowns for each sale
        for (let sale of sales) {
            let itemParams = [sale.dispatch_id];
            let itemDateFilter = '';
            if (start_date && end_date) {
                itemDateFilter = 'AND DATE(i.invoice_date) BETWEEN ? AND ?';
                itemParams.push(start_date, end_date);
            }

            const [items] = await connection.execute(`
                SELECT 
                    p.cylinder_size AS size,
                    ii.sale_type AS type,
                    SUM(ii.quantity) AS quantity,
                    SUM(ii.total_price) AS total_price
                FROM invoice_items ii
                JOIN invoices i ON i.invoice_id = ii.invoice_id
                JOIN products p ON p.product_id = ii.product_id
                WHERE i.dispatch_id = ? AND i.is_deleted = FALSE ${itemDateFilter}
                GROUP BY p.cylinder_size, ii.sale_type
            `, itemParams);

            let skuText = items.map(item => `${item.size} ${item.type}: ${item.quantity} (Rs. ${Number(item.total_price).toLocaleString()})`).join('\n');
            sale.sku_details = skuText || 'None';
        }

        // Excel Generation
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Sales Report');
        // Company Header
        sheet.mergeCells('A1:K1');
        sheet.getCell('A1').value = 'HIDELLANA DISTRIBUTORS (PVT) LTD';
        sheet.getCell('A1').font = { bold: true, size: 14 };
        sheet.getCell('A1').alignment = { horizontal: 'center' };

        sheet.mergeCells('A2:K2');
        let headerText = `Sales Report - Generated: ${new Date().toLocaleDateString()}`;
        if (start_date && end_date) {
            headerText = `Sales from ${start_date} to ${end_date}`;
        } else if (start_date) {
            headerText = `Sales from ${start_date} onwards`;
        } else if (end_date) {
            headerText = `Sales up to ${end_date}`;
        }
        sheet.getCell('A2').value = headerText;
        sheet.getCell('A2').alignment = { horizontal: 'center' };
        // Table Header
        sheet.getRow(4).values = [
            'Date', 'Dispatch No', 'Lorry', 'Supervisor', 'SKU Details', 'Invoices', 'Cylinders Sold',
            'Cash (Rs)', 'Cheque (Rs)', 'Credit (Rs)', 'Total Sales (Rs)'
        ];

        sheet.getRow(4).eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF101540' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        // Rows
        let currentRow = 5;
        let sums = { inv: 0, cyl: 0, cash: 0, chq: 0, crd: 0, tot: 0 };
        sales.forEach(sale => {
            const row = sheet.getRow(currentRow);
            row.values = [
                new Date(sale.dispatch_date).toLocaleDateString(),
                sale.dispatch_number || sale.dispatch_id, // Fallback if number is missing
                sale.lorry,
                sale.supervisor_name,
                sale.sku_details,
                sale.invoice_count,
                sale.cylinders_sold,
                parseFloat(sale.cash).toFixed(2),
                parseFloat(sale.cheque).toFixed(2),
                parseFloat(sale.credit).toFixed(2),
                parseFloat(sale.total_amount).toFixed(2)
            ];
            
            // Allow SKU details to wrap text
            row.getCell(5).alignment = { wrapText: true, vertical: 'middle' };

            sums.inv += Number(sale.invoice_count);
            sums.cyl += Number(sale.cylinders_sold);
            sums.cash += Number(sale.cash);
            sums.chq += Number(sale.cheque);
            sums.crd += Number(sale.credit);
            sums.tot += Number(sale.total_amount);
            currentRow++;
        });
        // Totals Row
        const summaryRow = sheet.getRow(currentRow + 1);
        summaryRow.values = [
            '', '', '', '', 'TOTALS:', sums.inv, sums.cyl,
            sums.cash.toFixed(2), sums.chq.toFixed(2), sums.crd.toFixed(2), sums.tot.toFixed(2)
        ];
        summaryRow.font = { bold: true };
        summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        sheet.columns.forEach(col => { col.width = 15; });
        sheet.getColumn(4).width = 25; // Supervisor name 
        sheet.getColumn(5).width = 30; // SKU Details width
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
};

module.exports = { getMySales, getAllSales, exportSalesToExcel };