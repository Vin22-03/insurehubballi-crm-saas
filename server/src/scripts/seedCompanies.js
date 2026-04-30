import { db } from "../config/db.js";

async function seedCompanies() {
  try {
    const companies = [
      { code: "LIC", name: "LIC of India" },
      { code: "TATA_AIA", name: "TATA AIA Life Insurance" },
      { code: "TATA_AIG", name: "TATA AIG General Insurance" },
      { code: "MANIPAL_CIGNA", name: "Manipal Cigna Health Insurance" },
    ];

    for (const company of companies) {
      const [rows] = await db.query(
        `SELECT id FROM Company WHERE code = ? LIMIT 1`,
        [company.code]
      );

      if (rows.length === 0) {
        await db.query(
          `INSERT INTO Company (code, name, isActive, createdAt, updatedAt)
           VALUES (?, ?, 1, NOW(), NOW())`,
          [company.code, company.name]
        );

        console.log(`✅ Created: ${company.name}`);
      } else {
        console.log(`⚡ Already exists: ${company.name}`);
      }
    }

    console.log("🎉 Company seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding companies:", error);
  } finally {
    // close pool (important for scripts)
    await db.end();
  }
}

seedCompanies();