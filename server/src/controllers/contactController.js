import { db } from "../config/db.js";

/* =========================
   HELPERS
========================= */

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === "string" && tags.trim()) {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

/* =========================
   CREATE CONTACT
========================= */

export const createContact = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      name,
      phone,
      altPhone,
      age,
      city,
      sourceNote,
      importSource,
      tags,
    } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone is required." });
    }

    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO Contact
       (name, phone, altPhone, age, city, sourceNote, tags, importSource, createdById, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        name || "Unnamed contact",
        phone,
        altPhone || null,
        age ? Number(age) : null,
        city || null,
        sourceNote || null,
        JSON.stringify(normalizeTags(tags)),
        importSource || "MANUAL",
        req.user.id,
      ]
    );

    const contactId = result.insertId;

    await connection.query(
      `INSERT INTO  \`LeadActivity\`
       (contactId, advisorId, activityType, sourcePage, note, createdAt)
       VALUES (?, ?, 'CONTACT_CREATED', 'CONTACTS_PAGE', 'Contact created', NOW())`,
      [contactId, req.user.id]
    );

    await connection.commit();

    return res.status(201).json({
      message: "Contact created successfully.",
      contactId,
    });

  } catch (error) {
    await connection.rollback();
    console.error("createContact error:", error);
    return res.status(500).json({ message: "Server error." });
  } finally {
    connection.release();
  }
};

const parseTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;

  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/* =========================
   GET CONTACTS
========================= */

