import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatePath = path.join(
  __dirname,
  "../../public_html/advisor-chatflow.html"
);

const cleanWhatsappNumber = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.startsWith("91") ? digits : `91${digits}`;
};

export const renderAdvisorChatflow = async (req, res) => {
  try {
    const { phone } = req.params;
    const cleanPhone = String(phone || "").replace(/\D/g, "");

    const [advisorRows] = await db.query(
      `SELECT id, name, phone, role, isActive, brandName, officeAddress, advisorRole, brandLogoUrl
       FROM \`User\`
       WHERE phone = ? AND role = 'ADVISOR'
       LIMIT 1`,
      [cleanPhone]
    );

    if (advisorRows.length === 0) {
      return res.status(404).send("Advisor page not found.");
    }

    const advisor = advisorRows[0];

    if (!advisor.isActive) {
      return res.status(403).send("This advisor page is currently inactive.");
    }

    let html = fs.readFileSync(templatePath, "utf-8");

    const advisorWhatsapp = cleanWhatsappNumber(advisor.phone);

    const brandName = advisor.brandName?.trim() || advisor.name || "Advisor";
    const advisorName = advisor.name || "Advisor";
    const advisorRole =
      advisor.advisorRole?.trim() || "Life & Health Insurance Advisor";
    const officeAddress = advisor.officeAddress?.trim() || "";
    const tagline = "team-insurehubballi";
    const brandLogoUrl = advisor.brandLogoUrl?.trim() || "";

    const initials =
      brandName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase() || "IH";

    html = html
      .replaceAll("{{brand_name}}", brandName)
      .replaceAll("{{tagline}}", tagline)
      .replaceAll("{{advisor_name}}", advisorName)
      .replaceAll("{{advisor_role}}", advisorRole)
      .replaceAll("{{advisor_mobile}}", advisor.phone || "")
      .replaceAll("{{advisor_whatsapp}}", advisorWhatsapp)
      .replaceAll("{{office_address}}", officeAddress)
      .replaceAll("{{brand_logo_url}}", brandLogoUrl)
      .replaceAll("{{brand_initials}}", initials);

    return res.status(200).type("html").send(html);
  } catch (error) {
    console.error("renderAdvisorChatflow error:", error);
    return res.status(500).send("Server error.");
  }
};