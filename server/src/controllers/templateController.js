import { db } from "../config/db.js";

export const getTemplatesForAdvisor = async (req, res) => {
  try {
    const { companyId, age } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required." });
    }

    const numericCompanyId = Number(companyId);
    const numericAge = age !== undefined && age !== null && age !== "" ? Number(age) : null;

    const [userRows] = await db.query(
      `SELECT id, role FROM \`User\` WHERE id = ? LIMIT 1`,
      [req.user.id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = userRows[0];

    if (user.role !== "ADMIN") {
      const [allowedRows] = await db.query(
        `SELECT companyId FROM AdvisorCompany WHERE advisorId = ?`,
        [user.id]
      );

      const allowedCompanyIds = allowedRows.map((row) => row.companyId);

      if (!allowedCompanyIds.includes(numericCompanyId)) {
        return res.status(403).json({
          message: "You are not allowed to access templates for this company.",
        });
      }
    }

    const params = [numericCompanyId];

    let ageCondition = "";
    if (numericAge !== null) {
      ageCondition = `
        AND (minAge IS NULL OR minAge <= ?)
        AND (maxAge IS NULL OR maxAge >= ?)
      `;
      params.push(numericAge, numericAge);
    }

    const [templates] = await db.query(
      `SELECT 
         t.*,
         c.id AS company_id,
         c.code AS company_code,
         c.name AS company_name
       FROM Template t
       JOIN \`Company\` c ON c.id = t.companyId
       WHERE t.companyId = ?
       AND t.isActive = 1
       ${ageCondition}
       ORDER BY t.title ASC, t.createdAt DESC`,
      params
    );

    const formattedTemplates = templates.map((t) => ({
      id: t.id,
      companyId: t.companyId,
      title: t.title,
      tagline: t.tagline,
      body: t.body,
      minAge: t.minAge,
      maxAge: t.maxAge,
      pdfUrl: t.pdfUrl,
      isActive: Boolean(t.isActive),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      company: {
        id: t.company_id,
        code: t.company_code,
        name: t.company_name,
      },
    }));

    return res.status(200).json({
      message: "Templates fetched successfully.",
      templates: formattedTemplates,
    });
  } catch (error) {
    console.error("getTemplatesForAdvisor error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};