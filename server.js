require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Nano = require("nano");
const winston = require("winston");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Winston logger config
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "sales-management-service" },
  transports: [
    new winston.transports.File({
      filename: path.join("logs", "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join("logs", "combined.log"),
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Middleware ghi log request
app.use((req, res, next) => {
  logger.info(`HTTP ${req.method} ${req.url}`);
  next();
});

// Serve static files trong thư mục 'public'
app.use(express.static("public"));

// CouchDB connection
const COUCHDB_USER = "anhtho2004";
const COUCHDB_PASS = "3062004anh";
const COUCHDB_URL = `http://${COUCHDB_USER}:${COUCHDB_PASS}@10.6.129.27:5984`;

const nano = Nano(COUCHDB_URL);

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// CouchDB DB reference
const usersDB = nano.db.use("users");
const productsDB = nano.db.use("products");
const ordersDB = nano.db.use("orders");

// Middleware xác thực token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    logger.warn("Unauthorized access attempt - no token");
    return res.status(401).json({ error: "Yêu cầu đăng nhập" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn("Unauthorized access attempt - invalid token");
      return res.status(403).json({ error: "Token không hợp lệ" });
    }
    req.user = user;
    next();
  });
};

// API test server
app.get("/test", (req, res) => {
  res.json({ message: "Server is working" });
});

// API đăng ký
app.post("/api/register", async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    logger.warn("Register failed: missing fields");
    return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
  }

  try {
    const existingUsers = await usersDB.find({
      selector: {
        $or: [{ username }, { email }],
      },
    });

    if (existingUsers.docs.length > 0) {
      logger.warn(
        `Register failed: username/email exists (${username}, ${email})`
      );
      return res.status(400).json({ error: "Username hoặc email đã tồn tại" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      username,
      password: hashedPassword,
      email,
      type: "user",
      createdAt: new Date().toISOString(),
    };

    await usersDB.insert(newUser);
    logger.info(`User registered: ${username}`);
    res.status(201).json({ message: "Đăng ký thành công" });
  } catch (error) {
    logger.error("Register error: %o", error);
    res.status(500).json({ error: "Lỗi server khi đăng ký" });
  }
});

// API đăng nhập
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    logger.warn("Login failed: missing fields");
    return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
  }

  try {
    const userResult = await usersDB.find({
      selector: { username },
    });

    if (userResult.docs.length === 0) {
      logger.warn(`Login failed: username not found (${username})`);
      return res.status(400).json({ error: "Username không tồn tại" });
    }

    const user = userResult.docs[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      logger.warn(`Login failed: wrong password for username ${username}`);
      return res.status(400).json({ error: "Mật khẩu không đúng" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    logger.info(`User logged in: ${username}`);
    res.json({ token, username: user.username });
  } catch (error) {
    logger.error("Login error: %o", error);
    res.status(500).json({ error: "Lỗi server khi đăng nhập" });
  }
});

// --- Products API ---

app.get("/api/products", authenticateToken, async (req, res) => {
  try {
    const result = await productsDB.find({ selector: {}, limit: 100 });
    // Chuyển đổi _id thành id cho frontend
    const products = result.docs.map((doc) => ({
      ...doc,
      id: doc._id,
      _id: undefined,
    }));
    res.json(products);
  } catch (error) {
    logger.error("Get products error: %o", error);
    res.status(500).json({ error: "Lỗi server khi lấy sản phẩm" });
  }
});

app.get("/api/products/:id", authenticateToken, async (req, res) => {
  const id = req.params.id;
  try {
    const product = await productsDB.get(id);
    res.json(product);
  } catch (error) {
    logger.error("Get product by ID error: %o", error);
    res.status(404).json({ error: "Sản phẩm không tồn tại" });
  }
});

app.post("/api/products", authenticateToken, async (req, res) => {
  const { name, price, quantity } = req.body;
  if (!name || price == null || quantity == null) {
    logger.warn("Create product failed: missing fields");
    return res.status(400).json({ error: "Thiếu thông tin sản phẩm" });
  }
  try {
    const newProduct = {
      name,
      price,
      quantity,
      createdAt: new Date().toISOString(),
    };
    const insertResult = await productsDB.insert(newProduct);
    logger.info(`Product created: ${name}`);
    res.status(201).json({ id: insertResult.id, rev: insertResult.rev });
  } catch (error) {
    logger.error("Create product error: %o", error);
    res.status(500).json({ error: "Lỗi server khi tạo sản phẩm" });
  }
});

app.put("/api/products/:id", authenticateToken, async (req, res) => {
  const id = req.params.id;
  const { name, price, quantity } = req.body;
  if (!name || price == null || quantity == null) {
    logger.warn("Update product failed: missing fields");
    return res.status(400).json({ error: "Thiếu thông tin cập nhật" });
  }
  try {
    const product = await productsDB.get(id);
    const updatedProduct = {
      ...product,
      name,
      price,
      quantity,
      updatedAt: new Date().toISOString(),
    };
    const updateResult = await productsDB.insert(updatedProduct);
    logger.info(`Product updated: ${name}`);
    res.json({ id: updateResult.id, rev: updateResult.rev });
  } catch (error) {
    logger.error("Update product error: %o", error);
    res.status(404).json({ error: "Sản phẩm không tồn tại hoặc lỗi server" });
  }
});

app.delete("/api/products/:id", authenticateToken, async (req, res) => {
  const id = req.params.id;
  try {
    const product = await productsDB.get(id);
    await productsDB.destroy(id, product._rev);
    logger.info(`Product deleted: ${id}`);
    res.json({ message: "Xóa sản phẩm thành công" });
  } catch (error) {
    logger.error("Delete product error: %o", error);
    res.status(404).json({ error: "Sản phẩm không tồn tại hoặc lỗi server" });
  }
});

// --- Orders API ---

app.get("/api/orders", authenticateToken, async (req, res) => {
  try {
    const result = await ordersDB.find({ selector: {}, limit: 100 });
    res.json(result.docs);
  } catch (error) {
    logger.error("Get orders error: %o", error);
    res.status(500).json({ error: "Lỗi server khi lấy đơn hàng" });
  }
});

app.get("/api/orders/:id", authenticateToken, async (req, res) => {
  const id = req.params.id;
  try {
    const order = await ordersDB.get(id);
    res.json(order);
  } catch (error) {
    logger.error("Get order by ID error: %o", error);
    res.status(404).json({ error: "Đơn hàng không tồn tại" });
  }
});

app.post("/api/orders", authenticateToken, async (req, res) => {
  const { customer_name, products } = req.body;
  if (!customer_name || !Array.isArray(products) || products.length === 0) {
    logger.warn("Create order failed: missing fields");
    return res.status(400).json({ error: "Thiếu thông tin đơn hàng" });
  }

  try {
    let total_price = 0;
    for (const item of products) {
      const product = await productsDB.get(item.product_id);
      if (!product) {
        logger.warn(
          `Create order failed: product not found (${item.product_id})`
        );
        return res.status(400).json({ error: "Sản phẩm không tồn tại" });
      }
      if (product.quantity < item.quantity) {
        logger.warn(
          `Create order failed: insufficient quantity for product ${product.name}`
        );
        return res
          .status(400)
          .json({ error: `Sản phẩm ${product.name} không đủ số lượng` });
      }
      total_price += product.price * item.quantity;
    }

    const newOrder = {
      customer_name,
      products,
      total_price,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const insertResult = await ordersDB.insert(newOrder);
    logger.info(`Order created for customer: ${customer_name}`);
    res.status(201).json({ id: insertResult.id, rev: insertResult.rev });
  } catch (error) {
    logger.error("Create order error: %o", error);
    res.status(500).json({ error: "Lỗi server khi tạo đơn hàng" });
  }
});

app.put("/api/orders/:id", authenticateToken, async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  if (!status) {
    logger.warn("Update order failed: missing status");
    return res.status(400).json({ error: "Thiếu trạng thái cập nhật" });
  }

  try {
    const order = await ordersDB.get(id);
    const updatedOrder = {
      ...order,
      status,
      updatedAt: new Date().toISOString(),
    };
    const updateResult = await ordersDB.insert(updatedOrder);
    logger.info(`Order ${id} status updated to: ${status}`);
    res.json({ id: updateResult.id, rev: updateResult.rev });
  } catch (error) {
    logger.error("Update order error: %o", error);
    res.status(404).json({ error: "Đơn hàng không tồn tại hoặc lỗi server" });
  }
});

// Start server
const PORT = 5000;
const HOST = "0.0.0.0";

const startServer = (port) => {
  const server = app.listen(port, HOST, () => {
    logger.info(
      `Server is running on http://10.6.129.27:${port} (listening on ${HOST})`
    );
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      logger.warn(`Port ${port} is busy, trying ${port + 1}`);
      startServer(port + 1);
    } else {
      logger.error("Server error: %o", error);
    }
  });
};

startServer(PORT);
