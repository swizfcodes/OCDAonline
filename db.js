// Shared MySQL connection pool (mysql2/promise)
const mysql = require("mysql2/promise");
const config = require("./dbconfig");

const pool = mysql.createPool(config);

pool
  .getConnection()
  .then((conn) => {
    console.log("MySQL connected.");
    conn.release();
  })
  .catch((err) => {
    console.error("MySQL connection failed:", err.message);
  });

module.exports = pool;
