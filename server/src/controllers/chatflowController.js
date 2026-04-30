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
      `SELECT id, name, phone, role, isActive
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

    html = html
  .replaceAll("{{brand_name}}", "insurehubballi")
  .replaceAll("{{tagline}}", "Your Cover, Our Care")
  .replaceAll("{{advisor_name}}", advisor.name || "Advisor")
  .replaceAll("{{advisor_role}}", "Life & Health Insurance Advisor")
  .replaceAll("{{advisor_mobile}}", advisor.phone || "")
  .replaceAll("{{advisor_whatsapp}}", advisorWhatsapp)
  .replaceAll(
    "{{office_address}}",
    "No 21, 3rd Floor, Satellite Complex, Koppikar Road, Hubballi"
  );

    return res.status(200).type("html").send(html);
  } catch (error) {
    console.error("renderAdvisorChatflow error:", error);
    return res.status(500).send("Server error.");
  }
};