import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { createAccount, deleteAccount, listAccountTransactions, listAccounts, startBanklinkConnection, updateAccount, uploadStatement } from "../controllers/accountController";

const router = Router();

router.use(authenticate);
router.get("/", listAccounts);
router.post("/", createAccount);
router.get("/:accountId/transactions", listAccountTransactions);
router.post("/:accountId/statements", uploadStatement);
router.patch("/:accountId", updateAccount);
router.delete("/:accountId", deleteAccount);
router.post("/:accountId/banklink/start", startBanklinkConnection);

export default router;
