import { apiFetch } from "../lib/api";

export type AccountSource = "banklink" | "statement";
export type Account = {
    id: string;
    name: string;
    bank: string;
    number: string;
    source: AccountSource;
    status: "awaiting_banklink" | "statement_ready" | "connected";
    color: string;
    balance: number;
    currency: string;
    lastSyncedAt: string | null;
    statementName?: string;
};
export type AccountTransaction = { id: string; accountId: string; name: string; counterparty?: string; reference?: string; category: string; amount: number; currency: string; type: "income" | "expense"; date: string };

export function listAccounts(): Promise<{ accounts: Account[] }> {
    return apiFetch("/api/accounts");
}

export function createAccount(input: {
    name: string;
    bank: string;
    last4?: string;
    source: AccountSource;
    statementName?: string;
}): Promise<{ account: Account }> {
    return apiFetch("/api/accounts", { method: "POST", body: JSON.stringify(input) });
}

export function startBanklinkConnection(accountId: string): Promise<{ account: Account; authorizationUrl: string }> {
    return apiFetch(`/api/accounts/${accountId}/banklink/start`, { method: "POST" });
}

export function listAccountTransactions(accountId: string): Promise<{ transactions: AccountTransaction[] }> {
    return apiFetch(`/api/accounts/${accountId}/transactions`);
}

export function updateAccount(accountId: string, input: { name: string; bank: string; last4?: string }): Promise<{ account: Account }> {
    return apiFetch(`/api/accounts/${accountId}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteAccount(accountId: string): Promise<void> {
    return apiFetch(`/api/accounts/${accountId}`, { method: "DELETE" });
}

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(reader.error ?? new Error("Unable to read statement file."));
        reader.readAsDataURL(file);
    });
}

export async function uploadStatement(accountId: string, file: File): Promise<{ account: Account; import: { id: string; status: string; transactionCount: number } }> {
    const contentBase64 = await fileToBase64(file);
    return apiFetch(`/api/accounts/${accountId}/statements`, {
        method: "POST",
        body: JSON.stringify({ fileName: file.name, mimeType: file.type || "text/csv", contentBase64 }),
    });
}
