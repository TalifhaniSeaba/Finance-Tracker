import { Response } from "express";
import { supabase } from "../src/config/supabase";
import { AuthRequest } from "../middleware/authenticate";
import { banklinkBankId, banklinkConfig, banklinkRequest } from "../src/config/banklink";
import { classifyTransaction } from "../services/transactionClassifier";
import { parseCsvStatement, parsePdfStatement } from "../services/statementParser";
import crypto from "node:crypto";

type AccountSource = "banklink" | "statement";

function toAccount(row: Record<string, unknown>) {
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const source = metadata.source === "statement" ? "statement" : "banklink";

  return {
    id: row.id,
    name: row.name,
    bank: metadata.bank ?? "Unknown bank",
    number: row.account_last4 ?? "0000",
    source,
    status: row.status === "connected" ? "connected" : source === "statement" ? "statement_ready" : "awaiting_banklink",
    color: metadata.color ?? "green",
    balance: row.balance ?? 0,
    currency: row.currency ?? "ZAR",
    lastSyncedAt: row.last_synced_at ?? null,
    statementName: metadata.statement_name ?? undefined,
  };
}

export async function listAccounts(req: AuthRequest, res: Response) {
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("id, name, account_last4, balance, currency, status, last_synced_at, metadata, created_at")
    .eq("user_id", req.user!.id)
    .order("created_at", { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ accounts: (data ?? []).map(toAccount) });
}

export async function createAccount(req: AuthRequest, res: Response) {
  const { name, bank, last4, source, statementName } = req.body as {
    name?: string;
    bank?: string;
    last4?: string;
    source?: AccountSource;
    statementName?: string;
  };

  const trimmedName = name?.trim();
  const trimmedBank = bank?.trim();
  const normalizedLast4 = last4?.replace(/\D/g, "").slice(-4);

  if (!trimmedName || !trimmedBank || !source || !["banklink", "statement"].includes(source)) {
    return res.status(400).json({ error: "Account name, bank, and a valid connection method are required." });
  }

  if (normalizedLast4 && normalizedLast4.length !== 4) {
    return res.status(400).json({ error: "The account number must contain four digits." });
  }

  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({
      user_id: req.user!.id,
      name: trimmedName,
      account_last4: normalizedLast4 || null,
      status: "pending",
      metadata: {
        bank: trimmedBank,
        source,
        ...(statementName ? { statement_name: statementName } : {}),
      },
    })
    .select("id, name, account_last4, balance, currency, status, last_synced_at, metadata, created_at")
    .single();

  if (error || !data) {
    return res.status(500).json({ error: error?.message ?? "Unable to create account." });
  }

  return res.status(201).json({ account: toAccount(data) });
}

