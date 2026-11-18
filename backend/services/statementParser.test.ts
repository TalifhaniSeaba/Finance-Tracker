import assert from "node:assert";
import { parsePdfStatement, parseCsvStatement } from "./statementParser";

// Helper to generate uncompressed PDF buffer for testing
function createTestPdf(lines: string[]): Buffer {
  const content = lines.map((line, i) => `1 0 0 1 50 ${720 - i * 18} Tm (${line.replace(/[()]/g, "")}) Tj`).join("\n");
  const stream = `BT /F1 10 Tf\n${content}\nET`;
  const streamLength = Buffer.byteLength(stream);

  const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${streamLength} >>
stream
${stream}
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000300 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
370
%%EOF`;
  return Buffer.from(pdf);
}

async function testFnbStatement() {
  const lines = [
    "First National Bank - Cheque Account Statement",
    "Statement Period : 01 March 2026 to 31 March 2026",
    "Account Number : 62812345678",
    "Date Description Amount Balance Bank Charges",
    "25 Mar CHECKERS HYPER 150.00 4850.00 Cr 0.00",
    "26 Mar SALARY DEPOSIT 25000.00 Cr 29850.00 Cr",
    "27 Mar FNB OB PMT John Doe Ref: Rent 8000.00 21850.00 Cr 2.50",
  ];
  const pdf = createTestPdf(lines);
  const txs = await parsePdfStatement(pdf, "FNB");

  assert.strictEqual(txs.length, 3);
  // Row 1: Grocery expense
  assert.strictEqual(txs[0].date, "2026-03-25");
  assert.strictEqual(txs[0].description, "CHECKERS HYPER");
  assert.strictEqual(txs[0].amount, 150.00);
  assert.strictEqual(txs[0].direction, "debit");
  assert.strictEqual(txs[0].balance, 4850.00);
  assert.strictEqual(txs[0].counterparty, "Checkers");

  // Row 2: Salary credit
  assert.strictEqual(txs[1].date, "2026-03-26");
  assert.strictEqual(txs[1].amount, 25000.00);
  assert.strictEqual(txs[1].direction, "credit");
  assert.strictEqual(txs[1].balance, 29850.00);

  // Row 3: Outgoing payment with reference
  assert.strictEqual(txs[2].date, "2026-03-27");
  assert.strictEqual(txs[2].amount, 8000.00);
  assert.strictEqual(txs[2].direction, "debit");
  assert.strictEqual(txs[2].balance, 21850.00);
  assert.strictEqual(txs[2].counterparty, "John Doe");
  assert.strictEqual(txs[2].reference, "Rent");
  console.log(" FNB statement parsed correctly");
}

async function testCapitecStatement() {
  const lines = [
    "Capitec Bank - Savings Account Statement",
    "Statement Period: From Date: 01/09/2026 To Date: 30/09/2026",
    "Account Number 1234567890",
    "Posting Date Transaction Date Description Money In Money Out Fee Balance",
    "04/09/2026 04/09/2026 Card Purchase 04/09 Checkers Sea Point -450.00 0.00 12350.00",
    "05/09/2026 05/09/2026 Salary from Tech Corp 30000.00 42350.00",
    "06/09/2026 06/09/2026 Transfer to Capitec Account Ref: Dinner -200.00 42150.00",
  ];
  const pdf = createTestPdf(lines);
  const txs = await parsePdfStatement(pdf, "Capitec");

  assert.strictEqual(txs.length, 3);
  assert.strictEqual(txs[0].date, "2026-09-04");
  assert.strictEqual(txs[0].amount, 450.00);
  assert.strictEqual(txs[0].direction, "debit");
  assert.strictEqual(txs[0].counterparty, "Checkers Sea Point");

  assert.strictEqual(txs[1].date, "2026-09-05");
  assert.strictEqual(txs[1].amount, 30000.00);
  assert.strictEqual(txs[1].direction, "credit");
  assert.strictEqual(txs[1].counterparty, "Tech Corp");

  assert.strictEqual(txs[2].date, "2026-09-06");
  assert.strictEqual(txs[2].amount, 200.00);
  assert.strictEqual(txs[2].direction, "debit");
  assert.strictEqual(txs[2].reference, "Dinner");
  console.log(" Capitec statement parsed correctly");
}

async function testStandardBankStatement() {
  const lines = [
    "The Standard Bank of South Africa Limited",
    "Statement Period: From: 01 Dec 26 To: 31 Dec 26",
    "Account Number: 10123456789",
    "Date Description Payments Deposits Balance",
    "28 Dec 26 DEBIT CARD PURCHASE 450.00 12350.00",
    "PICK N PAY STRUBENS VALLEY",
    "29 Dec 26 IB PAYMENT TO JANE SMITH REF: LOAN 1500.00 10850.00",
    "30 Dec 26 ELECTRONIC DEPOSIT SALARY 25000.00 35850.00",
  ];
  const pdf = createTestPdf(lines);
  const txs = await parsePdfStatement(pdf, "Standard Bank");

  assert.strictEqual(txs.length, 3);
  // Multi-line description concatenated properly
  assert.ok(txs[0].description.includes("PICK N PAY STRUBENS VALLEY"));
  assert.strictEqual(txs[0].date, "2026-12-28");
  assert.strictEqual(txs[0].amount, 450.00);
  assert.strictEqual(txs[0].direction, "debit");
  assert.strictEqual(txs[0].counterparty, "PICK N PAY STRUBENS VALLEY");

  assert.strictEqual(txs[1].amount, 1500.00);
  assert.strictEqual(txs[1].direction, "debit");
  assert.strictEqual(txs[1].counterparty, "JANE SMITH");
  assert.strictEqual(txs[1].reference, "LOAN");

  assert.strictEqual(txs[2].amount, 25000.00);
  assert.strictEqual(txs[2].direction, "credit");
  console.log(" Standard Bank statement parsed correctly");
}

async function testAbsaStatement() {
  const lines = [
    "Absa Bank Limited",
    "Statement Date: 2026-03-31",
    "Account Number: 40-1234-5678",
    "Date Description Amount Balance",
    "2026-03-25 POS PURCHASE - CHECKERS 450.00- 12350.00",
    "SANDTON CARD NO. 4718",
    "2026-03-26 SALARY DEPOSIT 25000.00 37350.00",
    "2026-03-27 DIGITAL PAYMENT TO ALICE REF: RENT 5000.00- 32350.00",
  ];
  const pdf = createTestPdf(lines);
  const txs = await parsePdfStatement(pdf, "Absa");

  assert.strictEqual(txs.length, 3);
  assert.strictEqual(txs[0].amount, 450.00);
  assert.strictEqual(txs[0].direction, "debit");
  assert.strictEqual(txs[0].reference, "4718");

  assert.strictEqual(txs[1].amount, 25000.00);
  assert.strictEqual(txs[1].direction, "credit");

  assert.strictEqual(txs[2].amount, 5000.00);
  assert.strictEqual(txs[2].direction, "debit");
  assert.strictEqual(txs[2].counterparty, "ALICE");
  assert.strictEqual(txs[2].reference, "RENT");
  console.log(" Absa statement parsed correctly");
}

async function testNedbankStatement() {
  const lines = [
    "Nedbank Limited - Statement of Account",
    "Statement Period : 01/03/2026 to 31/03/2026",
    "Account Number : 1234567890",
    "Date Description Debit Credit Balance",
    "25/03/2026 CHECKERS SANDTON 450.00 12350.00",
    "26/03/2026 SALARY ACME CORP 25000.00 Cr 37350.00",
    "27/03/2026 EFT TO BOB REF: SUPPLIES 1200.00 36150.00",
  ];
  const pdf = createTestPdf(lines);
  const txs = await parsePdfStatement(pdf, "Nedbank");

  assert.strictEqual(txs.length, 3);
  assert.strictEqual(txs[0].amount, 450.00);
  assert.strictEqual(txs[0].direction, "debit");
  assert.strictEqual(txs[0].counterparty, "Checkers");

  assert.strictEqual(txs[1].amount, 25000.00);
  assert.strictEqual(txs[1].direction, "credit");

  assert.strictEqual(txs[2].amount, 1200.00);
  assert.strictEqual(txs[2].direction, "debit");
  assert.strictEqual(txs[2].counterparty, "BOB");
  assert.strictEqual(txs[2].reference, "SUPPLIES");
  console.log(" Nedbank statement parsed correctly");
}

async function testDiscoveryStatement() {
  const lines = [
    "Discovery Bank Limited - Transaction Account",
    "Statement Period : 01 March 2026 - 31 March 2026",
    "Account Number : 12345678",
    "Date Description Money Out Money In Balance",
    "25/03/2026 Card purchase at Woolworths -350.00 15200.00",
    "26/03/2026 Salary Deposit Acme Corp 25000.00 40200.00",
    "27/03/2026 Transfer to Savings Ref: Goal1 -5000.00 35200.00",
  ];
  const pdf = createTestPdf(lines);
  const txs = await parsePdfStatement(pdf, "Discovery");

  assert.strictEqual(txs.length, 3);
  assert.strictEqual(txs[0].amount, 350.00);
  assert.strictEqual(txs[0].direction, "debit");
  assert.strictEqual(txs[0].counterparty, "Woolworths");

  assert.strictEqual(txs[1].amount, 25000.00);
  assert.strictEqual(txs[1].direction, "credit");

  assert.strictEqual(txs[2].amount, 5000.00);
  assert.strictEqual(txs[2].direction, "debit");
  assert.strictEqual(txs[2].reference, "Goal1");
  console.log(" Discovery Bank statement parsed correctly");
}

async function testCapitecCsvStatement() {
  const csv = [
    "Account Number,1234567890",
    "Posting Date,Transaction Date,Description,Money In (R),Money Out (R),Fee (R),Balance (R)",
    "2026-09-04,2026-09-04,Card Purchase Checkers Sea Point,,450.00,0.00,12350.00",
    "2026-09-05,2026-09-05,Salary from Tech Corp,30000.00,,0.00,42350.00",
  ].join("\n");

  const txs = parseCsvStatement(csv);
  assert.strictEqual(txs.length, 2);
  assert.strictEqual(txs[0].amount, 450.00);
  assert.strictEqual(txs[0].direction, "debit");
  assert.strictEqual(txs[0].counterparty, "Checkers Sea Point");
  assert.strictEqual(txs[1].amount, 30000.00);
  assert.strictEqual(txs[1].direction, "credit");
  assert.strictEqual(txs[1].counterparty, "Tech Corp");
  console.log("Capitec CSV statement parsed correctly");
}

async function testCardNumberNoOverflow() {
  const lines = [
    "First National Bank - Cheque Account Statement",
    "Statement Period : 01 March 2026 to 31 March 2026",
    "Account Number : 62812345678",
    "Date Description Amount Balance Bank Charges",
    "25 Mar POS PURCHASE 5123 4567 8901 2345 250.00 12 500.00 Cr 0.00",
  ];
  const pdf = createTestPdf(lines);
  const txs = await parsePdfStatement(pdf, "FNB");

  assert.strictEqual(txs.length, 1);
  assert.strictEqual(txs[0].amount, 250.00);
  assert.strictEqual(txs[0].balance, 12500.00);
  assert.ok(txs[0].amount < 100_000_000_000);
  console.log("Card numbers with spaces do not overflow amount field");
}

async function runAll() {
  console.log("Running comprehensive statement parser tests...\n");
  await testFnbStatement();
  await testCapitecStatement();
  await testStandardBankStatement();
  await testAbsaStatement();
  await testNedbankStatement();
  await testDiscoveryStatement();
  await testCapitecCsvStatement();
  await testCardNumberNoOverflow();
  console.log("\nAll statement parser tests passed successfully.");
}

runAll().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
