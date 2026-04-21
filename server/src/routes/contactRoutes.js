import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createContact,
  getContacts,
  convertContactToLead,
  addContactActivity,
} from "../controllers/contactController.js";

const router = express.Router();

router.post("/", protect, createContact);
router.get("/", protect, getContacts);
router.post("/:contactId/convert-to-lead", protect, convertContactToLead);
router.post("/:contactId/activities", protect, addContactActivity);

export default router;