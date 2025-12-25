// ----------------------------
// IMPORTS
// ----------------------------
require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");


// ----------------------------
// APP SETUP
// ----------------------------
const app = express();

// CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.vercel.app', 'https://shopflow-pro.vercel.app'] // Replace with your actual Vercel frontend URL
    : ['http://localhost:8080', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Health check endpoint
app.get("/", (req, res) => {
    res.json({ 
        message: "ShopSathi API is running!", 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// ----------------------------
// DATABASE CONNECTION
// ----------------------------
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) {
        console.error("❌ Database Connection Failed:", err);
        return;
    }
    console.log("✅ Connected to MySQL Database");

    // Create users table first
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            shop_name VARCHAR(255) DEFAULT 'My Shop',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
    `;

    const createProductsTable = `
        CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            name VARCHAR(255) NOT NULL,
            size VARCHAR(100),
            color VARCHAR(100),
            price DECIMAL(10,2) NOT NULL,
            purchase_price DECIMAL(10,2) DEFAULT 0,
            quantity INT NOT NULL DEFAULT 0,
            category VARCHAR(255),
            subcategory VARCHAR(255),
            product_type VARCHAR(50) DEFAULT 'ready-made',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    `;

    const createCustomersTable = `
        CREATE TABLE IF NOT EXISTS customers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            name VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            address TEXT,
            type VARCHAR(100),
            dues DECIMAL(10,2) DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    `;

    const createOrdersTable = `
        CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            customer_name VARCHAR(255),
            total_amount DECIMAL(10,2) NOT NULL,
            discount DECIMAL(10,2) NOT NULL DEFAULT 0,
            final_amount DECIMAL(10,2) NOT NULL,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    `;

    const createOrderItemsTable = `
        CREATE TABLE IF NOT EXISTS order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            product_id INT,
            product_name VARCHAR(255) NOT NULL,
            quantity INT NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    `;

    const createPurchasesTable = `
        CREATE TABLE IF NOT EXISTS purchases (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            supplier_name VARCHAR(255) NOT NULL,
            company_name VARCHAR(255),
            invoice_number VARCHAR(100),
            amount DECIMAL(10,2) NOT NULL,
            notes TEXT,
            has_bill_image TINYINT(1) DEFAULT 0,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    `;

    const tableStatements = [
        { name: "users", sql: createUsersTable },
        { name: "products", sql: createProductsTable },
        { name: "customers", sql: createCustomersTable },
        { name: "orders", sql: createOrdersTable },
        { name: "order_items", sql: createOrderItemsTable },
        { name: "purchases", sql: createPurchasesTable },
    ];

    tableStatements.forEach(({ name, sql }) => {
        db.query(sql, (tableErr) => {
            if (tableErr) {
                console.error(`⚠️ Failed to ensure '${name}' table exists:`, tableErr);
            }
        });
    });

    const ensureColumn = (table, column, definition) => {
        const checkSql = `SHOW COLUMNS FROM ${table} LIKE ?`;
        db.query(checkSql, [column], (err, rows) => {
            if (err) {
                console.error(`⚠️ Failed to inspect column ${column} on ${table}:`, err);
                return;
            }
            if (rows.length === 0) {
                const alterSql = `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`;
                db.query(alterSql, (alterErr) => {
                    if (alterErr) {
                        console.error(`⚠️ Failed to add column ${column} to ${table}:`, alterErr);
                    }
                });
            }
        });
    };

    ensureColumn("products", "purchase_price", "DECIMAL(10,2) DEFAULT 0");
    ensureColumn("products", "product_type", "VARCHAR(50) DEFAULT 'ready-made'");
    ensureColumn("products", "subcategory", "VARCHAR(255)");
    ensureColumn("products", "user_id", "INT");
    ensureColumn("customers", "user_id", "INT");
    ensureColumn("orders", "user_id", "INT");
    ensureColumn("purchases", "user_id", "INT");
});

// ----------------------------
// AUTH MIDDLEWARE
// ----------------------------
// Relaxed auth middleware for local development: if token is present we verify it,
// otherwise we allow the request to continue so the app works without strict auth.
const authMiddleware = (req, res, next) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : null;

    if (!token) {
        // No token -> treat as guest for now
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.warn("Invalid token, continuing as guest");
            return next();
        }
        req.user = decoded;
        next();
    });
};

// --------------------------------------------------------
// USER AUTH
// --------------------------------------------------------

// SIGNUP
app.post("/api/auth/signup", async (req, res) => {
    const { email, password } = req.body;

    const hashedPass = await bcrypt.hash(password, 10);

    const sql = "INSERT INTO users (email, password) VALUES (?, ?)";
    db.query(sql, [email, hashedPass], (err, result) => {
        if (err) return res.status(500).json(err);

        const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET, {
            expiresIn: "2h",
        });

        res.json({
            token,
            user: { id: result.insertId, email },
        });
    });
});

// LOGIN
app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], async (err, users) => {
        if (err) return res.status(500).json(err);
        if (users.length === 0)
            return res.status(401).json({ message: "Invalid credentials" });

        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: "2h",
        });

        res.json({ token, user: { id: user.id, email: user.email } });
    });
});

// LOGOUT
app.post("/api/auth/logout", (req, res) => {
    // For JWT tokens, logout is handled client-side by removing the token
    // This endpoint exists for consistency and future token blacklisting if needed
    res.json({ message: "Logged out successfully" });
});

// --------------------------------------------------------
// PRODUCTS CRUD
// --------------------------------------------------------

// GET ALL PRODUCTS
app.get("/api/products", authMiddleware, (req, res) => {
    const userId = req.user?.id;
    const sql = userId ? "SELECT * FROM products WHERE user_id = ?" : "SELECT * FROM products WHERE user_id IS NULL";
    const params = userId ? [userId] : [];
    
    db.query(sql, params, (err, data) => {
        if (err) return res.status(500).json(err);
        res.json(data);
    });
});

// CREATE PRODUCT
app.post("/api/products", authMiddleware, (req, res) => {
    const {
        name,
        size,
        color,
        price,
        purchasePrice,
        quantity,
        category,
        subcategory,
        productType,
    } = req.body;

    const userId = req.user?.id || null;

    const sql = `
        INSERT INTO products (user_id, name, size, color, price, purchase_price, quantity, category, subcategory, product_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            userId,
            name,
            size,
            color,
            price,
            purchasePrice ?? 0,
            quantity,
            category,
            subcategory,
            productType || "ready-made",
        ],
        (err, result) => {
            if (err) return res.status(500).json(err);
            res.json({
                id: result.insertId,
                user_id: userId,
                name,
                size,
                color,
                price,
                purchase_price: purchasePrice ?? 0,
                quantity,
                category,
                subcategory,
                product_type: productType || "ready-made",
            });
        }
    );
});

// UPDATE PRODUCT
app.put("/api/products/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    const { name, size, color, price, purchasePrice, quantity, category, subcategory, productType } = req.body;
    const userId = req.user?.id;

    const sql = `
        UPDATE products
        SET name=?, size=?, color=?, price=?, purchase_price=?, quantity=?, category=?, subcategory=?, product_type=?
        WHERE id=? AND (user_id = ? OR (user_id IS NULL AND ? IS NULL))
    `;

    db.query(
        sql,
        [name, size, color, price, purchasePrice ?? 0, quantity, category, subcategory, productType || "ready-made", id, userId, userId],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ id, name, size, color, price, purchase_price: purchasePrice ?? 0, quantity, category, subcategory, product_type: productType || "ready-made" });
        }
    );
});

