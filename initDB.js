require("dotenv").config();
const Nano = require("nano");

const COUCHDB_USER = "anhtho2004";
const COUCHDB_PASS = "3062004anh";
const COUCHDB_URL = `http://anhtho2004:3062004anh@localhost:5984`;

const nano = Nano(COUCHDB_URL);

const databases = ["users", "products", "orders"];

async function createDatabases() {
  try {
    const existingDbs = await nano.db.list();
    for (const dbName of databases) {
      if (existingDbs.includes(dbName)) {
        console.log(`Database '${dbName}' đã tồn tại, bỏ qua tạo mới.`);
      } else {
        await nano.db.create(dbName);
        console.log(`Tạo database '${dbName}' thành công.`);
      }
    }
  } catch (error) {
    console.error("Lỗi khi tạo database:", error);
  }
}

async function insertSampleData() {
  const productsDB = nano.use("products");
  const ordersDB = nano.use("orders");
  const productsSample = [
    {
      _id: "prod1",
      name: "Laptop",
      price: 1000,
      quantity: 10,
      createdAt: new Date().toISOString(),
    },
    {
      _id: "prod2",
      name: "Mouse",
      price: 20,
      quantity: 50,
      createdAt: new Date().toISOString(),
    },
    {
      _id: "prod3",
      name: "Keyboard",
      price: 50,
      quantity: 30,
      createdAt: new Date().toISOString(),
    },
  ];
  const ordersSample = [
    {
      _id: "ord1",
      customer_name: "Nguyễn Văn A",
      items: [{ product_id: "prod1", quantity: 1 }],
      total_price: 1000,
      status: "pending",
      createdAt: new Date().toISOString(),
    },
    {
      _id: "ord2",
      customer_name: "Trần Thị B",
      items: [{ product_id: "prod2", quantity: 2 }],
      total_price: 40,
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  ];
  try {
    const prodResult = await productsDB.list({ include_docs: true });
    if (prodResult.rows.length === 0) {
      for (const prod of productsSample) {
        await productsDB.insert(prod);
        console.log("Inserted product: " + prod._id);
      }
    } else {
      console.log("Products DB đã có dữ liệu, bỏ qua insert mẫu.");
    }
    const ordResult = await ordersDB.list({ include_docs: true });
    if (ordResult.rows.length === 0) {
      for (const ord of ordersSample) {
        await ordersDB.insert(ord);
        console.log("Inserted order: " + ord._id);
      }
    } else {
      console.log("Orders DB đã có dữ liệu, bỏ qua insert mẫu.");
    }
  } catch (err) {
    console.error("Lỗi khi insert dữ liệu mẫu:", err);
  }
}

async function insertSampleUsers() {
  const usersDB = nano.use("users");
  const bcrypt = require("bcrypt");
  const usersSample = [
    {
      _id: "anhtho2004",
      username: "anhtho2004",
      email: "anhtho2004@example.com",
      password: await bcrypt.hash("3062004anh", 10),
      type: "user",
      createdAt: new Date().toISOString(),
    },
    {
      _id: "user2",
      username: "user2",
      email: "user2@example.com",
      password: await bcrypt.hash("pass2", 10),
      type: "user",
      createdAt: new Date().toISOString(),
    },
    {
      _id: "user3",
      username: "user3",
      email: "user3@example.com",
      password: await bcrypt.hash("pass3", 10),
      type: "user",
      createdAt: new Date().toISOString(),
    },
  ];
  try {
    const userResult = await usersDB.list({ include_docs: true });
    if (userResult.rows.length === 0) {
      for (const user of usersSample) {
        await usersDB.insert(user);
        console.log("Inserted user: " + user._id);
      }
    } else {
      console.log("Users DB đã có dữ liệu, bỏ qua insert mẫu.");
    }
  } catch (err) {
    console.error("Lỗi khi insert dữ liệu mẫu cho users:", err);
  }
}

(async () => {
  await createDatabases();
  await insertSampleData();
  await insertSampleUsers();
})();
