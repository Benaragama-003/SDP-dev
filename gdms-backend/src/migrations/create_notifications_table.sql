-- Notification Module - Database Migration
-- Run this SQL in your MySQL database to create the notifications table

CREATE TABLE IF NOT EXISTS notifications (
    notification_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    title VARCHAR(100) NOT NULL,
    message VARCHAR(500) NOT NULL,
    type VARCHAR(50) DEFAULT 'GENERAL',
    reference_id VARCHAR(50) DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Index for fast lookup by user + unread status
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
