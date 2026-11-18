import { PDFParse } from "pdf-parse";

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

export const bankAliases: Record<string, string[]> = {
  FNB: ["fnb", "first national bank", "first national", "firstrand", "first rand", "rmb", "rand merchant bank", "wesbank"],
  Absa: ["absa", "absa bank", "absa bank limited"],
  Capitec: ["capitec", "capitec bank", "capitec bank limited"],
  Nedbank: ["nedbank", "nedbank limited", "nedbank ltd"],
  "Standard Bank": ["standard bank", "the standard bank of south africa", "standard bank south africa", "standardbank", "sbsa"],
  Discovery: ["discovery", "discovery bank", "discovery bank limited"],
};

export function bankMatches(text: string, bank: string): boolean {
  const normalizedText = text.toLowerCase();
  const normalizedBank = bank.toLowerCase().trim();
  const aliases = bankAliases[bank] ?? [normalizedBank];
  return aliases.some((alias) => normalizedText.includes(alias));
}

export function detectedBanks(text: string): string[] {
  return Object.keys(bankAliases).filter((bank) => bankMatches(text, bank));
}

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function parseDate(value: string | undefined, fallbackYear: number | null = null): string | null {
  if (!value) return null;
  const clean = value.trim();

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
      return date.toISOString().slice(0, 10);
    }
  }

  // 2. Named month format: 25 Mar 2026 or 25 March 2026 or 28 Dec 26 or 25 Mar
  const namedMatch = clean.match(/^(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{2,4}))?/);
  if (namedMatch) {
    const day = Number(namedMatch[1]);
    const monthStr = namedMatch[2].slice(0, 3).toLowerCase();
    const monthIndex = MONTH_NAMES.indexOf(monthStr);
    let year = namedMatch[3] ? Number(namedMatch[3]) : fallbackYear;
    if (year != null && year < 100) year = year > 50 ? 1900 + year : 2000 + year;

    if (monthIndex >= 0 && year != null) {
      const date = new Date(Date.UTC(year, monthIndex, day));
      if (date.getUTCFullYear() === year && date.getUTCMonth() === monthIndex && date.getUTCDate() === day) {
        return date.toISOString().slice(0, 10);
      }
    }
  }

  // 3. Numeric formats: DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, DD/MM/YY, or DD/MM
  const numPartsMatch = clean.match(/^(\d{1,2})[/. -](\d{1,2})(?:[/. -](\d{2,4}))?/);
  if (numPartsMatch) {
    const day = Number(numPartsMatch[1]);
    const month = Number(numPartsMatch[2]);
    let year = numPartsMatch[3] ? Number(numPartsMatch[3]) : fallbackYear;
    if (year != null && year < 100) year = year > 50 ? 1900 + year : 2000 + year;

    if (year != null && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(Date.UTC(year, month - 1, day));
      if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
        return date.toISOString().slice(0, 10);
      }
    }
  }

  return null;
}

const MAX_FINANCIAL_AMOUNT = 100_000_000_000; // 100 billion ZAR; prevents numeric(14,2) overflow

function parseAmount(value: string | undefined): number | null {
  if (!value) return null;
  const isNegative = value.includes("-") || (value.startsWith("(") && value.endsWith(")")) || /dr\s*$/i.test(value);
  const normalized = value
    .replace(/[R$€£()\s]/g, "")
    .replace(/(?:cr|dr)$/i, "")
    .replace(/-(?=$)/, "")
    .replace(/^[-+]/, "")
    .replace(/,(?=\d{2}$)/, ".")
    .replace(/,/g, "");
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || Math.abs(amount) >= MAX_FINANCIAL_AMOUNT) return null;
  return isNegative ? -Math.abs(amount) : Math.abs(amount);
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
  /^(?:tax\s+invoice|vat\s+registration|vat\s+reg)\b/i,
  /^(?:date\s+description\s+amount|posting\s+date\s+transaction\s+date)\b/i,
  /^(?:charges|fees\s+summary|bank\s+charges\s+summary)\b/i,
  /^(?:interest\s+rate|annual\s+turnover|credit\s+limit)\b/i,
];

function isLikelyTransactionDescription(value: string | undefined): boolean {
  const description = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!/[A-Za-z]{2,}/.test(description)) return false;
  return !nonTransactionDescriptionPatterns.some((pattern) => pattern.test(description));
}

