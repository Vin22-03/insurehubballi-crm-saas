import { db } from "../config/db.js";

export const getDashboardStats = async (req, res) => {
  try {
    const isAdmin = req.user.role === "ADMIN";
    const userId = req.user.id;

    const leadWhere = isAdmin ? "" : "WHERE assignedToId = ?";
    const contactWhere = isAdmin
      ? "WHERE isDeleted = 0"
      : "WHERE createdById = ? AND isDeleted = 0";
    const activityWhere = isAdmin
      ? "WHERE DATE(createdAt) = CURDATE()"
      : "WHERE advisorId = ? AND DATE(createdAt) = CURDATE()";

    const leadParams = isAdmin ? [] : [userId];
    const contactParams = isAdmin ? [] : [userId];
    const activityParams = isAdmin ? [] : [userId];

    const [[totalLeadsRows], [totalContactsRows], [dueRows], [interestedRows], [activityRows]] =
      await Promise.all([
        db.query(`SELECT COUNT(*) AS count FROM \`Lead\` ${leadWhere}`, leadParams),
        db.query(`SELECT COUNT(*) AS count FROM Contact ${contactWhere}`, contactParams),
        db.query(
          `SELECT COUNT(*) AS count FROM \`Lead\`
           WHERE ${isAdmin ? "1=1" : "assignedToId = ?"}
           AND nextFollowUpAt <= NOW()
           AND status IN ('FOLLOW_UP', 'CONTACTED', 'INTERESTED')`,
          leadParams
        ),
        db.query(
          `SELECT COUNT(*) AS count FROM \`Lead\`
           WHERE ${isAdmin ? "1=1" : "assignedToId = ?"}
           AND status = 'INTERESTED'`,
          leadParams
        ),
        db.query(`SELECT COUNT(*) AS count FROM \`LeadActivity\` ${activityWhere}`, activityParams),
      ]);

    return res.status(200).json({
      message: "Dashboard stats fetched successfully.",
      stats: {
        totalLeads: totalLeadsRows[0].count,
        totalContacts: totalContactsRows[0].count,
        dueFollowUps: dueRows[0].count,
        interestedLeads: interestedRows[0].count,
        todayActivities: activityRows[0].count,
      },
    });
  } catch (error) {
    console.error("getDashboardStats error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};