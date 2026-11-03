import { Router } from "express";
import academics from "./academics";
import admin from "./admin";
import catalog from "./catalog";
import chat from "./chat";
import finance from "./finance";
import me from "./me";

const router = Router();
router.use(catalog, me, academics, finance, chat, admin);

export default router;
