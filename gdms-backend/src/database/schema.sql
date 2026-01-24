CREATE TABLE users (
    user_id VARCHAR(20) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,  
    email VARCHAR(100),
    phone_number VARCHAR(15),
    role ENUM('ADMIN', 'SUPERVISOR') NOT NULL,  
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    created_by VARCHAR(20),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    reset_token VARCHAR(255),
    reset_token_expires DATETIME,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);


CREATE TABLE admins (
    admin_id VARCHAR(20) PRIMARY KEY,
    access_level INT, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE supervisors (
    supervisor_id VARCHAR(20) PRIMARY KEY,
    daily_target DECIMAL(10,2),
    achieved_sales DECIMAL(10,2) DEFAULT 0,
    status ENUM('AVAILABLE', 'ON_DUTY', 'OFF_DUTY') DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supervisor_id) REFERENCES users(user_id) ON DELETE CASCADE
);


CREATE TABLE dealers (
    dealer_id VARCHAR(20) PRIMARY KEY,
    dealer_name VARCHAR(100) NOT NULL,
    address TEXT,
    contact_number VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    route VARCHAR(50), 
    credit_limit DECIMAL(10,2) NOT NULL DEFAULT 0,
    current_credit DECIMAL(10,2) NOT NULL DEFAULT 0,
    status ENUM('ACTIVE', 'INACTIVE', 'BLACKLISTED') NOT NULL DEFAULT 'ACTIVE',
    created_by VARCHAR(20),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE products (
    product_id VARCHAR(20) PRIMARY KEY,
    product_code VARCHAR(10) UNIQUE NOT NULL,
    cylinder_size ENUM('5KG', '12.5KG', '37.5KG') NOT NULL,
    product_type ENUM('FILLED', 'EMPTY', 'DAMAGED') NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    supplier_price DECIMAL(10,2) NOT NULL,  
    description VARCHAR(255),
    status ENUM('AVAILABLE', 'OUT_OF_STOCK', 'DISCONTINUED') NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE inventory (
    inventory_id VARCHAR(20) PRIMARY KEY,
    product_id VARCHAR(20) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    min_stock_level INT NOT NULL DEFAULT 0,
    max_stock_level INT NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    managed_by VARCHAR(20),
    location VARCHAR(50),
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (managed_by) REFERENCES users(user_id)
);

CREATE TABLE purchase_orders (
    order_id VARCHAR(20) PRIMARY KEY,
    order_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    expected_date DATE NOT NULL,
    supplier VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('PENDING', 'RECEIVED', 'CANCELLED', 'PARTIAL') NOT NULL DEFAULT 'PENDING',
    invoice_number VARCHAR(50),
    received_date DATE,
    created_by VARCHAR(20) NOT NULL,
    approved_by VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (approved_by) REFERENCES users(user_id)
);


CREATE TABLE PO_items (
    order_item_id VARCHAR(20) PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    product_id VARCHAR(20) NOT NULL,
    ordered_quantity INT NOT NULL,
    received_quantity INT DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES purchase_orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);