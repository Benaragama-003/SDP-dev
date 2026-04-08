const cron = require('node-cron');
const { getConnection } = require('../config/database');
const { notifyAllAdmins } = require('../utils/notificationHelper');

//Update overdue credit status & send notifications

const startCreditCronJobs = () => {
    // Run daily at 12:01 AM — update overdue credits
    cron.schedule('1 0 * * *', async () => {
        console.log('Running scheduled overdue status update...');
        try {
            const pool = await getConnection();
            
            const [result] = await pool.execute(`
                UPDATE credit_transactions 
                SET status = 'OVERDUE'
                WHERE remaining_balance > 0 
                AND due_date < CURDATE() 
                AND status = 'PENDING'
            `);
            
            console.log(`Successfully updated ${result.affectedRows} credit(s) to OVERDUE status`);

            // Notify admins if any credits went overdue
            if (result.affectedRows > 0) {
                await notifyAllAdmins(pool, {
                    title: 'Credits Overdue',
                    message: `${result.affectedRows} credit transaction(s) are now overdue. Please review.`,
                    type: 'CREDIT_OVERDUE'
                });
            }
        } catch (error) {
            console.error('Failed to update overdue status:', error.message);
        }
    });

    // Run daily at 8:00 AM — check lorry maintenance due
    cron.schedule('0 8 * * *', async () => {
        console.log('Running lorry maintenance check...');
        try {
            const pool = await getConnection();
            
            const [lorries] = await pool.execute(`
                SELECT lorry_id, vehicle_number, next_service_date 
                FROM lorries 
                WHERE next_service_date IS NOT NULL 
                AND next_service_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
                AND status != 'MAINTENANCE'
            `);

            if (lorries.length > 0) {
                const lorryList = lorries.map(l => `${l.vehicle_number} (due: ${new Date(l.next_service_date).toLocaleDateString()})`).join(', ');
                await notifyAllAdmins(pool, {
                    title: 'Lorry Maintenance Due',
                    message: `${lorries.length} lorry(ies) have maintenance due within 3 days: ${lorryList}`,
                    type: 'MAINTENANCE_DUE'
                });
            }

            console.log(`Lorry maintenance check: ${lorries.length} lorries due`);
        } catch (error) {
            console.error('Failed lorry maintenance check:', error.message);
        }
    });

    console.log('Credit & maintenance cron jobs initialized');
};

module.exports = { startCreditCronJobs };