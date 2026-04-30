import { db } from "../config/db.js";

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

function mapActivity(activity) {
  return {
    id: activity.id,
    activityType: activity.activityType,
    note: activity.note || "",
    sourcePage: activity.sourcePage || null,
    nextFollowUpAt: activity.nextFollowUpAt,
    createdAt: activity.createdAt,
    template: activity.template_id
      ? {
          id: activity.template_id,
          title: activity.template_title,
        }
      : activity.template || null,
  };
}

function getLatestUsefulActivity(activities = []) {
  if (!activities.length) return null;

  const sorted = [...activities].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return sorted[0] || null;
}

function mapLeadRow(lead) {
  const activities = (lead.activities || []).map(mapActivity);

  const sourceActivity =
    [...activities].reverse().find((item) => item.sourcePage) || null;

  const templateActivity =
    [...activities].reverse().find((item) => item.template) || null;

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
    company: lead.company_id
      ? {
          id: lead.company_id,
          name: lead.company_name,
          code: lead.company_code,
        }
      : lead.company || null,
    source: sourceActivity?.sourcePage
      ? SOURCE_LABELS[sourceActivity.sourcePage] || sourceActivity.sourcePage
      : "Dashboard",
    template: templateActivity?.template || null,
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

async function attachActivitiesToLeads(leads) {
  const leadIds = leads.map((lead) => lead.id);

  if (leadIds.length === 0) return leads.map((lead) => ({ ...lead, activities: [] }));

  const [activities] = await db.query(
    `SELECT
       la.*,
       t.id AS template_id,
       t.title AS template_title
     FROM \`LeadActivity\` la
     LEFT JOIN Template t ON t.id = la.templateId
     WHERE la.leadId IN (?)
     ORDER BY la.createdAt ASC`,
    [leadIds]
  );

  const activitiesByLead = activities.reduce((acc, activity) => {
    if (!acc[activity.leadId]) acc[activity.leadId] = [];
    acc[activity.leadId].push(activity);
    return acc;
  }, {});

  return leads.map((lead) => ({
    ...lead,
    activities: activitiesByLead[lead.id] || [],
  }));
}

async function fetchLeadsWithCompany(whereSql, params, orderSql = "ORDER BY l.createdAt DESC", limitSql = "") {
  const [leads] = await db.query(
    `SELECT
       l.*,
       c.id AS company_id,
       c.code AS company_code,
       c.name AS company_name
     FROM \`Lead\` l
     LEFT JOIN \`Company\` c ON c.id = l.companyId
     ${whereSql}
     ${orderSql}
     ${limitSql}`,
    params
  );

  return attachActivitiesToLeads(leads);
}

export const createLead = async (req, res) => {
  const connection = await db.getConnection();

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
      const [allowedRows] = await connection.query(
        `SELECT companyId FROM AdvisorCompany WHERE advisorId = ?`,
        [req.user.id]
      );

      const allowedCompanyIds = allowedRows.map((item) => item.companyId);

      if (numericCompanyId && !allowedCompanyIds.includes(numericCompanyId)) {
        return res.status(403).json({
          message: "You are not allowed to create leads for this company.",
        });
      }
    }

    await connection.beginTransaction();

    const [leadResult] = await connection.query(
  `INSERT INTO \`Lead\`
   (name, phone, altPhone, age, city, companyId, remarks, nextFollowUpAt, contactId, createdById, assignedToId, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        name,
        phone,
        altPhone || null,
        age !== undefined && age !== null && age !== "" ? Number(age) : null,
        city || null,
        numericCompanyId,
        remarks || null,
        nextFollowUpAt ? new Date(nextFollowUpAt) : null,
        numericContactId,
        req.user.id,
        finalAssignedToId,
      ]
    );

    const leadId = leadResult.insertId;

  await connection.query(
  `INSERT INTO \`LeadActivity\`
   (leadId, contactId, advisorId, companyId, templateId, activityType, sourcePage, note, nextFollowUpAt, createdAt)
   VALUES (?, ?, ?, ?, ?, 'LEAD_CREATED', 'DASHBOARD_PAGE', ?, ?, NOW())`,
  [
    leadId,
    numericContactId,
    finalAssignedToId,
    numericCompanyId,
    numericTemplateId,
    remarks || "Lead created",
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
      message: "Lead created successfully.",
      lead: {
        ...lead,
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
    console.error("createLead error:", error);
    return res.status(500).json({ message: "Server error." });
  } finally {
    connection.release();
  }
};

export const getLeads = async (req, res) => {
  try {
    const { search, status, companyId } = req.query;

    const whereParts = [];
    const params = [];

    if (req.user.role !== "ADMIN") {
      whereParts.push("l.assignedToId = ?");
      params.push(req.user.id);
    }

    if (status) {
      whereParts.push("l.status = ?");
      params.push(status);
    }

    if (companyId) {
      whereParts.push("l.companyId = ?");
      params.push(Number(companyId));
    }

    if (search) {
      whereParts.push("(l.name LIKE ? OR l.phone LIKE ? OR l.city LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    const [leads] = await db.query(
      `SELECT
         l.*,
         c.id AS company_id,
         c.code AS company_code,
         c.name AS company_name,
         assigned.id AS assigned_id,
         assigned.name AS assigned_name,
         assigned.phone AS assigned_phone,
         assigned.role AS assigned_role,
         creator.id AS creator_id,
         creator.name AS creator_name,
         creator.phone AS creator_phone,
         creator.role AS creator_role
       FROM \`Lead\` l
       LEFT JOIN \`Company\` c ON c.id = l.companyId
       LEFT JOIN \`User\` assigned ON assigned.id = l.assignedToId
       LEFT JOIN \`User\` creator ON creator.id = l.createdById
       ${whereSql}
       ORDER BY l.createdAt DESC`,
      params
    );

    const formattedLeads = leads.map((lead) => ({
      ...lead,
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
      createdBy: lead.creator_id
        ? {
            id: lead.creator_id,
            name: lead.creator_name,
            phone: lead.creator_phone,
            role: lead.creator_role,
          }
        : null,
    }));

    return res.status(200).json({
      message: "Leads fetched successfully.",
      leads: formattedLeads,
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

    const [leadRows] = await db.query(
      `SELECT id, assignedToId, companyId
       FROM \`Lead\`
       WHERE id = ?
       LIMIT 1`,
      [Number(leadId)]
    );

    const lead = leadRows[0];

    if (!lead) {
      return res.status(404).json({ message: "Lead not found." });
    }

    if (req.user.role !== "ADMIN" && lead.assignedToId !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to add activity to this lead.",
      });
    }

    const numericCompanyId =
      companyId !== undefined && companyId !== null && companyId !== ""
        ? Number(companyId)
        : lead.companyId;

    const numericTemplateId =
      templateId !== undefined && templateId !== null && templateId !== ""
        ? Number(templateId)
        : null;

    const numericContactId =
      contactId !== undefined && contactId !== null && contactId !== ""
        ? Number(contactId)
        : null;

    const [result] = await db.query(
      `INSERT INTO  \`LeadActivity\`
       (leadId, contactId, advisorId, companyId, templateId, activityType, sourcePage, note, nextFollowUpAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        Number(leadId),
        numericContactId,
        req.user.role === "ADMIN" ? lead.assignedToId : req.user.id,
        numericCompanyId,
        numericTemplateId,
        activityType,
        sourcePage,
        note || null,
        nextFollowUpAt ? new Date(nextFollowUpAt) : null,
      ]
    );

    if (note || nextFollowUpAt) {
      await db.query(
        `UPDATE \`Lead\`
         SET remarks = COALESCE(?, remarks),
             nextFollowUpAt = COALESCE(?, nextFollowUpAt),
             status = 'FOLLOW_UP',
             updatedAt = NOW()
         WHERE id = ?`,
        [
          note || null,
          nextFollowUpAt ? new Date(nextFollowUpAt) : null,
          Number(leadId),
        ]
      );
    }

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
      message: "Lead activity added successfully.",
      activity: {
        ...activity,
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
    console.error("addLeadActivity error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const getLeadActivities = async (req, res) => {
  try {
    const { leadId } = req.params;

    const [leadRows] = await db.query(
      `SELECT id, assignedToId
       FROM \`Lead\`
       WHERE id = ?
       LIMIT 1`,
      [Number(leadId)]
    );

    const lead = leadRows[0];

    if (!lead) {
      return res.status(404).json({ message: "Lead not found." });
    }

    if (req.user.role !== "ADMIN" && lead.assignedToId !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to view activities of this lead.",
      });
    }

    const [activities] = await db.query(
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
       WHERE la.leadId = ?
       ORDER BY la.createdAt DESC`,
      [Number(leadId)]
    );

    return res.status(200).json({
      message: "Lead activities fetched successfully.",
      activities: activities.map((activity) => ({
        ...activity,
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
      })),
    });
  } catch (error) {
    console.error("getLeadActivities error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const getMyLeads = async (req, res) => {
  try {
    const advisorId = req.user.id;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const offset = (page - 1) * limit;

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

    const whereParts = ["l.assignedToId = ?"];
    const params = [advisorId];

    if (status) {
      whereParts.push("l.status = ?");
      params.push(status);
    }

    if (search) {
      whereParts.push("(l.name LIKE ? OR l.phone LIKE ? OR l.city LIKE ? OR c.name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = `WHERE ${whereParts.join(" AND ")}`;

    const [
      leads,
      countRows,
      totalLeadsRows,
      todayFollowRows,
      upcomingFollowRows,
      convertedRows,
      selectedDateLeadsRaw,
      upcomingRemindersRaw,
      reminderMonthRows,
    ] = await Promise.all([
      fetchLeadsWithCompany(
        whereSql,
        [...params, limit, offset],
        "ORDER BY l.updatedAt DESC, l.createdAt DESC",
        "LIMIT ? OFFSET ?"
      ),

      db.query(
        `SELECT COUNT(*) AS total
         FROM \`Lead\` l
         LEFT JOIN \`Company\` c ON c.id = l.companyId
         ${whereSql}`,
        params
      ),

      db.query(
        `SELECT COUNT(*) AS count FROM \`Lead\` WHERE assignedToId = ?`,
        [advisorId]
      ),

      db.query(
        `SELECT COUNT(*) AS count
         FROM \`Lead\`
         WHERE assignedToId = ?
         AND nextFollowUpAt >= ?
         AND nextFollowUpAt <= ?`,
        [advisorId, startOfDay(now), endOfDay(now)]
      ),

      db.query(
        `SELECT COUNT(*) AS count
         FROM \`Lead\`
         WHERE assignedToId = ?
         AND nextFollowUpAt >= ?`,
        [advisorId, startOfDay(now)]
      ),

      db.query(
        `SELECT COUNT(*) AS count
         FROM \`Lead\`
         WHERE assignedToId = ?
         AND status = 'CONVERTED'`,
        [advisorId]
      ),

      fetchLeadsWithCompany(
        `WHERE l.assignedToId = ?
         AND l.nextFollowUpAt >= ?
         AND l.nextFollowUpAt <= ?`,
        [advisorId, startOfDay(effectiveSelectedDate), endOfDay(effectiveSelectedDate)],
        "ORDER BY l.nextFollowUpAt ASC"
      ),

      fetchLeadsWithCompany(
        `WHERE l.assignedToId = ?
         AND l.nextFollowUpAt >= ?`,
        [advisorId, startOfDay(now), 5],
        "ORDER BY l.nextFollowUpAt ASC",
        "LIMIT ?"
      ),

      db.query(
        `SELECT nextFollowUpAt
         FROM \`Lead\`
         WHERE assignedToId = ?
         AND nextFollowUpAt >= ?
         AND nextFollowUpAt <= ?`,
        [advisorId, monthStart, monthEnd]
      ),
    ]);

    const total = countRows[0][0].total;
    const totalLeads = totalLeadsRows[0][0].count;
    const todayFollowUps = todayFollowRows[0][0].count;
    const upcomingFollowUps = upcomingFollowRows[0][0].count;
    const convertedLeads = convertedRows[0][0].count;
    const reminderMonthLeads = reminderMonthRows[0];

    const reminderDates = [
      ...new Set(
        reminderMonthLeads
          .filter((item) => item.nextFollowUpAt)
          .map((item) => formatDateKey(item.nextFollowUpAt))
      ),
    ];

    const mappedLeads = leads
      .map(mapLeadRow)
      .sort((a, b) => {
        const aTime = new Date(a.latestActivity?.createdAt || a.createdAt).getTime();
        const bTime = new Date(b.latestActivity?.createdAt || b.createdAt).getTime();
        return bTime - aTime;
      });

    const mappedSelectedDateLeads = selectedDateLeadsRaw
      .map(mapLeadRow)
      .sort((a, b) => {
        const aTime = new Date(a.latestActivity?.createdAt || a.createdAt).getTime();
        const bTime = new Date(b.latestActivity?.createdAt || b.createdAt).getTime();
        return bTime - aTime;
      });

    const mappedUpcomingReminders = upcomingRemindersRaw
      .map(mapLeadRow)
      .sort((a, b) => {
        const aTime = new Date(a.nextFollowUp || a.createdAt).getTime();
        const bTime = new Date(b.nextFollowUp || b.createdAt).getTime();
        return aTime - bTime;
      });

    return res.status(200).json({
      message: "Leads fetched successfully.",
      leads: mappedLeads,
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
      selectedDateLeads: mappedSelectedDateLeads,
      upcomingReminders: mappedUpcomingReminders,
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
    const { activityType, note, nextFollowUpAt, sourcePage, templateId } = req.body;

    if (!activityType) {
      return res.status(400).json({
        message: "activityType is required.",
      });
    }

    const [leadRows] = await db.query(
      `SELECT id, companyId, assignedToId
       FROM \`Lead\`
       WHERE id = ? AND assignedToId = ?
       LIMIT 1`,
      [Number(leadId), advisorId]
    );

    const lead = leadRows[0];

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found.",
      });
    }

    const numericTemplateId = templateId ? Number(templateId) : null;

    const [result] = await db.query(
  `INSERT INTO \`LeadActivity\`
   (leadId, advisorId, companyId, templateId, activityType, sourcePage, note, nextFollowUpAt, createdAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
  [
    lead.id,
    advisorId,
    lead.companyId,
    numericTemplateId,
    activityType,
    sourcePage || "LEADS_PAGE",
    note || null,
    nextFollowUpAt ? new Date(nextFollowUpAt) : null,
  ]
);

    const [activityRows] = await db.query(
      `SELECT
         la.*,
         t.id AS template_id,
         t.title AS template_title
       FROM \`LeadActivity\` la
       LEFT JOIN Template t ON t.id = la.templateId
       WHERE la.id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      message: "Lead activity saved successfully.",
      activity: mapActivity(activityRows[0]),
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

    const updateParts = [];
    const params = [];

    if (remarks !== undefined) {
      updateParts.push("remarks = ?");
      params.push(remarks);
    }

    if (nextFollowUpAt) {
      updateParts.push("nextFollowUpAt = ?");
      params.push(new Date(nextFollowUpAt));
    }

    if (status) {
      updateParts.push("status = ?");
      params.push(status);
    }

    if (updateParts.length === 0) {
      return res.status(400).json({ message: "No update fields provided." });
    }

    updateParts.push("updatedAt = NOW()");
    params.push(Number(leadId));

    await db.query(
      `UPDATE \`Lead\`
       SET ${updateParts.join(", ")}
       WHERE id = ?`,
      params
    );

    const [updatedRows] = await db.query(
      `SELECT * FROM \`Lead\` WHERE id = ? LIMIT 1`,
      [Number(leadId)]
    );

    return res.status(200).json({
      message: "Lead updated successfully",
      lead: updatedRows[0],
    });
  } catch (error) {
    console.error("updateLead error:", error);
    return res.status(500).json({ message: "Update failed" });
  }
};