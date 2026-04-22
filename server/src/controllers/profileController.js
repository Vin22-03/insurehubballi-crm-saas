import fs from "fs";
import path from "path";
import sharp from "sharp";
import prisma from "../config/prisma.js";

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        advisorCompanies: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                code: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: {
            assignedLeads: true,
            leadActivities: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      photoUrl: user.photoUrl,
      dob: user.dob,
      bio: user.bio,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      stats: {
        leads: user._count.assignedLeads,
        messages: user._count.leadActivities,
        companies: user.advisorCompanies.length,
      },
      assignedCompanies: user.advisorCompanies.map((item) => item.company),
    });
  } catch (error) {
    console.error("getProfile error:", error);
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, dob, bio } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        photoUrl: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    let finalPhotoUrl = existingUser.photoUrl;

    if (req.file) {
      const uploadsDir = path.join(process.cwd(), "uploads", "profiles");

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `user-${userId}-${Date.now()}.webp`;
      const outputPath = path.join(uploadsDir, fileName);

      // auto crop to square premium profile size
      await sharp(req.file.buffer)
        .resize(500, 500, {
          fit: "cover",
          position: "centre",
        })
        .webp({ quality: 90 })
        .toFile(outputPath);

      finalPhotoUrl = `/uploads/profiles/${fileName}`;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email: email?.trim() || null,
        dob: dob ? new Date(dob) : null,
        bio: bio?.trim() || null,
        photoUrl: finalPhotoUrl,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        photoUrl: true,
        dob: true,
        bio: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("updateProfile error:", error);

    if (error.code === "P2002") {
      return res.status(400).json({ message: "Email already exists" });
    }

    return res.status(500).json({ message: "Failed to update profile" });
  }
};

export { getProfile, updateProfile };