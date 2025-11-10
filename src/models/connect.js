// src/models/connect.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// LOG ĐỂ BIẾT ĐANG CHẠY LOCAL HAY RENDER
console.log("MODE:", process.env.NODE_ENV || "development");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_PORT:", process.env.DB_PORT || 5432);

const isProduction = process.env.NODE_ENV === "production";

// TỰ ĐỘNG TẠO CONNECTION STRING CHO RENDER.COM
const getConnectionString = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || 5432;
  const database = process.env.DB_NAME;

  let url = `postgresql://${user}:${password}@${host}:${port}/${database}`;

  // THÊM SSL CHO RENDER.COM
  if (process.env.DB_SSL === "true" || isProduction) {
    url += "?sslmode=require";
    if (process.env.DB_REJECT_UNAUTHORIZED === "false") {
      url += "&sslrejectunauthorized=false";
    }
  }

  return url;
};

const sequelize = new Sequelize(getConnectionString(), {
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,

  // SSL CHUẨN RENDER.COM
  dialectOptions: isProduction || process.env.DB_SSL === "true"
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED !== "false", // false = chấp nhận cert tự ký
        },
      }
    : {},

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

// HÀM KẾT NỐI VỚI THỬ LẠI TỰ ĐỘNG
const connectDB = async () => {
  for (let i = 0; i < 10; i++) {
    try {
      await sequelize.authenticate();
      console.log("KẾT NỐI POSTGRESQL THÀNH CÔNG! GYMSTAR SẴN SÀNG!");
      console.log(`→ Đang dùng: ${process.env.DB_HOST.includes("render") ? "RENDER.COM" : "LOCAL"}`);
      return;
    } catch (err) {
      console.error(`Lần ${i + 1} kết nối thất bại:`, err.message);
      if (i === 9) {
        console.error("KHÔNG THỂ KẾT NỐI DB SAU 10 LẦN – DỪNG SERVER!");
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

connectDB();



export default sequelize;