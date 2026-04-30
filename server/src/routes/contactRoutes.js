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
  importContacts,
  renameContactBatch,
} from "../controllers/contactController.js";

const router = express.Router();
// CONTACTS
router.post("/", protect, createContact);
router.get("/", protect, getContacts);
router.patch("/:contactId", protect, updateContact);
router.delete("/:contactId", protect, deleteContact);

// BATCHES
router.get("/batches", protect, getContactBatches);
router.patch("/batches/:batchId/rename", protect, renameContactBatch);

// BULK
router.post("/bulk-delete", protect, bulkDeleteContacts);
router.post("/import", protect, importContacts);

// ACTIONS
router.post("/:contactId/convert-to-lead", protect, convertContactToLead);
router.post("/:contactId/activities", protect, addContactActivity);

export default router;