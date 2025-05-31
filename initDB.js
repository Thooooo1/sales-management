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

createDatabases();
