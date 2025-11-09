// src/config/database.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

// === KIỂM TRA PASSWORD TRƯỚC KHI KẾT NỐI ===
if (!process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD không tồn tại trong .env!');
}

// ÉP KIỂU PASSWORD THÀNH STRING (fix lỗi SCRAM)
const password = String(process.env.DB_PASSWORD).trim();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  password, // ← ĐÂY LÀ CHỖ QUAN TRỌNG NHẤT
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5433,
    dialect: 'postgres',

    // Chỉ bật SSL khi deploy lên cloud
    dialectOptions: process.env.NODE_ENV === 'production'
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      : {},

    logging: false, // ← ĐÃ TẮT HOÀN TOÀN Executing log

    define: {
      timestamps: true,
      underscored: true,
    },

    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

export default sequelize;