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
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

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

// --------------------------------------------------------
// PRODUCTS CRUD
// --------------------------------------------------------

// GET ALL PRODUCTS
app.get("/api/products", authMiddleware, (req, res) => {
    db.query("SELECT * FROM products", (err, data) => {
        if (err) return res.status(500).json(err);
        res.json(data);
    });
});

// CREATE PRODUCT
app.post("/api/products", authMiddleware, (req, res) => {
    const { name, size, color, price, quantity, category } = req.body;

    const sql = `
        INSERT INTO products (name, size, color, price, quantity, category)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [name, size, color, price, quantity, category],
        (err, result) => {
            if (err) return res.status(500).json(err);
            res.json({ id: result.insertId, name, size, color, price, quantity, category });
        }
    );
});

// UPDATE PRODUCT
app.put("/api/products/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    const { name, size, color, price, quantity, category } = req.body;

    const sql = `
        UPDATE products
        SET name=?, size=?, color=?, price=?, quantity=?, category=?
        WHERE id=?
    `;

    db.query(
        sql,
        [name, size, color, price, quantity, category, id],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ id, name, size, color, price, quantity, category });
        }
    );
});

// DELETE PRODUCT
app.delete("/api/products/:id", authMiddleware, (req, res) => {
    db.query("DELETE FROM products WHERE id=?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

// --------------------------------------------------------
// ORDERS / BILLING
// --------------------------------------------------------

app.post("/api/orders", authMiddleware, (req, res) => {
    const { customerName, discount = 0, items } = req.body;

    if (!items || items.length === 0)
        return res.status(400).json({ message: "Items required" });

    db.beginTransaction((err) => {
        if (err) return res.status(500).json(err);

        const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const finalAmount = total - discount;

        const orderSql = `
            INSERT INTO orders (customer_name, total_amount, discount, final_amount, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `;

        db.query(
            orderSql,
            [customerName, total, discount, finalAmount],
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

                    // STOCK UPDATE
                    const stockPromises = items.map((i) => {
                        return new Promise((resolve, reject) => {
                            db.query(
                                "UPDATE products SET quantity = quantity - ? WHERE id = ?",
                                [i.quantity, i.id],
                                (err) => err ? reject(err) : resolve()
                            );
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
    db.query("SELECT * FROM customers ORDER BY name ASC", (err, data) => {
        if (err) return res.status(500).json(err);
        res.json(data);
    });
});

app.post("/api/customers", authMiddleware, (req, res) => {
    const { name, phone, address, type, dues } = req.body;

    db.query(
        "INSERT INTO customers (name, phone, address, type, dues) VALUES (?,?,?,?,?)",
        [name, phone, address, type, dues],
        (err, result) => {
            if (err) return res.status(500).json(err);
            res.json({ id: result.insertId, name, phone, address, type, dues });
        }
    );
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
    // For now, return simple aggregated stats so the dashboard works.
    // You can replace this with real SQL aggregation later.
    const salesTodaySql = `
        SELECT IFNULL(SUM(final_amount), 0) AS totalSalesToday
        FROM orders
        WHERE DATE(created_at) = CURDATE()
    `;
    const pendingDuesSql = `
        SELECT IFNULL(SUM(dues), 0) AS totalPendingDues FROM customers
    `;
    const lowStockSql = `
        SELECT COUNT(*) AS lowStockItems FROM products WHERE quantity <= 5
    `;
    const customersSql = `
        SELECT COUNT(*) AS totalCustomers FROM customers
    `;

    db.query(salesTodaySql, (err, salesRows) => {
        if (err) return res.status(500).json(err);
        db.query(pendingDuesSql, (err, duesRows) => {
            if (err) return res.status(500).json(err);
            db.query(lowStockSql, (err, lowRows) => {
                if (err) return res.status(500).json(err);
                db.query(customersSql, (err, custRows) => {
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
    const sql = `
        SELECT id, customer_name, total_amount, discount, final_amount, created_at
        FROM orders
        ORDER BY created_at DESC
    `;
    db.query(sql, (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows || []);
    });
});

// --------------------------------------------------------
// SERVER START
// --------------------------------------------------------
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
