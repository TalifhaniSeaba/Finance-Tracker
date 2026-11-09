import express from "express"
import authRoutes from "./Routes/authRoutes"
import accountRoutes from "./Routes/accountRoutes"
import dotenv from "dotenv"
import cors from "cors"
import { handleBanklinkWebhook } from "./controllers/banklinkWebhookController"

dotenv.config();

const app = express();



app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
}));



app.post("/api/webhooks/banklink", express.raw({ type: "application/json" }), handleBanklinkWebhook);
app.use(express.json({ limit: "15mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);


app.get("/", (req, res) => {
  res.send("Backend is running ");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
