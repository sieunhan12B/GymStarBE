import sequelize from "../models/connect.js";
import initModels from "../models/init-models.js";
import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import transporter from "../config/email.js";

dotenv.config();

const model = initModels(sequelize);

/** ============ ĐĂNG KÝ NGƯỜI DÙNG ============ */
const registerUser = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: "Thiếu thông tin đăng ký" });
    }

    const existingUser = await model.users.findOne({ where: { email } });
    if (existingUser) {
      if (existingUser.status === true)
        return res.status(400).json({ message: "Email đã được đăng ký" });
      else
        await existingUser.destroy(); // xóa user cũ chưa xác nhận để đăng ký lại
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await model.users.create({
      full_name,
      email,
      password: hashedPassword,
      role: "customer",
      status: false,
    });

    const verificationToken = jwt.sign(
      { user_id: newUser.user_id, email: newUser.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );
console.log("✅ TOKEN XÁC NHẬN:", verificationToken);
    await sendVerificationEmail(newUser.email, verificationToken);
    return res.status(201).json({ message: "Đăng ký thành công, vui lòng xác nhận email" });

    
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

/** ============ GỬI EMAIL XÁC NHẬN ============ */
const sendVerificationEmail = async (email, token) => {
  const verifyLink = `http://localhost:5000/QuanLyNguoiDung/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"GymStar" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Xác nhận email đăng ký GymStar",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #e53e3e;">Xác nhận tài khoản GymStar</h2>
        <p>Nhấn vào nút bên dưới để xác nhận tài khoản của bạn:</p>
        <a href="${verifyLink}" 
           style="display:inline-block; background:#e53e3e; color:#fff; padding:10px 20px; text-decoration:none; border-radius:5px;">
           Xác nhận ngay
        </a>
        <p>Liên kết này sẽ hết hạn sau <strong>15 phút</strong>.</p>
      </div>
    `,
  });

  console.log("Đã gửi email xác nhận đến:", email);
};

/** ============ XÁC NHẬN EMAIL ============ */
/** ============ XÁC NHẬN EMAIL ============ */
const verifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send(`
      <div style="text-align:center; padding:60px; font-family: Arial, sans-serif;">
        <h3 style="color:#e53e3e;">Thiếu mã xác nhận</h3>
        <p>Vui lòng kiểm tra link trong email.</p>
      </div>
    `);
  }

  try {
    // BƯỚC 1: Xác thực token hợp lệ
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await model.users.findByPk(decoded.user_id);

    if (!user) {
      return res.status(404).send(`
        <div style="text-align:center; padding:60px; font-family: Arial, sans-serif;">
          <h3 style="color:#e53e3e;">Người dùng không tồn tại</h3>
        </div>
      `);
    }

    if (user.status === true) {
      return res.send(`
        <div style="text-align:center; padding:60px; font-family: Arial, sans-serif;">
          <h3 style="color:#48bb78;">Tài khoản đã được xác nhận trước đó</h3>
          <p>Bạn có thể đăng nhập ngay bây giờ.</p>
          <a href="http://localhost:5173/login"
             style="background:#48bb78; color:white; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:bold;">
             Đăng nhập
          </a>
        </div>
      `);
    }

    // BƯỚC 2: Kích hoạt tài khoản
    await user.update({ status: true });
    await sendConfirmationEmail(user.email, user.full_name);

    // BƯỚC 3: Thành công
    return res.send(`
      <div style="text-align:center; padding:60px; font-family: Arial, sans-serif; background:#f7fafc; min-height:100vh;">
        <div style="background:white; padding:40px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.1); max-width:500px; margin:0 auto;">
          <h2 style="color:#48bb78; margin-bottom:16px;">Xác nhận thành công!</h2>
          <p style="font-size:16px; color:#2d3748;">Chào mừng <strong>${user.full_name}</strong> đến với <strong>GymStar</strong>!</p>
          <p style="color:#718096; margin:20px 0;">Tài khoản của bạn đã được kích hoạt.</p>
          <a href="http://localhost:5173/login"
             style="display:inline-block; background:#48bb78; color:white; padding:12px 28px; text-decoration:none; border-radius:8px; font-weight:bold; margin-top:20px;">
             Đăng nhập ngay
          </a>
        </div>
      </div>
    `);

  } catch (err) {
    console.error("Lỗi verifyEmail:", err);

    // BƯỚC 4: XỬ LÝ TOKEN HẾT HẠN → TỰ ĐỘNG GỬI LẠI
    if (err.name === "TokenExpiredError") {
      try {
        const decoded = jwt.decode(token);
        if (!decoded?.user_id) {
          return res.status(400).send(`
            <div style="text-align:center; padding:60px; font-family: Arial, sans-serif;">
              <h3 style="color:#e53e3e;">Mã xác nhận không hợp lệ</h3>
            </div>
          `);
        }

        const user = await model.users.findByPk(decoded.user_id);
        if (!user) {
          return res.status(404).send(`
            <div style="text-align:center; padding:60px; font-family: Arial, sans-serif;">
              <h3 style="color:#e53e3e;">Người dùng không tồn tại</h3>
            </div>
          `);
        }

        if (user.status === true) {
          return res.send(`
            <div style="text-align:center; padding:60px; font-family: Arial, sans-serif;">
              <h3 style="color:#48bb78;">Tài khoản đã được xác nhận</h3>
              <a href="http://localhost:5173/login" style="background:#48bb78; color:white; padding:12px 24px; text-decoration:none; border-radius:8px;">
                Đăng nhập
              </a>
            </div>
          `);
        }

        // TẠO TOKEN MỚI
        const newToken = jwt.sign(
          { user_id: user.user_id, email: user.email },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "15m" }
        );

        // GỬI LẠI EMAIL XÁC NHẬN
        await sendVerificationEmail(user.email, newToken);

        // THÔNG BÁO CHO NGƯỜI DÙNG
        return res.send(`
          <div style="text-align:center; padding:60px; font-family: Arial, sans-serif; background:#fff5f5; min-height:100vh;">
            <div style="background:white; padding:40px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.1); max-width:500px; margin:0 auto;">
              <h2 style="color:#f56565; margin-bottom:16px;">Mã xác nhận đã hết hạn</h2>
              <p style="font-size:16px; color:#2d3748;">
                Không sao! Chúng tôi đã gửi <strong>mã xác nhận mới</strong> đến:
              </p>
              <h3 style="color:#48bb78; margin:16px 0; font-size:18px;">${user.email}</h3>
              <p style="color:#718096;">
                Vui lòng kiểm tra <strong>hộp thư đến</strong> và <strong>mục Spam/Junk</strong>.<br>
                Link mới có hiệu lực trong <strong>15 phút</strong>.
              </p>
              <p style="margin-top:24px; font-size:14px; color:#a0aec0;">
                <em>Thời gian hiện tại: ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</em>
              </p>
            </div>
          </div>
        `);

      } catch (innerErr) {
        console.error("Lỗi khi gửi lại mã xác nhận:", innerErr);
        return res.status(500).send(`
          <div style="text-align:center; padding:60px; font-family: Arial, sans-serif;">
            <h3 style="color:#e53e3e;">Lỗi hệ thống</h3>
            <p>Vui lòng thử lại sau vài phút hoặc liên hệ hỗ trợ.</p>
          </div>
        `);
      }
    }

    // CÁC LỖI KHÁC (token sai, bị sửa, v.v.)
    return res.status(400).send(`
      <div style="text-align:center; padding:60px; font-family: Arial, sans-serif;">
        <h3 style="color:#e53e3e;">Mã xác nhận không hợp lệ</h3>
        <p>Vui lòng sử dụng link trong email mới nhất.</p>
      </div>
    `);
  }
};

