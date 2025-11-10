// src/models/connect.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// LOG ĐỂ KIỂM TRA
console.log("MODE:", process.env.NODE_ENV || "production");
console.log("DATABASE_URL:", process.env.DATABASE_URL);

// CHỈ DÙNG DATABASE_URL TỪ RENDER.COM
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,

  // SSL BẮT BUỘC CHO RENDER.COM
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Chấp nhận cert tự ký của Render
    },
  },

  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },

  // POOL SIÊU ỔN ĐỊNH
  pool: {
    max: 10,
    min: 0,
    acquire: 60000,
    idle: 10000,
  },

  // TỰ ĐỘNG THỬ LẠI KHI MẤT KẾT NỐI
  retry: {
    match: [
      /ECONNRESET/,
      /ETIMEDOUT/,
      /ESOCKETTIMEDOUT/,
      /ENOTFOUND/,
      /Connection terminated/,
      /SequelizeConnectionError/,
    ],
    max: 15,
  },
});

// KẾT NỐI VỚI THỬ LẠI TỰ ĐỘNG
const connectDB = async () => {
  for (let i = 0; i < 10; i++) {
    try {
      await sequelize.authenticate();
      console.log("KẾT NỐI POSTGRESQL THÀNH CÔNG TRÊN RENDER.COM!");
      return;
    } catch (err) {
      console.error(`Lần ${i + 1} kết nối thất bại:`, err.message);
      if (i === 9) {
        console.error("KHÔNG THỂ KẾT NỐI DB – DỪNG SERVER!");
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

connectDB();

export default sequelize;