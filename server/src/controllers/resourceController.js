import fs from "fs";
import path from "path";
import { db } from "../config/db.js";

const getFileTypeFromMime = (mimeType) => {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType === "application/vnd.ms-powerpoint") return "PPT";
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return "PPTX";
  }
  return null;
};

const formatResource = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  fileUrl: row.fileUrl,
  fileType: row.fileType,
  category: row.category,
  companyId: row.companyId,
  isActive: Boolean(row.isActive),
  uploadedById: row.uploadedById,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  company: row.company_id
    ? {
        id: row.company_id,
        name: row.company_name,
        code: row.company_code,
      }
    : null,
  uploadedBy: row.uploadedBy_id
    ? {
        id: row.uploadedBy_id,
        name: row.uploadedBy_name,
      }
    : undefined,
});

export const createResource = async (req, res) => {
  try {
    const { title, description, category, companyId, isActive } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const fileType = getFileTypeFromMime(req.file.mimetype);

    if (!fileType) {
      return res.status(400).json({ message: "Unsupported file type" });
    }

    const uploadsDir = path.join(process.cwd(), "uploads", "resources");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeOriginalName = req.file.originalname.replace(/\s+/g, "-");
    const fileName = `${Date.now()}-${safeOriginalName}`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, req.file.buffer);

    const [result] = await db.query(
      `INSERT INTO \`Resource\`
       (title, description, fileUrl, fileType, category, companyId, isActive, uploadedById, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        title.trim(),
        description?.trim() || null,
        `/uploads/resources/${fileName}`,
        fileType,
        category,
        companyId ? Number(companyId) : null,
        isActive === "false" ? 0 : 1,
        req.user.id,
      ]
    );

    const [rows] = await db.query(
      `SELECT
         r.*,
         c.id AS company_id,
         c.name AS company_name,
         c.code AS company_code,
         u.id AS uploadedBy_id,
         u.name AS uploadedBy_name
       FROM \`Resource\` r
       LEFT JOIN \`Company\` c ON c.id = r.companyId
       LEFT JOIN \`User\` u ON u.id = r.uploadedById
       WHERE r.id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      message: "Resource uploaded successfully",
      resource: formatResource(rows[0]),
    });
  } catch (error) {
    console.error("createResource error:", error);
    return res.status(500).json({ message: "Failed to upload resource" });
  }
};

export const getAdminResources = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         r.*,
         c.id AS company_id,
         c.name AS company_name,
         c.code AS company_code,
         u.id AS uploadedBy_id,
         u.name AS uploadedBy_name
       FROM \`Resource\` r
       LEFT JOIN \`Company\` c ON c.id = r.companyId
       LEFT JOIN \`User\` u ON u.id = r.uploadedById
       ORDER BY r.createdAt DESC`
    );

    return res.json({ resources: rows.map(formatResource) });
  } catch (error) {
    console.error("getAdminResources error:", error);
    return res.status(500).json({ message: "Failed to fetch resources" });
  }
};

export const getAdvisorResources = async (req, res) => {
  try {
    const { companyId, category, search } = req.query;

    const [advisorCompanies] = await db.query(
      `SELECT companyId
       FROM \`AdvisorCompany\`
       WHERE advisorId = ?`,
      [req.user.id]
    );

    const allowedCompanyIds = advisorCompanies.map((item) => item.companyId);

    const whereParts = ["r.isActive = 1"];
    const params = [];

    if (allowedCompanyIds.length > 0) {
      whereParts.push("(r.companyId IS NULL OR r.companyId IN (?))");
      params.push(allowedCompanyIds);
    } else {
      whereParts.push("r.companyId IS NULL");
    }

    if (companyId) {
      whereParts.push("r.companyId = ?");
      params.push(Number(companyId));
    }

    if (category) {
      whereParts.push("r.category = ?");
      params.push(category);
    }

    if (search?.trim()) {
      whereParts.push("r.title LIKE ?");
      params.push(`%${search.trim()}%`);
    }

    const [rows] = await db.query(
      `SELECT
         r.*,
         c.id AS company_id,
         c.name AS company_name,
         c.code AS company_code
       FROM \`Resource\` r
       LEFT JOIN \`Company\` c ON c.id = r.companyId
       WHERE ${whereParts.join(" AND ")}
       ORDER BY r.createdAt DESC`,
      params
    );

    return res.json({
      resources: rows.map((row) => {
        const formatted = formatResource(row);
        delete formatted.uploadedBy;
        return formatted;
      }),
    });
  } catch (error) {
    console.error("getAdvisorResources error:", error);
    return res.status(500).json({ message: "Failed to fetch resources" });
  }
};

export const updateResourceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    await db.query(
      `UPDATE \`Resource\`
       SET isActive = ?, updatedAt = NOW()
       WHERE id = ?`,
      [Boolean(isActive) ? 1 : 0, Number(id)]
    );

    const [rows] = await db.query(
      `SELECT * FROM \`Resource\` WHERE id = ? LIMIT 1`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Resource not found" });
    }

    return res.json({
      message: "Resource status updated successfully",
      resource: {
        ...rows[0],
        isActive: Boolean(rows[0].isActive),
      },
    });
  } catch (error) {
    console.error("updateResourceStatus error:", error);
    return res.status(500).json({ message: "Failed to update resource status" });
  }
};

export const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM \`Resource\` WHERE id = ? LIMIT 1`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Resource not found" });
    }

    const resource = rows[0];

    const fullPath = path.join(process.cwd(), resource.fileUrl.replace(/^\//, ""));

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await db.query(`DELETE FROM \`Resource\` WHERE id = ?`, [Number(id)]);

    return res.json({ message: "Resource deleted successfully" });
  } catch (error) {
    console.error("deleteResource error:", error);
    return res.status(500).json({ message: "Failed to delete resource" });
  }
};

export const updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, companyId } = req.body;

    await db.query(
      `UPDATE \`Resource\`
       SET title = ?,
           description = ?,
           category = ?,
           companyId = ?,
           updatedAt = NOW()
       WHERE id = ?`,
      [
        title?.trim(),
        description?.trim() || null,
        category,
        companyId ? Number(companyId) : null,
        Number(id),
      ]
    );

    const [rows] = await db.query(
      `SELECT
         r.*,
         c.id AS company_id,
         c.name AS company_name,
         c.code AS company_code,
         u.id AS uploadedBy_id,
         u.name AS uploadedBy_name
       FROM \`Resource\` r
       LEFT JOIN \`Company\` c ON c.id = r.companyId
       LEFT JOIN \`User\` u ON u.id = r.uploadedById
       WHERE r.id = ?
       LIMIT 1`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Resource not found" });
    }

    return res.json({
      message: "Resource updated successfully",
      resource: formatResource(rows[0]),
    });
  } catch (error) {
    console.error("updateResource error:", error);
    return res.status(500).json({ message: "Failed to update resource" });
  }
};