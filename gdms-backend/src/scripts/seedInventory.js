// src/scripts/seedInventory.js
// Seeds products, inventory rows, and initial stock movements
const { getConnection } = require('../config/database');
const { generateId } = require('../utils/generateId');

// Initial product definitions with prices
const products = [
    {
        cylinder_size: '2kg',
        product_code: 'CYL-2KG',
        filled_purchase_price: 300.00,
        new_purchase_price: 600.00,
        filled_selling_price: 400.00,
        new_selling_price: 700.00,
        initial_filled: 180  // Initial stock to seed
    },
    {
        cylinder_size: '5kg',
        product_code: 'CYL-5KG',
        filled_purchase_price: 500.00,
        new_purchase_price: 1000.00,
        filled_selling_price: 700.00,
        new_selling_price: 1400.00,
        initial_filled: 200
    },
    {
        cylinder_size: '12.5kg',
        product_code: 'CYL-12.5KG',
        filled_purchase_price: 1000.00,
        new_purchase_price: 2000.00,
        filled_selling_price: 1200.00,
        new_selling_price: 2400.00,
        initial_filled: 150
    },
    {
        cylinder_size: '37.5kg',
        product_code: 'CYL-37.5KG',
        filled_purchase_price: 3000.00,
        new_purchase_price: 7000.00,
        filled_selling_price: 4500.00,
        new_selling_price: 8500.00,
        initial_filled: 90
    }
];

const seedInventory = async () => {
    let connection;
    
    try {
        const pool = await getConnection();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        console.log('🌱 Starting inventory seed...\n');

        // Get an admin user for managed_by and created_by
        const [admins] = await connection.execute(
            "SELECT user_id FROM users WHERE role = 'ADMIN' LIMIT 1"
        );

        if (admins.length === 0) {
            throw new Error('No admin user found. Run seedAdmin.js first.');
        }

        const adminId = admins[0].user_id;
        console.log(`📌 Using admin: ${adminId}\n`);

        // Seed each product
        for (const product of products) {
            console.log(`\n📦 Processing ${product.cylinder_size}...`);

            // Check if product already exists
            const [existing] = await connection.execute(
                'SELECT product_id FROM products WHERE product_code = ?',
                [product.product_code]
            );

            let productId;

            if (existing.length > 0) {
                productId = existing[0].product_id;
                console.log(`   ✓ Product exists: ${productId}`);
            } else {
                // Insert new product
                productId = generateId('P');
                await connection.execute(
                    `INSERT INTO products (
                        product_id, product_code, cylinder_size,
                        filled_purchase_price, new_purchase_price,
                        filled_selling_price, new_selling_price,
                        status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
                    [
                        productId,
                        product.product_code,
                        product.cylinder_size,
                        product.filled_purchase_price,
                        product.new_purchase_price,
                        product.filled_selling_price,
                        product.new_selling_price
                    ]
                );
                console.log(`   ✓ Product created: ${productId}`);
            }

            // Create inventory rows for FILLED, EMPTY, DAMAGED (if not exist)
            const productTypes = ['FILLED', 'EMPTY', 'DAMAGED'];

            for (const productType of productTypes) {
                const [invExists] = await connection.execute(
                    'SELECT inventory_id, quantity FROM inventory WHERE product_id = ? AND product_type = ?',
                    [productId, productType]
                );

                if (invExists.length === 0) {
                    const inventoryId = generateId('INV');
                    const initialQty = productType === 'FILLED' ? product.initial_filled : 0;

                    await connection.execute(
                        `INSERT INTO inventory (
                            inventory_id, product_id, product_type, quantity,
                            reorder_level, managed_by, last_updated
                        ) VALUES (?, ?, ?, ?, 100, ?, NOW())`,
                        [inventoryId, productId, productType, initialQty, adminId]
                    );
                    console.log(`   ✓ Inventory ${productType}: ${initialQty}`);

                    // Create initial movement record for FILLED
                    if (productType === 'FILLED' && initialQty > 0) {
                        const movementId = generateId('MOV');
                        await connection.execute(
                            `INSERT INTO inventory_movements (
                                movement_id, product_id, product_type, movement_type,
                                quantity_change, quantity_before, quantity_after,
                                reference_id, created_by, created_at
                            ) VALUES (?, ?, ?, 'Initial Stock', ?, 0, ?, 'INITIAL_SEED', ?, NOW())`,
                            [movementId, productId, productType, initialQty, initialQty, adminId]
                        );
                        console.log(`   ✓ Movement recorded: +${initialQty} FILLED (Initial Stock)`);
                    }
                } else {
                    console.log(`   - Inventory ${productType} already exists (qty: ${invExists[0].quantity})`);
                }
            }
        }

        await connection.commit();
        console.log('\n✅ Inventory seed completed successfully!\n');

        // Print summary
        console.log('📊 Summary:');
        const [summary] = await connection.execute(`
            SELECT 
                p.cylinder_size,
                p.product_code,
                MAX(CASE WHEN i.product_type = 'FILLED' THEN i.quantity ELSE 0 END) as filled,
                MAX(CASE WHEN i.product_type = 'EMPTY' THEN i.quantity ELSE 0 END) as \`empty\`,
                MAX(CASE WHEN i.product_type = 'DAMAGED' THEN i.quantity ELSE 0 END) as damaged
            FROM products p
            LEFT JOIN inventory i ON p.product_id = i.product_id
            GROUP BY p.product_id, p.cylinder_size, p.product_code
            ORDER BY CAST(REGEXP_REPLACE(p.cylinder_size, '[^0-9.]', '') AS DECIMAL(10,2))
        `);

        console.log('┌──────────────┬──────────────┬────────┬───────┬─────────┐');
        console.log('│ Cylinder     │ Code         │ Filled │ Empty │ Damaged │');
        console.log('├──────────────┼──────────────┼────────┼───────┼─────────┤');
        summary.forEach(row => {
            console.log(`│ ${row.cylinder_size.padEnd(12)} │ ${row.product_code.padEnd(12)} │ ${String(row.filled).padStart(6)} │ ${String(row.empty).padStart(5)} │ ${String(row.damaged).padStart(7)} │`);
        });
        console.log('└──────────────┴──────────────┴────────┴───────┴─────────┘');

        // Print movements
        const [movements] = await connection.execute(`
            SELECT p.cylinder_size, im.movement_type, im.quantity_change, im.created_at
            FROM inventory_movements im
            JOIN products p ON im.product_id = p.product_id
            ORDER BY im.created_at DESC
            LIMIT 10
        `);

        if (movements.length > 0) {
            console.log('\n📜 Recent Movements:');
            movements.forEach(m => {
                const sign = m.quantity_change > 0 ? '+' : '';
                console.log(`   ${m.cylinder_size}: ${sign}${m.quantity_change} (${m.movement_type})`);
            });
        }

        process.exit(0);
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('\n❌ Seed failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

seedInventory();
