import crypto from "node:crypto";
import { Request, Response } from "express";
import { supabase } from "../src/config/supabase";
import { banklinkConfig } from "../src/config/banklink";
import { classifyTransaction } from "../services/transactionClassifier";

type BanklinkTransaction = {
  id?: string;
  account_number?: string | null;
  date?: string;
  description?: string;
  amount?: number | string;
  currency?: string;
  direction?: "debit" | "credit";
  balance?: number | null;
  reference?: string | null;
  counterparty?: string | null;
  merchant_name?: string | null;
};

type BanklinkPayload = {
  event?: string;
  reference?: string;
  account_number?: string | null;
  transactions?: BanklinkTransaction[];
  bank_profile_id?: string;
  link_request_id?: string;
};

type NormalizedTransaction = {
  external_id: string;
  transaction_date: string;
  description: string;
  reference: string | null;
  counterparty: string | null;
  currency: string;
  amount: number;
  balance_after: number | null;
  transaction_type: "income" | "expense" | "unknown";
  classification_source: "banklink";
  classification_status: "pending";
  raw_data: BanklinkTransaction;
};

function normalizeDate(value: string | undefined) {
  if (!value) return null;
  const date = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? null : date;
}

export function normalizeBanklinkTransaction(transaction: BanklinkTransaction, fallbackExternalId: string): NormalizedTransaction | null {
  const transactionDate = normalizeDate(transaction.date);
  const description = transaction.description?.trim();
  const amount = typeof transaction.amount === "number" ? transaction.amount : Number(transaction.amount);
  const currency = transaction.currency?.trim().toUpperCase() || "ZAR";

  if (!transactionDate || !description || !Number.isFinite(amount) || amount === 0 || !/^[A-Z]{3}$/.test(currency)) return null;

  return {
    external_id: transaction.id?.trim() || fallbackExternalId,
    transaction_date: transactionDate,
    description,
    reference: transaction.reference?.trim() || null,
    counterparty: transaction.counterparty?.trim() || transaction.merchant_name?.trim() || null,
    currency,
    amount: Math.abs(amount),
    balance_after: transaction.balance == null ? null : Number.isFinite(Number(transaction.balance)) ? Number(transaction.balance) : null,
    transaction_type: transaction.direction === "credit" ? "income" : transaction.direction === "debit" ? "expense" : "unknown",
    classification_source: "banklink",
    classification_status: "pending",
    raw_data: transaction,
  };
}

