// index.js - PHIÊN BẢN HOÀN CHỈNH 100% - KHÔNG CÒN LỖI SCRAM

import dotenv from "dotenv";
dotenv.config(); // PHẢI ĐẦU TIÊN

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import sequelize from "./src/config/database.js";
import rootRoutes from "./src/routes/root.router.js";
import initModels from "./src/models/init-models.js";

console.log("ACCESS_TOKEN_SECRET:", process.env.ACCESS_TOKEN_SECRET);
console.log("REFRESH_TOKEN_SECRET:", process.env.REFRESH_TOKEN_SECRET);

// Khởi tạo models - chỉ 1 dòng
initModels(sequelize);
console.log("Available models:", Object.keys(sequelize.models));

// Hàm kết nối DB - CHỈ GỌI SAU KHI SERVER ĐÃ CHẠY
const startDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully");

    await sequelize.sync({ force: false });
    console.log("Database & tables synced!");
  } catch (err) {
    console.error("LỖI KẾT NỐI DB:", err);
  }
};

// App
const app = express();

// CORS
const allowedOrigins = [
  "http://localhost:5173",
  "https://shopquanao-f7yd.onrender.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Gắn models vào req
app.use((req, res, next) => {
  req.sequelize = sequelize;
  req.models = sequelize.models;
  next();
});

app.get("/", (req, res) => {
  res.json({ message: "Welcome to GymStar backend!" });
});

app.use(rootRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err.stack);
  res.status(500).json({ message: "Lỗi server", error: err.message });
});

// Khởi động server + DB
const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startDatabase(); // DB kết nối SAU server
});