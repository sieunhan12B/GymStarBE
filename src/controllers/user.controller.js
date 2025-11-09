import sequelize from "../models/connect.js";
import initModels from "../models/init-models.js";
import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import transporter from "../config/email.js";

dotenv.config(); // Đọc file .env

const model = initModels(sequelize);

// // Hàm đăng ký người dùng
const registerUser = async (req, res) => {
  try {
    const { full_name, email, phone_number, password } = req.body;

    // === 1. Validate input ===
    if (!full_name || !email || !phone_number || !password) {
      return res.status(400).json({
        message: "Thông tin không được để trống",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }

    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({
        message: "Số điện thoại không hợp lệ (phải có 10-15 chữ số)",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      });
    }

    // === 2. Kiểm tra user tồn tại ===
    const User = req.models.users;
    const PasswordReset = req.models.password_resets;

    const existingUser = await User.findOne({ where: { email } });

    // === 3. Tạo token xác nhận ===
    const verificationToken = jwt.sign(
      { email },
      process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000);

    // In token ra terminal để test Postman (xóa dòng này khi deploy)
    console.log("TOKEN XÁC NHẬN (copy dán Postman):", verificationToken);

    // === 4. Trường hợp user đã tồn tại nhưng chưa xác nhận ===
    if (existingUser) {
      if (existingUser.status === true) {
        return res.status(400).json({
          message:
            "Email đã được sử dụng, vui lòng đăng nhập hoặc dùng email khác",
        });
      }

      // Cập nhật user cũ + tạo record mới trong password_resets
      const hashedPassword = await bcrypt.hash(password, 10);

      await existingUser.update({
        full_name,
        phone_number,
        password: hashedPassword,
      });

      // Xóa token cũ (nếu có)
      await PasswordReset.destroy({
        where: { user_id: existingUser.user_id, type: "register" },
      });

      // Tạo token mới trong password_resets
      await PasswordReset.create({
        user_id: existingUser.user_id,
        token: verificationToken,
        type: "register",
        expires_at: tokenExpires,
        used: false,
      });

      await sendVerificationEmail(email, verificationToken);

      return res.status(200).json({
        message:
          "Email đã được đăng ký nhưng chưa xác nhận. Chúng tôi đã gửi lại email xác nhận.",
      });
    }

    // === 5. Trường hợp đăng ký mới hoàn toàn ===
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      full_name,
      email,
      phone_number,
      password: hashedPassword,
      role: "customer",
      status: false,
    });

    // Lưu token vào bảng password_resets
    await PasswordReset.create({
      user_id: newUser.user_id,
      token: verificationToken,
      type: "register",
      expires_at: tokenExpires,
      used: false,
    });

    // Gửi email
    await sendVerificationEmail(email, verificationToken);

    return res.status(201).json({
      message: "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận.",
    });
  } catch (err) {
    console.error("Error registering user:", err);
    return res.status(500).json({
      message: "Lỗi khi đăng ký tài khoản",
      error: err.message,
    });
  }
};

// // Hàm gửi email xác nhận
const sendVerificationEmail = async (email, token) => {
  const verifyLink = `http://localhost:5000/QuanLyNguoiDung/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"GymStar" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Xác nhận email đăng ký GymStar",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #e53e3e; text-align: center;">Xác Nhận Email</h2>
        <p>Xin chào bạn,</p>
        <p>Vui lòng nhấn vào nút bên dưới để xác nhận email đăng ký tại <strong>GymStar</strong>:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="background: #e53e3e; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            XÁC NHẬN NGAY
          </a>
        </div>
        <p><small>Link sẽ hết hạn sau <strong>15 phút</strong>.</small></p>
      </div>
    `,
  });

  console.log("Đã gửi email xác nhận đến:", email);
};

