// ======================
// ✅ index.js - FINAL (Local + Render ready)
// ======================

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import sequelize from "./src/config/database.js";
import rootRoutes from "./src/routes/root.router.js";
import initModels from "./src/models/init-models.js";

// ======================
// 🔧 Load đúng file .env theo môi trường
// ======================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";
dotenv.config({ path: path.join(__dirname, envFile) });
console.log(`🔹 Loaded environment file: ${envFile}`);

// ======================
// 🔗 Init Sequelize models
// ======================
initModels(sequelize);
console.log("✅ Available models:", Object.keys(sequelize.models));

// ======================
// 🔌 Kết nối DB sau khi server khởi động
// ======================
const startDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully");
    await sequelize.sync({ force: false });
    console.log("✅ Database & tables synced!");
  } catch (err) {
    console.error("❌ LỖI KẾT NỐI DB:", err);
  }
};

// ======================
// 🚀 Express App
// ======================
const app = express();

// ======================
// 🌐 CORS Config
// ======================
const allowedOrigins = [
  "http://localhost:5173",
  "https://gymstarbe.onrender.com",
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

// ======================
// 🧱 Middleware
// ======================
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((req, res, next) => {
  req.sequelize = sequelize;
  req.models = sequelize.models;
  next();
});

// ======================
// 🏠 Base Route
// ======================
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to GymStar Backend 🚀",
    environment: process.env.NODE_ENV,
  });
});

// ======================
// 🧭 Routes
// ======================
app.use(rootRoutes);

// ======================
// ⚠️ Global Error Handler
// ======================
app.use((err, req, res, next) => {
  console.error("🔥 Global error:", err.stack);
  res.status(500).json({ message: "Lỗi server", error: err.message });
});

// ======================
// 🟢 Start server
// ======================
const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  startDatabase();
});
