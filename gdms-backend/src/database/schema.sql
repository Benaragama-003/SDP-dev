-- Users Table (Parent table for both admins and supervisors)
CREATE TABLE users (
    user_id VARCHAR(20) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone_number VARCHAR(15),
    role ENUM('ADMIN', 'SUPERVISOR') NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'INACTIVE',
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    reset_token VARCHAR(255),
    reset_token_expires DATETIME,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admins Table (Admin-specific data)
CREATE TABLE admins (
    admin_id VARCHAR(20) PRIMARY KEY,
    access_level INT DEFAULT 1 CHECK (access_level IN (1, 2)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Supervisors Table (Supervisor-specific data)
CREATE TABLE supervisors (
    supervisor_id VARCHAR(20) PRIMARY KEY,
    achieved_sales DECIMAL(12,2) DEFAULT 0.00,
    monthly_target DECIMAL(12,2) DEFAULT 0.00,
    status ENUM('AVAILABLE', 'ON_DUTY', 'OFF_DUTY') DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supervisor_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_supervisor_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Lorries Table
CREATE TABLE lorries (
    lorry_id VARCHAR(20) PRIMARY KEY,
    vehicle_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_model VARCHAR(50),
    status ENUM('AVAILABLE', 'ON_ROUTE', 'MAINTENANCE') DEFAULT 'AVAILABLE',
    last_service_date DATE,
    next_service_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vehicle_number (vehicle_number),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- Dealers Table
CREATE TABLE dealers (
    dealer_id VARCHAR(20) PRIMARY KEY,
    dealer_name VARCHAR(100) NOT NULL,
    address TEXT,
    contact_number VARCHAR(15) NOT NULL,
    alternative_contact VARCHAR(15),
    email VARCHAR(100),
    route VARCHAR(50),
    credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    current_credit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_terms_days INT DEFAULT 30,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_by VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_dealer_name (dealer_name),
    INDEX idx_contact (contact_number),
    INDEX idx_status (status),
    INDEX idx_route (route)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Products Table (Cylinder definitions with pricing)
CREATE TABLE products (
    product_id VARCHAR(20) PRIMARY KEY,
    product_code VARCHAR(10) UNIQUE NOT NULL COMMENT 'e.g., CYL-5KG, CYL-12KG',
    cylinder_size VARCHAR(20) NOT NULL COMMENT 'e.g., 2kg, 5kg, 12.5kg, 37.5kg',  
    -- Purchase prices (from supplier)
    filled_purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Price to buy filled cylinder (refill) from supplier',
    new_purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Price to buy brand new cylinder from supplier',
    -- Selling prices (to dealer/customer)
    filled_selling_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Price for gas refill (exchange sale)',
    new_selling_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Price for new cylinder (first-time sale)',
    status ENUM('ACTIVE', 'DISCONTINUED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_code (product_code),
    INDEX idx_cylinder_size (cylinder_size),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Purchase Orders Table
CREATE TABLE purchase_orders (
    order_id VARCHAR(20) PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    order_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    expected_delivery_date DATE NOT NULL,
    actual_delivery_date DATE,
    supplier VARCHAR(100) DEFAULT 'Laugfs Gas PLC',
    supplier_contact VARCHAR(15),
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status ENUM('PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    supplier_invoice_number VARCHAR(50),
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

-- Purchase Order Items Table
CREATE TABLE PO_items (
    order_item_id VARCHAR(20) PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    product_id VARCHAR(20) NOT NULL,
    purchase_type ENUM('FILLED', 'NEW') NOT NULL DEFAULT 'FILLED' COMMENT 'FILLED=refill empties, NEW=buy new cylinders',
    ordered_quantity INT NOT NULL,
    received_quantity INT DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES purchase_orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    INDEX idx_order (order_id),
    INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Dispatches Table
CREATE TABLE dispatches (
    dispatch_id VARCHAR(20) PRIMARY KEY,
    dispatch_number VARCHAR(50) UNIQUE NOT NULL,
    dispatch_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    lorry_id VARCHAR(20) NOT NULL,
    supervisor_id VARCHAR(20) NOT NULL,
    dispatch_route VARCHAR(50),
    status ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'AWAITING_UNLOAD', 'UNLOADED', 'CANCELLED') DEFAULT 'SCHEDULED',
    created_by VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lorry_id) REFERENCES lorries(lorry_id),
    FOREIGN KEY (supervisor_id) REFERENCES supervisors(supervisor_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    INDEX idx_dispatch_number (dispatch_number),
    INDEX idx_status (status),
    INDEX idx_date (dispatch_date),
    INDEX idx_route (dispatch_route),
    INDEX idx_lorry (lorry_id),
    INDEX idx_supervisor (supervisor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dispatch Items Table (Summary tracking per dispatch)
CREATE TABLE dispatch_items (
    dispatch_item_id VARCHAR(20) PRIMARY KEY,
    dispatch_id VARCHAR(20) NOT NULL,
    product_id VARCHAR(20) NOT NULL,
    product_type ENUM('FILLED', 'EMPTY') NOT NULL,
    allocated_quantity INT NOT NULL COMMENT 'Initial quantity loaded',
    sold_filled INT DEFAULT 0 COMMENT 'Total filled cylinders sold (exchange)',
    sold_new INT DEFAULT 0 COMMENT 'Total new cylinders sold',
    empty_collected INT DEFAULT 0 COMMENT 'Total empty cylinders collected',
    damaged_quantity INT DEFAULT 0 COMMENT 'Total damaged (links to damage_inventory)',
    returned_quantity INT GENERATED ALWAYS AS (allocated_quantity - sold_filled - sold_new - damaged_quantity) STORED,
	FOREIGN KEY (dispatch_id) REFERENCES dispatches(dispatch_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    INDEX idx_dispatch (dispatch_id),
    INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Inventory Table (Main warehouse inventory tracking)
CREATE TABLE inventory (
    inventory_id VARCHAR(20) PRIMARY KEY,
    product_id VARCHAR(20) NOT NULL,
    product_type ENUM('FILLED', 'EMPTY', 'DAMAGED') NOT NULL COMMENT 'State of cylinders in warehouse',
    quantity INT NOT NULL DEFAULT 0,
    reorder_level INT DEFAULT 100,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    managed_by VARCHAR(20),
    UNIQUE KEY unique_product_type (product_id, product_type),
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (managed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_product (product_id),
    INDEX idx_low_stock (quantity),
    INDEX idx_type (product_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inventory Movements Table (Audit trail for all inventory changes)
CREATE TABLE inventory_movements (
    movement_id VARCHAR(20) PRIMARY KEY,
    product_id VARCHAR(20) NOT NULL,
    product_type ENUM('FILLED', 'EMPTY', 'DAMAGED') NOT NULL,
    movement_type ENUM(
		'Initial Stock',
        'PURCHASE_RECEIVED',
        'DISPATCH_LOADED',
        'DISPATCH_RETURNED',
        'DAMAGE_REPORTED',
        'ADJUSTMENT'
    ) NOT NULL,
    quantity_change INT NOT NULL COMMENT 'Positive for IN, Negative for OUT',
    quantity_before INT NOT NULL,
    quantity_after INT NOT NULL,
    reference_id VARCHAR(20) COMMENT 'dispatch_id, order_id, or damage_id based on movement_type',
    created_by VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    INDEX idx_product (product_id),
    INDEX idx_type (movement_type),
    INDEX idx_date (created_at),
    INDEX idx_reference (reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Damage Inventory Table (Detailed damage incident tracking)
CREATE TABLE damage_inventory (
    damage_id VARCHAR(20) PRIMARY KEY,
    product_id VARCHAR(20) NOT NULL,
    quantity_damaged INT NOT NULL COMMENT 'Number of damaged cylinders',
    -- Reference to source (only one will be filled)
    dispatch_id VARCHAR(20) COMMENT 'Auto-filled if supervisor reports damage during dispatch',
    dealer_id VARCHAR(20) COMMENT 'If damage reported at dealer location',
    damage_reason TEXT NOT NULL COMMENT 'Description of damage from UI form',
    -- Who reported and when
    reported_by VARCHAR(20) NOT NULL COMMENT 'User who reported the damage',
    reported_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (dispatch_id) REFERENCES dispatches(dispatch_id) ON DELETE SET NULL,
    FOREIGN KEY (dealer_id) REFERENCES dealers(dealer_id) ON DELETE SET NULL,
    FOREIGN KEY (reported_by) REFERENCES users(user_id),
    
    INDEX idx_product (product_id),
    INDEX idx_dispatch (dispatch_id),
    INDEX idx_dealer (dealer_id),
    INDEX idx_reported_date (reported_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lorry Stock Table (Real-time lorry inventory tracking)
CREATE TABLE lorry_stock (
    lorry_stock_id VARCHAR(20) PRIMARY KEY,
    dispatch_id VARCHAR(20) NOT NULL,
    product_id VARCHAR(20) NOT NULL,
    product_type ENUM('FILLED', 'EMPTY') NOT NULL COMMENT 'Only FILLED and EMPTY tracked on lorry',
    loaded_quantity INT NOT NULL DEFAULT 0 COMMENT 'Initial quantity loaded from warehouse',
    sold_filled INT DEFAULT 0 COMMENT 'Quantity of filled cylinders sold (exchange)',
    sold_new INT DEFAULT 0 COMMENT 'Quantity of new cylinders sold (first-time)',
    empty_collected INT DEFAULT 0 COMMENT 'Empty cylinders collected from dealers',
    damaged_quantity INT DEFAULT 0 COMMENT 'Quantity damaged during dispatch',
    balance_quantity INT GENERATED ALWAYS AS (loaded_quantity - sold_filled - sold_new - damaged_quantity) STORED COMMENT 'Auto-calculated remaining quantity',
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_dispatch_product_type (dispatch_id, product_id, product_type),
    FOREIGN KEY (dispatch_id) REFERENCES dispatches(dispatch_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    INDEX idx_dispatch (dispatch_id),
    INDEX idx_product_type (product_id, product_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoices Table
CREATE TABLE invoices (
    invoice_id VARCHAR(20) PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dealer_id VARCHAR(20) NOT NULL,
    dispatch_id VARCHAR(20) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_type ENUM('CASH', 'CHEQUE', 'CREDIT') NOT NULL,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(dealer_id),
    FOREIGN KEY (dispatch_id) REFERENCES dispatches(dispatch_id),
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_dealer (dealer_id),
    INDEX idx_dispatch (dispatch_id),
    INDEX idx_date (invoice_date),
    INDEX idx_payment_type (payment_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoice Items Table (Track individual sale items)
CREATE TABLE invoice_items (
    invoice_item_id VARCHAR(20) PRIMARY KEY,
    invoice_id VARCHAR(20) NOT NULL,
    product_id VARCHAR(20) NOT NULL,
    sale_type ENUM('FILLED', 'NEW') NOT NULL COMMENT 'FILLED=exchange sale, NEW=first-time purchase',
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    empty_returned INT DEFAULT 0 COMMENT 'Empty cylinders returned by dealer (for exchange sales)',
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    INDEX idx_invoice (invoice_id),
    INDEX idx_product (product_id),
    INDEX idx_sale_type (sale_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments Table
CREATE TABLE payments (
    payment_id VARCHAR(20) PRIMARY KEY,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id VARCHAR(20) NOT NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(12,2) NOT NULL,
    payment_method ENUM('CASH', 'CHEQUE', 'CREDIT') NOT NULL,
    status ENUM('COMPLETED', 'PENDING', 'CANCELLED') DEFAULT 'COMPLETED',
    collected_by VARCHAR(20) NOT NULL COMMENT 'Can be admin or supervisor',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
    FOREIGN KEY (collected_by) REFERENCES users(user_id),
    INDEX idx_payment_number (payment_number),
    INDEX idx_invoice (invoice_id),
    INDEX idx_date (payment_date),
    INDEX idx_collector (collected_by),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cheque Payments Table (Additional cheque-specific data)
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

-- Credit Transactions Table (Per-invoice credit tracking)
CREATE TABLE credit_transactions (
    credit_id VARCHAR(20) PRIMARY KEY,
    dealer_id VARCHAR(20) NOT NULL,
    invoice_id VARCHAR(20) NOT NULL UNIQUE COMMENT 'One credit record per invoice',
    credit_amount DECIMAL(12,2) NOT NULL COMMENT 'Original invoice amount',
    due_date DATE NOT NULL COMMENT 'Payment due date (invoice_date + payment_terms_days)',
    settled_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Amount paid so far',
    remaining_balance DECIMAL(12,2) NOT NULL COMMENT 'Outstanding amount',
    status ENUM('PENDING', 'OVERDUE') DEFAULT 'PENDING' COMMENT 'PENDING=within due date, OVERDUE=past due date',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(dealer_id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    INDEX idx_dealer (dealer_id),
    INDEX idx_invoice (invoice_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Credit Settlements Table (Track payments against credit invoices)
CREATE TABLE credit_settlements (
    settlement_id VARCHAR(20) PRIMARY KEY,
    credit_id VARCHAR(20) NOT NULL,
    payment_id VARCHAR(20) NOT NULL,
    settlement_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(12,2) NOT NULL,
    collected_by VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (credit_id) REFERENCES credit_transactions(credit_id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id),
    FOREIGN KEY (collected_by) REFERENCES users(user_id),
    INDEX idx_credit (credit_id),
    INDEX idx_payment (payment_id),
    INDEX idx_date (settlement_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

