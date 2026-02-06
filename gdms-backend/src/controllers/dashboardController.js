const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Get dashboard statistics
const getDashboardStats = async (req, res, next) => {
    try {
        const pool = await getConnection();
        
        // 1. Today's Sales
        const [todaySales] = await pool.execute(`
            SELECT COALESCE(SUM(total_amount), 0) as total
            FROM invoices 
            WHERE DATE(created_at) = CURDATE()
        `);
        
        // 2. Total Outstanding Credit
        const [totalCredit] = await pool.execute(`
            SELECT COALESCE(SUM(remaining_balance), 0) as total
            FROM credit_transactions 
            WHERE status IN ('PENDING', 'OVERDUE')
        `);
        
        // 3. Pending Cheques
        const [pendingCheques] = await pool.execute(`
            SELECT COUNT(*) as count, COALESCE(SUM(p.amount), 0) as total
            FROM cheque_payments cp
            JOIN payments p ON cp.cheque_payment_id = p.payment_id
            WHERE cp.clearance_status = 'PENDING'
        `);
        
        // 4. Active Dispatches
        const [activeDispatches] = await pool.execute(`
            SELECT COUNT(*) as count
            FROM dispatches 
            WHERE status IN ('SCHEDULED', 'IN_PROGRESS')
        `);
        
        // 5. This Month's Sales (for comparison)
        const [monthSales] = await pool.execute(`
            SELECT COALESCE(SUM(total_amount), 0) as total
            FROM invoices 
            WHERE MONTH(created_at) = MONTH(CURDATE()) 
            AND YEAR(created_at) = YEAR(CURDATE())
        `);
        
        // 6. Low Stock Products (quantity < 50)
        const [lowStock] = await pool.execute(`
            SELECT COUNT(*) as count
            FROM inventory 
            WHERE quantity < 50 AND product_type = 'FILLED'
        `);
        
        return successResponse(res, 200, 'Dashboard stats retrieved', {
            todaySales: todaySales[0].total,
            monthSales: monthSales[0].total,
            totalCredit: totalCredit[0].total,
            pendingCheques: {
                count: pendingCheques[0].count,
                amount: pendingCheques[0].total
            },
            activeDispatches: activeDispatches[0].count,
            lowStockAlerts: lowStock[0].count
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getDashboardStats };