export const getContacts = async (req, res) => {
  try {
    const { search, advisorId, source, batchId, actionStatus, tag } = req.query;

    const whereParts = ["c.isDeleted = 0"];
    const params = [];

    if (req.user.role !== "ADMIN") {
      whereParts.push("c.createdById = ?");
      params.push(req.user.id);
    }

    if (advisorId && req.user.role === "ADMIN") {
      whereParts.push("c.createdById = ?");
      params.push(Number(advisorId));
    }

    if (source && source !== "ALL") {
      whereParts.push("c.importSource = ?");
      params.push(source);
    }

    if (batchId && batchId !== "ALL") {
      whereParts.push("c.importBatchId = ?");
      params.push(batchId);
    }

    if (search) {
      whereParts.push(
        `(c.name LIKE ? OR c.phone LIKE ? OR c.city LIKE ? OR c.importBatchId LIKE ?)`
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = `WHERE ${whereParts.join(" AND ")}`;

    const [contacts] = await db.query(
      `SELECT
         c.*,

         u.id AS advisor_id,
         u.name AS advisor_name,
         u.phone AS advisor_phone,
         u.role AS advisor_role,

         l.id AS lead_id,
         l.status AS lead_status,
         l.companyId AS lead_companyId,
         l.assignedToId AS lead_assignedToId

       FROM Contact c
       LEFT JOIN \`User\` u ON u.id = c.createdById
       LEFT JOIN \`Lead\` l ON l.contactId = c.id
       ${whereSql}
       ORDER BY c.createdAt DESC`,
      params
    );

    const contactIds = contacts.map((c) => c.id);

    let activitiesByContact = {};

    if (contactIds.length > 0) {
      const [activities] = await db.query(
        `SELECT contactId, activityType, createdAt
         FROM \`LeadActivity\`
         WHERE contactId IN (?)
         ORDER BY createdAt DESC`,
        [contactIds]
      );

      activitiesByContact = activities.reduce((acc, activity) => {
        if (!acc[activity.contactId]) acc[activity.contactId] = [];
        if (acc[activity.contactId].length < 5) {
          acc[activity.contactId].push(activity);
        }
        return acc;
      }, {});
    }

    let formatted = contacts.map((c) => {
      const activities = activitiesByContact[c.id] || [];

      const hasWhatsApp = activities.some(
        (a) => a.activityType === "WHATSAPP"
      );

      const hasCall = activities.some((a) => a.activityType === "CALL");

      let actionStatusValue = "NONE";
      if (hasWhatsApp && hasCall) actionStatusValue = "BOTH";
      else if (hasWhatsApp) actionStatusValue = "WHATSAPP";
      else if (hasCall) actionStatusValue = "CALL";

      const contactTags = parseTags(c.tags);

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        altPhone: c.altPhone,
        age: c.age,
        city: c.city,
        sourceNote: c.sourceNote,
        tags: contactTags,
        importSource: c.importSource,
        importBatchId: c.importBatchId,
        createdAt: c.createdAt,

        hasLead: !!c.lead_id,
        actionStatus: actionStatusValue,
        lastActivity: activities[0] || null,

        advisor: c.advisor_id
          ? {
              id: c.advisor_id,
              name: c.advisor_name,
              phone: c.advisor_phone,
            }
          : null,
      };
    });

    if (actionStatus && actionStatus !== "ALL") {
      formatted = formatted.filter(
        (contact) => contact.actionStatus === actionStatus
      );
    }

    if (tag && tag !== "ALL") {
      formatted = formatted.filter((contact) =>
        contact.tags?.includes(tag)
      );
    }

    return res.status(200).json({
      message: "Contacts fetched successfully.",
      contacts: formatted,
    });
  } catch (error) {
    console.error("getContacts error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

/* =========================
   UPDATE CONTACT
========================= */

export const updateContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { name, phone, altPhone, age, city, sourceNote, tags } = req.body;

    const [contactRows] = await db.query(
      `SELECT * FROM Contact WHERE id = ? LIMIT 1`,
      [Number(contactId)]
    );

    const contact = contactRows[0];

    if (!contact || contact.isDeleted) {
      return res.status(404).json({ message: "Contact not found." });
    }

    if (req.user.role !== "ADMIN" && contact.createdById !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to update this contact.",
      });
    }

    if (!phone) {
      return res.status(400).json({ message: "Phone is required." });
    }

    const finalTags =
      tags !== undefined ? JSON.stringify(normalizeTags(tags)) : contact.tags;

    await db.query(
      `UPDATE Contact
       SET name = ?,
           phone = ?,
           altPhone = ?,
           age = ?,
           city = ?,
           sourceNote = ?,
           tags = ?,
           updatedAt = NOW()
       WHERE id = ?`,
      [
        name || "Unnamed Contact",
        phone,
        altPhone || null,
        age !== undefined && age !== null && age !== "" ? Number(age) : null,
        city || null,
        sourceNote || null,
        finalTags,
        Number(contactId),
      ]
    );

    const [updatedRows] = await db.query(
      `SELECT * FROM Contact WHERE id = ? LIMIT 1`,
      [Number(contactId)]
    );

    return res.status(200).json({
      message: "Contact updated successfully.",
      contact: {
        ...updatedRows[0],
        tags: parseTags(updatedRows[0].tags),
      },
    });
  } catch (error) {
    console.error("updateContact error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

/* =========================
   DELETE CONTACT
========================= */

export const deleteContact = async (req, res) => {
  try {
    const { contactId } = req.params;

    const [contactRows] = await db.query(
      `SELECT * FROM Contact WHERE id = ? LIMIT 1`,
      [Number(contactId)]
    );

    const contact = contactRows[0];

    if (!contact || contact.isDeleted) {
      return res.status(404).json({ message: "Contact not found." });
    }

    if (req.user.role !== "ADMIN" && contact.createdById !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to delete this contact.",
      });
    }

    await db.query(
      `UPDATE Contact
       SET isDeleted = 1, updatedAt = NOW()
       WHERE id = ?`,
      [Number(contactId)]
    );

    return res.status(200).json({
      message: "Contact deleted successfully.",
    });
  } catch (error) {
    console.error("deleteContact error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

/* =========================
   IMPORT CONTACTS
========================= */

export const importContacts = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { contacts, batchName, tags } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
  connection.release();
  return res.status(400).json({
    message: "contacts array is required.",
  });
}

    const batchId = `BATCH-${Date.now()}`;
    
    let importedCount = 0;
    let skippedCount = 0;

    await connection.beginTransaction();
    await connection.query(
  `INSERT INTO ContactImportBatch
   (batchId, batchName, tags, createdById, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, NOW(), NOW())`,
  [
    batchId,
    batchName || `Imported Batch ${new Date().toLocaleDateString("en-IN")}`,
    JSON.stringify(normalizeTags(tags)),
    req.user.id,
  ]
);

    for (const row of contacts) {
      const phone = String(row.phone || "").replace(/\D/g, "").slice(-10);

      if (!phone || phone.length !== 10) {
        skippedCount++;
        continue;
      }

      await connection.query(
        `INSERT INTO Contact
         (name, phone, altPhone, age, city, sourceNote, tags, importSource, importBatchId, createdById, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'EXCEL', ?, ?, NOW(), NOW())`,
        [
          row.name || "Unnamed Contact",
          phone,
          row.altPhone ? String(row.altPhone).replace(/\D/g, "").slice(-10) : null,
          row.age !== undefined && row.age !== null && row.age !== ""
            ? Number(row.age)
            : null,
          row.city || null,
          row.sourceNote || "Imported from Excel",
          JSON.stringify(normalizeTags(row.tags || row.tag)),
          batchId,
          req.user.id,
        ]
      );

      importedCount++;
    }

    await connection.commit();

    return res.status(201).json({
      message: "Contacts imported successfully.",
      batchId,
      totalRows: contacts.length,
      importedCount,
      skippedCount,
    });
  } catch (error) {
    await connection.rollback();
    console.error("importContacts error:", error);
    return res.status(500).json({ message: "Server error." });
  } finally {
    connection.release();
  }
};

/* =========================
   BULK DELETE CONTACTS
========================= */

export const bulkDeleteContacts = async (req, res) => {
  try {
    const { contactIds } = req.body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({
        message: "contactIds are required.",
      });
    }

    const numericIds = contactIds.map(Number).filter(Boolean);

    if (numericIds.length === 0) {
      return res.status(400).json({
        message: "Valid contactIds are required.",
      });
    }

    const whereParts = ["id IN (?)", "isDeleted = 0"];
    const params = [numericIds];

    if (req.user.role !== "ADMIN") {
      whereParts.push("createdById = ?");
      params.push(req.user.id);
    }

    await db.query(
      `UPDATE Contact
       SET isDeleted = 1, updatedAt = NOW()
       WHERE ${whereParts.join(" AND ")}`,
      params
    );

    return res.status(200).json({
      message: "Selected contacts deleted successfully.",
    });
  } catch (error) {
    console.error("bulkDeleteContacts error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

/* =========================
   CONTACT BATCHES
========================= */

export const getContactBatches = async (req, res) => {
  try {
    const whereParts = ["isDeleted = 0", "c.importBatchId IS NOT NULL"];
    const params = [];

    if (req.user.role !== "ADMIN") {
      whereParts.push("c.createdById = ?");
      params.push(req.user.id);
    }

    const [batches] = await db.query(
      `SELECT 
         c.importBatchId AS batchId,
         b.batchName,
         b.tags,
         COUNT(c.id) AS count,
         MAX(c.createdAt) AS latestCreatedAt
       FROM Contact c
       LEFT JOIN ContactImportBatch b 
         ON c.importBatchId = b.batchId
       WHERE ${whereParts.join(" AND ")}
       GROUP BY c.importBatchId, b.batchName, b.tags
       ORDER BY latestCreatedAt DESC`,
      params
    );

    return res.status(200).json({
      message: "Contact batches fetched successfully.",
      batches,
    });
  } catch (error) {
    console.error("getContactBatches error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

/* =========================
   CONVERT CONTACT TO LEAD
========================= */

export const convertContactToLead = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { contactId } = req.params;
    const { companyId, remarks, nextFollowUpAt } = req.body;

    const [contactRows] = await connection.query(
      `SELECT 
         c.*,
         l.id AS existingLeadId
       FROM Contact c
       LEFT JOIN \`Lead\` l ON l.contactId = c.id
       WHERE c.id = ?
       LIMIT 1`,
      [Number(contactId)]
    );

    const contact = contactRows[0];

    if (!contact || contact.isDeleted) {
      return res.status(404).json({ message: "Contact not found." });
    }

    if (req.user.role !== "ADMIN" && contact.createdById !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to convert this contact.",
      });
    }

    if (contact.existingLeadId) {
      return res.status(400).json({
        message: "This contact is already converted into a lead.",
      });
    }

    const numericCompanyId =
      companyId !== undefined && companyId !== null && companyId !== ""
        ? Number(companyId)
        : null;

    if (req.user.role === "ADVISOR" && numericCompanyId) {
      const [allowedRows] = await connection.query(
        `SELECT companyId
         FROM AdvisorCompany
         WHERE advisorId = ?`,
        [req.user.id]
      );

      const allowedCompanyIds = allowedRows.map((item) => item.companyId);

      if (!allowedCompanyIds.includes(numericCompanyId)) {
        return res.status(403).json({
          message: "You are not allowed to use this company for conversion.",
        });
      }
    }

    await connection.beginTransaction();

    const [leadResult] = await connection.query(
      `INSERT INTO \`Lead\`
       (name, phone, altPhone, age, city, companyId, remarks, nextFollowUpAt, contactId, createdById, assignedToId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        contact.name,
        contact.phone,
        contact.altPhone,
        contact.age,
        contact.city,
        numericCompanyId,
        remarks || null,
        nextFollowUpAt ? new Date(nextFollowUpAt) : null,
        contact.id,
        req.user.id,
        req.user.id,
      ]
    );

    const leadId = leadResult.insertId;

    await connection.query(
      `INSERT INTO  \`LeadActivity\`
       (leadId, contactId, advisorId, companyId, activityType, sourcePage, note, nextFollowUpAt, createdAt)
       VALUES (?, ?, ?, ?, 'LEAD_CREATED', 'CONTACTS_PAGE', ?, ?, NOW())`,
      [
        leadId,
        contact.id,
        req.user.id,
        numericCompanyId,
        remarks || "Contact converted to lead",
        nextFollowUpAt ? new Date(nextFollowUpAt) : null,
      ]
    );

    await connection.commit();

    const [leadRows] = await db.query(
      `SELECT 
         l.*,
         c.id AS company_id,
         c.code AS company_code,
         c.name AS company_name,
         u.id AS assigned_id,
         u.name AS assigned_name,
         u.phone AS assigned_phone,
         u.role AS assigned_role
       FROM \`Lead\` l
       LEFT JOIN \`Company\` c ON c.id = l.companyId
       LEFT JOIN \`User\` u ON u.id = l.assignedToId
       WHERE l.id = ?
       LIMIT 1`,
      [leadId]
    );

    const lead = leadRows[0];

    return res.status(201).json({
      message: "Contact converted to lead successfully.",
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        altPhone: lead.altPhone,
        age: lead.age,
        city: lead.city,
        companyId: lead.companyId,
        remarks: lead.remarks,
        nextFollowUpAt: lead.nextFollowUpAt,
        contactId: lead.contactId,
        createdById: lead.createdById,
        assignedToId: lead.assignedToId,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        company: lead.company_id
          ? {
              id: lead.company_id,
              code: lead.company_code,
              name: lead.company_name,
            }
          : null,
        assignedTo: lead.assigned_id
          ? {
              id: lead.assigned_id,
              name: lead.assigned_name,
              phone: lead.assigned_phone,
              role: lead.assigned_role,
            }
          : null,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("convertContactToLead error:", error);
    return res.status(500).json({ message: "Server error." });
  } finally {
    connection.release();
  }
};

/* =========================
   ADD CONTACT ACTIVITY
========================= */

export const addContactActivity = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { activityType, companyId, templateId, note, nextFollowUpAt } =
      req.body;

    if (!activityType) {
      return res.status(400).json({
        message: "activityType is required.",
      });
    }

    const [contactRows] = await db.query(
      `SELECT 
         c.*,
         l.id AS lead_id
       FROM Contact c
       LEFT JOIN \`Lead\` l ON l.contactId = c.id
       WHERE c.id = ?
       LIMIT 1`,
      [Number(contactId)]
    );

    const contact = contactRows[0];

    if (!contact || contact.isDeleted) {
      return res.status(404).json({ message: "Contact not found." });
    }

    if (req.user.role !== "ADMIN" && contact.createdById !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to add activity to this contact.",
      });
    }

    const numericCompanyId =
      companyId !== undefined && companyId !== null && companyId !== ""
        ? Number(companyId)
        : null;

    const numericTemplateId =
      templateId !== undefined && templateId !== null && templateId !== ""
        ? Number(templateId)
        : null;

    const [result] = await db.query(
      `INSERT INTO  \`LeadActivity\`
       (contactId, leadId, advisorId, companyId, templateId, activityType, sourcePage, note, nextFollowUpAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'CONTACTS_PAGE', ?, ?, NOW())`,
      [
        Number(contactId),
        contact.lead_id || null,
        req.user.id,
        numericCompanyId,
        numericTemplateId,
        activityType,
        note || null,
        nextFollowUpAt ? new Date(nextFollowUpAt) : null,
      ]
    );

    const [activityRows] = await db.query(
      `SELECT 
         la.*,
         c.id AS company_id,
         c.code AS company_code,
         c.name AS company_name,
         t.id AS template_id,
         t.title AS template_title
       FROM \`LeadActivity\` la
       LEFT JOIN \`Company\` c ON c.id = la.companyId
       LEFT JOIN Template t ON t.id = la.templateId
       WHERE la.id = ?
       LIMIT 1`,
      [result.insertId]
    );

    const activity = activityRows[0];

    return res.status(201).json({
      message: "Contact activity added successfully.",
      activity: {
        id: activity.id,
        contactId: activity.contactId,
        leadId: activity.leadId,
        advisorId: activity.advisorId,
        companyId: activity.companyId,
        templateId: activity.templateId,
        activityType: activity.activityType,
        sourcePage: activity.sourcePage,
        note: activity.note,
        nextFollowUpAt: activity.nextFollowUpAt,
        createdAt: activity.createdAt,
        updatedAt: activity.updatedAt,
        company: activity.company_id
          ? {
              id: activity.company_id,
              code: activity.company_code,
              name: activity.company_name,
            }
          : null,
        template: activity.template_id
          ? {
              id: activity.template_id,
              title: activity.template_title,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("addContactActivity error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};
export const renameContactBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { batchName } = req.body;

    if (!batchName || !batchName.trim()) {
      return res.status(400).json({
        message: "Batch name is required.",
      });
    }

    const whereParts = ["batchId = ?"];
    const params = [batchId];

    if (req.user.role !== "ADMIN") {
      whereParts.push("createdById = ?");
      params.push(req.user.id);
    }

    const [result] = await db.query(
      `UPDATE ContactImportBatch
       SET batchName = ?, updatedAt = NOW()
       WHERE ${whereParts.join(" AND ")}`,
      [batchName.trim(), ...params]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Batch not found.",
      });
    }

    return res.status(200).json({
      message: "Batch renamed successfully.",
    });
  } catch (error) {
    console.error("renameContactBatch error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};