const Nano = require("nano");

const COUCHDB_USER = "anhtho2004";
const COUCHDB_PASS = "3062004anh";
const COUCHDB_URL = `http://${COUCHDB_USER}:${COUCHDB_PASS}@localhost:5984`;

const nano = Nano(COUCHDB_URL);

async function getDB(dbName) {
  try {
    const dbList = await nano.db.list();
    if (!dbList.includes(dbName)) {
      await nano.db.create(dbName);
      console.log(`Database "${dbName}" created`);
    }
    return nano.db.use(dbName);
  } catch (err) {
    console.error("Error connecting to CouchDB:", err);
    throw err;
  }
}

// Trả về nano object để thao tác replication hoặc các thao tác khác
module.exports = {
  nano,
  getDB,
};