// DELETE PRODUCT
app.delete("/api/products/:id", authMiddleware, (req, res) => {
    const userId = req.user?.id;
    const sql = "DELETE FROM products WHERE id=? AND (user_id = ? OR (user_id IS NULL AND ? IS NULL))";
    
    db.query(sql, [req.params.id, userId, userId], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

// --------------------------------------------------------
// ORDERS / BILLING
// --------------------------------------------------------

app.post("/api/orders", authMiddleware, (req, res) => {
    const { customerName, discount = 0, items } = req.body;
    const userId = req.user?.id || null;

    if (!items || items.length === 0)
        return res.status(400).json({ message: "Items required" });

    db.beginTransaction((err) => {
        if (err) return res.status(500).json(err);

        const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const finalAmount = total - discount;

        const orderSql = `
            INSERT INTO orders (user_id, customer_name, total_amount, discount, final_amount, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;

        db.query(
            orderSql,
            [userId, customerName, total, discount, finalAmount],
            (err, orderResult) => {
                if (err) return db.rollback(() => res.status(500).json(err));

                const orderId = orderResult.insertId;

                const itemsSql = `
                    INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
                    VALUES ?
                `;

                const values = items.map((i) => [
                    orderId,
                    i.id,
                    i.name,
                    i.quantity,
                    i.price,
                ]);

                db.query(itemsSql, [values], (err) => {
                    if (err) return db.rollback(() => res.status(500).json(err));

                    // STOCK UPDATE - only update products belonging to the same user
                    const stockPromises = items.map((i) => {
                        return new Promise((resolve, reject) => {
                            const stockSql = userId 
                                ? "UPDATE products SET quantity = quantity - ? WHERE id = ? AND user_id = ?"
                                : "UPDATE products SET quantity = quantity - ? WHERE id = ? AND user_id IS NULL";
                            const stockParams = userId ? [i.quantity, i.id, userId] : [i.quantity, i.id];
                            
                            db.query(stockSql, stockParams, (err) => err ? reject(err) : resolve());
                        });
                    });

                    Promise.all(stockPromises)
                        .then(() => {
                            db.commit((err) => {
                                if (err) return db.rollback(() => res.status(500).json(err));
                                res.json({ success: true, orderId });
                            });
                        })
                        .catch((err) => db.rollback(() => res.status(500).json(err)));
                });
            }
        );
    });
});

// --------------------------------------------------------
// CUSTOMERS CRUD
// --------------------------------------------------------

app.get("/api/customers", authMiddleware, (req, res) => {
    const userId = req.user?.id;
    const sql = userId ? "SELECT * FROM customers WHERE user_id = ? ORDER BY name ASC" : "SELECT * FROM customers WHERE user_id IS NULL ORDER BY name ASC";
    const params = userId ? [userId] : [];
    
    db.query(sql, params, (err, data) => {
        if (err) return res.status(500).json(err);
        res.json(data);
    });
});

app.post("/api/customers", authMiddleware, (req, res) => {
    const { name, phone, address, type, dues } = req.body;
    const userId = req.user?.id || null;

    db.query(
        "INSERT INTO customers (user_id, name, phone, address, type, dues) VALUES (?,?,?,?,?,?)",
        [userId, name, phone, address, type, dues],
        (err, result) => {
            if (err) return res.status(500).json(err);
            res.json({ id: result.insertId, user_id: userId, name, phone, address, type, dues });
        }
    );
});

// UPDATE CUSTOMER (useful for settling dues)
app.put("/api/customers/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    const { name, phone, address, type, dues } = req.body;

    const sql = `
        UPDATE customers
        SET name = ?, phone = ?, address = ?, type = ?, dues = ?
        WHERE id = ?
    `;

    db.query(sql, [name, phone, address, type, dues, id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ id, name, phone, address, type, dues });
    });
});

// DELETE CUSTOMER
app.delete("/api/customers/:id", authMiddleware, (req, res) => {
    db.query("DELETE FROM customers WHERE id=?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Customer not found" });
        }
        res.json({ success: true });
    });
});

// --------------------------------------------------------
// DASHBOARD STATS
// --------------------------------------------------------

app.get("/api/dashboard/stats", authMiddleware, (req, res) => {
    const userId = req.user?.id;
    
    // For now, return simple aggregated stats so the dashboard works.
    // You can replace this with real SQL aggregation later.
    const userFilter = userId ? "WHERE user_id = ?" : "WHERE user_id IS NULL";
    const userParam = userId ? [userId] : [];
    
    const salesTodaySql = `
        SELECT IFNULL(SUM(final_amount), 0) AS totalSalesToday
        FROM orders
        ${userFilter} AND DATE(created_at) = CURDATE()
    `;
    const pendingDuesSql = `
        SELECT IFNULL(SUM(dues), 0) AS totalPendingDues FROM customers ${userFilter}
    `;
    const lowStockSql = `
        SELECT COUNT(*) AS lowStockItems FROM products ${userFilter} AND quantity <= 5
    `;
    const customersSql = `
        SELECT COUNT(*) AS totalCustomers FROM customers ${userFilter}
    `;

    db.query(salesTodaySql, userParam, (err, salesRows) => {
        if (err) return res.status(500).json(err);
        db.query(pendingDuesSql, userParam, (err, duesRows) => {
            if (err) return res.status(500).json(err);
            db.query(lowStockSql, userParam, (err, lowRows) => {
                if (err) return res.status(500).json(err);
                db.query(customersSql, userParam, (err, custRows) => {
                    if (err) return res.status(500).json(err);

                    res.json({
                        totalSalesToday: Number(salesRows?.[0]?.totalSalesToday ?? 0),
                        totalPendingDues: Number(duesRows?.[0]?.totalPendingDues ?? 0),
                        lowStockItems: Number(lowRows?.[0]?.lowStockItems ?? 0),
                        totalCustomers: Number(custRows?.[0]?.totalCustomers ?? 0),
                    });
                });
            });
        });
    });
});

// --------------------------------------------------------
// ORDERS HISTORY
// --------------------------------------------------------

app.get("/api/orders", authMiddleware, (req, res) => {
    const userId = req.user?.id;
    const userFilter = userId ? "WHERE user_id = ?" : "WHERE user_id IS NULL";
    const userParam = userId ? [userId] : [];
    
    const sql = `
        SELECT id, customer_name, total_amount, discount, final_amount, created_at
        FROM orders
        ${userFilter}
        ORDER BY created_at DESC
    `;
    db.query(sql, userParam, (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows || []);
    });
});

app.get("/api/orders/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM orders WHERE id = ?", [id], (err, orders) => {
        if (err) return res.status(500).json(err);
        if (orders.length === 0) return res.status(404).json({ message: "Order not found" });
        const order = orders[0];
        db.query(
            "SELECT product_id, product_name, quantity, price FROM order_items WHERE order_id = ?",
            [id],
            (itemsErr, items) => {
                if (itemsErr) return res.status(500).json(itemsErr);
                res.json({
                    ...order,
                    items: items || [],
                });
            },
        );
    });
});

// --------------------------------------------------------
// PURCHASES
// --------------------------------------------------------

app.post("/api/purchases", authMiddleware, (req, res) => {
    const { supplierName, companyName, invoiceNumber, amount, date, notes, hasBillImage } = req.body;
    const userId = req.user?.id || null;

    if (!supplierName || amount === undefined) {
        return res.status(400).json({ message: "Supplier name and amount are required" });
    }

    const createdAt = date ? new Date(date) : new Date();

    const sql = `
        INSERT INTO purchases (user_id, supplier_name, company_name, invoice_number, amount, notes, has_bill_image, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [userId, supplierName, companyName || null, invoiceNumber || null, amount, notes || null, hasBillImage ? 1 : 0, createdAt],
        (err, result) => {
            if (err) return res.status(500).json(err);
            res.json({
                id: result.insertId,
                user_id: userId,
                supplierName,
                companyName,
                invoiceNumber,
                amount,
                notes,
                hasBillImage: !!hasBillImage,
                created_at: createdAt,
            });
        },
    );
});

// --------------------------------------------------------
// REPORTS
// --------------------------------------------------------

app.get("/api/reports/sales-summary", authMiddleware, (req, res) => {
    const userId = req.user?.id;
    const userJoin = userId ? "LEFT JOIN products p ON p.id = oi.product_id AND p.user_id = ?" : "LEFT JOIN products p ON p.id = oi.product_id AND p.user_id IS NULL";
    const orderFilter = userId ? "LEFT JOIN orders o ON o.id = oi.order_id WHERE o.user_id = ?" : "LEFT JOIN orders o ON o.id = oi.order_id WHERE o.user_id IS NULL";
    
    const sql = `
        SELECT 
            oi.product_name,
            SUM(oi.quantity) AS totalQty,
            SUM(oi.quantity * oi.price) AS totalRevenue,
            SUM(oi.quantity * IFNULL(p.purchase_price, 0)) AS totalCost
        FROM order_items oi
        ${orderFilter}
        ${userJoin}
        GROUP BY oi.product_name
        ORDER BY totalQty DESC
        LIMIT 10
    `;

    const params = userId ? [userId, userId] : [];
    
    db.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json(err);
        const mapped = (rows || []).map((row) => {
            const revenue = Number(row.totalRevenue ?? 0);
            const cost = Number(row.totalCost ?? 0);
            return {
                product_name: row.product_name,
                totalQty: Number(row.totalQty ?? 0),
                totalRevenue: revenue,
                totalCost: cost,
                profit: revenue - cost,
            };
        });
        res.json(mapped);
    });
});

// --------------------------------------------------------
// SERVER START
// --------------------------------------------------------
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