// Hàm gửi email chào mừng (tùy chọn)
const sendConfirmationEmail = async (email, full_name) => {
  try {
    await transporter.sendMail({
      from: `"GymStar" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Chào mừng bạn đến với GymStar!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background: #f9fafb;">
          <h2 style="color: #e53e3e; text-align: center;">Chào mừng bạn!</h2>
          <p>Xin chào <strong>${full_name}</strong>,</p>
          <p>Tài khoản của bạn đã được <strong>xác nhận thành công</strong>!</p>
          <p>Bây giờ bạn có thể đăng nhập và trải nghiệm đầy đủ dịch vụ tại GymStar.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:5173/login" style="background: #e53e3e; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              ĐĂNG NHẬP NGAY
            </a>
          </div>
          <p>Cảm ơn bạn đã tin tưởng <strong>GymStar</strong>!</p>
        </div>
      `,
    });
    console.log("Đã gửi email chào mừng đến:", email);
  } catch (error) {
    console.error("Lỗi gửi email chào mừng:", error.message);
  }
};

// HÀM XÁC NHẬN EMAIL - HOÀN HẢO CHO POSTGRESQL
const verifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send(`
      <div style="text-align:center; font-family:Arial; padding:60px; background:#fff5f5; min-height:100vh;">
        <h2 style="color:#e53e3e;">Thiếu mã xác nhận</h2>
        <p>Vui lòng kiểm tra lại link trong email.</p>
      </div>
    `);
  }

  try {
    const PasswordReset = req.models.password_resets;
    const User = req.models.users;

    // Tìm token (chỉ cần token + type + chưa dùng)
    const resetRecord = await PasswordReset.findOne({
      where: {
        token,
        type: "register",
        used: false,
      },
    });

    // === TOKEN KHÔNG TỒN TẠI HOẶC ĐÃ DÙNG ===
    if (!resetRecord) {
      return res.status(400).send(`
        <div style="text-align:center; font-family:Arial; padding:60px; background:#fffbe6; min-height:100vh;">
          <h2 style="color:#d69e2e;">Mã xác nhận không hợp lệ</h2>
          <p>Link có thể đã được sử dụng hoặc không đúng.</p>
          <p><a href="https://www.youtube.com/watch?v=B_KS2x3udNo&t=134s" style="color:#e53e3e;">Quay lại đăng ký</a></p>
        </div>
      `);
    }

    const user = await User.findByPk(resetRecord.user_id);

    // === TOKEN HẾT HẠN → TỰ ĐỘNG GỬI MÃ MỚI (CHÍNH XÁC NHƯ BẠN MUỐN!) ===
    if (new Date() > resetRecord.expires_at) {
      // Tạo token mới
      const newToken = jwt.sign(
        { email: user.email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
      );

      const newExpires = new Date(Date.now() + 15 * 60 * 1000);

      // Xóa token cũ
      await PasswordReset.destroy({
        where: { user_id: user.user_id, type: "register" },
      });

      // Tạo token mới trong DB
      await PasswordReset.create({
        user_id: user.user_id,
        token: newToken,
        type: "register",
        expires_at: newExpires,
        used: false,
      });

      // Gửi email mới
      await sendVerificationEmail(user.email, newToken);

      console.log("TOKEN MỚI (gửi lại do hết hạn) – copy dán Postman:");
      console.log(newToken);
      console.log("Email đã gửi đến:", user.email);

      // HIỆN THÔNG BÁO ĐẸP – CHÍNH XÁC NHƯ BẠN MUỐN!
      return res.send(`
        <div style="text-align:center; font-family:Arial; padding:60px; background:#fffbe6; min-height:100vh;">
          <h2 style="color:#d69e2e;">Mã xác nhận đã hết hạn</h2>
          <p style="font-size:18px; color:#333; max-width:600px; margin:20px auto;">
            Chúng tôi vừa gửi lại <strong>email xác nhận mới</strong> đến:
          </p>
          <p style="font-size:20px; font-weight:bold; color:#2d3748;">
            ${user.email}
          </p>
          <p>Vui lòng kiểm tra hộp thư (bao gồm mục <strong>Spam/Junk</strong>).</p>
          <div style="margin:30px 0;">
            <a href="mailto:${user.email}" style="background:#3182ce; color:white; padding:14px 32px; text-decoration:none; border-radius:8px; font-weight:bold;">
              MỞ EMAIL NGAY
            </a>
          </div>
          <small>Link mới có hiệu lực trong 15 phút.</small>
        </div>
      `);
    }

    // === TOKEN CÒN HẠN → XÁC NHẬN THÀNH CÔNG ===
    await user.update({ status: true });
    await resetRecord.update({ used: true });

    console.log(`Xác nhận thành công: ${user.email}`);

    return res.send(`
      <div style="text-align:center; font-family:Arial; padding:60px; background:#f0fff4; min-height:100vh;">
        <h1 style="color:#48bb78;">Xác nhận thành công!</h1>
        <p style="font-size:20px;">Chào mừng <strong>${user.full_name}</strong>!</p>
        <p>Tài khoản đã được kích hoạt thành công.</p>
        <div style="margin:30px 0;">
          <a href="https://www.youtube.com/watch?v=B_KS2x3udNo&t=134s" style="background:#48bb78; color:white; padding:16px 40px; text-decoration:none; border-radius:8px; font-weight:bold; font-size:18px;">
            ĐĂNG NHẬP NGAY
          </a>
        </div>
      </div>
    `);
  } catch (err) {
    console.error("Lỗi verifyEmail:", err.message);
    return res.status(500).send(`
      <div style="text-align:center; padding:60px; background:#fff5f5;">
        <h2 style="color:#e53e3e;">Lỗi hệ thống</h2>
        <p>${err.message}</p>
      </div>
    `);
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email và mật khẩu không được để trống" });
    }

    const User = req.models.users;
    const PasswordReset = req.models.password_resets;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không đúng" });
    }

    if (user.status !== true) {
      return res.status(403).json({
        message:
          "Tài khoản chưa được xác nhận. Vui lòng kiểm tra email để kích hoạt.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không đúng" });
    }

    // Tạo access token (15 phút)
    const accessToken = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role || "customer",
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    // Tạo refresh token (7 ngày)
    const refreshToken = jwt.sign(
      { user_id: user.user_id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // Xóa refresh token cũ
    await PasswordReset.destroy({
      where: { user_id: user.user_id, type: "refresh" },
    });

    // Lưu refresh token mới
    await PasswordReset.create({
      user_id: user.user_id,
      token: refreshToken,
      type: "refresh",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      used: false,
    });

    // In token ra terminal để test
    console.log("ĐĂNG NHẬP THÀNH CÔNG!");
    console.log("ACCESS TOKEN (15m):", accessToken);
    console.log("REFRESH TOKEN (7d):", refreshToken);

    return res.status(200).json({
      message: "Đăng nhập thành công",
      accessToken,
      refreshToken,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role || "customer",
      },
    });
  } catch (err) {
    console.error("Lỗi đăng nhập:", err.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

const refreshTokenRoute = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(401).json({ message: "Thiếu refresh token" });

    const PasswordReset = req.models.password_resets;
    const User = req.models.users;

    // Tìm token trong DB
    const tokenRecord = await PasswordReset.findOne({
      where: {
        token: refreshToken,
        type: "refresh",
        used: false,
        expires_at: { [Op.gt]: new Date() },
      },
    });

    if (!tokenRecord) {
      return res
        .status(401)
        .json({ message: "Refresh token không hợp lệ hoặc đã hết hạn" });
    }

    // Verify chữ ký
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      await tokenRecord.update({ used: true });
      return res.status(401).json({ message: "Refresh token bị giả mạo" });
    }

    const user = await User.findByPk(decoded.user_id);
    if (!user || user.status !== true) {
      await tokenRecord.update({ used: true });
      return res.status(401).json({ message: "Tài khoản không hợp lệ" });
    }

    // Tạo access token mới
    const newAccessToken = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role || "customer",
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    // Tạo refresh token mới (rotating)
    const newRefreshToken = jwt.sign(
      { user_id: user.user_id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // Cập nhật token mới
    await tokenRecord.update({
      token: newRefreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      used: true,
    });

    await PasswordReset.create({
      user_id: user.user_id,
      token: newRefreshToken,
      type: "refresh",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      used: false,
    });

    console.log("REFRESH TOKEN THÀNH CÔNG!");
    console.log("NEW ACCESS TOKEN:", newAccessToken);

    return res.json({
      message: "Làm mới token thành công",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    console.error("Lỗi refresh:", err.message);
    return res.status(401).json({ message: "Refresh token không hợp lệ" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, keyword = "" } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const where = keyword
      ? {
          [Op.or]: [
            { full_name: { [Op.iLike]: `%${keyword}%` } },
            { email: { [Op.iLike]: `%${keyword}%` } },
          ],
        }
      : {};

    // ĐÚNG 100%: model.users (vì init-models.js trả về "users")
    const { count, rows } = await model.users.findAndCountAll({
      where,
      attributes: [
        "user_id",
        "full_name",
        "email",
        "gender",
        "birth_date",
        "status",
        "role",
        "createdAt",
        "updatedAt",
      ],
      order: [["user_id", "DESC"]],
      limit: limitNum,
      offset,
    });

    return res.status(200).json({
      message: "Lấy danh sách người dùng thành công",
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(count / limitNum),
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi getAllUsers:", error);
    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

const protectRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Không có token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token hết hạn hoặc không hợp lệ" });
  }
};

const logoutUser = async (req, res) => {
  try {
    const { refreshToken, accessToken } = req.body;

    const PasswordReset = req.models.password_resets;

    let deleted = 0;

    // Ưu tiên xóa bằng refreshToken
    if (refreshToken) {
      deleted = await PasswordReset.destroy({
        where: { token: refreshToken, type: "refresh" }
      });
    }

    // Nếu không có refreshToken nhưng có accessToken → decode để lấy user_id
    else if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        deleted = await PasswordReset.destroy({
          where: { user_id: decoded.user_id, type: "refresh" }
        });
      } catch (err) {
        // accessToken hết hạn → vẫn OK, vì frontend đã xóa
      }
    }

    console.log("ĐĂNG XUẤT THÀNH CÔNG – ĐÃ XÓA REFRESH TOKEN!");
    return res.status(200).json({ 
      message: "Đăng xuất thành công! Tất cả thiết bị đã bị đăng xuất." 
    });

  } catch (err) {
    console.error("Lỗi đăng xuất:", err.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// const changePassword = async (req, res) => {
//   try {
//     const userId = req.user.id_user;
//     const { currentPassword, newPassword } = req.body;

//     if (!currentPassword || !newPassword) {
//       return res.status(400).json({
//         message: "Mật khẩu hiện tại và mới không được để trống",
//       });
//     }

//     if (newPassword.length < 6) {
//       return res.status(400).json({
//         message: "Mật khẩu mới phải có ít nhất 6 ký tự",
//       });
//     }

//     const user = await model.user.findOne({ where: { id_user: userId } });
//     if (!user) {
//       return res.status(404).json({
//         message: "Không tìm thấy người dùng",
//       });
//     }

//     const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
//     if (!isPasswordValid) {
//       return res.status(400).json({
//         message: "Mật khẩu hiện tại không đúng",
//       });
//     }

//     const saltRounds = 10;
//     const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

//     await model.user.update(
//       { password: hashedNewPassword },
//       { where: { id_user: userId } }
//     );

//     return res.status(200).json({
//       message: "Thay đổi mật khẩu thành công",
//     });
//   } catch (error) {
//     console.error("Lỗi khi thay đổi mật khẩu:", error.message);
//     return res.status(500).json({
//       message: "Lỗi khi thay đổi mật khẩu",
//       error: error.message,
//     });
//   }
// };

// const updateInfoUser = async (req, res) => {
//   try {
//     const userId = req.user.id_user;
//     const { fullname, email, phone_number, address } = req.body;

//     let user = await model.user.findByPk(userId);
//     if (!user) {
//       return res.status(404).json({ message: "Tài khoản không tồn tại" });
//     }

//     if (!fullname || !email || !phone_number || !address) {
//       return res.status(400).json({
//         message: "Các thông tin không được để trống",
//         data: null,
//       });
//     }

//     const existingEmail = await model.user.findOne({
//       where: { email, id_user: { [Op.ne]: userId } },
//     });
//     if (existingEmail) {
//       return res.status(400).json({
//         message: "Email đã được sử dụng",
//       });
//     }

//     await model.user.update(
//       {
//         fullname,
//         email,
//         phone_number,
//         address,
//       },
//       { where: { id_user: userId } }
//     );

//     user = await model.user.findByPk(userId);

//     const userData = {
//       fullname: user.fullname,
//       email: user.email,
//       phone_number: user.phone_number,
//       address: user.address,
//       updatedAt: user.updatedAt,
//     };

//     return res.status(200).json({ message: "Cập nhật thông tin thành công", data: userData });
//   } catch (err) {
//     return res.status(400).json({ message: "Lỗi khi cập nhật thông tin", error: err.message });
//   }
// };

// const searchUsersByKeyword = async (req, res) => {
//   try {
//     const { keyword, page = 1, limit = 10 } = req.query;

//     // Kiểm tra từ khóa
//     if (!keyword || typeof keyword !== "string" || keyword.trim() === "") {
//       return res.status(400).json({
//         message: "Vui lòng cung cấp từ khóa tìm kiếm hợp lệ",
//       });
//     }

//     // Chuẩn hóa page và limit
//     const pageNum = Math.max(1, parseInt(page, 10));
//     const limitNum = Math.max(1, parseInt(limit, 10));
//     const offset = (pageNum - 1) * limitNum;

//     // Tìm kiếm người dùng theo từ khóa trong fullname, email, phone_number
//     const result = await model.user.findAndCountAll({
//       where: {
//         [Op.or]: [
//           { fullname: { [Op.like]: `%${keyword}%` } },
//           { email: { [Op.like]: `%${keyword}%` } },
//           { phone_number: { [Op.like]: `%${keyword}%` } },
//           { address: { [Op.like]: `%${keyword}%` } },
//         ],
//       },
//       attributes: [
//         "id_user",
//         "fullname",
//         "email",
//         "phone_number",
//         "address",
//         "createdAt",
//         "updatedAt",
//         "role",
//       ],
//       limit: limitNum,
//       offset,
//     });

//     const users = result.rows.map((user) => user.toJSON());
//     const totalItems = result.count;

//     if (users.length === 0) {
//       return res.status(404).json({
//         message: "Không tìm thấy người dùng nào phù hợp với từ khóa",
//       });
//     }

//     const totalPages = Math.ceil(totalItems / limitNum);
//     const pagination = {
//       currentPage: pageNum,
//       itemsPerPage: limitNum,
//       totalItems,
//       totalPages,
//       hasNextPage: pageNum < totalPages,
//       hasPrevPage: pageNum > 1,
//     };

//     return res.status(200).json({
//       message: "Tìm kiếm người dùng thành công",
//       data: users,
//       pagination,
//     });
//   } catch (error) {
//     console.error("Lỗi khi tìm kiếm người dùng:", error.message);
//     return res.status(500).json({
//       message: "Lỗi khi tìm kiếm người dùng",
//       error: error.message,
//     });
//   }
// };

export {
  registerUser,
  sendVerificationEmail,
  sendConfirmationEmail,
  verifyEmail,
  loginUser,
  refreshTokenRoute,
  protectRoute,
  logoutUser,
  // getInfoUser,
  getAllUsers,
  // changePassword,
  // updateInfoUser,
  // searchUsersByKeyword,
};