export async function startBanklinkConnection(req: AuthRequest, res: Response) {
  const accountId = req.params.accountId;
  const { data: account, error: accountError } = await supabase
    .from("bank_accounts")
    .select("id, name, account_last4, balance, status, metadata, connection_id")
    .eq("id", accountId)
    .eq("user_id", req.user!.id)
    .single();

  if (accountError || !account) {
    return res.status(404).json({ error: "Account not found." });
  }

  const metadata = (account.metadata ?? {}) as Record<string, unknown>;
  if (metadata.source !== "banklink") {
    return res.status(400).json({ error: "Only Banklink accounts can start a Banklink connection." });
  }

  if (account.connection_id && account.status === "connected") {
    return res.status(200).json({ account: toAccount(account), alreadyConnected: true });
  }

  const bankId = banklinkBankId(String(metadata.bank ?? ""));
  if (!bankId) {
    return res.status(400).json({ error: "This bank is not supported by Banklink." });
  }

  const reference = `finats:${req.user!.id}:${account.id}`;
  let requestData: { id: string; reference: string; url: string; status: string };
  try {
    requestData = await banklinkRequest<{ id: string; reference: string; url: string; status: string }>("/link-requests", {
      method: "POST",
      body: JSON.stringify({
        reference,
        name: `${account.name} connection`,
        bank_id: bankId,
        destinations: banklinkConfig.webhookUrl ? [{ type: "webhook", url: banklinkConfig.webhookUrl }] : [],
        save_data: true,
        redirect_url: banklinkConfig.redirectUrl,
      }),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to create the Banklink link request.";
    return res.status(502).json({ error: message });
  }

  const connectionMetadata = { reference, link_request_id: requestData.id, link_request_url: requestData.url, link_request_status: requestData.status };
  const { data: connection, error: connectionError } = await supabase
    .from("bank_connections")
    .insert({
      user_id: req.user!.id,
      provider: "banklink",
      connection_method: "banklink",
      bank_name: String(metadata.bank),
      status: "processing",
      metadata: connectionMetadata,
    })
    .select("id, provider, status, external_profile_id")
    .single();

  if (connectionError || !connection) {
    return res.status(500).json({ error: connectionError?.message ?? "Unable to save the Banklink connection." });
  }

  const updatedMetadata = { ...metadata, banklink_reference: reference, link_request_id: requestData.id, link_request_url: requestData.url };
  const { data: updatedAccount, error: updateError } = await supabase
    .from("bank_accounts")
    .update({ connection_id: connection.id, status: "processing", metadata: updatedMetadata })
    .eq("id", account.id)
    .eq("user_id", req.user!.id)
    .select("id, name, account_last4, balance, status, metadata, connection_id")
    .single();

  if (updateError || !updatedAccount) {
    await supabase.from("bank_connections").delete().eq("id", connection.id).eq("user_id", req.user!.id);
    return res.status(500).json({ error: updateError?.message ?? "Unable to connect the account." });
  }

  return res.status(200).json({ account: toAccount(updatedAccount), connection, authorizationUrl: requestData.url });
}

export async function listAccountTransactions(req: AuthRequest, res: Response) {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, account_id, description, counterparty, reference, category, amount, currency, transaction_type, transaction_date")
    .eq("account_id", req.params.accountId)
    .eq("user_id", req.user!.id)
    .order("transaction_date", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ transactions: (data ?? []).map((transaction) => ({
    id: transaction.id,
    accountId: transaction.account_id,
    name: transaction.description,
    counterparty: transaction.counterparty ?? undefined,
    reference: transaction.reference ?? undefined,
    currency: transaction.currency,
    category: transaction.category ?? "Uncategorised",
    amount: Number(transaction.amount),
    type: transaction.transaction_type === "income" ? "income" : "expense",
    date: transaction.transaction_date,
  })) });
}

export async function uploadStatement(req: AuthRequest, res: Response) {
  const accountId = req.params.accountId;
  const { fileName, mimeType, contentBase64 } = req.body as { fileName?: string; mimeType?: string; contentBase64?: string };
  if (!fileName || !contentBase64) return res.status(400).json({ error: "A statement file is required." });
  if (contentBase64.length > 14_000_000) return res.status(413).json({ error: "The statement file is too large." });

  const { data: account, error: accountError } = await supabase
    .from("bank_accounts")
    .select("id, name, account_last4, balance, currency, status, last_synced_at, metadata")
    .eq("id", accountId)
    .eq("user_id", req.user!.id)
    .single();
  if (accountError || !account) return res.status(404).json({ error: "Account not found." });

  const isCsv = mimeType === "text/csv" || fileName.toLowerCase().endsWith(".csv");
  const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  if (!isCsv && !isPdf) return res.status(415).json({ error: "Only CSV and PDF statements are supported." });

  const buffer = Buffer.from(contentBase64, "base64");
  const importId = crypto.randomUUID();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${req.user!.id}/${accountId}/${importId}-${safeFileName}`;
  const { error: uploadError } = await supabase.storage.from("statements").upload(storagePath, buffer, { contentType: mimeType || "text/csv", upsert: false });
  if (uploadError) return res.status(500).json({ error: `Unable to store statement: ${uploadError.message}` });

  const { data: statementImport, error: importError } = await supabase.from("statement_imports").insert({ id: importId, user_id: req.user!.id, account_id: accountId, file_name: fileName, storage_path: storagePath, mime_type: mimeType || "text/csv", file_size_bytes: buffer.byteLength, status: "processing" }).select("id").single();
  if (importError || !statementImport) return res.status(500).json({ error: importError?.message ?? "Unable to create statement import." });

  try {
    const parsed = isCsv ? parseCsvStatement(buffer.toString("utf8")) : await parsePdfStatement(buffer);
    const rows = parsed.map((transaction, index) => {
      const classification = classifyTransaction({ description: transaction.description, counterparty: transaction.counterparty, transactionType: transaction.direction === "credit" ? "income" : "expense" });
      return { user_id: req.user!.id, account_id: accountId, external_id: `statement:${importId}:${index}`, transaction_date: transaction.date, description: transaction.description, reference: transaction.reference, counterparty: transaction.counterparty, currency: transaction.currency, amount: transaction.amount, balance_after: transaction.balance, transaction_type: classification.transactionType, category: classification.category, classification_confidence: classification.confidence, classification_source: `rules:v1:${classification.rule}`, classification_status: classification.status, raw_data: transaction };
    });

    if (rows.length > 0) {
      const { error: transactionError } = await supabase.from("transactions").upsert(rows, { onConflict: "account_id,external_id" });
      if (transactionError) throw new Error(transactionError.message);
      const { data: storedTransactions, error: storedError } = await supabase.from("transactions").select("id, transaction_type, category, classification_confidence, classification_source, raw_data").eq("account_id", accountId).in("external_id", rows.map((row) => row.external_id));
      if (storedError) throw new Error(storedError.message);
      const classificationRows = (storedTransactions ?? []).map((transaction) => ({ transaction_id: transaction.id, classifier_version: "rules:v1", transaction_type: transaction.transaction_type, category: transaction.category, confidence: transaction.classification_confidence, source: "rules", raw_result: { source: transaction.classification_source, provider_data: transaction.raw_data } }));
      if (classificationRows.length > 0) {
        const { error: classificationError } = await supabase.from("classification_results").upsert(classificationRows, { onConflict: "transaction_id,classifier_version" });
        if (classificationError) throw new Error(classificationError.message);
      }
    }

    const latestBalance = [...parsed].reverse().find((transaction) => transaction.balance != null)?.balance ?? null;
    const now = new Date().toISOString();
    const { data: updatedAccount, error: accountUpdateError } = await supabase.from("bank_accounts").update({ status: "connected", balance: latestBalance, last_synced_at: now, metadata: { ...((account.metadata ?? {}) as Record<string, unknown>), source: "statement", statement_name: fileName } }).eq("id", accountId).eq("user_id", req.user!.id).select("id, name, account_last4, balance, currency, status, last_synced_at, metadata, created_at").single();
    if (accountUpdateError || !updatedAccount) throw new Error(accountUpdateError?.message ?? "Unable to update account after import.");
    await supabase.from("statement_imports").update({ status: "completed", transaction_count: rows.length, processed_at: now }).eq("id", importId);
    return res.status(201).json({ import: { id: importId, status: "completed", transactionCount: rows.length }, account: toAccount(updatedAccount) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to parse statement.";
    await supabase.from("statement_imports").update({ status: "failed", error_message: message }).eq("id", importId);
    return res.status(422).json({ error: message });
  }
}

export async function updateAccount(req: AuthRequest, res: Response) {
  const accountId = req.params.accountId;
  const { name, bank, last4 } = req.body as { name?: string; bank?: string; last4?: string };
  const trimmedName = name?.trim();
  const trimmedBank = bank?.trim();
  const normalizedLast4 = last4?.replace(/\D/g, "").slice(-4);

  if (!trimmedName || !trimmedBank) {
    return res.status(400).json({ error: "Account name and bank are required." });
  }
  if (normalizedLast4 && normalizedLast4.length !== 4) {
    return res.status(400).json({ error: "The account number must contain four digits." });
  }

  const { data: current, error: currentError } = await supabase
    .from("bank_accounts")
    .select("id, metadata")
    .eq("id", accountId)
    .eq("user_id", req.user!.id)
    .single();

  if (currentError || !current) return res.status(404).json({ error: "Account not found." });

  const metadata = (current.metadata ?? {}) as Record<string, unknown>;
  const { data, error } = await supabase
    .from("bank_accounts")
    .update({
      name: trimmedName,
      account_last4: normalizedLast4 || null,
      metadata: { ...metadata, bank: trimmedBank },
    })
    .eq("id", accountId)
    .eq("user_id", req.user!.id)
    .select("id, name, account_last4, balance, currency, status, last_synced_at, metadata, created_at")
    .single();

  if (error || !data) return res.status(500).json({ error: error?.message ?? "Unable to update account." });
  return res.status(200).json({ account: toAccount(data) });
}

export async function deleteAccount(req: AuthRequest, res: Response) {
  const { error } = await supabase
    .from("bank_accounts")
    .delete()
    .eq("id", req.params.accountId)
    .eq("user_id", req.user!.id);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).send();
}
