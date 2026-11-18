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

function parsePdfDate(value: string | undefined, fallbackYear: number | null) {
  const parsed = parseDate(value);
  if (parsed || !value || fallbackYear == null) return parsed;
  return parseDate(`${value.trim()} ${fallbackYear}`);
}

// A statement contains many date/amount pairs that are not transactions.
// These are labels for metadata or totals, not merchant activity.
const nonTransactionDescriptionPatterns = [
  /^(?:opening|closing|available|current|ledger)\s+balance\b/i,
  /^(?:balance\s+(?:brought|carried)\s+forward)\b/i,
  /^(?:account\s+)?(?:summary|totals?|subtotals?)\b/i,
  /^(?:statement|account)\s+(?:period|details?|information)\b/i,
  /^(?:page|branch|sort\s+code|account\s+(?:number|no\.?))\b/i,
  /^(?:from|to|as\s+of|period)\s*:/i,
];

function isLikelyTransactionDescription(value: string | undefined) {
  const description = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!/[A-Za-z]{2,}/.test(description)) return false;
  return !nonTransactionDescriptionPatterns.some((pattern) => pattern.test(description));
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
    if (!date || !isLikelyTransactionDescription(description) || amount == null || amount === 0) return [];

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
  const debit = /dr\s*$/i.test(value);
  const negative = debit || value.includes("-") || (value.startsWith("(") && value.endsWith(")"));
  const normalized = value.replace(/[R$€£()\s]/g, "").replace(/(?:cr|dr)$/i, "").replace(/,(?=\d{2}$)/, ".").replace(/,/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? (negative ? -Math.abs(amount) : Math.abs(amount)) : null;
}

export async function parsePdfStatement(content: Buffer, expectedBank: string): Promise<ParsedStatementTransaction[]> {
  const parser = new PDFParse({ data: content });
  try {
    const result = await parser.getText({ lineEnforce: true, cellSeparator: "\t", cellThreshold: 7 });
    const text = result.text.replace(/\u00a0/g, " ");
    if (!text.trim()) throw new Error("This PDF contains no selectable text. It may be scanned and require OCR.");
    const foundBanks = detectedBanks(text);
    if (!bankMatches(text, expectedBank)) {
      throw new Error(`The selected bank is ${expectedBank}, but this statement could not be verified as ${expectedBank}. Detected: ${foundBanks.join(", ") || "no supported bank"}. Select the matching bank or upload a statement that includes the bank name.`);
    }

    const transactions: ParsedStatementTransaction[] = [];
    const fallbackYearMatch = text.match(/\b(20\d{2})\b/);
    const fallbackYear = fallbackYearMatch ? Number(fallbackYearMatch[1]) : null;
    const datePattern = "\\d{4}[-/]\\d{2}[-/]\\d{2}|\\d{1,2}[/.]\\d{1,2}[/.]\\d{4}|\\d{1,2}\\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\\s+\\d{4})?";
    const amountPattern = "(?:[R$€£]\\s*)?[-(]?\\d[\\d\\s,]*(?:[.,]\\d{2})\\)?\\s*(?:Cr|Dr)?";
    for (const line of text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
      // Transaction rows in supported statements begin with their posting date.
      // Searching for a date anywhere would also capture statement periods,
      // headers, and explanatory text containing an amount.
      const dateMatch = line.match(new RegExp(`^(?:[-*•]\\s*)?(${datePattern})\\b`, "i"));
      if (!dateMatch) continue;
      const date = parsePdfDate(dateMatch[1], fallbackYear);
      const amountMatches = line.match(new RegExp(amountPattern, "g")) ?? [];
      const amounts = amountMatches.map(parsePdfAmount).filter((amount): amount is number => amount != null);
      if (!date || amounts.length === 0) continue;

      const transactionAmount = amounts.length > 1 ? amounts[amounts.length - 2] : amounts[0];
      const balance = amounts.length > 1 ? amounts[amounts.length - 1] : null;
      const description = line.replace(dateMatch[0], "").replace(new RegExp(amountPattern, "g"), " ").replace(/\s+/g, " ").trim();
      if (!isLikelyTransactionDescription(description) || transactionAmount === 0) continue;
      const lower = line.toLowerCase();
      const direction = transactionAmount < 0 || /\b(debit|withdrawal|payment|dr)\b/.test(lower) ? "debit" : "credit";
      transactions.push({ date, description, amount: Math.abs(transactionAmount), direction, balance, reference: null, counterparty: null, currency: "ZAR" });
    }

    // Some FNB PDFs preserve the visible table but do not expose complete
    // transaction rows in plain-text extraction. Use the library's cell-aware
    // table extraction as a fallback for that layout.
    if (transactions.length === 0) {
      const tableResult = await parser.getTable();
      const tableRows = tableResult.mergedTables.flat();
      const tableAmountPattern = /^(?:[R$€£]\s*)?[-(]?\d[\d\s,]*(?:[.,]\d{2})\)?\s*(?:Cr|Dr)?$/i;
      for (const row of tableRows) {
        const cells = row.map((cell) => cell.replace(/\s+/g, " ").trim()).filter(Boolean);
        if (cells.length < 3) continue;
        const dateCellIndex = cells.findIndex((cell) => parsePdfDate(cell, fallbackYear) != null);
        if (dateCellIndex < 0) continue;
        const date = parsePdfDate(cells[dateCellIndex], fallbackYear);
        const amountCells = cells
          .map((cell, index) => ({ cell, index, amount: tableAmountPattern.test(cell) ? parsePdfAmount(cell) : null }))
          .filter((item): item is { cell: string; index: number; amount: number } => item.amount != null);
        if (!date || amountCells.length === 0) continue;
        const transactionAmount = amountCells.length > 1 ? amountCells[amountCells.length - 2].amount : amountCells[0].amount;
        const balance = amountCells.length > 1 ? amountCells[amountCells.length - 1].amount : null;
        const description = cells.slice(dateCellIndex + 1, amountCells[0].index).join(" ");
        if (!isLikelyTransactionDescription(description) || transactionAmount === 0) continue;
        const lower = row.join(" ").toLowerCase();
        const direction = transactionAmount < 0 || /\b(debit|withdrawal|payment|dr)\b/.test(lower) ? "debit" : "credit";
        transactions.push({ date, description, amount: Math.abs(transactionAmount), direction, balance, reference: null, counterparty: null, currency: "ZAR" });
      }
    }
    if (transactions.length === 0) throw new Error(`The ${expectedBank} statement identity was detected, but no transaction rows could be read. This bank layout may be unsupported or the PDF may be scanned.`);
    return transactions;
  } finally {
    await parser.destroy();
  }
}
