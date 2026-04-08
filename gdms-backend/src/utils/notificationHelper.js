const { generateId } = require('./generateId');

const createNotification = async (connection, { user_id, title, message, type = 'GENERAL', reference_id = null }) => {
    const notification_id = generateId('NTF');
    await connection.execute(
        `INSERT INTO notifications (notification_id, user_id, title, message, type, reference_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [notification_id, user_id, title, message, type, reference_id]
    );
    return notification_id;
};

const notifyAllAdmins = async (connection, { title, message, type = 'GENERAL', reference_id = null }) => {
    const [admins] = await connection.execute(
        "SELECT user_id FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE'"
    );
    for (const admin of admins) {
        await createNotification(connection, {
            user_id: admin.user_id, title, message, type, reference_id
        });
    }
};

module.exports = { createNotification, notifyAllAdmins };
