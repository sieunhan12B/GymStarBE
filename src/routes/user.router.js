import express from "express";
import {
  getAllUsers,
  registerUser,
  verifyEmail,
  loginUser,
  refreshTokenRoute,
  protectRoute,
  logoutUser,
} from "../controllers/user.controller.js";

const userRouter = express.Router();

userRouter.get("/LayDanhSachNguoiDung", getAllUsers);
userRouter.post("/DangKy", registerUser);
userRouter.get("/verify-email", verifyEmail);
userRouter.post("/DangNhap", loginUser);
userRouter.post("/refresh-token", refreshTokenRoute);
userRouter.post("/DangXuat", logoutUser);
// Profile (bảo vệ)
userRouter.get("/profile", protectRoute, async (req, res) => {
  const user = await req.models.users.findByPk(req.user.user_id);
  res.json({
    message: "Chào mừng vào profile!",
    user: {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    },
  });
});   

export default userRouter;
