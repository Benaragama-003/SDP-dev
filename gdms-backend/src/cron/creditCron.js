const cron = require('node-cron');
const { getConnection } = require('../config/database');

//Update overdue credit status

const startCreditCronJobs = () => {
    // Run daily at 12:01 AM
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
        } catch (error) {
            console.error('Failed to update overdue status:', error.message);
        }
    });

    console.log(' Credit cron jobs initialized');
};

module.exports = { startCreditCronJobs };