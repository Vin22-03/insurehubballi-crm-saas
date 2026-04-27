import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb({
  host: "srv917.hstgr.io",
  port: 3306,
  user: "u674178439_insurecrm",
  password: "Insure@crm43",
  database: "u674178439_insure_crm",
  charset: "utf8mb4",
});

const prisma = new PrismaClient({ adapter });

export default prisma;