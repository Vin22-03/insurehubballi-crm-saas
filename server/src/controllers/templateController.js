import prisma from "../config/prisma.js";

export const getTemplatesForAdvisor = async (req, res) => {
  try {
    const { companyId, age } = req.query;

    if (!companyId) {
      return res.status(400).json({
        message: "companyId is required.",
      });
    }

    const numericCompanyId = Number(companyId);

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        role: true,
        advisorCompanies: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role !== "ADMIN") {
      const allowedCompanyIds = user.advisorCompanies.map((item) => item.companyId);

      if (!allowedCompanyIds.includes(numericCompanyId)) {
        return res.status(403).json({
          message: "You are not allowed to access templates for this company.",
        });
      }
    }

    const numericAge =
      age !== undefined && age !== null && age !== "" ? Number(age) : null;

    const templates = await prisma.template.findMany({
      where: {
        companyId: numericCompanyId,
        isActive: true,
        ...(numericAge !== null
          ? {
              AND: [
                {
                  OR: [{ minAge: null }, { minAge: { lte: numericAge } }],
                },
                {
                  OR: [{ maxAge: null }, { maxAge: { gte: numericAge } }],
                },
              ],
            }
          : {}),
      },
      orderBy: [{ title: "asc" }, { createdAt: "desc" }],
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
      message: "Templates fetched successfully.",
      templates,
    });
  } catch (error) {
    console.error("getTemplatesForAdvisor error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};