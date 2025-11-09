// src/models/connect.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

console.log("Đang kết nối PostgreSQL local...");
console.log("DB_NAME :", process.env.DB_NAME);
console.log("DB_USER :", process.env.DB_USER);
console.log("DB_HOST :", process.env.DB_HOST);
console.log("DB_PORT :", process.env.DB_PORT || 5433);

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5433,
    dialect: "postgres",
    logging: console.log,
    dialectOptions: {
      ssl: false
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true // quan trọng: giữ tên table là "users", không thành "user"
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test kết nối khi khởi động (giữ lại để biết DB sống)
sequelize.authenticate()
  .then(() => console.log("KẾT NỐI POSTGRESQL THÀNH CÔNG! (port 5433)"))
  .catch(err => console.error("LỖI KẾT NỐI DB:", err));

// Sync tự động khi dev
// if (process.env.NODE_ENV !== "production") {
//   sequelize.sync({ alter: true })
//     .then(() => console.log("Sync tables thành công (alter mode)"))
//     .catch(err => console.error("Lỗi sync:", err));
// }

export default sequelize;