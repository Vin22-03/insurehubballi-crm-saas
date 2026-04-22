import fs from "fs";
import path from "path";
import prisma from "../config/prisma.js";

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

    const resource = await prisma.resource.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        fileUrl: `/uploads/resources/${fileName}`,
        fileType,
        category,
        companyId: companyId ? Number(companyId) : null,
        isActive: isActive === "false" ? false : true,
        uploadedById: req.user.id,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: "Resource uploaded successfully",
      resource,
    });
  } catch (error) {
    console.error("createResource error:", error);
    return res.status(500).json({ message: "Failed to upload resource" });
  }
};

export const getAdminResources = async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.json({ resources });
  } catch (error) {
    console.error("getAdminResources error:", error);
    return res.status(500).json({ message: "Failed to fetch resources" });
  }
};

export const getAdvisorResources = async (req, res) => {
  try {
    const { companyId, category, search } = req.query;

    const advisorCompanies = await prisma.advisorCompany.findMany({
      where: { advisorId: req.user.id },
      select: { companyId: true },
    });

    const allowedCompanyIds = advisorCompanies.map((item) => item.companyId);

    const where = {
      isActive: true,
      OR: [
        { companyId: null },
        { companyId: { in: allowedCompanyIds } },
      ],
    };

    if (companyId) {
      where.companyId = Number(companyId);
    }

    if (category) {
      where.category = category;
    }

    if (search?.trim()) {
      where.title = {
        contains: search.trim(),
      };
    }

    const resources = await prisma.resource.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return res.json({ resources });
  } catch (error) {
    console.error("getAdvisorResources error:", error);
    return res.status(500).json({ message: "Failed to fetch resources" });
  }
};

export const updateResourceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const resource = await prisma.resource.update({
      where: { id: Number(id) },
      data: {
        isActive: Boolean(isActive),
      },
    });

    return res.json({
      message: "Resource status updated successfully",
      resource,
    });
  } catch (error) {
    console.error("updateResourceStatus error:", error);
    return res.status(500).json({ message: "Failed to update resource status" });
  }
};

export const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id: Number(id) },
    });

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    const fullPath = path.join(process.cwd(), resource.fileUrl.replace(/^\//, ""));

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await prisma.resource.delete({
      where: { id: Number(id) },
    });

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

    const resource = await prisma.resource.update({
      where: { id: Number(id) },
      data: {
        title: title?.trim(),
        description: description?.trim() || null,
        category,
        companyId: companyId ? Number(companyId) : null,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.json({
      message: "Resource updated successfully",
      resource,
    });
  } catch (error) {
    console.error("updateResource error:", error);
    return res.status(500).json({ message: "Failed to update resource" });
  }
};