const KNOWN_SOUTH_AFRICAN_BRANDS = [
  "Checkers", "Pick n Pay", "PnP", "Woolworths", "Spar", "Shoprite", "Boxer", "Food Lovers Market",
  "Takealot", "Amazon", "Clicks", "Dis-Chem", "Makro", "Game", "Mr Price", "Cotton On", "Zara", "H&M",
  "Uber Eats", "Mr D", "Nando's", "KFC", "McDonalds", "Steers", "Spur", "Debonairs", "Wimpy", "Mugg & Bean",
  "Uber", "Bolt", "Shell", "Engen", "BP", "Total", "Sasol", "Caltex", "Astron",
  "Netflix", "Spotify", "DStv", "Showmax", "YouTube", "Apple", "Google",
  "Vodacom", "MTN", "Telkom", "Cell C", "Rain", "City of Joburg", "City of Cape Town", "Eskom",
  "Virgin Active", "Planet Fitness"
];

const GENERIC_COUNTERPARTY_WORDS = new Set([
  "deposit", "payment", "transfer", "credit", "debit", "withdrawal", "transaction", "purchase", "fee", "order"
]);

export function extractCounterparty(description: string): string | null {
  const clean = description.trim();

  // 1. FNB OB PMT <Counterparty> [Ref: ...]
  const fnbPmt = clean.match(/\bFNB\s+OB\s+PMT\s+([^,;:\n]+?)(?=\s+(?:Ref|Reference|Inv|#|\d{6,})|\s*$)/i);
  if (fnbPmt && fnbPmt[1].trim()) {
    const val = fnbPmt[1].trim();
    if (!GENERIC_COUNTERPARTY_WORDS.has(val.toLowerCase())) return val;
  }

  // 2. [EFT/IB/Digital] Payment / Transfer to <Counterparty>
  const pmtTo = clean.match(/\b(?:(?:IB|EFT|DIGITAL|ONLINE|ELECTRONIC|APP|IMMEDIATE)\s*(?:PAYMENT|PMT|PYMT|TRANSFER)?|(?:PAYMENT|PMT|PYMT|TRANSFER))\s+(?:TO|FOR)\s+([^,;:\n]+?)(?=\s+(?:Ref|Reference|Inv|#|\d{6,})|\s*$)/i);
  if (pmtTo && pmtTo[1].trim()) {
    const val = pmtTo[1].trim();
    if (!GENERIC_COUNTERPARTY_WORDS.has(val.toLowerCase())) return val;
  }

  // 3. Salary / Wages [from] <Counterparty>
  const salaryMatch = clean.match(/\b(?:SALARY(?:\s*\/\s*WAGES)?|WAGES)\s+(?:DEPOSIT\s+)?(?:FROM\s+|BY\s+)?([^,;:\n]+?)(?=\s+(?:Ref|Reference|Inv|#|\d{6,})|\s*$)/i);
  if (salaryMatch && salaryMatch[1].trim()) {
    const val = salaryMatch[1].trim();
    if (!GENERIC_COUNTERPARTY_WORDS.has(val.toLowerCase())) return val;
  }

  // 4. POS / Card Purchase [at] <Merchant>
  const cardPurchase = clean.match(/\b(?:POS|CARD|DEBIT CARD|CREDIT CARD)\s+PURCHASE(?:\s+-\s*|\s+AT\s+|\s+)?(?:(?:\(?\d{1,2}[/.-]\d{1,2}\)?|\d{1,2}\s+[A-Za-z]{3})\s+)?([^,;:\n]+?)(?=\s+(?:Card|Ref|On|\d{6,})|\s*$)/i);
  if (cardPurchase && cardPurchase[1].trim()) {
    const val = cardPurchase[1].trim();
    if (!GENERIC_COUNTERPARTY_WORDS.has(val.toLowerCase())) return val;
  }

  // 5. Debit order / Stop order / Magtape debit <Company>
  const orderMatch = clean.match(/\b(?:DEBIT ORDER|STOP ORDER|MAGTAPE DEBIT)(?:\s+(?:TO|FOR))?\s+([^,;:\n]+?)(?=\s+(?:Ref|Reference|Inv|#|\d{6,})|\s*$)/i);
  if (orderMatch && orderMatch[1].trim()) {
    const val = orderMatch[1].trim();
    if (!GENERIC_COUNTERPARTY_WORDS.has(val.toLowerCase())) return val;
  }

  // 6. Match prominent South African brands
  for (const brand of KNOWN_SOUTH_AFRICAN_BRANDS) {
    const brandRegex = new RegExp(`\\b${brand.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}\\b`, "i");
    if (brandRegex.test(clean)) return brand;
  }

  return null;
}

export function extractReference(description: string): string | null {
  // 1. Explicit Ref / Reference / Inv / Invoice
  const refMatch = description.match(/\b(?:REF(?:ERENCE)?|INV(?:OICE)?)(?:\s*NO\.?)?[\s:#]+([A-Za-z0-9/_.-]+)/i);
  if (refMatch && refMatch[1].trim()) return refMatch[1].trim();

  // 2. Card No (must be digits/masking, e.g. CARD NO. 4718 or CARD *1234)
  const cardMatch = description.match(/\bCARD(?:\s*(?:NO\.?|NUMBER))?[\s:#]+([*0-9Xx]{4,}(?:[-* ]*[0-9Xx]{4})*)\b/i);
  if (cardMatch && cardMatch[1].trim()) return cardMatch[1].trim();

  // 3. Beneficiary reference
  const benMatch = description.match(/\b(?:BEN|BENE|BENEFICIARY)\s*REF[\s:#]+([A-Za-z0-9/_.-]+)/i);
  if (benMatch && benMatch[1].trim()) return benMatch[1].trim();

  return null;
}

export function extractYearContext(text: string): { fallbackYear: number | null; periodStartYear: number | null; periodEndYear: number | null } {
  // Check for statement period: e.g. "From 01 Jan 2025 to 31 Jan 2026" or "Statement Period: 2026-01-01 to 2026-01-31"
  const periodMatch = text.match(/(?:statement\s*period|period|from\s*date|from)\b[^\n\r]*?(\b20\d{2}\b)[^\n\r]*?(?:to\s*date|to|until|-)\b[^\n\r]*?(\b20\d{2}\b)/i);
  if (periodMatch) {
    const startYear = Number(periodMatch[1]);
    const endYear = Number(periodMatch[2]);
    return { fallbackYear: endYear, periodStartYear: startYear, periodEndYear: endYear };
  }

  // Check for single date in statement header: "Statement Date : 25 March 2026" or "Date : 2026-03-25"
  const dateHeaderMatch = text.match(/(?:statement\s*date|tax\s*invoice\s*date|date\s*printed|print\s*date)\s*[:]\s*[^\n\r]*?(\b20\d{2}\b)/i);
  if (dateHeaderMatch) {
    const year = Number(dateHeaderMatch[1]);
    return { fallbackYear: year, periodStartYear: year, periodEndYear: year };
  }

  // Check for any 4-digit year 2020-2035 in the first 1500 characters
  const headerSample = text.slice(0, 1500);
  const years = [...headerSample.matchAll(/\b(202\d|203\d)\b/g)].map((m) => Number(m[1]));
  const mostRecentYear = years.length > 0 ? Math.max(...years) : null;

  return { fallbackYear: mostRecentYear, periodStartYear: mostRecentYear, periodEndYear: mostRecentYear };
}

// Amount pattern requiring boundary or whitespace before R so that words ending in R
// (such as HYPER, UBER, ORDER, TRANSFER, WATER) do not have their trailing R eaten,
// and strictly requiring standardized grouping so card numbers with spaces are not merged.
const AMOUNT_REGEX = /(?:(?<=\s|^)[R$€£]\s*|\b[R$€£]\s*)?([-(]?(?:\b\d{1,3}(?:[ ,]\d{3})+(?!\d)|\b\d+)(?:\.\d{2}|,\d{2})\)?\s*(?:Cr|Dr|-|\+)?(?=\s|$|[),;]))|(?<=\s|^)((?:\b\d{1,3}(?:[ ,]\d{3})+(?!\d)|\b\d+)(?:\.\d{2}|,\d{2})\s*[-](?=\s|$|[),;]))/gi;

function parseRawAmount(raw: string) {
  const clean = raw.trim();
  const isCredit = /(?:cr|\+)\s*$/i.test(clean);
  const isDebit = /(?:dr|-)\s*$/i.test(clean) || /^[-(]/.test(clean);
  const normalized = clean
    .replace(/[R$€£()\s]/g, "")
    .replace(/(?:cr|dr)$/i, "")
    .replace(/-(?=$)/, "")
    .replace(/^[-+]/, "")
    .replace(/,(?=\d{2}$)/, ".")
    .replace(/,/g, "");
  const num = Number(normalized);
  if (!Number.isFinite(num) || Math.abs(num) >= MAX_FINANCIAL_AMOUNT) return null;
  return {
    value: Math.abs(num),
    isCredit,
    isDebit,
    raw: clean,
  };
}

function extractAmountsFromLine(line: string) {
  const matches = [...line.matchAll(AMOUNT_REGEX)];
  return matches.map((m) => {
    const raw = m[0].trim();
    const parsed = parseRawAmount(raw);
    return {
      raw,
      index: m.index ?? 0,
      length: raw.length,
      parsed,
    };
  }).filter((item): item is { raw: string; index: number; length: number; parsed: NonNullable<ReturnType<typeof parseRawAmount>> } => item.parsed != null);
}

const DATE_START_REGEX = /^(?:[-*•]\s*)?((?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2})|(?:\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)|(?:\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{2,4})?))\b/i;
const SECOND_DATE_REGEX = /^\s+((?:\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)|(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}))\b/i;

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

export function parseCsvStatement(content: string): ParsedStatementTransaction[] {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";
  const rows = parseCsvRows(content, delimiter);
  if (rows.length < 2) throw new Error("The CSV statement must contain a header and at least one transaction.");

  // Detect header row even if preceded by metadata lines
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const candidateHeaders = rows[i].map(headerKey);
    const hasDate = candidateHeaders.some((h) => ["date", "transactiondate", "valuedate", "postingdate"].includes(h));
    const hasDesc = candidateHeaders.some((h) => ["description", "details", "narration", "transactiondescription"].includes(h));
    const hasMoney = candidateHeaders.some((h) => ["amount", "debit", "credit", "moneyin", "moneyout", "moneyinr", "moneyoutr"].includes(h));
    if (hasDate && (hasDesc || hasMoney)) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = rows[headerRowIndex].map(headerKey);
  const find = (...names: string[]) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0);
  const dateIndex = find("date", "transactiondate", "valuedate", "postingdate");
  const descriptionIndex = find("description", "details", "narration", "transactiondescription");
  const amountIndex = find("amount", "transactionamount");
  const debitIndex = find("debit", "withdrawal", "moneyout", "moneyoutr");
  const creditIndex = find("credit", "deposit", "moneyin", "moneyinr");
  const balanceIndex = find("balance", "runningbalance", "balanceafter", "balancer");
  const referenceIndex = find("reference", "referencenumber");
  const counterpartyIndex = find("counterparty", "merchant", "payee");
  const currencyIndex = find("currency");

  if (dateIndex === undefined || descriptionIndex === undefined || (amountIndex === undefined && debitIndex === undefined && creditIndex === undefined)) {
    throw new Error("CSV must include date, description, and amount or debit/credit columns.");
  }

  return rows.slice(headerRowIndex + 1).flatMap((row) => {
    const date = parseDate(row[dateIndex]);
    const rawDescription = row[descriptionIndex]?.trim();
    const debit = debitIndex === undefined ? null : parseAmount(row[debitIndex]);
    const credit = creditIndex === undefined ? null : parseAmount(row[creditIndex]);
    const rawAmount = amountIndex === undefined ? null : parseAmount(row[amountIndex]);
    const amount = debit != null && debit !== 0 ? Math.abs(debit) : credit != null && credit !== 0 ? Math.abs(credit) : rawAmount == null ? null : Math.abs(rawAmount);
    if (!date || !isLikelyTransactionDescription(rawDescription) || amount == null || amount === 0) return [];

    const direction = debit != null && debit !== 0 ? "debit" : credit != null && credit !== 0 ? "credit" : rawAmount != null && rawAmount < 0 ? "debit" : "credit";
    const description = rawDescription!;
    const reference = referenceIndex !== undefined && row[referenceIndex] ? row[referenceIndex].trim() : extractReference(description);
    const counterparty = counterpartyIndex !== undefined && row[counterpartyIndex] ? row[counterpartyIndex].trim() : extractCounterparty(description);
    const rawBalance = balanceIndex === undefined ? null : parseAmount(row[balanceIndex]);

    return [{
      date,
      description,
      amount,
      direction,
      balance: rawBalance,
      reference: reference || null,
      counterparty: counterparty || null,
      currency: (currencyIndex === undefined ? "ZAR" : row[currencyIndex] || "ZAR").trim().toUpperCase()
    }];
  });
}

export async function parsePdfStatement(content: Buffer, expectedBank: string): Promise<ParsedStatementTransaction[]> {
  const parser = new PDFParse({ data: content });
  try {
    const result = await parser.getText({ lineEnforce: true, cellSeparator: "\t", cellThreshold: 7, pageJoiner: "\n" });
    const text = result.text.replace(/\u00a0/g, " ");
    if (!text.trim()) throw new Error("This PDF contains no selectable text. It may be scanned and require OCR.");

    const foundBanks = detectedBanks(text);
    if (!bankMatches(text, expectedBank)) {
      throw new Error(`The selected bank is ${expectedBank}, but this statement could not be verified as ${expectedBank}. Detected: ${foundBanks.join(", ") || "no supported bank"}. Select the matching bank or upload a statement that includes the bank name.`);
    }

    const { fallbackYear } = extractYearContext(text);
    const lines = text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);

    type PendingTx = {
      date: string;
      rawDescription: string;
      continuationLines: string[];
      amounts: Array<{ raw: string; value: number; isCredit: boolean; isDebit: boolean }>;
    };

    const pendingList: PendingTx[] = [];
    let currentTx: PendingTx | null = null;

    for (const line of lines) {
      if (nonTransactionDescriptionPatterns.some((pattern) => pattern.test(line))) {
        continue;
      }

      const dateMatch = line.match(DATE_START_REGEX);
      if (dateMatch) {
        if (currentTx) {
          pendingList.push(currentTx);
          currentTx = null;
        }

        const dateStr = dateMatch[1];
        const parsedDate = parseDate(dateStr, fallbackYear);
        if (!parsedDate) continue;

        let remainder = line.slice(dateMatch[0].length);

        // Check for second date (common in Capitec: Posting Date + Transaction Date)
        const secondDateMatch = remainder.match(SECOND_DATE_REGEX);
        if (secondDateMatch) {
          remainder = remainder.slice(secondDateMatch[0].length);
        }

        const amounts = extractAmountsFromLine(line);
        if (amounts.length === 0) continue;

        const firstAmountIndex = amounts[0].index;
        let desc = "";
        if (firstAmountIndex > dateMatch[0].length) {
          desc = line.slice(dateMatch[0].length + (secondDateMatch ? secondDateMatch[0].length : 0), firstAmountIndex).trim();
        } else {
          desc = remainder.replace(new RegExp(AMOUNT_REGEX.source, "gi"), " ").trim();
        }

        desc = desc.replace(/[\t]+/g, " ").replace(/\s+/g, " ").trim();

        currentTx = {
          date: parsedDate,
          rawDescription: desc,
          continuationLines: [],
          amounts: amounts.map((a) => a.parsed),
        };
      } else if (currentTx) {
        // Multi-line continuation: line has no amounts and has descriptive text
        const lineAmounts = extractAmountsFromLine(line);
        if (lineAmounts.length === 0 && /[A-Za-z]{2,}/.test(line)) {
          currentTx.continuationLines.push(line.replace(/[\t]+/g, " ").trim());
        }
      }
    }

    if (currentTx) {
      pendingList.push(currentTx);
    }

    const isFnb = bankMatches(expectedBank, "FNB");
    const isAbsa = bankMatches(expectedBank, "Absa");
    const transactions: ParsedStatementTransaction[] = [];

    for (const item of pendingList) {
      const fullDesc = [item.rawDescription, ...item.continuationLines].join(" ").replace(/\s+/g, " ").trim();
      if (!isLikelyTransactionDescription(fullDesc) || item.amounts.length === 0) continue;

      const txAmountObj = item.amounts[0];
      const txAmount = txAmountObj.value;
      if (txAmount === 0) continue;

      let balance: number | null = null;
      if (item.amounts.length >= 2) {
        if (isFnb) {
          // In FNB: [Amount, Balance, AccruedCharges] -> Balance is item.amounts[1]
          balance = item.amounts[1].value;
          if (item.amounts[1].isDebit) balance = -balance;
        } else {
          // For other banks: Balance is the last amount on the row
          const lastAmount = item.amounts[item.amounts.length - 1];
          balance = lastAmount.isDebit ? -lastAmount.value : lastAmount.value;
        }
      }

      let direction: "debit" | "credit" = "debit";
      if (txAmountObj.isCredit) {
        direction = "credit";
      } else if (txAmountObj.isDebit) {
        direction = "debit";
      } else if (isFnb) {
        // In FNB statements, standard debits are unsigned. Credits are explicitly marked with Cr.
        direction = "debit";
      } else if (isAbsa) {
        // In Absa statements, debits carry a minus sign (leading or trailing). Credits are unsigned.
        direction = "credit";
      } else {
        const lowerDesc = fullDesc.toLowerCase();
        if (/\b(salary|wages|deposit|refund|credit|money in|funds received|incoming)\b/.test(lowerDesc)) {
          direction = "credit";
        } else {
          direction = "debit";
        }
      }

      const counterparty = extractCounterparty(fullDesc);
      const reference = extractReference(fullDesc);

      transactions.push({
        date: item.date,
        description: fullDesc,
        amount: txAmount,
        direction,
        balance,
        reference,
        counterparty,
        currency: "ZAR",
      });
    }

  
    if (transactions.length >= 2) {
      for (let i = 1; i < transactions.length; i++) {
        const prev = transactions[i - 1];
        const curr = transactions[i];
        if (prev.balance != null && curr.balance != null) {
          const delta = Math.round((curr.balance - prev.balance) * 100) / 100;
          if (Math.abs(Math.abs(delta) - curr.amount) < 0.05) {
            if (delta > 0 && curr.direction !== "credit") {
              curr.direction = "credit";
            } else if (delta < 0 && curr.direction !== "debit") {
              curr.direction = "debit";
            }
          } else {
            const revDelta = Math.round((prev.balance - curr.balance) * 100) / 100;
            if (Math.abs(Math.abs(revDelta) - prev.amount) < 0.05) {
              if (revDelta > 0 && prev.direction !== "credit") {
                prev.direction = "credit";
              } else if (revDelta < 0 && prev.direction !== "debit") {
                prev.direction = "debit";
              }
            }
          }
        }
      }
    }

    
    if (transactions.length === 0) {
      const tableResult = await parser.getTable();
      const tableRows = tableResult.mergedTables.flat();
      for (const row of tableRows) {
        const cells = row.map((cell) => cell.replace(/\s+/g, " ").trim()).filter(Boolean);
        if (cells.length < 3) continue;

        const dateCellIndex = cells.findIndex((cell) => parseDate(cell, fallbackYear) != null);
        if (dateCellIndex < 0) continue;
        const date = parseDate(cells[dateCellIndex], fallbackYear);

        const amountCells = cells
          .map((cell, index) => {
            const parsed = parseRawAmount(cell);
            return parsed ? { cell, index, parsed } : null;
          })
          .filter((item): item is { cell: string; index: number; parsed: NonNullable<ReturnType<typeof parseRawAmount>> } => item != null);

        if (!date || amountCells.length === 0) continue;

        const txAmountObj = amountCells[0].parsed;
        const txAmount = txAmountObj.value;
        if (txAmount === 0) continue;

        let balance: number | null = null;
        if (amountCells.length >= 2) {
          const balObj = isFnb ? amountCells[1].parsed : amountCells[amountCells.length - 1].parsed;
          balance = balObj.isDebit ? -balObj.value : balObj.value;
        }

        const description = cells.slice(dateCellIndex + 1, amountCells[0].index).join(" ").trim();
        if (!isLikelyTransactionDescription(description)) continue;

        let direction: "debit" | "credit" = "debit";
        if (txAmountObj.isCredit) {
          direction = "credit";
        } else if (txAmountObj.isDebit) {
          direction = "debit";
        } else if (isFnb) {
          direction = "debit";
        } else if (isAbsa) {
          direction = "credit";
        } else {
          const lowerDesc = description.toLowerCase();
          if (/\b(salary|wages|deposit|refund|credit|money in|funds received|incoming)\b/.test(lowerDesc)) {
            direction = "credit";
          } else {
            direction = "debit";
          }
        }

        const counterparty = extractCounterparty(description);
        const reference = extractReference(description);

        transactions.push({
          date,
          description,
          amount: txAmount,
          direction,
          balance,
          reference,
          counterparty,
          currency: "ZAR",
        });
      }
    }

    if (transactions.length === 0) {
      throw new Error(`The ${expectedBank} statement identity was detected, but no transaction rows could be read. This bank layout may be unsupported or the PDF may be scanned.`);
    }

    return transactions;
  } finally {
    await parser.destroy();
  }
}
