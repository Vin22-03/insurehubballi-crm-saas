import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import templateRoutes from "./routes/templateRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import resourceRoutes from "./routes/resourceRoutes.js";
import { db } from "./config/db.js";
import chatflowRoutes from "./routes/chatflowRoutes.js";


dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsPath = path.join(__dirname, "../uploads");
const clientDistPath = path.join(__dirname, "../../client/dist");

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(uploadsPath));

app.get("/api-health", (req, res) => {
  res.send("API is running 🚀");
});

app.get("/db-test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS ok");

    res.json({
      success: true,
      message: "mysql2 database connected successfully",
      result: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "mysql2 database connection failed",
      error: error.message,
    });
  }
});

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/templates", templateRoutes);
app.use("/leads", leadRoutes);
app.use("/contacts", contactRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/profile", profileRoutes);
app.use("/resources", resourceRoutes);
app.use("/chatflow", chatflowRoutes);

app.use(express.static(clientDistPath));

app.get("/{*any}", (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});