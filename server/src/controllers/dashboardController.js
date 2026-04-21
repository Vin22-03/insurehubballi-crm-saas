import prisma from "../config/prisma.js";

export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    const whereLead =
      req.user.role === "ADMIN"
        ? {}
        : { assignedToId: req.user.id };

    const whereContact =
      req.user.role === "ADMIN"
        ? { isDeleted: false }
        : { createdById: req.user.id, isDeleted: false };

    const whereActivity =
      req.user.role === "ADMIN"
        ? {}
        : { advisorId: req.user.id };

    const [
      totalLeads,
      totalContacts,
      dueFollowUps,
      interestedLeads,
      todayActivities,
    ] = await Promise.all([
      prisma.lead.count({ where: whereLead }),
      prisma.contact.count({ where: whereContact }),
      prisma.lead.count({
        where: {
          ...whereLead,
          nextFollowUpAt: {
            lte: now,
          },
          status: {
            in: ["FOLLOW_UP", "CONTACTED", "INTERESTED"],
          },
        },
      }),
      prisma.lead.count({
        where: {
          ...whereLead,
          status: "INTERESTED",
        },
      }),
      prisma.leadActivity.count({
        where: {
          ...whereActivity,
          createdAt: {
            gte: todayStart,
          },
        },
      }),
    ]);

    return res.status(200).json({
      message: "Dashboard stats fetched successfully.",
      stats: {
        totalLeads,
        totalContacts,
        dueFollowUps,
        interestedLeads,
        todayActivities,
      },
    });
  } catch (error) {
    console.error("getDashboardStats error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};