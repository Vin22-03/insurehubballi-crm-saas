import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createContact,
  getContacts,
  convertContactToLead,
  addContactActivity,
  updateContact,
  deleteContact,
  bulkDeleteContacts,
  getContactBatches,
  importContacts
} from "../controllers/contactController.js";

const router = express.Router();

router.post("/", protect, createContact);
router.get("/", protect, getContacts);

router.get("/batches", protect, getContactBatches);
router.post("/bulk-delete", protect, bulkDeleteContacts);

router.patch("/:contactId", protect, updateContact);
router.delete("/:contactId", protect, deleteContact);

router.post("/:contactId/convert-to-lead", protect, convertContactToLead);
router.post("/:contactId/activities", protect, addContactActivity);
router.post("/import", protect, importContacts);

export default router;