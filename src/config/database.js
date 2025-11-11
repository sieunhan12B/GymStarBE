// ======================
// ✅ src/config/database.js - FINAL VERSION (Local + Render)
// ======================

import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ===== 1. Load file .env tương ứng môi trường =====
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";

dotenv.config({ path: path.join(__dirname, "../../", envFile) });
console.log(`🔹 Loaded env file for DB: ${envFile}`);

// ===== 2. Kiểm tra biến môi trường =====
if (!process.env.DB_PASSWORD) {
  throw new Error("❌ DB_PASSWORD không tồn tại trong file .env!");
}

// ===== 3. Cấu hình Sequelize =====
const isProduction = process.env.NODE_ENV === "production";

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  String(process.env.DB_PASSWORD).trim(),
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    dialect: "postgres",
    logging: false,

    define: {
      timestamps: true,
      underscored: true,
    },

    pool: {
      max: 5,
      min: 0,
      acquire: 60000, // tăng timeout
      idle: 10000,
    },

    // ===== 4. SSL: chỉ bật ở production =====
    dialectOptions: isProduction
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false, // Render dùng chứng chỉ tự ký
          },
        }
      : {},
  }
);

// ===== 5. Test kết nối =====
sequelize
  .authenticate()
  .then(() => {
    console.log("✅ KẾT NỐI DATABASE THÀNH CÔNG:", process.env.DB_HOST);
  })
  .catch((err) => {
    console.error("❌ LỖI KẾT NỐI DATABASE:", err.message);
    process.exit(1);
  });

export default sequelize;
