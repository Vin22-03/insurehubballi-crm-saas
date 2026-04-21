import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";


export const registerAdmin = async (req, res) => {
  try {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        message: "Name, phone, and password are required.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Phone number already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.user.create({
      data: {
        name,
        phone,
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    return res.status(201).json({
      message: "Admin created successfully.",
      user: {
        id: admin.id,
        name: admin.name,
        phone: admin.phone,
        role: admin.role,
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

    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid phone or password." });
    }

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

    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const existingPendingRequest = await prisma.passwordResetRequest.findFirst({
      where: {
        userId: user.id,
        status: "PENDING",
      },
    });

    if (existingPendingRequest) {
      return res.status(400).json({
        message: "A password reset request is already pending for this user.",
      });
    }

    const resetRequest = await prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        requestedBy: user.phone,
        status: "PENDING",
      },
    });

    return res.status(201).json({
      message: "Password reset request sent to admin successfully.",
      request: resetRequest,
    });
  } catch (error) {
    console.error("forgotPasswordRequest error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        advisorCompanies: {
          select: {
            company: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

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
        companies: user.advisorCompanies.map((item) => item.company),
      },
    });
  } catch (error) {
    console.error("getMe error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};