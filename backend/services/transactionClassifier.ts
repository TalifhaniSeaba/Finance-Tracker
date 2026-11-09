export type ClassificationType = "income" | "expense" | "transfer" | "unknown";
export type ClassificationStatus = "classified" | "needs_review";

export type ClassificationInput = {
  description: string;
  counterparty: string | null;
  transactionType: ClassificationType;
};

export type ClassificationResult = {
  transactionType: ClassificationType;
  category: string;
  confidence: number;
  status: ClassificationStatus;
  rule: string;
};

const rules: Array<{ category: string; rule: string; keywords: string[]; confidence: number }> = [
  { category: "Food", rule: "food_and_groceries", keywords: ["checkers", "pick n pay", "pnp", "woolworths", "spar", "food", "restaurant", "takeaway", "uber eats", "mr d"], confidence: 0.94 },
  { category: "Housing", rule: "housing_and_utilities", keywords: ["rent", "landlord", "property", "electricity", "water", "municipal", "rates"], confidence: 0.93 },
  { category: "Transport", rule: "transport", keywords: ["uber", "bolt", "petrol", "fuel", "shell", "engen", "parking", "taxi", "toll"], confidence: 0.92 },
  { category: "Subscriptions", rule: "subscriptions", keywords: ["netflix", "spotify", "dstv", "showmax", "subscription", "monthly plan"], confidence: 0.91 },
  { category: "Healthcare", rule: "healthcare", keywords: ["clicks", "dis-chem", "pharmacy", "doctor", "hospital", "medical"], confidence: 0.91 },
  { category: "Fees", rule: "bank_fees", keywords: ["bank fee", "service fee", "monthly fee", "transaction fee", "commission", "charge"], confidence: 0.95 },
  { category: "Shopping", rule: "shopping", keywords: ["takealot", "amazon", "clothing", "mall", "shop"], confidence: 0.82 },
  { category: "Transfer", rule: "transfer", keywords: ["transfer", "beneficiary", "payment to", "eft"], confidence: 0.88 },
];

export function classifyTransaction(input: ClassificationInput): ClassificationResult {
  if (input.transactionType === "income") {
    return { transactionType: "income", category: "Income", confidence: 0.99, status: "classified", rule: "credit_transaction" };
  }

  const searchText = `${input.description} ${input.counterparty ?? ""}`.toLowerCase();
  const matchedRule = rules.find((rule) => rule.keywords.some((keyword) => searchText.includes(keyword)));

  if (matchedRule) {
    const transactionType = matchedRule.category === "Transfer" ? "transfer" : input.transactionType === "expense" ? "expense" : "unknown";
    return {
      transactionType,
      category: matchedRule.category,
      confidence: matchedRule.confidence,
      status: transactionType === "unknown" ? "needs_review" : "classified",
      rule: matchedRule.rule,
    };
  }

  return {
    transactionType: input.transactionType,
    category: "Other",
    confidence: 0.25,
    status: "needs_review",
    rule: "no_matching_rule",
  };
}
