export type ParsedStatementTransaction = {
  date: string;
  description: string;
  amount: number;
  direction: "debit" | "credit";
  balance: number | null;
  reference: string | null;
  counterparty: string | null;
  currency: string;
};

function parseCsvRows(content: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const next = content[index + 1];
    if (character === '"' && quoted && next === '"') {
      value += '"'; index += 1; continue;
    }
    if (character === '"') { quoted = !quoted; continue; }
    if (character === delimiter && !quoted) { row.push(value.trim()); value = ""; continue; }
    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value.trim()); value = "";
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      continue;
    }
    value += character;
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value.trim());
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }
  return rows;
}

function headerKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseAmount(value: string | undefined) {
  if (!value) return null;
  const normalized = value.replace(/[R$€£\s]/g, "").replace(/,/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function parseDate(value: string | undefined) {
  if (!value) return null;
  const clean = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return clean.slice(0, 10);
  const namedMonth = clean.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (namedMonth) {
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = monthNames.indexOf(namedMonth[2].slice(0, 3).toLowerCase());
    const date = new Date(Date.UTC(Number(namedMonth[3]), month, Number(namedMonth[1])));
    return month >= 0 && date.getUTCFullYear() === Number(namedMonth[3]) && date.getUTCMonth() === month && date.getUTCDate() === Number(namedMonth[1])
      ? date.toISOString().slice(0, 10)
      : null;
  }
  const parts = clean.split(/[/. -]/).map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) return null;
  const [first, second, third] = parts;
  const year = first > 31 ? first : third;
  const month = first > 31 ? second : second;
  const day = first > 31 ? third : first;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.toISOString().slice(0, 10)
    : null;
}

export function parseCsvStatement(content: string): ParsedStatementTransaction[] {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";
  const rows = parseCsvRows(content, delimiter);
  if (rows.length < 2) throw new Error("The CSV statement must contain a header and at least one transaction.");

  const headers = rows[0].map(headerKey);
  const find = (...names: string[]) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0);
  const dateIndex = find("date", "transactiondate", "valuedate");
  const descriptionIndex = find("description", "details", "narration", "transactiondescription");
  const amountIndex = find("amount", "transactionamount");
  const debitIndex = find("debit", "withdrawal", "moneyout");
  const creditIndex = find("credit", "deposit", "moneyin");
  const balanceIndex = find("balance", "runningbalance", "balanceafter");
  const referenceIndex = find("reference", "referencenumber");
  const counterpartyIndex = find("counterparty", "merchant", "payee");
  const currencyIndex = find("currency");

  if (dateIndex === undefined || descriptionIndex === undefined || (amountIndex === undefined && debitIndex === undefined && creditIndex === undefined)) {
    throw new Error("CSV must include date, description, and amount or debit/credit columns.");
  }

  return rows.slice(1).flatMap((row) => {
    const date = parseDate(row[dateIndex]);
    const description = row[descriptionIndex]?.trim();
    const debit = debitIndex === undefined ? null : parseAmount(row[debitIndex]);
    const credit = creditIndex === undefined ? null : parseAmount(row[creditIndex]);
    const rawAmount = amountIndex === undefined ? null : parseAmount(row[amountIndex]);
    const amount = debit != null && debit !== 0 ? Math.abs(debit) : credit != null && credit !== 0 ? Math.abs(credit) : rawAmount == null ? null : Math.abs(rawAmount);
    if (!date || !description || amount == null || amount === 0) return [];

    const direction = debit != null && debit !== 0 ? "debit" : credit != null && credit !== 0 ? "credit" : rawAmount != null && rawAmount < 0 ? "debit" : "credit";
    return [{ date, description, amount, direction, balance: balanceIndex === undefined ? null : parseAmount(row[balanceIndex]), reference: referenceIndex === undefined ? null : row[referenceIndex] || null, counterparty: counterpartyIndex === undefined ? null : row[counterpartyIndex] || null, currency: (currencyIndex === undefined ? "ZAR" : row[currencyIndex] || "ZAR").trim().toUpperCase() }];
  });
}
import { PDFParse } from "pdf-parse";

const bankAliases: Record<string, string[]> = {
  FNB: ["fnb", "first national bank", "first national"],
  Absa: ["absa", "absa bank"],
  Capitec: ["capitec", "capitec bank"],
  Nedbank: ["nedbank", "nedbank limited"],
  "Standard Bank": ["standard bank"],
  Discovery: ["discovery bank", "discovery"],
};

function bankMatches(text: string, bank: string) {
  const aliases = bankAliases[bank] ?? [bank.toLowerCase()];
  return aliases.some((alias) => text.toLowerCase().includes(alias));
}

function detectedBanks(text: string) {
  return Object.keys(bankAliases).filter((bank) => bankMatches(text, bank));
}


function parsePdfAmount(value: string) {
  const negative = value.includes("-") || (value.startsWith("(") && value.endsWith(")"));
  const normalized = value.replace(/[R$€£()\s]/g, "").replace(/,(?=\d{2}$)/, ".").replace(/,/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? (negative ? -Math.abs(amount) : Math.abs(amount)) : null;
}

export async function parsePdfStatement(content: Buffer, expectedBank: string): Promise<ParsedStatementTransaction[]> {
  const parser = new PDFParse({ data: content });
  try {
    const result = await parser.getText();
    const text = result.text.replace(/\u00a0/g, " ");
    if (!text.trim()) throw new Error("This PDF contains no selectable text. It may be scanned and require OCR.");
    const foundBanks = detectedBanks(text);
    if (!bankMatches(text, expectedBank)) {
      throw new Error(`The selected bank is ${expectedBank}, but this statement could not be verified as ${expectedBank}. Detected: ${foundBanks.join(", ") || "no supported bank"}. Select the matching bank or upload a statement that includes the bank name.`);
    }

    const transactions: ParsedStatementTransaction[] = [];
    const datePattern = "\\d{4}[-/]\\d{2}[-/]\\d{2}|\\d{1,2}[/.]\\d{1,2}[/.]\\d{4}|\\d{1,2}\\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{4}";
    const amountPattern = "(?:[R$€£]\\s*)?[-(]?\\d[\\d\\s,]*(?:[.,]\\d{2})\\)?";
    for (const line of text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
      const dateMatch = line.match(new RegExp(`\\b(${datePattern})\\b`, "i"));
      if (!dateMatch) continue;
      const date = parseDate(dateMatch[1]);
      const amountMatches = line.match(new RegExp(amountPattern, "g")) ?? [];
      const amounts = amountMatches.map(parsePdfAmount).filter((amount): amount is number => amount != null);
      if (!date || amounts.length === 0) continue;

      const transactionAmount = amounts.length > 1 ? amounts[amounts.length - 2] : amounts[0];
      const balance = amounts.length > 1 ? amounts[amounts.length - 1] : null;
      const description = line.replace(dateMatch[0], "").replace(new RegExp(amountPattern, "g"), " ").replace(/\s+/g, " ").trim();
      if (!description || transactionAmount === 0) continue;
      const lower = line.toLowerCase();
      const direction = transactionAmount < 0 || /\b(debit|withdrawal|payment)\b/.test(lower) ? "debit" : "credit";
      transactions.push({ date, description, amount: Math.abs(transactionAmount), direction, balance, reference: null, counterparty: null, currency: "ZAR" });
    }
    if (transactions.length === 0) throw new Error(`The ${expectedBank} statement identity was detected, but no transaction rows could be read. This bank layout may be unsupported or the PDF may be scanned.`);
    return transactions;
  } finally {
    await parser.destroy();
  }
}
