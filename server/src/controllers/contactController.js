import prisma from "../config/prisma.js";

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

export const createContact = async (req, res) => {
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

    const contact = await prisma.contact.create({
      data: {
        name: name || "Unnamed contact",
        phone,
        altPhone: altPhone || null,
        age: age !== undefined && age !== null && age !== "" ? Number(age) : null,
        city: city || null,
        sourceNote: sourceNote || null,
        tags: normalizeTags(tags),
        importSource: importSource || "MANUAL",
        createdById: req.user.id,
      },
    });

    await prisma.leadActivity.create({
      data: {
        contactId: contact.id,
        advisorId: req.user.id,
        activityType: "CONTACT_CREATED",
        sourcePage: "CONTACTS_PAGE",
        note: "Contact created",
      },
    });

    return res.status(201).json({
      message: "Contact created successfully.",
      contact,
    });
  } catch (error) {
    console.error("createContact error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const getContacts = async (req, res) => {
  try {
    const { search, advisorId, source, batchId, actionStatus, tag } = req.query;

    const baseWhere =
      req.user.role === "ADMIN"
        ? { isDeleted: false }
        : { createdById: req.user.id, isDeleted: false };

    const contacts = await prisma.contact.findMany({
      where: {
        ...baseWhere,

        ...(advisorId && req.user.role === "ADMIN"
          ? { createdById: Number(advisorId) }
          : {}),

        ...(source && source !== "ALL" ? { importSource: source } : {}),

        ...(batchId && batchId !== "ALL" ? { importBatchId: batchId } : {}),

        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { phone: { contains: search } },
                { city: { contains: search } },
                { importBatchId: { contains: search } },
              ],
            }
          : {}),
      },

      orderBy: {
        createdAt: "desc",
      },

      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
        lead: {
          select: {
            id: true,
            status: true,
            companyId: true,
            assignedToId: true,
          },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            activityType: true,
            createdAt: true,
          },
        },
      },
    });

    let formatted = contacts.map((c) => {
      const hasWhatsApp = c.activities.some(
        (a) => a.activityType === "WHATSAPP"
      );

      const hasCall = c.activities.some((a) => a.activityType === "CALL");

      let actionStatusValue = "NONE";
      if (hasWhatsApp && hasCall) actionStatusValue = "BOTH";
      else if (hasWhatsApp) actionStatusValue = "WHATSAPP";
      else if (hasCall) actionStatusValue = "CALL";

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        altPhone: c.altPhone,
        age: c.age,
        city: c.city,
        sourceNote: c.sourceNote,
        tags: Array.isArray(c.tags) ? c.tags : [],
        importSource: c.importSource,
        importBatchId: c.importBatchId,
        createdAt: c.createdAt,

        hasLead: !!c.lead,
        actionStatus: actionStatusValue,
        lastActivity: c.activities[0] || null,

        advisor: c.createdBy
          ? {
              id: c.createdBy.id,
              name: c.createdBy.name,
              phone: c.createdBy.phone,
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

export const updateContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { name, phone, altPhone, age, city, sourceNote, tags } = req.body;

    const contact = await prisma.contact.findUnique({
      where: { id: Number(contactId) },
    });

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

    const updatedContact = await prisma.contact.update({
      where: { id: Number(contactId) },
      data: {
        name: name || "Unnamed Contact",
        phone,
        altPhone: altPhone || null,
        age: age !== undefined && age !== null && age !== "" ? Number(age) : null,
        city: city || null,
        sourceNote: sourceNote || null,
        ...(tags !== undefined ? { tags: normalizeTags(tags) } : {}),
      },
    });

    return res.status(200).json({
      message: "Contact updated successfully.",
      contact: updatedContact,
    });
  } catch (error) {
    console.error("updateContact error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const deleteContact = async (req, res) => {
  try {
    const { contactId } = req.params;

    const contact = await prisma.contact.findUnique({
      where: { id: Number(contactId) },
    });

    if (!contact || contact.isDeleted) {
      return res.status(404).json({ message: "Contact not found." });
    }

    if (req.user.role !== "ADMIN" && contact.createdById !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to delete this contact.",
      });
    }

    await prisma.contact.update({
      where: { id: Number(contactId) },
      data: {
        isDeleted: true,
      },
    });

    return res.status(200).json({
      message: "Contact deleted successfully.",
    });
  } catch (error) {
    console.error("deleteContact error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const importContacts = async (req, res) => {
  try {
    const { contacts } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        message: "contacts array is required.",
      });
    }

    const batchId = `BATCH-${Date.now()}`;
    let importedCount = 0;
    let skippedCount = 0;

    for (const row of contacts) {
      const phone = String(row.phone || "").replace(/\D/g, "").slice(-10);

      if (!phone || phone.length !== 10) {
        skippedCount++;
        continue;
      }

      await prisma.contact.create({
        data: {
          name: row.name || "Unnamed Contact",
          phone,
          altPhone: row.altPhone
            ? String(row.altPhone).replace(/\D/g, "").slice(-10)
            : null,
          age:
            row.age !== undefined && row.age !== null && row.age !== ""
              ? Number(row.age)
              : null,
          city: row.city || null,
          sourceNote: row.sourceNote || "Imported from Excel",
          tags: normalizeTags(row.tags || row.tag),
          importSource: "EXCEL",
          importBatchId: batchId,
          createdById: req.user.id,
        },
      });

      importedCount++;
    }

    return res.status(201).json({
      message: "Contacts imported successfully.",
      batchId,
      totalRows: contacts.length,
      importedCount,
      skippedCount,
    });
  } catch (error) {
    console.error("importContacts error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const bulkDeleteContacts = async (req, res) => {
  try {
    const { contactIds } = req.body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({
        message: "contactIds are required.",
      });
    }

    const numericIds = contactIds.map(Number);

    await prisma.contact.updateMany({
      where: {
        id: { in: numericIds },
        ...(req.user.role === "ADMIN" ? {} : { createdById: req.user.id }),
        isDeleted: false,
      },
      data: {
        isDeleted: true,
      },
    });

    return res.status(200).json({
      message: "Selected contacts deleted successfully.",
    });
  } catch (error) {
    console.error("bulkDeleteContacts error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const getContactBatches = async (req, res) => {
  try {
    const batches = await prisma.contact.groupBy({
      by: ["importBatchId"],
      where: {
        isDeleted: false,
        importBatchId: { not: null },
        ...(req.user.role === "ADMIN" ? {} : { createdById: req.user.id }),
      },
      _count: {
        id: true,
      },
      _max: {
        createdAt: true,
      },
    });

    return res.status(200).json({
      message: "Contact batches fetched successfully.",
      batches: batches.map((batch) => ({
        batchId: batch.importBatchId,
        count: batch._count.id,
        latestCreatedAt: batch._max.createdAt,
      })),
    });
  } catch (error) {
    console.error("getContactBatches error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const convertContactToLead = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { companyId, remarks, nextFollowUpAt } = req.body;

    const contact = await prisma.contact.findUnique({
      where: { id: Number(contactId) },
      include: {
        lead: true,
      },
    });

    if (!contact || contact.isDeleted) {
      return res.status(404).json({ message: "Contact not found." });
    }

    if (req.user.role !== "ADMIN" && contact.createdById !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to convert this contact.",
      });
    }

    if (contact.lead) {
      return res.status(400).json({
        message: "This contact is already converted into a lead.",
      });
    }

    const numericCompanyId =
      companyId !== undefined && companyId !== null && companyId !== ""
        ? Number(companyId)
        : null;

    if (req.user.role === "ADVISOR" && numericCompanyId) {
      const advisor = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          advisorCompanies: {
            select: {
              companyId: true,
            },
          },
        },
      });

      const allowedCompanyIds = advisor.advisorCompanies.map(
        (item) => item.companyId
      );

      if (!allowedCompanyIds.includes(numericCompanyId)) {
        return res.status(403).json({
          message: "You are not allowed to use this company for conversion.",
        });
      }
    }

    const lead = await prisma.lead.create({
      data: {
        name: contact.name,
        phone: contact.phone,
        altPhone: contact.altPhone,
        age: contact.age,
        city: contact.city,
        companyId: numericCompanyId,
        remarks: remarks || null,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
        contactId: contact.id,
        createdById: req.user.id,
        assignedToId: req.user.id,
      },
      include: {
        company: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        contactId: contact.id,
        advisorId: req.user.id,
        companyId: numericCompanyId,
        activityType: "LEAD_CREATED",
        sourcePage: "CONTACTS_PAGE",
        note: remarks || "Contact converted to lead",
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
      },
    });

    return res.status(201).json({
      message: "Contact converted to lead successfully.",
      lead,
    });
  } catch (error) {
    console.error("convertContactToLead error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

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

    const contact = await prisma.contact.findUnique({
      where: { id: Number(contactId) },
      include: {
        lead: true,
      },
    });

    if (!contact || contact.isDeleted) {
      return res.status(404).json({ message: "Contact not found." });
    }

    if (req.user.role !== "ADMIN" && contact.createdById !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to add activity to this contact.",
      });
    }

    const activity = await prisma.leadActivity.create({
      data: {
        contactId: Number(contactId),
        leadId: contact.lead?.id || null,
        advisorId: req.user.id,
        companyId:
          companyId !== undefined && companyId !== null && companyId !== ""
            ? Number(companyId)
            : null,
        templateId:
          templateId !== undefined && templateId !== null && templateId !== ""
            ? Number(templateId)
            : null,
        activityType,
        sourcePage: "CONTACTS_PAGE",
        note: note || null,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
      },
      include: {
        company: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        template: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: "Contact activity added successfully.",
      activity,
    });
  } catch (error) {
    console.error("addContactActivity error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};