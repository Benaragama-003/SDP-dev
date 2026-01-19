// Seed Admin User Script - Run this in browser console on first load
// This will create a default admin user for testing

const initializeApp = () => {
    // Get existing users
    const users = JSON.parse(localStorage.getItem('dms_users') || '[]');

    // Check if admin already exists
    const adminExists = users.some(u => u.role === 'admin');

    if (!adminExists) {
        // Create default admin user
        const adminUser = {
            id: 'admin-001',
            name: 'System Administrator',
            email: 'admin@hidellana.lk',
            password: 'admin123',
            role: 'admin',
            createdAt: new Date().toISOString()
        };

        users.push(adminUser);
        localStorage.setItem('dms_users', JSON.stringify(users));
        console.log('✅ Admin user created successfully!');
        console.log('📧 Email: admin@hidellana.lk');
        console.log('🔑 Password: admin123');
    } else {
        console.log('ℹ️ Admin user already exists');
    }
};

// Run initialization
initializeApp();
