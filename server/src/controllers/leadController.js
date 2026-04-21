import prisma from "../config/prisma.js";

export const createLead = async (req, res) => {
  try {
    const {
      name,
      phone,
      altPhone,
      age,
      city,
      companyId,
      remarks,
      nextFollowUpAt,
      contactId,
      assignedToId,
      templateId,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        message: "Name and phone are required.",
      });
    }

    const numericCompanyId =
      companyId !== undefined && companyId !== null && companyId !== ""
        ? Number(companyId)
        : null;

    const numericContactId =
      contactId !== undefined && contactId !== null && contactId !== ""
        ? Number(contactId)
        : null;

    const numericTemplateId =
    templateId !== undefined && templateId !== null && templateId !== ""
      ? Number(templateId)
      : null;

    let finalAssignedToId = req.user.id;

    if (req.user.role === "ADMIN") {
      if (!assignedToId) {
        return res.status(400).json({
          message: "assignedToId is required for admin-created leads.",
        });
      }
      finalAssignedToId = Number(assignedToId);
    }

    if (req.user.role === "ADVISOR") {
      const advisor = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          advisorCompanies: {
            select: { companyId: true },
          },
        },
      });

      const allowedCompanyIds = advisor.advisorCompanies.map((item) => item.companyId);

      if (numericCompanyId && !allowedCompanyIds.includes(numericCompanyId)) {
        return res.status(403).json({
          message: "You are not allowed to create leads for this company.",
        });
      }
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        altPhone: altPhone || null,
        age: age !== undefined && age !== null && age !== "" ? Number(age) : null,
        city: city || null,
        companyId: numericCompanyId,
        remarks: remarks || null,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
        contactId: numericContactId,
        createdById: req.user.id,
        assignedToId: finalAssignedToId,
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
        contactId: numericContactId,
        advisorId: finalAssignedToId,
        companyId: numericCompanyId,
        templateId: numericTemplateId,
        activityType: "LEAD_CREATED",
        sourcePage: "DASHBOARD_PAGE",
        note: remarks || "Lead created",
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
      },
    });

    return res.status(201).json({
      message: "Lead created successfully.",
      lead,
    });
  } catch (error) {
    console.error("createLead error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const getLeads = async (req, res) => {
  try {
    const { search, status, companyId } = req.query;

    const whereClause = {
      ...(req.user.role === "ADMIN" ? {} : { assignedToId: req.user.id }),
      ...(status ? { status } : {}),
      ...(companyId ? { companyId: Number(companyId) } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search } },
              { city: { contains: search } },
            ],
          }
        : {}),
    };

    const leads = await prisma.lead.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
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
        createdBy: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Leads fetched successfully.",
      leads,
    });
  } catch (error) {
    console.error("getLeads error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const addLeadActivity = async (req, res) => {
  try {
    const { leadId } = req.params;
    const {
      activityType,
      sourcePage,
      companyId,
      templateId,
      note,
      nextFollowUpAt,
      contactId,
    } = req.body;

    if (!activityType || !sourcePage) {
      return res.status(400).json({
        message: "activityType and sourcePage are required.",
      });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: Number(leadId) },
      select: {
        id: true,
        assignedToId: true,
        companyId: true,
      },
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found." });
    }

    if (req.user.role !== "ADMIN" && lead.assignedToId !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to add activity to this lead.",
      });
    }

    const activity = await prisma.leadActivity.create({
      data: {
        leadId: Number(leadId),
        contactId:
          contactId !== undefined && contactId !== null && contactId !== ""
            ? Number(contactId)
            : null,
        advisorId: req.user.role === "ADMIN" ? lead.assignedToId : req.user.id,
        companyId:
          companyId !== undefined && companyId !== null && companyId !== ""
            ? Number(companyId)
            : lead.companyId,
        templateId:
          templateId !== undefined && templateId !== null && templateId !== ""
            ? Number(templateId)
            : null,
        activityType,
        sourcePage,
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

    if (note || nextFollowUpAt) {
      await prisma.lead.update({
        where: { id: Number(leadId) },
        data: {
          remarks: note || undefined,
          nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : undefined,
          status: "FOLLOW_UP",
        },
      });
    }

    return res.status(201).json({
      message: "Lead activity added successfully.",
      activity,
    });
  } catch (error) {
    console.error("addLeadActivity error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const getLeadActivities = async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id: Number(leadId) },
      select: {
        id: true,
        assignedToId: true,
      },
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found." });
    }

    if (req.user.role !== "ADMIN" && lead.assignedToId !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to view activities of this lead.",
      });
    }

    const activities = await prisma.leadActivity.findMany({
      where: {
        leadId: Number(leadId),
      },
      orderBy: {
        createdAt: "desc",
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

    return res.status(200).json({
      message: "Lead activities fetched successfully.",
      activities,
    });
  } catch (error) {
    console.error("getLeadActivities error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

const SOURCE_LABELS = {
  DASHBOARD_PAGE: "Dashboard",
  CONTACTS_PAGE: "Contacts",
  LEADS_PAGE: "Leads",
};

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDateKey(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mapLeadRow(lead) {
  const activities = (lead.activities || []).map(mapActivity);

  const sourceActivity =
    [...activities]
      .reverse()
      .find((item) => item.sourcePage) || null;

  const templateActivity =
    [...activities]
      .reverse()
      .find((item) => item.template) || null;

  const latestActivity = getLatestUsefulActivity(activities);

  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    age: lead.age,
    city: lead.city,
    status: lead.status,
    remarks: lead.remarks || "",
    nextFollowUp: lead.nextFollowUpAt,
    company: lead.company
      ? {
          id: lead.company.id,
          name: lead.company.name,
          code: lead.company.code,
        }
      : null,
    source: sourceActivity?.sourcePage
      ? SOURCE_LABELS[sourceActivity.sourcePage] || sourceActivity.sourcePage
      : "Dashboard",
    template: templateActivity?.template
      ? {
          id: templateActivity.template.id,
          title: templateActivity.template.title,
        }
      : null,
    latestActivity: latestActivity
      ? {
          id: latestActivity.id,
          activityType: latestActivity.activityType,
          note: latestActivity.note,
          createdAt: latestActivity.createdAt,
        }
      : null,
    activityTimeline: activities
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20),
    createdAt: lead.createdAt,
  };
}
function mapActivity(activity) {
  return {
    id: activity.id,
    activityType: activity.activityType,
    note: activity.note || "",
    sourcePage: activity.sourcePage || null,
    nextFollowUpAt: activity.nextFollowUpAt,
    createdAt: activity.createdAt,
    template: activity.template
      ? {
          id: activity.template.id,
          title: activity.template.title,
        }
      : null,
  };
}

function getLatestUsefulActivity(activities = []) {
  if (!activities.length) return null;

  const sorted = [...activities].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return sorted[0] || null;
}

export const getMyLeads = async (req, res) => {
  try {
    const advisorId = req.user.id;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const status =
      req.query.status && req.query.status !== "ALL"
        ? req.query.status
        : null;

    const selectedDateParam = req.query.selectedDate;
    const calendarMonth = Number(req.query.calendarMonth);
    const calendarYear = Number(req.query.calendarYear);

    const now = new Date();
    const effectiveSelectedDate = selectedDateParam
      ? new Date(selectedDateParam)
      : now;

    const month =
      Number.isInteger(calendarMonth) && calendarMonth >= 0 && calendarMonth <= 11
        ? calendarMonth
        : now.getMonth();

    const year =
      Number.isInteger(calendarYear) && calendarYear > 2000
        ? calendarYear
        : now.getFullYear();

    const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const baseWhere = {
      assignedToId: advisorId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search } },
              { city: { contains: search } },
              {
                company: {
                  name: { contains: search },
                },
              },
            ],
          }
        : {}),
    };

    const commonInclude = {
      company: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      activities: {
  orderBy: {
    createdAt: "asc",
  },
  select: {
    id: true,
    activityType: true,
    sourcePage: true,
    note: true,
    nextFollowUpAt: true,
    createdAt: true,
    template: {
      select: {
        id: true,
        title: true,
      },
    },
  },
      },
    };

    const [
      leads,
      total,
      totalLeads,
      todayFollowUps,
      upcomingFollowUps,
      convertedLeads,
      selectedDateLeadsRaw,
      upcomingRemindersRaw,
      reminderMonthLeads,
    ] = await Promise.all([
      prisma.lead.findMany({
        where: baseWhere,
        skip,
        take: limit,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        include: commonInclude,
      }),

      prisma.lead.count({
        where: baseWhere,
      }),

      prisma.lead.count({
        where: {
          assignedToId: advisorId,
        },
      }),

      prisma.lead.count({
        where: {
          assignedToId: advisorId,
          nextFollowUpAt: {
            gte: startOfDay(now),
            lte: endOfDay(now),
          },
        },
      }),

      prisma.lead.count({
        where: {
          assignedToId: advisorId,
          nextFollowUpAt: {
            gte: startOfDay(now),
          },
        },
      }),

      prisma.lead.count({
        where: {
          assignedToId: advisorId,
          status: "CONVERTED",
        },
      }),

      prisma.lead.findMany({
        where: {
          assignedToId: advisorId,
          nextFollowUpAt: {
            gte: startOfDay(effectiveSelectedDate),
            lte: endOfDay(effectiveSelectedDate),
          },
        },
        orderBy: {
          nextFollowUpAt: "asc",
        },
        include: commonInclude,
      }),

      prisma.lead.findMany({
        where: {
          assignedToId: advisorId,
          nextFollowUpAt: {
            gte: startOfDay(now),
          },
        },
        take: 5,
        orderBy: {
          nextFollowUpAt: "asc",
        },
        include: commonInclude,
      }),

      prisma.lead.findMany({
        where: {
          assignedToId: advisorId,
          nextFollowUpAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        select: {
          nextFollowUpAt: true,
        },
      }),
    ]);

    const reminderDates = [
      ...new Set(
        reminderMonthLeads
          .filter((item) => item.nextFollowUpAt)
          .map((item) => formatDateKey(item.nextFollowUpAt))
      ),
    ];

    return res.status(200).json({
      message: "Leads fetched successfully.",
      leads: leads.map(mapLeadRow),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      kpis: {
        totalLeads,
        todayFollowUps,
        upcomingFollowUps,
        convertedLeads,
      },
      selectedDateLeads: selectedDateLeadsRaw.map(mapLeadRow),
      upcomingReminders: upcomingRemindersRaw.map(mapLeadRow),
      reminderDates,
    });
  } catch (error) {
    console.error("getMyLeads error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const createLeadActivity = async (req, res) => {
  try {
    const advisorId = req.user.id;
    const { leadId } = req.params;
    const {
      activityType,
      note,
      nextFollowUpAt,
      sourcePage,
      templateId,
    } = req.body;

    if (!activityType) {
      return res.status(400).json({
        message: "activityType is required.",
      });
    }

    const lead = await prisma.lead.findFirst({
      where: {
        id: Number(leadId),
        assignedToId: advisorId,
      },
      select: {
        id: true,
        companyId: true,
        assignedToId: true,
      },
    });

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found.",
      });
    }

    const activity = await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        advisorId,
        companyId: lead.companyId,
        templateId: templateId ? Number(templateId) : null,
        activityType,
        sourcePage: sourcePage || "LEADS_PAGE",
        note: note || null,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
      },
      include: {
        template: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: "Lead activity saved successfully.",
      activity: mapActivity(activity),
    });
  } catch (error) {
    console.error("createLeadActivity error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};
export const updateLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { remarks, nextFollowUpAt, status } = req.body;

    const updated = await prisma.lead.update({
      where: { id: Number(leadId) },
      data: {
        ...(remarks !== undefined && { remarks }),
        ...(nextFollowUpAt && {
          nextFollowUpAt: new Date(nextFollowUpAt),
        }),
        ...(status && { status }),
      },
    });

    return res.status(200).json({
      message: "Lead updated successfully",
      lead: updated,
    });
  } catch (error) {
    console.error("updateLead error:", error);
    return res.status(500).json({ message: "Update failed" });
  }
};