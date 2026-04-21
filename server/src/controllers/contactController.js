import prisma from "../config/prisma.js";

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
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        message: "Name and phone are required.",
      });
    }

    const contact = await prisma.contact.create({
      data: {
        name,
        phone,
        altPhone: altPhone || null,
        age: age !== undefined && age !== null && age !== "" ? Number(age) : null,
        city: city || null,
        sourceNote: sourceNote || null,
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
    const whereClause =
      req.user.role === "ADMIN"
        ? {
            isDeleted: false,
          }
        : {
            createdById: req.user.id,
            isDeleted: false,
          };

    const contacts = await prisma.contact.findMany({
      where: whereClause,
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
      },
    });

    return res.status(200).json({
      message: "Contacts fetched successfully.",
      contacts,
    });
  } catch (error) {
    console.error("getContacts error:", error);
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

      const allowedCompanyIds = advisor.advisorCompanies.map((item) => item.companyId);

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
    const {
      activityType,
      companyId,
      templateId,
      note,
      nextFollowUpAt,
    } = req.body;

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