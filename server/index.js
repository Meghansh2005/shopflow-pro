const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // specific for auth
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Meghansh@2005', // ⚠️ UPDATE THIS
    database: 'shopflow'
});

db.connect(err => {
    if (err) {
        console.error('DB Connection Failed:', err);
    } else {
        console.log('Connected to MySQL Database');

        // Ensure required tables exist (simple schema)
        const createProductsTable = `
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                size VARCHAR(100),
                color VARCHAR(100),
                price DECIMAL(10,2) NOT NULL,
                quantity INT NOT NULL DEFAULT 0,
                category VARCHAR(255)
            ) ENGINE=InnoDB;
        `;

        const createCustomersTable = `
            CREATE TABLE IF NOT EXISTS customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                address TEXT,
                type VARCHAR(100),
                dues DECIMAL(10,2) DEFAULT 0
            ) ENGINE=InnoDB;
        `;

        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL
            ) ENGINE=InnoDB;
        `;

        const createOrdersTable = `
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_name VARCHAR(255),
                total_amount DECIMAL(10,2) NOT NULL,
                discount DECIMAL(10,2) NOT NULL DEFAULT 0,
                final_amount DECIMAL(10,2) NOT NULL,
                created_at DATETIME NOT NULL
            ) ENGINE=InnoDB;
        `;

        const createOrderItemsTable = `
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                product_id INT NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                quantity INT NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `;

        db.query(createProductsTable, (err) => {
            if (err) console.error("Failed to ensure 'products' table exists:", err);
            // Add missing columns if table exists but columns are missing
            // Check and add size column
            db.query("SHOW COLUMNS FROM products LIKE 'size'", (err, results) => {
                if (err || results.length === 0) {
                    db.query("ALTER TABLE products ADD COLUMN size VARCHAR(100)", (alterErr) => {
                        if (alterErr && !alterErr.message.includes("Duplicate")) {
                            console.log("Note: size column may already exist");
                        }
                    });
                }
            });
            // Check and add color column
            db.query("SHOW COLUMNS FROM products LIKE 'color'", (err, results) => {
                if (err || results.length === 0) {
                    db.query("ALTER TABLE products ADD COLUMN color VARCHAR(100)", (alterErr) => {
                        if (alterErr && !alterErr.message.includes("Duplicate")) {
                            console.log("Note: color column may already exist");
                        }
                    });
                }
            });
            // Check and add category column
            db.query("SHOW COLUMNS FROM products LIKE 'category'", (err, results) => {
                if (err || results.length === 0) {
                    db.query("ALTER TABLE products ADD COLUMN category VARCHAR(255)", (alterErr) => {
                        if (alterErr && !alterErr.message.includes("Duplicate")) {
                            console.log("Note: category column may already exist");
                        }
                    });
                }
            });
            // Check and add quantity column
            db.query("SHOW COLUMNS FROM products LIKE 'quantity'", (err, results) => {
                if (err || results.length === 0) {
                    db.query("ALTER TABLE products ADD COLUMN quantity INT NOT NULL DEFAULT 0", (alterErr) => {
                        if (alterErr && !alterErr.message.includes("Duplicate")) {
                            console.log("Note: quantity column may already exist");
                        }
                    });
                }
            });
        });

        db.query(createCustomersTable, (err) => {
            if (err) console.error("Failed to ensure 'customers' table exists:", err);
        });

        db.query(createUsersTable, (err) => {
            if (err) console.error("Failed to ensure 'users' table exists:", err);
        });

        db.query(createOrdersTable, (err) => {
            if (err) console.error("Failed to ensure 'orders' table exists:", err);
        });

        db.query(createOrderItemsTable, (err) => {
            if (err) console.error("Failed to ensure 'order_items' table exists:", err);
        });
    }
});

// --- AUTH ENDPOINTS ---

// Login Route
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    // Simple query to check user
    const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
    db.query(sql, [email, password], (err, data) => {
        if (err) return res.status(500).json(err);
        if (data.length > 0) {
            const user = data[0];
            // Create a fake token for the frontend to save
            const token = jwt.sign({ id: user.id }, 'secretKey', { expiresIn: '1h' });
            return res.json({ token, user });
        } else {
            return res.status(401).json({ message: "Invalid credentials" });
        }
    });
});

// Signup Route
app.post('/api/auth/signup', (req, res) => {
    const { email, password, shopName, ownerName } = req.body;
    // For simplicity, we just insert email/pass. You can add more columns to DB later.
    const sql = "INSERT INTO users (email, password) VALUES (?, ?)";
    db.query(sql, [email, password], (err, result) => {
        if (err) return res.status(500).json(err);
        // Auto-login after signup
        const token = jwt.sign({ id: result.insertId }, 'secretKey');
        return res.json({ token, user: { id: result.insertId, email, shopName, ownerName } });
    });
});

// Logout (Frontend handles the logic, this is just for completeness)
app.post('/api/auth/logout', (req, res) => {
    res.json({ message: "Logged out" });
});

// --- DATA ENDPOINTS ---

// Get Products (with optional category / search later)
app.get('/api/products', (req, res) => {
    const sql = "SELECT * FROM products";
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json(err);
        return res.json(data);
    });
});

// Create Product
app.post('/api/products', (req, res) => {
    const { name, size, color, price, quantity, category } = req.body;
    if (!name || price === undefined || quantity === undefined) {
        return res.status(400).json({ message: "Name, price, and quantity are required" });
    }
    const sql = "INSERT INTO products (name, size, color, price, quantity, category) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sql, [name, size || null, color || null, price, quantity, category || null], (err, result) => {
        if (err) {
            console.error("Product creation error:", err);
            return res.status(500).json({ message: err.message || "Failed to create product" });
        }
        res.json({ id: result.insertId, name, size, color, price, quantity, category });
    });
});

// Update Product stock/fields
app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, size, color, price, quantity, category } = req.body;
    const sql = "UPDATE products SET name = ?, size = ?, color = ?, price = ?, quantity = ?, category = ? WHERE id = ?";
    db.query(sql, [name, size || null, color || null, price, quantity, category || null, id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ id, name, size, color, price, quantity, category });
    });
});

// Delete Product
app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM products WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.json({ success: true });
    });
});

// --- ORDERS / BILLING ---

// Create Order (Invoice) and reduce stock
app.post('/api/orders', (req, res) => {
    const { customerName, discount = 0, items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Items are required" });
    }

    db.beginTransaction(err => {
        if (err) {
            console.error("Transaction begin error:", err);
            return res.status(500).json({ message: err.message || "Failed to start transaction" });
        }

        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const finalAmount = total - discount;

        const orderSql = "INSERT INTO orders (customer_name, total_amount, discount, final_amount, created_at) VALUES (?, ?, ?, ?, NOW())";
        db.query(orderSql, [customerName || null, total, discount, finalAmount], (err, orderResult) => {
            if (err) {
                console.error("Order creation error:", err);
                return db.rollback(() => res.status(500).json({ message: err.message || "Failed to create order" }));
            }

            const orderId = orderResult.insertId;

            const orderItemsSql = "INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES ?";
            const orderItemsValues = items.map(item => [
                orderId,
                item.id,
                item.name,
                item.quantity,
                item.price
            ]);

            db.query(orderItemsSql, [orderItemsValues], (err) => {
                if (err) {
                    console.error("Order items creation error:", err);
                    return db.rollback(() => res.status(500).json({ message: err.message || "Failed to create order items" }));
                }

                const stockSql = "UPDATE products SET quantity = quantity - ? WHERE id = ?";
                const stockUpdates = items.map(item => new Promise((resolve, reject) => {
                    db.query(stockSql, [item.quantity, item.id], (err) => {
                        if (err) {
                            console.error(`Stock update error for product ${item.id}:`, err);
                            return reject(err);
                        }
                        resolve();
                    });
                }));

                Promise.all(stockUpdates)
                    .then(() => {
                        db.commit(err => {
                            if (err) {
                                console.error("Commit error:", err);
                                return db.rollback(() => res.status(500).json({ message: err.message || "Failed to commit transaction" }));
                            }
                            res.json({ id: orderId, customerName, total, discount, finalAmount });
                        });
                    })
                    .catch(err => {
                        console.error("Stock update error:", err);
                        db.rollback(() => res.status(500).json({ message: err.message || "Failed to update stock" }));
                    });
            });
        });
    });
});

// Orders history
app.get('/api/orders', (req, res) => {
    const sql = "SELECT id, customer_name, total_amount, discount, final_amount, created_at FROM orders ORDER BY created_at DESC";
    db.query(sql, (err, data) => {
        if (err) {
            console.error("Orders fetch error:", err);
            return res.status(500).json({ message: err.message || "Failed to fetch orders" });
        }
        res.json(data || []);
    });
});

// --- CUSTOMERS ---

// List customers
app.get('/api/customers', (req, res) => {
    const sql = "SELECT * FROM customers ORDER BY name ASC";
    db.query(sql, (err, data) => {
        if (err) {
            console.error("Customers fetch error:", err);
            return res.status(500).json({ message: err.message || "Failed to fetch customers" });
        }
        res.json(data || []);
    });
});

// Create Customer
app.post('/api/customers', (req, res) => {
    const { name, phone, address, type, dues } = req.body;
    if (!name) {
        return res.status(400).json({ message: "Customer name is required" });
    }
    const sql = "INSERT INTO customers (name, phone, address, type, dues) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [name, phone || null, address || null, type || null, dues || 0], (err, result) => {
        if (err) {
            console.error("Customer creation error:", err);
            return res.status(500).json({ message: err.message || "Failed to create customer" });
        }
        res.json({ id: result.insertId, name, phone, address, type, dues: dues || 0 });
    });
});

// Update Customer
app.put('/api/customers/:id', (req, res) => {
    const { id } = req.params;
    const { name, phone, address, type, dues } = req.body;
    const sql = "UPDATE customers SET name = ?, phone = ?, address = ?, type = ?, dues = ? WHERE id = ?";
    db.query(sql, [name, phone || null, address || null, type || null, dues || 0, id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ id, name, phone, address, type, dues: dues || 0 });
    });
});

// Delete Customer
app.delete('/api/customers/:id', (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM customers WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Customer not found" });
        }
        res.json({ success: true });
    });
});

// Get Dashboard Stats
app.get('/api/dashboard/stats', (req, res) => {
    // 1. Get total products
    // 2. Get total orders (if you have an orders table)
    // For now, we will send mock data so your Dashboard doesn't crash
    res.json({
        totalSalesToday: 1500.00,
        totalPendingDues: 120,
        lowStockItems: 3,
        totalCustomers: 15
    });
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});