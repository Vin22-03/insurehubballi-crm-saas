import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";

const DEFAULT_TEMPLATE_BODY = `Dear *{client_name}*,

Thank you for your valuable time.

Based on age *{age}*, we are sharing a suitable *{template_title}* from Team - insurehubballi.

For more details, please contact:
*{advisor_name}*
*{advisor_mobile}*

Team - insurehubballi
Your Cover, Our Care`;

// Admin creates advisor and sets initial password + company mappings
export const createAdvisor = async (req, res) => {
  try {
    const { name, phone, password, companyIds } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        message: "Name, phone, and password are required.",
      });
    }

    if (!Array.isArray(companyIds) || companyIds.length === 0) {
      return res.status(400).json({
        message: "At least one company must be assigned.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Phone number already exists." });
    }

    const companies = await prisma.company.findMany({
      where: {
        id: {
          in: companyIds,
        },
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    if (companies.length !== companyIds.length) {
      return res.status(400).json({
        message: "One or more selected companies are invalid.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const advisor = await prisma.user.create({
      data: {
        name,
        phone,
        password: hashedPassword,
        role: "ADVISOR",
        mustChangePassword: true,
        advisorCompanies: {
          create: companyIds.map((companyId) => ({
            companyId,
          })),
        },
      },
      include: {
        advisorCompanies: {
          include: {
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

    return res.status(201).json({
      message: "Advisor created successfully.",
      user: {
        id: advisor.id,
        name: advisor.name,
        phone: advisor.phone,
        role: advisor.role,
        mustChangePassword: advisor.mustChangePassword,
        companies: advisor.advisorCompanies.map((item) => item.company),
      },
    });
  } catch (error) {
    console.error("createAdvisor error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};
// Admin sees all password reset requests
export const getPasswordResetRequests = async (req, res) => {
  try {
    const requests = await prisma.passwordResetRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
        handledBy: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      message: "Password reset requests fetched successfully.",
      requests,
    });
  } catch (error) {
    console.error("getPasswordResetRequests error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

// Admin manually sets new password and completes request
export const completePasswordResetRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { newPassword, adminNote } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required." });
    }

    const resetRequest = await prisma.passwordResetRequest.findUnique({
      where: { id: Number(requestId) },
      include: {
        user: true,
      },
    });

    if (!resetRequest) {
      return res.status(404).json({ message: "Reset request not found." });
    }

    if (resetRequest.status !== "PENDING") {
      return res.status(400).json({
        message: "This request has already been processed.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRequest.userId },
        data: {
          password: hashedPassword,
        },
      }),
      prisma.passwordResetRequest.update({
        where: { id: Number(requestId) },
        data: {
          status: "COMPLETED",
          adminNote: adminNote || null,
          handledById: req.user.id,
          completedAt: new Date(),
        },
      }),
    ]);

    return res.status(200).json({
      message: "Password reset completed successfully.",
    });
  } catch (error) {
    console.error("completePasswordResetRequest error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

// Optional: admin can reject request
export const rejectPasswordResetRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminNote } = req.body;

    const resetRequest = await prisma.passwordResetRequest.findUnique({
      where: { id: Number(requestId) },
    });

    if (!resetRequest) {
      return res.status(404).json({ message: "Reset request not found." });
    }

    if (resetRequest.status !== "PENDING") {
      return res.status(400).json({
        message: "This request has already been processed.",
      });
    }

    await prisma.passwordResetRequest.update({
      where: { id: Number(requestId) },
      data: {
        status: "REJECTED",
        adminNote: adminNote || null,
        handledById: req.user.id,
        completedAt: new Date(),
      },
    });

    return res.status(200).json({
      message: "Password reset request rejected successfully.",
    });
  } catch (error) {
    console.error("rejectPasswordResetRequest error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};
export const getAllCompanies = async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    return res.status(200).json({
      message: "Companies fetched successfully.",
      companies,
    });
  } catch (error) {
    console.error("getAllCompanies error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const getAllAdvisors = async (req, res) => {
  try {
    const advisors = await prisma.user.findMany({
      where: {
        role: "ADVISOR",
      },
      orderBy: {
        createdAt: "desc",
      },
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

    return res.status(200).json({
      message: "Advisors fetched successfully.",
      advisors: advisors.map((advisor) => ({
        ...advisor,
        companies: advisor.advisorCompanies.map((item) => item.company),
      })),
    });
  } catch (error) {
    console.error("getAllAdvisors error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const createTemplate = async (req, res) => {
  try {
    const {
      companyId,
      title,
      tagline,
      body,
      minAge,
      maxAge,
      pdfUrl,
    } = req.body;

    if (!companyId || !title) {
      return res.status(400).json({
        message: "Company, title are required.",
      });
    }

    const company = await prisma.company.findUnique({
      where: { id: Number(companyId) },
    });

    if (!company || !company.isActive) {
      return res.status(400).json({
        message: "Invalid company selected.",
      });
    }

    const template = await prisma.template.create({
      data: {
        companyId: Number(companyId),
        title,
        tagline: tagline || null,
        body: body?.trim() ? body.trim() : DEFAULT_TEMPLATE_BODY,
        minAge: minAge !== undefined && minAge !== null && minAge !== "" ? Number(minAge) : null,
        maxAge: maxAge !== undefined && maxAge !== null && maxAge !== "" ? Number(maxAge) : null,
        pdfUrl: pdfUrl || null,
      },
      include: {
        company: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: "Template created successfully.",
      template,
    });
  } catch (error) {
    console.error("createTemplate error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const getAllTemplates = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const companyId =
      req.query.companyId && req.query.companyId !== "ALL"
        ? Number(req.query.companyId)
        : null;

    const where = {
      ...(companyId ? { companyId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { tagline: { contains: search } },
              {
                company: {
                  name: { contains: search },
                },
              },
            ],
          }
        : {}),
    };

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          company: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      }),
      prisma.template.count({ where }),
    ]);

    return res.status(200).json({
      message: "Templates fetched successfully.",
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getAllTemplates error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};
export const updateAdvisor = async (req, res) => {
  try {
    const { advisorId } = req.params;
    const { name, phone, companyIds } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        message: "Name and phone are required.",
      });
    }

    if (!Array.isArray(companyIds) || companyIds.length === 0) {
      return res.status(400).json({
        message: "At least one company must be assigned.",
      });
    }

    const advisor = await prisma.user.findUnique({
      where: { id: Number(advisorId) },
      include: {
        advisorCompanies: true,
      },
    });

    if (!advisor || advisor.role !== "ADVISOR") {
      return res.status(404).json({ message: "Advisor not found." });
    }

    const existingPhoneUser = await prisma.user.findFirst({
      where: {
        phone,
        NOT: { id: Number(advisorId) },
      },
    });

    if (existingPhoneUser) {
      return res.status(400).json({
        message: "Phone number already exists.",
      });
    }

    const companies = await prisma.company.findMany({
      where: {
        id: { in: companyIds },
        isActive: true,
      },
      select: { id: true },
    });

    if (companies.length !== companyIds.length) {
      return res.status(400).json({
        message: "One or more selected companies are invalid.",
      });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: Number(advisorId) },
        data: {
          name,
          phone,
        },
      }),
      prisma.advisorCompany.deleteMany({
        where: { advisorId: Number(advisorId) },
      }),
      prisma.advisorCompany.createMany({
        data: companyIds.map((companyId) => ({
          advisorId: Number(advisorId),
          companyId,
        })),
      }),
    ]);

    const updatedAdvisor = await prisma.user.findUnique({
      where: { id: Number(advisorId) },
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

    return res.status(200).json({
      message: "Advisor updated successfully.",
      advisor: {
        ...updatedAdvisor,
        companies: updatedAdvisor.advisorCompanies.map((item) => item.company),
      },
    });
  } catch (error) {
    console.error("updateAdvisor error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const resetAdvisorPassword = async (req, res) => {
  try {
    const { advisorId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        message: "New password is required.",
      });
    }

    const advisor = await prisma.user.findUnique({
      where: { id: Number(advisorId) },
    });

    if (!advisor || advisor.role !== "ADVISOR") {
      return res.status(404).json({ message: "Advisor not found." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: Number(advisorId) },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
      },
    });

    return res.status(200).json({
      message: "Advisor password reset successfully.",
    });
  } catch (error) {
    console.error("resetAdvisorPassword error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const toggleAdvisorStatus = async (req, res) => {
  try {
    const { advisorId } = req.params;

    const advisor = await prisma.user.findUnique({
      where: { id: Number(advisorId) },
    });

    if (!advisor || advisor.role !== "ADVISOR") {
      return res.status(404).json({ message: "Advisor not found." });
    }

    const updatedAdvisor = await prisma.user.update({
      where: { id: Number(advisorId) },
      data: {
        isActive: !advisor.isActive,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    return res.status(200).json({
      message: `Advisor ${updatedAdvisor.isActive ? "activated" : "deactivated"} successfully.`,
      advisor: updatedAdvisor,
    });
  } catch (error) {
    console.error("toggleAdvisorStatus error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};
export const updateTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { companyId, title, tagline, body, minAge, maxAge, pdfUrl } = req.body;

    if (!companyId || !title) {
      return res.status(400).json({
        message: "Company and title are required.",
      });
    }

    const existingTemplate = await prisma.template.findUnique({
      where: { id: Number(templateId) },
    });

    if (!existingTemplate) {
      return res.status(404).json({ message: "Template not found." });
    }

    const company = await prisma.company.findUnique({
      where: { id: Number(companyId) },
    });

    if (!company || !company.isActive) {
      return res.status(400).json({
        message: "Invalid company selected.",
      });
    }

    const updatedTemplate = await prisma.template.update({
      where: { id: Number(templateId) },
      data: {
        companyId: Number(companyId),
        title,
        tagline: tagline || null,
        body: body?.trim() ? body.trim() : DEFAULT_TEMPLATE_BODY,
        minAge:
          minAge !== undefined && minAge !== null && minAge !== ""
            ? Number(minAge)
            : null,
        maxAge:
          maxAge !== undefined && maxAge !== null && maxAge !== ""
            ? Number(maxAge)
            : null,
        pdfUrl: pdfUrl || null,
      },
      include: {
        company: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Template updated successfully.",
      template: updatedTemplate,
    });
  } catch (error) {
    console.error("updateTemplate error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const toggleTemplateStatus = async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await prisma.template.findUnique({
      where: { id: Number(templateId) },
    });

    if (!template) {
      return res.status(404).json({ message: "Template not found." });
    }

    const updatedTemplate = await prisma.template.update({
      where: { id: Number(templateId) },
      data: {
        isActive: !template.isActive,
      },
    });

    return res.status(200).json({
      message: `Template ${updatedTemplate.isActive ? "activated" : "deactivated"} successfully.`,
      template: updatedTemplate,
    });
  } catch (error) {
    console.error("toggleTemplateStatus error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await prisma.template.findUnique({
      where: { id: Number(templateId) },
    });

    if (!template) {
      return res.status(404).json({ message: "Template not found." });
    }

    const usageCount = await prisma.leadActivity.count({
      where: { templateId: Number(templateId) },
    });

    if (usageCount > 0) {
      return res.status(400).json({
        message: "This template has been used already. Deactivate it instead of deleting.",
      });
    }

    await prisma.template.delete({
      where: { id: Number(templateId) },
    });

    return res.status(200).json({
      message: "Template deleted successfully.",
    });
  } catch (error) {
    console.error("deleteTemplate error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};