import prisma from "../config/prisma.js";

async function seedCompanies() {
  try {
    const companies = [
      { code: "LIC", name: "LIC of India" },
      { code: "TATA_AIA", name: "TATA AIA Life Insurance" },
      { code: "TATA_AIG", name: "TATA AIG General Insurance" },
      { code: "MANIPAL_CIGNA", name: "Manipal Cigna Health Insurance" },
    ];

    for (const company of companies) {
      const existing = await prisma.company.findUnique({
        where: { code: company.code },
      });

      if (!existing) {
        await prisma.company.create({
          data: company,
        });
        console.log(`✅ Created: ${company.name}`);
      } else {
        console.log(`⚡ Already exists: ${company.name}`);
      }
    }

    console.log("🎉 Company seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding companies:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedCompanies();