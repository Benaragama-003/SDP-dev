-- Business Data Seed (Products, Inventory, Dealers)
-- Note: User accounts should be created via scripts or UI

-- Insert products
INSERT INTO products (product_id, product_code, cylinder_size, product_type, unit_price, supplier_price, description, status)
VALUES
('PRD_001', '5KG-F', '5KG', 'FILLED', 1250.00, 1000.00, '5KG Filled Gas Cylinder', 'AVAILABLE'),
('PRD_002', '5KG-E', '5KG', 'EMPTY', 0.00, 0.00, '5KG Empty Gas Cylinder', 'AVAILABLE'),
('PRD_003', '5KG-D', '5KG', 'DAMAGED', 0.00, 0.00, '5KG Damaged Gas Cylinder', 'AVAILABLE'),
('PRD_004', '12.5KG-F', '12.5KG', 'FILLED', 3150.00, 2800.00, '12.5KG Filled Gas Cylinder', 'AVAILABLE'),
('PRD_005', '12.5KG-E', '12.5KG', 'EMPTY', 0.00, 0.00, '12.5KG Empty Gas Cylinder', 'AVAILABLE'),
('PRD_006', '12.5KG-D', '12.5KG', 'DAMAGED', 0.00, 0.00, '12.5KG Damaged Gas Cylinder', 'AVAILABLE'),
('PRD_007', '37.5KG-F', '37.5KG', 'FILLED', 9450.00, 8500.00, '37.5KG Filled Gas Cylinder', 'AVAILABLE'),
('PRD_008', '37.5KG-E', '37.5KG', 'EMPTY', 0.00, 0.00, '37.5KG Empty Gas Cylinder', 'AVAILABLE'),
('PRD_009', '37.5KG-D', '37.5KG', 'DAMAGED', 0.00, 0.00, '37.5KG Damaged Gas Cylinder', 'AVAILABLE');

-- Insert inventory
INSERT INTO inventory (inventory_id, product_id, quantity, min_stock_level, max_stock_level, location)
VALUES
('INV_001', 'PRD_001', 500, 100, 1000, 'Warehouse A'),
('INV_002', 'PRD_002', 300, 50, 500, 'Warehouse A'),
('INV_003', 'PRD_003', 20, 0, 50, 'Warehouse A'),
('INV_004', 'PRD_004', 800, 150, 1500, 'Warehouse A'),
('INV_005', 'PRD_005', 400, 100, 800, 'Warehouse A'),
('INV_006', 'PRD_006', 15, 0, 50, 'Warehouse A'),
('INV_007', 'PRD_007', 300, 50, 600, 'Warehouse A'),
('INV_008', 'PRD_008', 150, 30, 300, 'Warehouse A'),
('INV_009', 'PRD_009', 10, 0, 30, 'Warehouse A');

-- Insert dealers
INSERT INTO dealers (dealer_id, dealer_name, address, contact_number, email, route, credit_limit, current_credit, status, created_by)
VALUES
('DLR_001', 'Kamal Silva', 'No. 123, Main Street, Ratnapura', '0771234567', 'kamal@silvagas.com', 'Route A', 100000.00, 0.00, 'ACTIVE', 'ADM_OFFICIAL'),
('DLR_002', 'Nimal Perera', 'No. 456, Balangoda Road, Ratnapura', '0772345678', 'nimal@pereratrading.com', 'Route B', 150000.00, 0.00, 'ACTIVE', 'ADM_OFFICIAL'),
('DLR_003', 'Sunil Fernando', 'No. 789, Pelmadulla Road, Ratnapura', '0773456789', 'sunil@fernandostores.com', 'Route A', 80000.00, 0.00, 'ACTIVE', 'ADM_OFFICIAL');