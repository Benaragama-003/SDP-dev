-- ============================================

-- Users table (base authentication table)
-- Purpose: Store all system users (Admin, Supervisor)
-- 3NF: No transitive dependencies, all non-key attributes depend only on user_id
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

-- Admins table (extends users)
-- Purpose: Store admin-specific information
-- 3NF: Only admin-specific attributes, references users table
CREATE TABLE admins (
    admin_id VARCHAR(20) PRIMARY KEY,
    access_level INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Supervisors table (extends users)
-- Purpose: Store supervisor-specific information and performance metrics
-- 3NF: Only supervisor-specific attributes, references users table
CREATE TABLE supervisors (
    supervisor_id VARCHAR(20) PRIMARY KEY,
    daily_target DECIMAL(10,2) DEFAULT 0,
    achieved_sales DECIMAL(10,2) DEFAULT 0,
    assigned_lorry_id VARCHAR(20),
    active_route_id VARCHAR(20),
    status ENUM('AVAILABLE', 'ON_DUTY', 'OFF_DUTY') DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supervisor_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_supervisor_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BUSINESS ENTITIES
-- ============================================

-- Dealers table
-- Purpose: Store customer/dealer information
-- 3NF: All attributes depend only on dealer_id
CREATE TABLE dealers (
    dealer_id VARCHAR(20) PRIMARY KEY,
    dealer_name VARCHAR(100) NOT NULL,
    business_registration_no VARCHAR(50),
    address TEXT,
    contact_number VARCHAR(15) NOT NULL,
    alternative_contact VARCHAR(15),
    email VARCHAR(100),
    route VARCHAR(50),
    credit_limit DECIMAL(10,2) NOT NULL DEFAULT 0,
    current_credit DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_terms_days INT DEFAULT 30,
    gps_latitude DECIMAL(10,8),
    gps_longitude DECIMAL(11,8),
    status ENUM('ACTIVE', 'INACTIVE', 'BLACKLISTED') NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    created_by VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    INDEX idx_dealer_name (dealer_name),
    INDEX idx_contact (contact_number),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products table
-- Purpose: Store product catalog (9 SKUs: 3 sizes × 3 types)
-- 3NF: All attributes depend only on product_id
CREATE TABLE products (
    product_id VARCHAR(20) PRIMARY KEY,
    product_code VARCHAR(10) UNIQUE NOT NULL,
    cylinder_size ENUM('5KG', '12.5KG', '37.5KG') NOT NULL,
    product_type ENUM('FILLED', 'EMPTY', 'DAMAGED') NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    supplier_price DECIMAL(10,2) NOT NULL,
    description VARCHAR(255),
    weight_kg DECIMAL(5,2),
    status ENUM('AVAILABLE', 'OUT_OF_STOCK', 'DISCONTINUED') NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_code (product_code),
    INDEX idx_cylinder_type (cylinder_size, product_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lorries table
-- Purpose: Store vehicle/lorry information
-- 3NF: All lorry attributes depend only on lorry_id
CREATE TABLE lorries (
    lorry_id VARCHAR(20) PRIMARY KEY,
    vehicle_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_model VARCHAR(50),
    capacity_kg INT NOT NULL,
    capacity_units INT NOT NULL,
    fuel_type ENUM('PETROL', 'DIESEL', 'ELECTRIC') DEFAULT 'DIESEL',
    status ENUM('AVAILABLE', 'ON_ROUTE', 'MAINTENANCE', 'OUT_OF_SERVICE') DEFAULT 'AVAILABLE',
    current_latitude DECIMAL(10,8),
    current_longitude DECIMAL(11,8),
    last_location_update DATETIME,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    assigned_supervisor_id VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_supervisor_id) REFERENCES supervisors(supervisor_id) ON DELETE SET NULL,
    INDEX idx_vehicle_number (vehicle_number),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key to supervisors for assigned_lorry_id
ALTER TABLE supervisors
ADD FOREIGN KEY (assigned_lorry_id) REFERENCES lorries(lorry_id) ON DELETE SET NULL;

-- Routes table
-- Purpose: Store delivery routes
-- 3NF: Route attributes depend only on route_id
CREATE TABLE routes (
    route_id VARCHAR(20) PRIMARY KEY,
    route_name VARCHAR(100) NOT NULL,
    route_code VARCHAR(10) UNIQUE,
    estimated_distance_km DECIMAL(10,2),
    estimated_duration_mins INT,
    start_location VARCHAR(100),
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_route_code (route_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key to supervisors for active_route_id
ALTER TABLE supervisors
ADD FOREIGN KEY (active_route_id) REFERENCES routes(route_id) ON DELETE SET NULL;

-- Route-Dealer junction table (Many-to-Many relationship)
-- Purpose: Link routes to dealers with sequence order
-- 3NF: Composite key (route_id, dealer_id), sequence_order depends on both
CREATE TABLE route_dealers (
    route_dealer_id VARCHAR(20) PRIMARY KEY,
    route_id VARCHAR(20) NOT NULL,
    dealer_id VARCHAR(20) NOT NULL,
    sequence_order INT NOT NULL,
    estimated_time_mins INT,
    notes TEXT,
    UNIQUE KEY unique_route_dealer (route_id, dealer_id),
    FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE CASCADE,
    FOREIGN KEY (dealer_id) REFERENCES dealers(dealer_id) ON DELETE CASCADE,
    INDEX idx_route (route_id),
    INDEX idx_sequence (route_id, sequence_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INVENTORY MANAGEMENT
-- ============================================

-- Warehouse Inventory table
-- Purpose: Track stock levels in warehouse
-- 3NF: Inventory attributes depend only on inventory_id (which is tied to product_id)
CREATE TABLE inventory (
    inventory_id VARCHAR(20) PRIMARY KEY,
    product_id VARCHAR(20) NOT NULL UNIQUE,
    quantity INT NOT NULL DEFAULT 0,
    min_stock_level INT NOT NULL DEFAULT 0,
    max_stock_level INT NOT NULL DEFAULT 1000,
    reorder_level INT DEFAULT 100,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    managed_by VARCHAR(20),
    location VARCHAR(50) DEFAULT 'Main Warehouse',
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (managed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_product (product_id),
    INDEX idx_low_stock (quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lorry Stock table
-- Purpose: Track stock loaded on each lorry
-- 3NF: Composite key (lorry_id, product_id), quantity depends on both
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

-- Stock Adjustments table
-- Purpose: Track all inventory adjustments (physical count, damage, transfer)
-- 3NF: All attributes depend on adjustment_id
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

-- Damaged Products table
-- Purpose: Track damaged inventory
-- 3NF: All attributes depend on damage_id
CREATE TABLE damaged_products (
    damage_id VARCHAR(20) PRIMARY KEY,
    product_id VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    damage_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    damage_type ENUM('TRANSPORT', 'HANDLING', 'MANUFACTURING', 'OTHER') DEFAULT 'OTHER',
    damage_reason VARCHAR(255) NOT NULL,
    reported_by VARCHAR(20),
    photo_url VARCHAR(255),
    disposal_status ENUM('PENDING', 'DISPOSED', 'RETURNED') DEFAULT 'PENDING',
    disposal_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (reported_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_damage_date (damage_date),
    INDEX idx_disposal (disposal_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PURCHASE ORDERS
-- ============================================

-- Purchase Orders table
-- Purpose: Track orders from suppliers
-- 3NF: All order attributes depend on order_id
CREATE TABLE purchase_orders (
    order_id VARCHAR(20) PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    order_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    expected_delivery_date DATE NOT NULL,
    actual_delivery_date DATE,
    supplier VARCHAR(100) NOT NULL,
    supplier_contact VARCHAR(15),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
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

-- Purchase Order Items table
-- Purpose: Line items for each purchase order
-- 3NF: Attributes depend on order_item_id (which links to order_id and product_id)
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

-- ============================================
-- DISPATCH MANAGEMENT
-- ============================================

-- Dispatches table
-- Purpose: Track lorry dispatches for deliveries
-- 3NF: All dispatch attributes depend on dispatch_id
CREATE TABLE dispatches (
    dispatch_id VARCHAR(20) PRIMARY KEY,
    dispatch_number VARCHAR(50) UNIQUE NOT NULL,
    dispatch_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    lorry_id VARCHAR(20) NOT NULL,
    supervisor_id VARCHAR(20) NOT NULL,
    route_id VARCHAR(20),
    driver_name VARCHAR(100),
    driver_contact VARCHAR(15),
    start_time DATETIME,
    end_time DATETIME,
    start_odometer INT,
    end_odometer INT,
    fuel_consumed_liters DECIMAL(10,2),
    status ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'SCHEDULED',
    notes TEXT,
    created_by VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lorry_id) REFERENCES lorries(lorry_id),
    FOREIGN KEY (supervisor_id) REFERENCES supervisors(supervisor_id),
    FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    INDEX idx_dispatch_number (dispatch_number),
    INDEX idx_status (status),
    INDEX idx_date (dispatch_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dispatch Items table
-- Purpose: Products loaded on each dispatch
-- 3NF: Attributes depend on dispatch_item_id (which links dispatch and product)
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

-- ============================================
-- SALES & INVOICING
-- ============================================

-- Invoices table
-- Purpose: Track all sales invoices to dealers
-- 3NF: All invoice attributes depend on invoice_id
CREATE TABLE invoices (
    invoice_id VARCHAR(20) PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dealer_id VARCHAR(20) NOT NULL,
    supervisor_id VARCHAR(20) NOT NULL,
    lorry_id VARCHAR(20),
    dispatch_id VARCHAR(20),
    subtotal DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('CASH', 'CHEQUE', 'CREDIT', 'BANK_TRANSFER') NOT NULL,
    payment_status ENUM('PAID', 'PENDING', 'PARTIAL', 'OVERDUE') DEFAULT 'PENDING',
    due_date DATE,
    notes TEXT,
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_sent_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(dealer_id),
    FOREIGN KEY (supervisor_id) REFERENCES supervisors(supervisor_id),
    FOREIGN KEY (lorry_id) REFERENCES lorries(lorry_id) ON DELETE SET NULL,
    FOREIGN KEY (dispatch_id) REFERENCES dispatches(dispatch_id) ON DELETE SET NULL,
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_dealer (dealer_id),
    INDEX idx_date (invoice_date),
    INDEX idx_payment_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoice Items table
-- Purpose: Line items for each invoice
-- 3NF: Attributes depend on invoice_item_id (which links invoice and product)
CREATE TABLE invoice_items (
    invoice_item_id VARCHAR(20) PRIMARY KEY,
    invoice_id VARCHAR(20) NOT NULL,
    product_id VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    INDEX idx_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PAYMENTS
-- ============================================

-- Payments table
-- Purpose: Track all payment transactions
-- 3NF: All payment attributes depend on payment_id
CREATE TABLE payments (
    payment_id VARCHAR(20) PRIMARY KEY,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id VARCHAR(20) NOT NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('CASH', 'CHEQUE', 'CREDIT', 'BANK_TRANSFER') NOT NULL,
    status ENUM('COMPLETED', 'PENDING', 'FAILED', 'CANCELLED') DEFAULT 'COMPLETED',
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

-- Cash Payments table (extends payments)
-- Purpose: Additional details for cash payments
-- 3NF: Cash-specific attributes
CREATE TABLE cash_payments (
    cash_payment_id VARCHAR(20) PRIMARY KEY,
    cash_received DECIMAL(10,2) NOT NULL,
    change_given DECIMAL(10,2) DEFAULT 0,
    denomination_notes TEXT,
    FOREIGN KEY (cash_payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cheque Payments table (extends payments)
-- Purpose: Additional details for cheque payments
-- 3NF: Cheque-specific attributes
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

-- Credit Transactions table
-- Purpose: Track credit sales and balances
-- 3NF: All credit attributes depend on credit_id
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

-- Credit Settlements table
-- Purpose: Track partial/full credit payments
-- 3NF: Attributes depend on settlement_id
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

-- ============================================
-- REPORTS & ANALYTICS
-- ============================================

-- Daily Sales Summary table
-- Purpose: Aggregate daily sales for quick reporting
-- 3NF: Summary attributes depend on summary_id (date-based)
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

-- Lorry Daily Sales table
-- Purpose: Track sales per lorry per day
-- 3NF: Composite uniqueness on (sales_date, lorry_id)
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

-- Reports table
-- Purpose: Store generated report metadata
-- 3NF: Report attributes depend on report_id
CREATE TABLE reports (
    report_id VARCHAR(20) PRIMARY KEY,
    report_type ENUM('DAILY_SALES', 'INVENTORY', 'COLLECTION', 'PERFORMANCE', 'CREDIT', 'DISPATCH', 'CUSTOM') NOT NULL,
    report_name VARCHAR(100) NOT NULL,
    report_date DATE NOT NULL,
    date_from DATE,
    date_to DATE,
    generated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    generated_by VARCHAR(20) NOT NULL,
    parameters JSON,
    file_path VARCHAR(255),
    file_format ENUM('PDF', 'EXCEL', 'CSV') DEFAULT 'PDF',
    FOREIGN KEY (generated_by) REFERENCES users(user_id),
    INDEX idx_type (report_type),
    INDEX idx_date (report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- GPS & TRACKING
-- ============================================

-- GPS Tracking table
-- Purpose: Store GPS location history for lorries
-- 3NF: Location data depends on tracking_id
CREATE TABLE gps_tracking (
    tracking_id VARCHAR(20) PRIMARY KEY,
    lorry_id VARCHAR(20) NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    tracked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    speed_kmh DECIMAL(5,2),
    heading_degrees INT,
    accuracy_meters DECIMAL(6,2),
    FOREIGN KEY (lorry_id) REFERENCES lorries(lorry_id) ON DELETE CASCADE,
    INDEX idx_lorry_time (lorry_id, tracked_at),
    INDEX idx_time (tracked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- AUDIT & LOGGING
-- ============================================

-- Audit Log table
-- Purpose: Track all database changes for security and compliance
-- 3NF: Audit attributes depend on log_id
CREATE TABLE audit_log (
    log_id VARCHAR(20) PRIMARY KEY
/*CREATE TABLE users (
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
);*/