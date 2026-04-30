import bcrypt from "bcryptjs";
import { db } from "../config/db.js";

const DEFAULT_TEMPLATE_BODY = `Dear *{client_name}*,

Thank you for your valuable time.

we are sharing a suitable *{template_title}* from Team - insurehubballi.

For more details, please contact:
*{advisor_name}*
*{advisor_mobile}*
*{advisor_url}*

Team - insurehubballi
Your Cover, Our Care`;

/* =========================
   COMPANIES
========================= */

export const getAllCompanies = async (req, res) => {
  try {
    const [companies] = await db.query(
      `SELECT id, code, name
       FROM \`Company\`
       WHERE isActive = 1
       ORDER BY name ASC`
    );

    return res.status(200).json({
      message: "Companies fetched successfully.",
      companies,
    });
  } catch (error) {
    console.error("getAllCompanies error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

/* =========================
   ADVISORS
========================= */

export const getAllAdvisors = async (req, res) => {
  try {
    const [advisors] = await db.query(
  `SELECT id, name, phone, advisorUrl, role, isActive, mustChangePassword, createdAt
   FROM \`User\`
   WHERE role = 'ADVISOR'
   ORDER BY createdAt DESC`
);

    const advisorIds = advisors.map((a) => a.id);

    let companiesByAdvisor = {};

    if (advisorIds.length > 0) {
      const [companyRows] = await db.query(
        `SELECT ac.advisorId, c.id, c.code, c.name
         FROM AdvisorCompany ac
         JOIN \`Company\` c ON c.id = ac.companyId
         WHERE ac.advisorId IN (?)`,
        [advisorIds]
      );

      companiesByAdvisor = companyRows.reduce((acc, row) => {
        if (!acc[row.advisorId]) acc[row.advisorId] = [];
        acc[row.advisorId].push({
          id: row.id,
          code: row.code,
          name: row.name,
        });
        return acc;
      }, {});
    }

    return res.status(200).json({
      message: "Advisors fetched successfully.",
      advisors: advisors.map((advisor) => ({
        ...advisor,
        isActive: Boolean(advisor.isActive),
        mustChangePassword: Boolean(advisor.mustChangePassword),
        companies: companiesByAdvisor[advisor.id] || [],
      })),
    });
  } catch (error) {
    console.error("getAllAdvisors error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const createAdvisor = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { name, phone, password, companyIds, advisorUrl } = req.body;

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

    const numericCompanyIds = companyIds.map(Number);

    const [existingRows] = await connection.query(
      `SELECT id FROM \`User\` WHERE phone = ? LIMIT 1`,
      [phone]
    );

    if (existingRows.length > 0) {
      return res.status(400).json({ message: "Phone number already exists." });
    }

    const [companies] = await connection.query(
      `SELECT id, code, name
       FROM Company
       WHERE id IN (?) AND isActive = 1`,
      [numericCompanyIds]
    );

    if (companies.length !== numericCompanyIds.length) {
      return res.status(400).json({
        message: "One or more selected companies are invalid.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const finalAdvisorUrl =
      advisorUrl && advisorUrl.trim() ? advisorUrl.trim() : null;

    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO \`User\`
       (name, phone, password, advisorUrl, role, isActive, mustChangePassword, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'ADVISOR', 1, 1, NOW(), NOW())`,
      [name, phone, hashedPassword, finalAdvisorUrl]
    );

    const advisorId = result.insertId;

    for (const companyId of numericCompanyIds) {
      await connection.query(
        `INSERT INTO AdvisorCompany (advisorId, companyId)
         VALUES (?, ?)`,
        [advisorId, companyId]
      );
    }

    await connection.commit();

    return res.status(201).json({
      message: "Advisor created successfully.",
      user: {
        id: advisorId,
        name,
        phone,
        advisorUrl: finalAdvisorUrl,
        role: "ADVISOR",
        mustChangePassword: true,
        companies,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("createAdvisor error:", error);
    return res.status(500).json({ message: "Server error." });
  } finally {
    connection.release();
  }
};
export const updateAdvisor = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { advisorId } = req.params;
    const { name, phone, companyIds, advisorUrl } = req.body;
    const numericAdvisorId = Number(advisorId);

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

    const numericCompanyIds = companyIds.map(Number);

    const [advisorRows] = await connection.query(
      `SELECT id, role FROM \`User\` WHERE id = ? LIMIT 1`,
      [numericAdvisorId]
    );

    if (advisorRows.length === 0 || advisorRows[0].role !== "ADVISOR") {
      return res.status(404).json({ message: "Advisor not found." });
    }

    const [phoneRows] = await connection.query(
      `SELECT id FROM \`User\` WHERE phone = ? AND id != ? LIMIT 1`,
      [phone, numericAdvisorId]
    );

    if (phoneRows.length > 0) {
      return res.status(400).json({
        message: "Phone number already exists.",
      });
    }

    const [companies] = await connection.query(
      `SELECT id, code, name
       FROM Company
       WHERE id IN (?) AND isActive = 1`,
      [numericCompanyIds]
    );

    if (companies.length !== numericCompanyIds.length) {
      return res.status(400).json({
        message: "One or more selected companies are invalid.",
      });
    }

    const finalAdvisorUrl =
      advisorUrl && advisorUrl.trim() ? advisorUrl.trim() : null;

    await connection.beginTransaction();

    await connection.query(
      `UPDATE \`User\`
       SET name = ?, phone = ?, advisorUrl = ?, updatedAt = NOW()
       WHERE id = ?`,
      [name, phone, finalAdvisorUrl, numericAdvisorId]
    );

    await connection.query(
      `DELETE FROM AdvisorCompany WHERE advisorId = ?`,
      [numericAdvisorId]
    );

    for (const companyId of numericCompanyIds) {
      await connection.query(
        `INSERT INTO AdvisorCompany (advisorId, companyId)
         VALUES (?, ?)`,
        [numericAdvisorId, companyId]
      );
    }

    await connection.commit();

    return res.status(200).json({
      message: "Advisor updated successfully.",
      advisor: {
        id: numericAdvisorId,
        name,
        phone,
        advisorUrl: finalAdvisorUrl,
        role: "ADVISOR",
        companies,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("updateAdvisor error:", error);
    return res.status(500).json({ message: "Server error." });
  } finally {
    connection.release();
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

    const [advisorRows] = await db.query(
      `SELECT id, role FROM \`User\` WHERE id = ? LIMIT 1`,
      [Number(advisorId)]
    );

    if (advisorRows.length === 0 || advisorRows[0].role !== "ADVISOR") {
      return res.status(404).json({ message: "Advisor not found." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE \`User\`
       SET password = ?, mustChangePassword = 1, updatedAt = NOW()
       WHERE id = ?`,
      [hashedPassword, Number(advisorId)]
    );

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

    const [advisorRows] = await db.query(
      `SELECT id, name, phone, role, isActive, mustChangePassword
       FROM \`User\`
       WHERE id = ?
       LIMIT 1`,
      [Number(advisorId)]
    );

    if (advisorRows.length === 0 || advisorRows[0].role !== "ADVISOR") {
      return res.status(404).json({ message: "Advisor not found." });
    }

    const newStatus = advisorRows[0].isActive ? 0 : 1;

    await db.query(
      `UPDATE \`User\` SET isActive = ?, updatedAt = NOW()
       WHERE id = ?`,
      [newStatus, Number(advisorId)]
    );

    return res.status(200).json({
      message: `Advisor ${newStatus ? "activated" : "deactivated"} successfully.`,
      advisor: {
        ...advisorRows[0],
        isActive: Boolean(newStatus),
        mustChangePassword: Boolean(advisorRows[0].mustChangePassword),
      },
    });
  } catch (error) {
    console.error("toggleAdvisorStatus error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

/* =========================
   PASSWORD RESET REQUESTS
========================= */

export const getPasswordResetRequests = async (req, res) => {
  try {
    const [requests] = await db.query(
      `SELECT 
         prr.id,
         prr.userId,
         prr.requestedBy AS phone,
         prr.requestNote AS message,
         prr.status,
         prr.adminNote,
         prr.handledById,
         prr.completedAt,
         prr.createdAt,
         prr.updatedAt,

         u.id AS user_id,
         u.name AS user_name,
         u.phone AS user_phone,
         u.role AS user_role,

         hb.id AS handledBy_id,
         hb.name AS handledBy_name,
         hb.phone AS handledBy_phone,
         hb.role AS handledBy_role

       FROM PasswordResetRequest prr
       LEFT JOIN \`User\` u ON u.id = prr.userId
       LEFT JOIN \`User\` hb ON hb.id = prr.handledById
       ORDER BY prr.createdAt DESC`
    );

    const formattedRequests = requests.map((request) => ({
      id: request.id,
      phone: request.phone || request.user_phone || "",
      message: request.message || "",
      status: request.status,
      createdAt: request.createdAt,
      completedAt: request.completedAt || null,
      adminNote: request.adminNote || "",
      user: request.user_id
        ? {
            id: request.user_id,
            name: request.user_name,
            phone: request.user_phone,
            role: request.user_role,
          }
        : null,
      handledBy: request.handledBy_id
        ? {
            id: request.handledBy_id,
            name: request.handledBy_name,
            phone: request.handledBy_phone,
            role: request.handledBy_role,
          }
        : null,
    }));

    return res.status(200).json({
      message: "Password reset requests fetched successfully.",
      requests: formattedRequests,
    });
  } catch (error) {
    console.error("getPasswordResetRequests error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const completePasswordResetRequest = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { requestId } = req.params;
    const { newPassword, adminNote } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required." });
    }

    const [requestRows] = await connection.query(
      `SELECT id, userId, status
       FROM PasswordResetRequest
       WHERE id = ?
       LIMIT 1`,
      [Number(requestId)]
    );

    if (requestRows.length === 0) {
      return res.status(404).json({ message: "Reset request not found." });
    }

    const resetRequest = requestRows[0];

    if (resetRequest.status !== "PENDING") {
      return res.status(400).json({
        message: "This request has already been processed.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await connection.beginTransaction();

    await connection.query(
      `UPDATE \`User\`
       SET password = ?, updatedAt = NOW()
       WHERE id = ?`,
      [hashedPassword, resetRequest.userId]
    );

    await connection.query(
      `UPDATE PasswordResetRequest
       SET status = 'COMPLETED',
           adminNote = ?,
           handledById = ?,
           completedAt = NOW(),
           updatedAt = NOW()
       WHERE id = ?`,
      [adminNote || null, req.user.id, Number(requestId)]
    );

    await connection.commit();

    return res.status(200).json({
      message: "Password reset completed successfully.",
    });
  } catch (error) {
    await connection.rollback();
    console.error("completePasswordResetRequest error:", error);
    return res.status(500).json({ message: "Server error." });
  } finally {
    connection.release();
  }
};

export const rejectPasswordResetRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminNote } = req.body;

    const [requestRows] = await db.query(
      `SELECT id, status
       FROM PasswordResetRequest
       WHERE id = ?
       LIMIT 1`,
      [Number(requestId)]
    );

    if (requestRows.length === 0) {
      return res.status(404).json({ message: "Reset request not found." });
    }

    if (requestRows[0].status !== "PENDING") {
      return res.status(400).json({
        message: "This request has already been processed.",
      });
    }

    await db.query(
      `UPDATE PasswordResetRequest
       SET status = 'REJECTED',
           adminNote = ?,
           handledById = ?,
           completedAt = NOW(),
           updatedAt = NOW()
       WHERE id = ?`,
      [adminNote || null, req.user.id, Number(requestId)]
    );

    return res.status(200).json({
      message: "Password reset request rejected successfully.",
    });
  } catch (error) {
    console.error("rejectPasswordResetRequest error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

/* =========================
   TEMPLATES
========================= */

export const createTemplate = async (req, res) => {
  try {
    const { companyId, title, tagline, body, minAge, maxAge, pdfUrl } = req.body;

    if (!companyId || !title) {
      return res.status(400).json({
        message: "Company, title are required.",
      });
    }

    const [companyRows] = await db.query(
      `SELECT id, code, name, isActive
       FROM \`Company\`
       WHERE id = ?
       LIMIT 1`,
      [Number(companyId)]
    );

    if (companyRows.length === 0 || !companyRows[0].isActive) {
      return res.status(400).json({
        message: "Invalid company selected.",
      });
    }

    const finalBody = body?.trim() ? body.trim() : DEFAULT_TEMPLATE_BODY;

    const [result] = await db.query(
      `INSERT INTO \`Template\`
       (companyId, title, tagline, body, minAge, maxAge, pdfUrl, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [
        Number(companyId),
        title,
        tagline || null,
        finalBody,
        minAge !== undefined && minAge !== null && minAge !== "" ? Number(minAge) : null,
        maxAge !== undefined && maxAge !== null && maxAge !== "" ? Number(maxAge) : null,
        pdfUrl || null,
      ]
    );

    const [templateRows] = await db.query(
      `SELECT 
         t.*,
         c.id AS company_id,
         c.code AS company_code,
         c.name AS company_name
       FROM \`Template\` t
       JOIN \`Company\` c ON c.id = t.companyId
       WHERE t.id = ?
       LIMIT 1`,
      [result.insertId]
    );

    const template = templateRows[0];

    return res.status(201).json({
      message: "Template created successfully.",
      template: {
        ...template,
        isActive: Boolean(template.isActive),
        company: {
          id: template.company_id,
          code: template.company_code,
          name: template.company_name,
        },
      },
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
    const offset = (page - 1) * limit;

    const search = req.query.search || "";
    const companyId =
      req.query.companyId && req.query.companyId !== "ALL"
        ? Number(req.query.companyId)
        : null;

    const whereParts = [];
    const params = [];

    if (companyId) {
      whereParts.push("t.companyId = ?");
      params.push(companyId);
    }

    if (search) {
      whereParts.push("(t.title LIKE ? OR t.tagline LIKE ? OR c.name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    const [templates] = await db.query(
      `SELECT 
         t.*,
         c.id AS company_id,
         c.code AS company_code,
         c.name AS company_name
       FROM \`Template\` t
       JOIN \`Company\` c ON c.id = t.companyId
       ${whereSql}
       ORDER BY t.createdAt DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM \`Template\` t
       JOIN \`Company\` c ON c.id = t.companyId
       ${whereSql}`,
      params
    );

    const total = countRows[0].total;

    const formattedTemplates = templates.map((template) => ({
      id: template.id,
      companyId: template.companyId,
      title: template.title,
      tagline: template.tagline,
      body: template.body,
      minAge: template.minAge,
      maxAge: template.maxAge,
      pdfUrl: template.pdfUrl,
      isActive: Boolean(template.isActive),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      company: {
        id: template.company_id,
        code: template.company_code,
        name: template.company_name,
      },
    }));

    return res.status(200).json({
      message: "Templates fetched successfully.",
      templates: formattedTemplates,
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

export const updateTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { companyId, title, tagline, body, minAge, maxAge, pdfUrl } = req.body;

    if (!companyId || !title) {
      return res.status(400).json({
        message: "Company and title are required.",
      });
    }

    const [templateRows] = await db.query(
      `SELECT id FROM \`Template\` WHERE id = ? LIMIT 1`,
      [Number(templateId)]
    );

    if (templateRows.length === 0) {
      return res.status(404).json({ message: "Template not found." });
    }

    const [companyRows] = await db.query(
      `SELECT id, isActive FROM \`Company\` WHERE id = ? LIMIT 1`,
      [Number(companyId)]
    );

    if (companyRows.length === 0 || !companyRows[0].isActive) {
      return res.status(400).json({
        message: "Invalid company selected.",
      });
    }

    await db.query(
      `UPDATE \`Template\`
       SET companyId = ?,
           title = ?,
           tagline = ?,
           body = ?,
           minAge = ?,
           maxAge = ?,
           pdfUrl = ?,
           updatedAt = NOW()
       WHERE id = ?`,
      [
        Number(companyId),
        title,
        tagline || null,
        body?.trim() ? body.trim() : DEFAULT_TEMPLATE_BODY,
        minAge !== undefined && minAge !== null && minAge !== "" ? Number(minAge) : null,
        maxAge !== undefined && maxAge !== null && maxAge !== "" ? Number(maxAge) : null,
        pdfUrl || null,
        Number(templateId),
      ]
    );

    const [updatedRows] = await db.query(
      `SELECT 
         t.*,
         c.id AS company_id,
         c.code AS company_code,
         c.name AS company_name
       FROM \`Template\` t
       JOIN \`Company\` c ON c.id = t.companyId
       WHERE t.id = ?
       LIMIT 1`,
      [Number(templateId)]
    );

    const updatedTemplate = updatedRows[0];

    return res.status(200).json({
      message: "Template updated successfully.",
      template: {
        id: updatedTemplate.id,
        companyId: updatedTemplate.companyId,
        title: updatedTemplate.title,
        tagline: updatedTemplate.tagline,
        body: updatedTemplate.body,
        minAge: updatedTemplate.minAge,
        maxAge: updatedTemplate.maxAge,
        pdfUrl: updatedTemplate.pdfUrl,
        isActive: Boolean(updatedTemplate.isActive),
        createdAt: updatedTemplate.createdAt,
        updatedAt: updatedTemplate.updatedAt,
        company: {
          id: updatedTemplate.company_id,
          code: updatedTemplate.company_code,
          name: updatedTemplate.company_name,
        },
      },
    });
  } catch (error) {
    console.error("updateTemplate error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const toggleTemplateStatus = async (req, res) => {
  try {
    const { templateId } = req.params;

    const [templateRows] = await db.query(
      `SELECT id, isActive FROM \`Template\` WHERE id = ? LIMIT 1`,
      [Number(templateId)]
    );

    if (templateRows.length === 0) {
      return res.status(404).json({ message: "Template not found." });
    }

    const newStatus = templateRows[0].isActive ? 0 : 1;

    await db.query(
      `UPDATE \`Template\` SET isActive = ?, updatedAt = NOW()
       WHERE id = ?`,
      [newStatus, Number(templateId)]
    );

    const [updatedRows] = await db.query(
      `SELECT * FROM \`Template\` WHERE id = ? LIMIT 1`,
      [Number(templateId)]
    );

    return res.status(200).json({
      message: `Template ${newStatus ? "activated" : "deactivated"} successfully.`,
      template: {
        ...updatedRows[0],
        isActive: Boolean(updatedRows[0].isActive),
      },
    });
  } catch (error) {
    console.error("toggleTemplateStatus error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;

    const [templateRows] = await db.query(
      `SELECT id FROM \`Template\` WHERE id = ? LIMIT 1`,
      [Number(templateId)]
    );

    if (templateRows.length === 0) {
      return res.status(404).json({ message: "Template not found." });
    }

    const [usageRows] = await db.query(
      `SELECT COUNT(*) AS count
       FROM \`LeadActivity\`
       WHERE templateId = ?`,
      [Number(templateId)]
    );

    if (usageRows[0].count > 0) {
      return res.status(400).json({
        message: "This template has been used already. Deactivate it instead of deleting.",
      });
    }

    await db.query(
      `DELETE FROM \`Template\` WHERE id = ?`,
      [Number(templateId)]
    );

    return res.status(200).json({
      message: "Template deleted successfully.",
    });
  } catch (error) {
    console.error("deleteTemplate error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

/* =========================
   PERFORMANCE
========================= */

export const getAdvisorPerformance = async (req, res) => {
  try {
    const [advisors] = await db.query(
      `SELECT id, name, phone, isActive, createdAt
       FROM \`User\`
       WHERE role = 'ADVISOR'
       ORDER BY createdAt DESC`
    );

    const [leadRows] = await db.query(
      `SELECT id, assignedToId, status, nextFollowUpAt
       FROM \`Lead\`
       WHERE assignedToId IS NOT NULL`
    );

    const [activityRows] = await db.query(
      `SELECT la.id, la.leadId, la.activityType, la.note, la.createdAt, l.assignedToId
       FROM \`LeadActivity\` la
       JOIN \`Lead\` l ON l.id = la.leadId
       ORDER BY la.createdAt DESC`
    );

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const leadsByAdvisor = leadRows.reduce((acc, lead) => {
      if (!acc[lead.assignedToId]) acc[lead.assignedToId] = [];
      acc[lead.assignedToId].push(lead);
      return acc;
    }, {});

    const activitiesByAdvisor = activityRows.reduce((acc, activity) => {
      if (!acc[activity.assignedToId]) acc[activity.assignedToId] = [];
      acc[activity.assignedToId].push(activity);
      return acc;
    }, {});

    const performance = advisors.map((advisor) => {
      const leads = leadsByAdvisor[advisor.id] || [];

      const totalLeads = leads.length;
      const newLeads = leads.filter((lead) => lead.status === "NEW").length;
      const followUpLeads = leads.filter((lead) => lead.status === "FOLLOW_UP").length;
      const interestedLeads = leads.filter((lead) => lead.status === "INTERESTED").length;
      const convertedLeads = leads.filter((lead) => lead.status === "CONVERTED").length;
      const closedLeads = leads.filter((lead) =>
        ["CLOSED", "NOT_INTERESTED"].includes(lead.status)
      ).length;

      const todayFollowUps = leads.filter((lead) => {
        if (!lead.nextFollowUpAt) return false;
        const followDate = new Date(lead.nextFollowUpAt);
        return followDate >= todayStart && followDate <= todayEnd;
      }).length;

      const advisorActivities = activitiesByAdvisor[advisor.id] || [];
      const lastActivity = advisorActivities[0] || null;

      const conversionRate =
        totalLeads > 0
          ? Number(((convertedLeads / totalLeads) * 100).toFixed(1))
          : 0;

      const performanceScore =
        convertedLeads * 5 +
        interestedLeads * 3 +
        followUpLeads * 1 +
        totalLeads * 0.25;

      return {
        id: advisor.id,
        name: advisor.name,
        phone: advisor.phone,
        isActive: Boolean(advisor.isActive),
        totalLeads,
        newLeads,
        followUpLeads,
        interestedLeads,
        convertedLeads,
        closedLeads,
        todayFollowUps,
        conversionRate,
        performanceScore,
        lastActivity: lastActivity
          ? {
              activityType: lastActivity.activityType,
              note: lastActivity.note || "",
              createdAt: lastActivity.createdAt,
            }
          : null,
      };
    });

    const teamSummary = {
      totalAdvisors: performance.length,
      activeAdvisors: performance.filter((item) => item.isActive).length,
      totalLeads: performance.reduce((sum, item) => sum + item.totalLeads, 0),
      totalConverted: performance.reduce((sum, item) => sum + item.convertedLeads, 0),
    };

    return res.status(200).json({
      message: "Advisor performance fetched successfully.",
      summary: teamSummary,
      advisors: performance,
    });
  } catch (error) {
    console.error("getAdvisorPerformance error:", error);
    return res.status(500).json({
      message: "Server error.",
    });
  }
};

export const getAdvisorLeadsForAdmin = async (req, res) => {
  try {
    const { advisorId } = req.params;

    const [advisorRows] = await db.query(
      `SELECT id, name, phone, role, isActive
       FROM \`User\`
       WHERE id = ?
       LIMIT 1`,
      [Number(advisorId)]
    );

    if (advisorRows.length === 0 || advisorRows[0].role !== "ADVISOR") {
      return res.status(404).json({ message: "Advisor not found." });
    }

    const advisor = {
      ...advisorRows[0],
      isActive: Boolean(advisorRows[0].isActive),
    };

    const [leadRows] = await db.query(
      `SELECT 
         l.id,
         l.name,
         l.phone,
         l.altPhone,
         l.age,
         l.city,
         l.status,
         l.remarks,
         l.nextFollowUpAt,
         l.createdAt,
         c.id AS company_id,
         c.code AS company_code,
         c.name AS company_name
       FROM \`Lead\` l
       LEFT JOIN \`Company\` c ON c.id = l.companyId
       WHERE l.assignedToId = ?
       ORDER BY l.createdAt DESC`,
      [Number(advisorId)]
    );

    const leadIds = leadRows.map((lead) => lead.id);

    let latestActivityByLead = {};

    if (leadIds.length > 0) {
      const [activities] = await db.query(
        `SELECT la.*
         FROM \`LeadActivity\` la
         INNER JOIN (
           SELECT leadId, MAX(createdAt) AS maxCreatedAt
           FROM \`LeadActivity\`
           WHERE leadId IN (?)
           GROUP BY leadId
         ) latest
         ON latest.leadId = la.leadId
         AND latest.maxCreatedAt = la.createdAt`,
        [leadIds]
      );

      latestActivityByLead = activities.reduce((acc, activity) => {
        acc[activity.leadId] = {
          id: activity.id,
          activityType: activity.activityType,
          note: activity.note,
          createdAt: activity.createdAt,
        };
        return acc;
      }, {});
    }

    const formattedLeads = leadRows.map((lead) => ({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      altPhone: lead.altPhone,
      age: lead.age,
      city: lead.city,
      status: lead.status,
      remarks: lead.remarks,
      nextFollowUpAt: lead.nextFollowUpAt,
      createdAt: lead.createdAt,
      company: lead.company_id
        ? {
            id: lead.company_id,
            code: lead.company_code,
            name: lead.company_name,
          }
        : null,
      lastActivity: latestActivityByLead[lead.id] || null,
    }));

    return res.status(200).json({
      message: "Advisor leads fetched successfully.",
      advisor,
      leads: formattedLeads,
    });
  } catch (error) {
    console.error("getAdvisorLeadsForAdmin error:", error);
    return res.status(500).json({
      message: "Server error.",
    });
  }
};