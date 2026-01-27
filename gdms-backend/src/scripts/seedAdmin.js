// src/scripts/seedAdmin.js
const { getConnection } = require('../config/database');
const { hashPassword } = require('../utils/passwordUtils');
const { generateId } = require('../utils/generateId');

const seedAdmin = async () => {
    const adminDetails = {
        username: process.env.INITIAL_ADMIN_USERNAME || 'admin_official',
        name: 'Hidellana Admin',
        email: process.env.INITIAL_ADMIN_EMAIL || 'distributors.hidellana@gmail.com',
        password: process.env.INITIAL_ADMIN_PASSWORD || 'Hidellana@2026',
        role: 'ADMIN'
    };

    try {
        const pool = await getConnection();

        // Step 1: Ensure full_name column exists (migration)
        console.log('Checking database schema...');
        const [columns] = await pool.execute('SHOW COLUMNS FROM users LIKE "full_name"');
        if (columns.length === 0) {
            console.log('Adding missing full_name column to users table...');
            await pool.execute('ALTER TABLE users ADD COLUMN full_name VARCHAR(100) AFTER username');
            console.log('Column added successfully');
        }

        // Step 2: Check if user already exists
        const [existing] = await pool.execute(
            'SELECT user_id FROM users WHERE email = ?',
            [adminDetails.email]
        );

        if (existing.length > 0) {
            console.log('Admin user already exists.');
            process.exit(0);
        }

        const password_hash = await hashPassword(adminDetails.password);
        const user_id = generateId('ADM');

        // Insert into users
        await pool.execute(
            `INSERT INTO users (user_id, username, full_name, password_hash, email, role, status)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
            [user_id, adminDetails.username, adminDetails.name, password_hash, adminDetails.email, adminDetails.role]
        );

        // Insert into admins
        await pool.execute(
            'INSERT INTO admins (admin_id, access_level) VALUES (?, ?)',
            [user_id, 1]
        );

        console.log('Admin user seeded successfully');
        console.log(`Email: ${adminDetails.email}`);
        console.log(`Password: ${adminDetails.password}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to seed admin:', error.message);
        process.exit(1);
    }
};

seedAdmin();