/** ============ EMAIL CHÀO MỪNG ============ */
const sendConfirmationEmail = async (email, full_name) => {
  await transporter.sendMail({
    from: `"GymStar" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Chào mừng đến với GymStar!",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #e53e3e;">Xin chào ${full_name}!</h2>
        <p>Tài khoản của bạn đã được kích hoạt thành công.</p>
        <a href="http://localhost:5173/login" 
           style="display:inline-block; background:#e53e3e; color:#fff; padding:10px 20px; text-decoration:none; border-radius:5px;">
           Đăng nhập ngay
        </a>
      </div>
    `,
  });
  console.log("Đã gửi email chào mừng:", email);
};

/** ============ ĐĂNG NHẬP ============ */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await model.users.findOne({ where: { email } });

    if (!user)
      return res.status(400).json({ message: "Email hoặc mật khẩu không đúng" });

    if (!user.status)
      return res.status(403).json({ message: "Tài khoản chưa xác nhận email" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Email hoặc mật khẩu không đúng" });

    const accessToken = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { user_id: user.user_id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Đăng nhập thành công",
      accessToken,
      refreshToken,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

/** ============ LÀM MỚI TOKEN ============ */
const refreshTokenRoute = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ message: "Thiếu refresh token" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await model.users.findByPk(decoded.user_id);
    if (!user)
      return res.status(404).json({ message: "Người dùng không tồn tại" });

    const newAccessToken = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    const newRefreshToken = jwt.sign(
      { user_id: user.user_id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Làm mới token thành công",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return res.status(401).json({ message: "Refresh token không hợp lệ hoặc đã hết hạn" });
  }
};

/** ============ LẤY DANH SÁCH NGƯỜI DÙNG ============ */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, keyword = "" } = req.query;
    const offset = (page - 1) * limit;

    const where = keyword
      ? {
          [Op.or]: [
            { full_name: { [Op.iLike]: `%${keyword}%` } },
            { email: { [Op.iLike]: `%${keyword}%` } },
          ],
        }
      : {};

    const { count, rows } = await model.users.findAndCountAll({
      where,
      attributes: [
        "user_id", "full_name", "email", "gender",
        "birth_date", "status", "role", "createdAt"
      ],
      order: [["user_id", "DESC"]],
      limit: Number(limit),
      offset: Number(offset),
    });

    return res.status(200).json({
      message: "Lấy danh sách người dùng thành công",
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / limit),
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi getAllUsers:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

export {
  registerUser,
  sendVerificationEmail,
  sendConfirmationEmail,
  verifyEmail,
  loginUser,
  refreshTokenRoute,
  getAllUsers,
};
