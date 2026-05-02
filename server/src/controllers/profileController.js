import fs from "fs";
import path from "path";
import sharp from "sharp";
import { db } from "../config/db.js";

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [userRows] = await db.query(
      `SELECT id, name, phone, email, photoUrl, brandLogoUrl, dob, bio, role, isActive, createdAt,
       brandName, officeAddress, advisorRole
       FROM \`User\`
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRows[0];

    const [[leadCountRows], [activityCountRows], [companies]] = await Promise.all([
      db.query(`SELECT COUNT(*) AS count FROM \`Lead\` WHERE assignedToId = ?`, [userId]),
      db.query(`SELECT COUNT(*) AS count FROM \`LeadActivity\` WHERE advisorId = ?`, [userId]),
      db.query(
        `SELECT c.id, c.name, c.code, c.isActive
         FROM AdvisorCompany ac
         JOIN \`Company\` c ON c.id = ac.companyId
         WHERE ac.advisorId = ?`,
        [userId]
      ),
    ]);

    return res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      photoUrl: user.photoUrl,
      brandLogoUrl: user.brandLogoUrl,
      dob: user.dob,
      bio: user.bio,
      brandName: user.brandName,
      officeAddress: user.officeAddress,
      advisorRole: user.advisorRole,
      role: user.role,
      isActive: Boolean(user.isActive),
      createdAt: user.createdAt,
      stats: {
        leads: leadCountRows[0].count,
        messages: activityCountRows[0].count,
        companies: companies.length,
      },
      assignedCompanies: companies.map((c) => ({
        ...c,
        isActive: Boolean(c.isActive),
      })),
    });
  } catch (error) {
    console.error("getProfile error:", error);
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, dob, bio, brandName, officeAddress, advisorRole } = req.body;

    const [existingRows] = await db.query(
      `SELECT id, photoUrl, brandLogoUrl FROM \`User\` WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    let finalPhotoUrl = existingRows[0].photoUrl;
    let finalBrandLogoUrl = existingRows[0].brandLogoUrl;

    const profileFile = req.files?.photo?.[0];
    const brandLogoFile = req.files?.brandLogo?.[0];

    if (req.body.removePhoto === "true") {
  finalPhotoUrl = null;
}

if (req.body.removeBrandLogo === "true") {
  finalBrandLogoUrl = null;
}

    if (profileFile) {
      const uploadsDir = path.join(process.cwd(), "uploads", "profiles");

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `user-${userId}-${Date.now()}.webp`;
      const outputPath = path.join(uploadsDir, fileName);

      await sharp(profileFile.buffer)
        .resize(500, 500, { fit: "cover", position: "centre" })
        .webp({ quality: 90 })
        .toFile(outputPath);

      finalPhotoUrl = `/uploads/profiles/${fileName}`;
    }

    if (brandLogoFile) {
      const uploadsDir = path.join(process.cwd(), "uploads", "brands");

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `brand-${userId}-${Date.now()}.webp`;
      const outputPath = path.join(uploadsDir, fileName);

      await sharp(brandLogoFile.buffer)
        .resize(400, 400, { fit: "contain", background: "#ffffff" })
        .webp({ quality: 90 })
        .toFile(outputPath);

      finalBrandLogoUrl = `/uploads/brands/${fileName}`;
    }

    try {
      await db.query(
        `UPDATE \`User\`
         SET email = ?, dob = ?, bio = ?, brandName = ?, officeAddress = ?, advisorRole = ?, photoUrl = ?, brandLogoUrl = ?, updatedAt = NOW()
         WHERE id = ?`,
        [
          email?.trim() || null,
          dob ? new Date(dob) : null,
          bio?.trim() || null,
          brandName?.trim() || null,
          officeAddress?.trim() || null,
          advisorRole?.trim() || null,
          finalPhotoUrl,
          finalBrandLogoUrl,
          userId,
        ]
      );
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ message: "Email already exists" });
      }
      throw err;
    }

    const [updatedRows] = await db.query(
      `SELECT id, name, phone, email, photoUrl, brandLogoUrl, dob, bio, role, isActive, createdAt,
       brandName, officeAddress, advisorRole
       FROM \`User\`
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    const updatedUser = updatedRows[0];

    return res.json({
      message: "Profile updated successfully",
      user: {
        ...updatedUser,
        isActive: Boolean(updatedUser.isActive),
      },
    });
  } catch (error) {
    console.error("updateProfile error:", error);
    return res.status(500).json({ message: "Failed to update profile" });
  }
};

export { getProfile, updateProfile };