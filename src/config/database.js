// src/config/database.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

// === 1. FIX: ÉP BUỘC SSL LUÔN LUÔN, KỂ CẢ LOCAL (Render bắt buộc SSL 100%) ===
if (!process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD không tồn tại trong .env!');
}

const password = String(process.env.DB_PASSWORD).trim();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  password,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432, // ← ĐÚNG PORT 5432, KHÔNG ĐỂ 5433

    dialect: 'postgres',

    // === 2. FIX: BẬT SSL LUÔN LUÔN, KHÔNG CHỈ PRODUCTION ===
    // Render sẽ NGẮT KẾT NỐI NGAY nếu không có SSL → ECONNRESET
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Render dùng cert tự ký
      }
    },

    logging: false,

    define: {
      timestamps: true,
      underscored: true,
    },

    pool: {
      max: 5,
      min: 0,
      acquire: 60000,  // Tăng timeout lên 60s (mạng VN chậm hay bị reset)
      idle: 10000,
    },

    // === 3. FIX: THÊM retry + reconnect tự động ===
    retry: {
      match: [
        /ECONNRESET/,
        /ETIMEDOUT/,
        /ESOCKETTIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNREFUSED/,
        /Connection terminated/,
      ],
      max: 5,
    },
    dialectOptions: {
      ...((process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true') && {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      })
    }
  }
);

// Test kết nối ngay khi khởi động
sequelize.authenticate()
  .then(() => {
    console.log('✅ KẾT NỐI DATABASE THÀNH CÔNG: Render PostgreSQL');
  })
  .catch(err => {
    console.error('❌ LỖI KẾT NỐI DATABASE:', err.message);
    process.exit(1); // Dừng luôn nếu không kết nối được
  });

export default sequelize;