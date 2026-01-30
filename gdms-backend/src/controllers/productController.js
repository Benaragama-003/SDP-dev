const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');


// Inventory summary grouped by size
const getInventorySummary = async (req, res, next) => {
    try {
        const pool = await getConnection();
        const [rows] = await pool.execute(`
            SELECT 
                p.cylinder_size,
                MAX(CASE WHEN i.product_type = 'FILLED' THEN i.quantity ELSE 0 END) as filled,
                MAX(CASE WHEN i.product_type = 'EMPTY' THEN i.quantity ELSE 0 END) as empty,
                MAX(CASE WHEN i.product_type = 'DAMAGED' THEN i.quantity ELSE 0 END) as damaged
            FROM products p
            LEFT JOIN inventory i ON p.product_id = i.product_id
            WHERE p.status = 'ACTIVE'
            GROUP BY p.product_id, p.cylinder_size
            ORDER BY CAST(REGEXP_REPLACE(p.cylinder_size, '[^0-9.]', '') AS DECIMAL(10,2))
        `);
        return successResponse(res, 200, 'Inventory summary retrieved', rows);
    } catch (error) {
        next(error);
    }
};

// Get all standardized products
const getAllProducts = async (req, res, next) => {
    try {
        const pool = await getConnection();
        const [products] = await pool.execute(
            'SELECT * FROM products WHERE status = "ACTIVE" ORDER BY cylinder_size'
        );
        return successResponse(res, 200, 'Products retrieved successfully', products);
    } catch (error) {
        next(error);
    }
};

// Add new product with 4 price points
const createProduct = async (req, res, next) => {
    const {
        cylinder_size,
        filled_purchase_price,
        new_purchase_price,
        filled_selling_price,
        new_selling_price,
        cylinder_deposit,
        description,
        initial_quantity
    } = req.body;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const product_id = `P${Date.now().toString().slice(-5)}`;
            const sizeNum = cylinder_size.replace(/[^0-9.]/g, '') || '0';
            const product_code = `CYL-${sizeNum}KG`; // e.g., CYL-5KG, CYL-12KG

            await connection.execute(
                `INSERT INTO products (product_id, product_code, cylinder_size, filled_purchase_price, new_purchase_price, filled_selling_price, new_selling_price, cylinder_deposit, description)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [product_id, product_code, cylinder_size, filled_purchase_price || 0, new_purchase_price || 0, filled_selling_price || 0, new_selling_price || 0, cylinder_deposit || 0, description]
            );

            // Initialize inventory for the 3 main types (FILLED, EMPTY, DAMAGED) 
            const types = ['FILLED', 'EMPTY', 'DAMAGED'];
            for (const type of types) {
                await connection.execute(
                    `INSERT INTO inventory (inventory_id, product_id, product_type, quantity, managed_by)
                     VALUES (?, ?, ?, ?, ?)`,
                    [`INV${Date.now()}${type[0]}`, product_id, type, type === 'FILLED' ? (initial_quantity || 0) : 0, req.user.userId]
                );
            }

            await connection.commit();
            return successResponse(res, 201, 'Product definition created successfully', { product_id, product_code });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getInventorySummary,
    getAllProducts,
    createProduct
};
