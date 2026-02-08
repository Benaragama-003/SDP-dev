const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Get dashboard statistics
const getDashboardStats = async (req, res, next) => {
    try {
        const pool = await getConnection();
        const userRole = req.user.role;
        const userId = req.user.userId;

        if (userRole === 'SUPERVISOR') {
            // ========== SUPERVISOR DASHBOARD ==========

            // 1. Total Sales for the Month (for this supervisor)
            const [monthlySales] = await pool.execute(`
                SELECT COALESCE(SUM(i.total_amount), 0) as total
                FROM invoices i
                JOIN dispatches d ON i.dispatch_id = d.dispatch_id
                WHERE d.supervisor_id = ?
                  AND i.is_deleted = FALSE
                  AND MONTH(i.invoice_date) = MONTH(CURDATE())
                  AND YEAR(i.invoice_date) = YEAR(CURDATE())
            `, [userId]);

            // 2. Total Credits to Be Collected (for this supervisor's invoices)
            const [creditsToCollect] = await pool.execute(`
                SELECT COALESCE(SUM(remaining_balance), 0) as total
                FROM credit_transactions
                WHERE status IN ('PENDING', 'OVERDUE')
            `);

            // 3. Total Invoice Count (for this supervisor)
            const [totalInvoices] = await pool.execute(`
                SELECT COUNT(*) as count
                FROM invoices i
                JOIN dispatches d ON i.dispatch_id = d.dispatch_id
                WHERE d.supervisor_id = ? AND i.is_deleted = FALSE
            `, [userId]);

            // 4. Stock by Product (inventory - FILLED type)
            const [stockByProduct] = await pool.execute(`
                SELECT p.cylinder_size, inv.quantity
                FROM inventory inv
                JOIN products p ON inv.product_id = p.product_id
                WHERE inv.product_type = 'FILLED' AND p.status = 'ACTIVE'
                ORDER BY p.cylinder_size
            `);

            // 5. Active Dealer Count
            const [activeDealers] = await pool.execute(`
                SELECT COUNT(*) as count
                FROM dealers
                WHERE status = 'ACTIVE'
            `);

            return successResponse(res, 200, 'Dashboard stats retrieved', {
                monthlySales: monthlySales[0].total,
                creditsToCollect: creditsToCollect[0].total,
                totalInvoices: totalInvoices[0].count,
                stockByProduct: stockByProduct,
                activeDealers: activeDealers[0].count
            });

        } else {
            // ========== ADMIN DASHBOARD ==========

            // 1. Stock by Product (inventory - FILLED type)
            const [stockByProduct] = await pool.execute(`
                SELECT p.cylinder_size, inv.quantity
                FROM inventory inv
                JOIN products p ON inv.product_id = p.product_id
                WHERE inv.product_type = 'FILLED' AND p.status = 'ACTIVE'
                ORDER BY p.cylinder_size
            `);

            // 2. Purchase Orders to Be Received (PENDING or APPROVED)
            const [pendingPurchaseOrders] = await pool.execute(`
                SELECT COUNT(*) as count
                FROM purchase_orders
                WHERE status IN ('PENDING', 'APPROVED')
            `);

            // 3. Active Dealer Count
            const [activeDealers] = await pool.execute(`
                SELECT COUNT(*) as count
                FROM dealers
                WHERE status = 'ACTIVE'
            `);

            // 4. Dispatches Today
            const [dispatchesToday] = await pool.execute(`
                SELECT COUNT(*) as count
                FROM dispatches
                WHERE DATE(dispatch_date) = CURDATE()
            `);

            // 5. Pending Credits (total remaining balance)
            const [pendingCredits] = await pool.execute(`
                SELECT COALESCE(SUM(remaining_balance), 0) as total
                FROM credit_transactions
                WHERE status IN ('PENDING', 'OVERDUE')
            `);

            // 6. Monthly Total Revenue
            const [monthlyRevenue] = await pool.execute(`
                SELECT COALESCE(SUM(i.total_amount), 0) as total
                FROM invoices i
                WHERE i.is_deleted = FALSE AND MONTH(i.invoice_date) = MONTH(CURDATE()) AND YEAR(i.invoice_date) = YEAR(CURDATE())
            `);

            return successResponse(res, 200, 'Dashboard stats retrieved', {
                stockByProduct: stockByProduct,
                pendingPurchaseOrders: pendingPurchaseOrders[0].count,
                activeDealers: activeDealers[0].count,
                dispatchesToday: dispatchesToday[0].count,
                pendingCredits: pendingCredits[0].total,
                monthlyRevenue: monthlyRevenue[0].total
            });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = { getDashboardStats };