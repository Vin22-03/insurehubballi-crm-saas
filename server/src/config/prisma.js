import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();  // MUST

const prisma = new PrismaClient({
  log: ["query", "error", "warn"],  // add query log for debugging
});

export default prisma;