function verifySignature(rawBody: Buffer, header: string | undefined, secret: string) {
  if (!header) return false;
  const timestamp = header.split(",").find((part) => part.startsWith("t="))?.slice(2);
  const signatures = header.split(",").filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  const timestampNumber = Number(timestamp);

  if (!timestamp || !Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300 || signatures.length === 0) {
    return false;
  }

  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody.toString("utf8")}`).digest("hex");
  return signatures.some((signature) => {
    const actual = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
  });
}

export async function handleBanklinkWebhook(req: Request, res: Response) {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
  const signature = req.header("Banklink-Signature");
  const deliveryId = req.header("Banklink-Delivery");
  const eventName = req.header("Banklink-Event") || "unknown";

  if (!banklinkConfig.webhookSecret) {
    return res.status(503).json({ error: "BANKLINK_WEBHOOK_SECRET is not configured." });
  }
  if (!verifySignature(rawBody, signature, banklinkConfig.webhookSecret)) {
    return res.status(401).json({ error: "Invalid Banklink webhook signature." });
  }
  if (!deliveryId) {
    return res.status(400).json({ error: "Banklink-Delivery header is required." });
  }

  let payload: BanklinkPayload;
  try {
    payload = JSON.parse(rawBody.toString("utf8")) as BanklinkPayload;
  } catch {
    return res.status(400).json({ error: "Invalid webhook JSON." });
  }

  const { data: storedEvent, error: storeError } = await supabase
    .from("webhook_events")
    .insert({ provider: "banklink", delivery_id: deliveryId, event_type: eventName, payload, processing_status: "received" })
    .select("id")
    .single();

  if (storeError?.code === "23505") {
    return res.status(200).json({ received: true, duplicate: true });
  }
  if (storeError || !storedEvent) {
    return res.status(500).json({ error: storeError?.message ?? "Unable to store webhook event." });
  }

  try {
    const reference = payload.reference;
    const { data: connection } = reference
      ? await supabase.from("bank_connections").select("id, user_id, metadata").contains("metadata", { reference }).maybeSingle()
      : { data: null };

    if (!connection) {
      await supabase.from("webhook_events").update({ processing_status: "ignored", processed_at: new Date().toISOString(), error_message: "No matching Banklink connection." }).eq("id", storedEvent.id);
      return res.status(200).json({ received: true, ignored: true });
    }

    const { data: account } = await supabase.from("bank_accounts").select("id, metadata").eq("connection_id", connection.id).eq("user_id", connection.user_id).single();
    if (!account) throw new Error("No local account is linked to this Banklink connection.");

    const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];
    const rows = transactions.flatMap((transaction, index) => {
      const normalized = normalizeBanklinkTransaction(transaction, `${deliveryId}-${index}`);
      if (!normalized) return [];
      const classification = classifyTransaction({
        description: normalized.description,
        counterparty: normalized.counterparty,
        transactionType: normalized.transaction_type,
      });
      return [{
        user_id: connection.user_id,
        account_id: account.id,
        ...normalized,
        transaction_type: classification.transactionType,
        category: classification.category,
        classification_confidence: classification.confidence,
        classification_source: `rules:v1:${classification.rule}`,
        classification_status: classification.status,
      }];
    });

    if (rows.length > 0) {
      const { error: transactionError } = await supabase.from("transactions").upsert(rows, { onConflict: "account_id,external_id", ignoreDuplicates: true });
      if (transactionError) throw new Error(transactionError.message);

      const externalIds = rows.map((row) => row.external_id);
      const { data: storedTransactions, error: storedTransactionsError } = await supabase
        .from("transactions")
        .select("id, external_id, transaction_type, category, classification_confidence, classification_source, raw_data")
        .eq("account_id", account.id)
        .in("external_id", externalIds);
      if (storedTransactionsError) throw new Error(storedTransactionsError.message);

      const classificationRows = (storedTransactions ?? []).map((transaction) => {
        const source = String(transaction.classification_source ?? "rules:v1:no_matching_rule");
        const rule = source.split(":").slice(2).join(":") || "no_matching_rule";
        return {
          transaction_id: transaction.id,
          classifier_version: "rules:v1",
          transaction_type: transaction.transaction_type,
          category: transaction.category,
          confidence: transaction.classification_confidence,
          source: "rules",
          raw_result: { rule, source, provider_data: transaction.raw_data },
        };
      });

      if (classificationRows.length > 0) {
        const { error: classificationError } = await supabase
          .from("classification_results")
          .upsert(classificationRows, { onConflict: "transaction_id,classifier_version" });
        if (classificationError) throw new Error(classificationError.message);
      }
    }

    const connectionMetadata = { ...(connection.metadata as Record<string, unknown>), webhook_event: eventName, last_account_number: payload.account_number ?? null };
    await supabase.from("bank_connections").update({ status: "connected", external_profile_id: payload.bank_profile_id ?? null, last_synced_at: new Date().toISOString(), metadata: connectionMetadata }).eq("id", connection.id);
    await supabase.from("bank_accounts").update({ status: "connected", last_synced_at: new Date().toISOString(), metadata: { ...(account.metadata as Record<string, unknown>), banklink_account_number: payload.account_number ?? null } }).eq("id", account.id);
    await supabase.from("webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString() }).eq("id", storedEvent.id);

    return res.status(200).json({ received: true, processed: true, transactions: rows.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to process Banklink webhook.";
    await supabase.from("webhook_events").update({ processing_status: "failed", processed_at: new Date().toISOString(), error_message: message }).eq("id", storedEvent.id);
    return res.status(500).json({ error: message });
  }
}
