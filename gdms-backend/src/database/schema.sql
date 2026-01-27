CREATE TABLE users (
    user_id VARCHAR(20) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone_number VARCHAR(15),
    role ENUM('ADMIN', 'SUPERVISOR') NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    created_by VARCHAR(20),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    reset_token VARCHAR(255),
    reset_token_expires DATETIME,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admins (
    admin_id VARCHAR(20) PRIMARY KEY,
    access_level INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lorries (
    lorry_id VARCHAR(20) PRIMARY KEY,
    vehicle_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_model VARCHAR(50),
    status ENUM('AVAILABLE', 'ON_ROUTE', 'MAINTENANCE', 'OUT_OF_SERVICE') DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vehicle_number (vehicle_number),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE supervisors (
    supervisor_id VARCHAR(20) PRIMARY KEY,
    access_level INT DEFAULT 0,
    is_admin BOOLEAN DEFAULT FALSE,
    achieved_sales DECIMAL(10,2) DEFAULT 0,
    monthly_target DECIMAL(12,2) DEFAULT 0,
    status ENUM('AVAILABLE', 'ON_DUTY', 'OFF_DUTY') DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supervisor_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_supervisor_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dealers (
    dealer_id VARCHAR(20) PRIMARY KEY,
    dealer_name VARCHAR(100) NOT NULL,
    address TEXT,
    contact_number VARCHAR(15) NOT NULL,
    alternative_contact VARCHAR(15),
    email VARCHAR(100),
    route VARCHAR(50),
    credit_limit DECIMAL(10,2) NOT NULL DEFAULT 0,
    current_credit DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_terms_days INT DEFAULT 30,
    status ENUM('ACTIVE', 'INACTIVE', 'BLACKLISTED') NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    created_by VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    INDEX idx_dealer_name (dealer_name),
    INDEX idx_contact (contact_number),
    INDEX idx_status (status),
    INDEX idx_route (route)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
    product_id VARCHAR(20) PRIMARY KEY,
    product_code VARCHAR(10) UNIQUE NOT NULL,
    cylinder_size VARCHAR(20) NOT NULL,
    product_type ENUM('FILLED', 'EMPTY', 'DAMAGED') NOT NULL,
    supplier_filled_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    supplier_new_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    dealer_filled_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    dealer_new_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    description VARCHAR(255),
    status ENUM('AVAILABLE', 'OUT_OF_STOCK', 'DISCONTINUED') NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_code (product_code),
    INDEX idx_cylinder_type (cylinder_size, product_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory (
    inventory_id VARCHAR(20) PRIMARY KEY,
    product_id VARCHAR(20) NOT NULL UNIQUE,
    quantity INT NOT NULL DEFAULT 0,
    min_stock_level INT NOT NULL DEFAULT 0,
    reorder_level INT DEFAULT 100,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    managed_by VARCHAR(20),
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (managed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_product (product_id),
    INDEX idx_low_stock (quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lorry_stock (
    lorry_stock_id VARCHAR(20) PRIMARY KEY,
    lorry_id VARCHAR(20) NOT NULL,
    product_id VARCHAR(20) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_lorry_product (lorry_id, product_id),
    FOREIGN KEY (lorry_id) REFERENCES lorries(lorry_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    INDEX idx_lorry (lorry_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stock_adjustments (
    adjustment_id VARCHAR(20) PRIMARY KEY,
    adjustment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    adjustment_type ENUM('PHYSICAL_COUNT', 'DAMAGE', 'TRANSFER', 'CORRECTION') NOT NULL,
    product_id VARCHAR(20) NOT NULL,
    location_type ENUM('WAREHOUSE', 'LORRY') NOT NULL,
    location_id VARCHAR(20),
    previous_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    variance INT NOT NULL,
    reason TEXT,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    created_by VARCHAR(20) NOT NULL,
    approved_by VARCHAR(20),
    approved_date DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_date (adjustment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE purchase_orders (
    order_id VARCHAR(20) PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    order_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    expected_delivery_date DATE NOT NULL,
    actual_delivery_date DATE,
    supplier VARCHAR(100) DEFAULT 'Laugfs Gas',
    supplier_contact VARCHAR(15),
    subtotal DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('DRAFT', 'PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED', 'PARTIAL') NOT NULL DEFAULT 'PENDING',
    invoice_number VARCHAR(50),
    payment_status ENUM('UNPAID', 'PARTIAL', 'PAID') DEFAULT 'UNPAID',
    payment_due_date DATE,
    notes TEXT,
    created_by VARCHAR(20) NOT NULL,
    approved_by VARCHAR(20),
    received_by VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (received_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_order_number (order_number),
    INDEX idx_status (status),
    INDEX idx_order_date (order_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE PO_items (
    order_item_id VARCHAR(20) PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    product_id VARCHAR(20) NOT NULL,
    ordered_quantity INT NOT NULL,
    received_quantity INT DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    FOREIGN KEY (order_id) REFERENCES purchase_orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dispatches (
    dispatch_id VARCHAR(20) PRIMARY KEY,
    dispatch_number VARCHAR(50) UNIQUE NOT NULL,
    dispatch_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    lorry_id VARCHAR(20) NOT NULL,
    supervisor_id VARCHAR(20) NOT NULL,
    dispatch_route VARCHAR(50),
    status ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'AWAITING_UNLOAD', 'UNLOADED', 'CANCELLED') DEFAULT 'SCHEDULED',
    notes TEXT,
    created_by VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lorry_id) REFERENCES lorries(lorry_id),
    FOREIGN KEY (supervisor_id) REFERENCES supervisors(supervisor_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    INDEX idx_dispatch_number (dispatch_number),
    INDEX idx_status (status),
    INDEX idx_date (dispatch_date),
    INDEX idx_route (dispatch_route)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dispatch_items (
    dispatch_item_id VARCHAR(20) PRIMARY KEY,
    dispatch_id VARCHAR(20) NOT NULL,
    product_id VARCHAR(20) NOT NULL,
    allocated_quantity INT NOT NULL,
    sold_quantity INT DEFAULT 0,
    returned_quantity INT DEFAULT 0,
    damaged_quantity INT DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (dispatch_id) REFERENCES dispatches(dispatch_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    INDEX idx_dispatch (dispatch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoices (
    invoice_id VARCHAR(20) PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dealer_id VARCHAR(20) NOT NULL,
    supervisor_id VARCHAR(20) NOT NULL,
    lorry_id VARCHAR(20),
    dispatch_id VARCHAR(20),
    subtotal DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(dealer_id),
    FOREIGN KEY (supervisor_id) REFERENCES supervisors(supervisor_id),
    FOREIGN KEY (lorry_id) REFERENCES lorries(lorry_id) ON DELETE SET NULL,
    FOREIGN KEY (dispatch_id) REFERENCES dispatches(dispatch_id) ON DELETE SET NULL,
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_dealer (dealer_id),
    INDEX idx_date (invoice_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice_items (
    invoice_item_id VARCHAR(20) PRIMARY KEY,
    invoice_id VARCHAR(20) NOT NULL,
    product_id VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    INDEX idx_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
    payment_id VARCHAR(20) PRIMARY KEY,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id VARCHAR(20) NOT NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('CASH', 'CHEQUE') NOT NULL,
    status ENUM('COMPLETED', 'PENDING', 'CANCELLED') DEFAULT 'COMPLETED',
    collected_by VARCHAR(20) NOT NULL,
    reference_number VARCHAR(50),
    bank_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
    FOREIGN KEY (collected_by) REFERENCES supervisors(supervisor_id),
    INDEX idx_payment_number (payment_number),
    INDEX idx_invoice (invoice_id),
    INDEX idx_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cash_payments (
    cash_payment_id VARCHAR(20) PRIMARY KEY,
    cash_received DECIMAL(10,2) NOT NULL,
    change_given DECIMAL(10,2) DEFAULT 0,
    denomination_notes TEXT,
    FOREIGN KEY (cash_payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cheque_payments (
    cheque_payment_id VARCHAR(20) PRIMARY KEY,
    cheque_number VARCHAR(50) NOT NULL,
    cheque_date DATE NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    branch_name VARCHAR(100),
    clearance_status ENUM('PENDING', 'CLEARED', 'RETURNED', 'CANCELLED') DEFAULT 'PENDING',
    clearance_date DATE,
    returned_date DATE,
    return_reason VARCHAR(255),
    FOREIGN KEY (cheque_payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE,
    INDEX idx_cheque_number (cheque_number),
    INDEX idx_clearance (clearance_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE credit_transactions (
    credit_id VARCHAR(20) PRIMARY KEY,
    dealer_id VARCHAR(20) NOT NULL,
    invoice_id VARCHAR(20) NOT NULL,
    credit_amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    settled_amount DECIMAL(10,2) DEFAULT 0,
    remaining_balance DECIMAL(10,2) NOT NULL,
    status ENUM('ACTIVE', 'PARTIAL', 'SETTLED', 'OVERDUE', 'WRITTEN_OFF') DEFAULT 'ACTIVE',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(dealer_id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
    INDEX idx_dealer (dealer_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE credit_settlements (
    settlement_id VARCHAR(20) PRIMARY KEY,
    credit_id VARCHAR(20) NOT NULL,
    payment_id VARCHAR(20) NOT NULL,
    settlement_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10,2) NOT NULL,
    collected_by VARCHAR(20) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (credit_id) REFERENCES credit_transactions(credit_id),
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id),
    FOREIGN KEY (collected_by) REFERENCES supervisors(supervisor_id),
    INDEX idx_credit (credit_id),
    INDEX idx_date (settlement_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE daily_sales_summary (
    summary_id VARCHAR(20) PRIMARY KEY,
    sales_date DATE UNIQUE NOT NULL,
    total_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_cheque DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_credit DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_bank_transfer DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_invoices INT NOT NULL DEFAULT 0,
    total_dealers_served INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date (sales_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lorry_daily_sales (
    lorry_sales_id VARCHAR(20) PRIMARY KEY,
    sales_date DATE NOT NULL,
    lorry_id VARCHAR(20) NOT NULL,
    supervisor_id VARCHAR(20),
    dispatch_id VARCHAR(20),
    total_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_invoices INT NOT NULL DEFAULT 0,
    total_dealers_served INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_lorry_date (sales_date, lorry_id),
    FOREIGN KEY (lorry_id) REFERENCES lorries(lorry_id),
    FOREIGN KEY (supervisor_id) REFERENCES supervisors(supervisor_id) ON DELETE SET NULL,
    FOREIGN KEY (dispatch_id) REFERENCES dispatches(dispatch_id) ON DELETE SET NULL,
    INDEX idx_date (sales_date),
    INDEX idx_lorry (lorry_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

