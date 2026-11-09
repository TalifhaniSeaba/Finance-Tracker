import "dotenv/config";

const banklinkApiUrl = (process.env.BANKLINK_API_URL || "https://api.banklink.co.za/v1").replace(/\/$/, "");

export const banklinkConfig = {
  apiUrl: banklinkApiUrl,
  apiKey: process.env.BANKLINK_API_KEY,
  webhookSecret: process.env.BANKLINK_WEBHOOK_SECRET,
  webhookUrl: process.env.BANKLINK_WEBHOOK_URL,
  redirectUrl: process.env.BANKLINK_REDIRECT_URL || "http://localhost:3000/dashboard",
};

export async function banklinkRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!banklinkConfig.apiKey) {
    throw new Error("BANKLINK_API_KEY is not configured on the backend.");
  }

  const response = await fetch(`${banklinkConfig.apiUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${banklinkConfig.apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json() as { data?: T; error?: { code?: string; message?: string } };

  if (!response.ok || !body.data) {
    const code = body.error?.code ? `[${body.error.code}] ` : "";
    throw new Error(`${code}${body.error?.message || `Banklink request failed (${response.status}).`}`);
  }

  return body.data;
}

export function banklinkBankId(bank: string) {
  const bankIds: Record<string, string> = {
    FNB: "fnb",
    Absa: "absa",
    Nedbank: "nedbank",
    "Standard Bank": "standard_bank",
    Discovery: "discovery",
  };

  return bankIds[bank];
}
