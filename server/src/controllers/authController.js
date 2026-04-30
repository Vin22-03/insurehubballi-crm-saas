import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../config/db.js";

const normalizeUser = (user) => ({
  ...user,
  isActive: Boolean(user.isActive),
  mustChangePassword: Boolean(user.mustChangePassword),
});

export const registerAdmin = async (req, res) => {
  try {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        message: "Name, phone, and password are required.",
      });
    }

    const [existingRows] = await db.query(
      "SELECT id FROM \`User\` WHERE phone = ? LIMIT 1",
      [phone]
    );

    if (existingRows.length > 0) {
      return res.status(400).json({ message: "Phone number already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO \`User\` (name, phone, password, role, isActive, mustChangePassword, createdAt, updatedAt)
       VALUES (?, ?, ?, 'ADMIN', 1, 0, NOW(), NOW())`,
      [name, phone, hashedPassword]
    );

    return res.status(201).json({
      message: "Admin created successfully.",
      user: {
        id: result.insertId,
        name,
        phone,
        role: "ADMIN",
      },
    });
  } catch (error) {
    console.error("registerAdmin error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        message: "Phone and password are required.",
      });
    }

    const [rows] = await db.query(
      `SELECT id, name, phone, password, role, isActive, mustChangePassword
       FROM \`User\`
       WHERE phone = ?
       LIMIT 1`,
      [phone]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid phone or password." });
    }

    const user = normalizeUser(rows[0]);

    if (!user.isActive) {
      return res.status(403).json({ message: "This account is inactive." });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid phone or password." });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        phone: user.phone,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const forgotPasswordRequest = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required." });
    }

    const [userRows] = await db.query(
      "SELECT id, phone FROM \`User\` WHERE phone = ? LIMIT 1",
      [phone]
    );

    if (userRows.length === 0) {
      return res.status(200).json({
        message:
          "If the account exists, the password reset request has been submitted.",
      });
    }

    const user = userRows[0];

    const [pendingRows] = await db.query(
      `SELECT id FROM PasswordResetRequest
       WHERE userId = ? AND status = 'PENDING'
       LIMIT 1`,
      [user.id]
    );

    if (pendingRows.length > 0) {
      return res.status(200).json({
        message:
          "If the account exists, the password reset request has been submitted.",
      });
    }

    const [result] = await db.query(
      `INSERT INTO PasswordResetRequest
       (userId, requestedBy, status, createdAt, updatedAt)
       VALUES (?, ?, 'PENDING', NOW(), NOW())`,
      [user.id, user.phone]
    );

    return res.status(201).json({
      message: "Password reset request sent to admin successfully.",
      request: {
        id: result.insertId,
        userId: user.id,
        requestedBy: user.phone,
        status: "PENDING",
      },
    });
  } catch (error) {
    console.error("forgotPasswordRequest error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const getMe = async (req, res) => {
  try {
    const [userRows] = await db.query(
      `SELECT id, name, phone, role, isActive, mustChangePassword, createdAt
       FROM \`User\`
       WHERE id = ?
       LIMIT 1`,
      [req.user.id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = normalizeUser(userRows[0]);

    const [companyRows] = await db.query(
      `SELECT c.id, c.code, c.name
       FROM AdvisorCompany ac
       JOIN \`Company\` c ON c.id = ac.companyId
       WHERE ac.advisorId = ?`,
      [user.id]
    );

    return res.status(200).json({
      message: "Current user fetched successfully.",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
        companies: companyRows,
      },
    });
  } catch (error) {
    console.error("getMe error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};