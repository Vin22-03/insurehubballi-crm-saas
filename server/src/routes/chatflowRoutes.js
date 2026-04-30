import express from "express";
import { renderAdvisorChatflow } from "../controllers/chatflowController.js";

const router = express.Router();

router.get("/:phone", renderAdvisorChatflow);

export default router;