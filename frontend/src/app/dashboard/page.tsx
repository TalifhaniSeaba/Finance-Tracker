"use client";

import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardNavbar from "../components/DashboardNavbar";
import { Account, AccountSource, AccountTransaction, createAccount, deleteAccount, listAccountTransactions, listAccounts, startBanklinkConnection, updateAccount, uploadStatement } from "../services/accountServices";

type IconName = "chart" | "wallet" | "target" | "file" | "bell" | "search" | "plus" | "chevron-down" | "more" | "arrow-down-left" | "arrow-up-right-small" | "close" | "upload" | "link" | "check" | "trash" | "warning";

type SuccessInfo = { accountName: string; bank: string; transactionCount: number; statementName: string } | null;
const SELECTED_ACCOUNT_STORAGE_KEY = "finats:selected-account-id";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const paths: Record<IconName, ReactNode> = {
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 3-4 3 2 5-7" /></>,
    wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5z" /><path d="M4 8h15" /><path d="M16 12h4" /></>,
    target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    "chevron-down": <path d="m7 10 5 5 5-5" />,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
    "arrow-down-left": <><path d="M17 7 7 17" /><path d="M7 8v9h9" /></>,
    "arrow-up-right-small": <><path d="m7 17 10-10M9 7h8v8" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></>,
    link: <><path d="m10 13 4-4" /><path d="M7.5 17.5 5 15a3.5 3.5 0 0 1 5-5l1 1M16.5 6.5 19 9a3.5 3.5 0 0 1-5 5l-1-1" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></>,
    warning: <><path d="M12 9v4M12 17h.01" /><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

const formatCurrency = (value: number, currency = "ZAR") =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
const today = () => new Intl.DateTimeFormat("en-CA").format(new Date());
const displayDate = (value: string) => {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(date);
};
const banks = ["FNB", "Absa", "Capitec", "Nedbank", "Standard Bank", "Discovery"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CATEGORY_THEMES: Record<string, { color: string; pillClass: string }> = {
  Food: { color: "#f97316", pillClass: "category-pill--food" },
  Housing: { color: "#3b82f6", pillClass: "category-pill--housing" },
  Transport: { color: "#8b5cf6", pillClass: "category-pill--transport" },
  Subscriptions: { color: "#ec4899", pillClass: "category-pill--subscriptions" },
  Healthcare: { color: "#ef4444", pillClass: "category-pill--healthcare" },
  Shopping: { color: "#14b8a6", pillClass: "category-pill--shopping" },
  Fees: { color: "#64748b", pillClass: "category-pill--fees" },
  Transfer: { color: "#06b6d4", pillClass: "category-pill--transfer" },
  Income: { color: "#10b981", pillClass: "category-pill--income" },
  Other: { color: "#94a3b8", pillClass: "category-pill--other" },
};

function getCategoryTheme(category: string) {
  return CATEGORY_THEMES[category] ?? { color: "#6366f1", pillClass: "category-pill--other" };
}

function bankCardTheme(bank: string) {
  const clean = (bank || "").toLowerCase();
  if (clean.includes("fnb") || clean.includes("first national")) return "account-card--fnb";
  if (clean.includes("standard")) return "account-card--standard-bank";
  if (clean.includes("absa")) return "account-card--absa";
  if (clean.includes("capitec")) return "account-card--capitec";
  if (clean.includes("nedbank")) return "account-card--nedbank";
  if (clean.includes("discovery")) return "account-card--discovery";
  return "account-card--default";
}

function accountStatusLabel(account: Account) {
  if (account.balanceSource === "statement" && account.balanceAsOf) return `Statement verified (${displayDate(account.balanceAsOf)})`;
  if (account.status === "connected") return "Connected";
  return account.status === "awaiting_banklink" ? "Awaiting secure sync" : "Statement ready";
}

function isInDateRange(dateValue: string, range: string, anchorDateStr?: string) {
  if (range === "all") return true;
  const date = new Date(`${dateValue}T12:00:00`);
  if (isNaN(date.getTime())) return true;

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  let anchor = todayDate;
  if (anchorDateStr) {
    const anchorCandidate = new Date(`${anchorDateStr}T12:00:00`);
    if (!isNaN(anchorCandidate.getTime()) && anchorCandidate.getTime() < todayDate.getTime()) {
      anchor = anchorCandidate;
    }
  }

  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const end = new Date(anchor);
  end.setHours(23, 59, 59, 999);

  if (range === "past-7") {
    start.setDate(start.getDate() - 6);
    return date >= start && date <= end;
  }
  if (range === "past-30") {
    start.setDate(start.getDate() - 29);
    return date >= start && date <= end;
  }
  if (range === "this-month") {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
    return date >= start && date <= end;
  }
  return true;
}

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [showConnect, setShowConnect] = useState(false);
  const [bank, setBank] = useState("FNB");
  const [method, setMethod] = useState<AccountSource>("banklink");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [dateRange, setDateRange] = useState("all");
  const [notice, setNotice] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);

  useEffect(() => {
    let active = true;
    const banklinkStatus = new URLSearchParams(window.location.search).get("banklink_status");

    listAccounts()
      .then(({ accounts: savedAccounts }) => {
        if (!active) return;
        if (banklinkStatus) {
          setNotice(banklinkStatus === "success" ? "Banklink consent completed. Waiting for the signed sync webhook." : `Banklink connection ${banklinkStatus}.`);
        }
        setAccounts(savedAccounts);
        const savedSelection = localStorage.getItem(SELECTED_ACCOUNT_STORAGE_KEY);
        const nextSelection = savedAccounts.some((account) => account.id === savedSelection)
          ? savedSelection
          : savedAccounts[0]?.id;

        if (nextSelection) {
          setSelectedAccountId(nextSelection);
          localStorage.setItem(SELECTED_ACCOUNT_STORAGE_KEY, nextSelection);
        }
      })
      .catch((error: unknown) => {
        if (active) setNotice(error instanceof Error ? error.message : "Unable to load your accounts.");
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;

    listAccountTransactions(selectedAccountId)
      .then(({ transactions: savedTransactions }) => setTransactions(savedTransactions))
      .catch(() => setTransactions([]));
  }, [selectedAccountId]);

  useEffect(() => {
    if (!selectedAccountId || selectedAccount?.status === "connected") return;
    let active = true;
    const refresh = async () => {
      const [{ accounts: nextAccounts }, { transactions: nextTransactions }] = await Promise.all([
        listAccounts(),
        listAccountTransactions(selectedAccountId),
      ]);
      if (!active) return;
      setAccounts(nextAccounts);
      setTransactions(nextTransactions);
    };
    const timer = window.setInterval(() => { void refresh().catch(() => undefined); }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [selectedAccountId, selectedAccount?.status]);

  const latestTransactionDate = useMemo(() => {
    return transactions.reduce((latest, t) => t.date > latest ? t.date : latest, "");
  }, [transactions]);

  const selectedTransactions = useMemo(() => {
    return transactions.filter(
      (transaction) => transaction.accountId === selectedAccountId && isInDateRange(transaction.date, dateRange, latestTransactionDate)
    );
  }, [selectedAccountId, dateRange, transactions, latestTransactionDate]);

  const income = selectedTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = selectedTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);

  const categories = useMemo(() => {
    const grouped = new Map<string, number>();
    selectedTransactions.filter((item) => item.type === "expense").forEach((item) => {
      grouped.set(item.category, (grouped.get(item.category) ?? 0) + item.amount);
    });
    return [...grouped.entries()].sort(([, first], [, second]) => second - first);
  }, [selectedTransactions]);

  function chooseBank(event: ChangeEvent<HTMLSelectElement>) {
    const nextBank = event.target.value;
    setBank(nextBank);
    if (nextBank !== "FNB") setMethod("statement");
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!accountName.trim()) {
      errors.accountName = "Account label is required";
    }
    if (!editingAccount && accountNumber.trim().length !== 4) {
      errors.accountNumber = "Last 4 digits are required";
    }
    if (!editingAccount && method === "statement" && !statementFile) {
      errors.statementFile = "Please choose a statement file";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function connectAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      setSavingAccount(true);
      setFieldErrors({});
      if (editingAccount) {
        const { account: updatedAccount } = await updateAccount(editingAccount.id, { name: accountName, bank, last4: accountNumber });
        let finalAccount = updatedAccount;
        let updateNotice = "Account details updated.";
        if (editingAccount.source === "statement" && statementFile) {
          const result = await uploadStatement(editingAccount.id, statementFile);
          finalAccount = result.account;
          const skipped = result.import.overlapCount;
          updateNotice = `${result.import.transactionCount} new transaction${result.import.transactionCount === 1 ? "" : "s"} imported from ${statementFile.name}.${skipped > 0 ? ` ${skipped} overlapping transaction${skipped === 1 ? " was" : "s were"} skipped.` : ""}`;
          const { transactions: importedTransactions } = await listAccountTransactions(editingAccount.id);
          setTransactions(importedTransactions);
        }
        setAccounts((current) => current.map((account) => account.id === finalAccount.id ? finalAccount : account));
        setEditingAccount(null);
        setShowConnect(false);
        setStatementFile(null);
        setNotice(updateNotice);
        return;
      }

      const { account: createdAccount } = await createAccount({ name: accountName, bank, last4: accountNumber, source: method, statementName: statementFile?.name });
      if (method === "statement") {
        if (!statementFile) throw new Error("Choose a CSV or PDF statement before submitting.");
        const { account: importedAccount, import: statementImport } = await uploadStatement(createdAccount.id, statementFile);
        const { transactions: importedTransactions } = await listAccountTransactions(createdAccount.id);
        setAccounts((current) => [...current, importedAccount]);
        setTransactions(importedTransactions);
        setSelectedAccountId(importedAccount.id);
        localStorage.setItem(SELECTED_ACCOUNT_STORAGE_KEY, importedAccount.id);
        setAccountName(""); setAccountNumber(""); setStatementFile(null); setShowConnect(false);
        setSuccessInfo({
          accountName: importedAccount.name,
          bank: importedAccount.bank,
          transactionCount: statementImport.transactionCount,
          statementName: statementFile.name,
        });
        return;
      }
      const connection = method === "banklink" ? await startBanklinkConnection(createdAccount.id) : null;
      const account = connection?.account ?? createdAccount;
      setAccounts((current) => [...current, account]);
      setSelectedAccountId(account.id);
      localStorage.setItem(SELECTED_ACCOUNT_STORAGE_KEY, account.id);
      setAccountName(""); setAccountNumber(""); setStatementFile(null); setShowConnect(false);
      if (connection) {
        window.location.assign(connection.authorizationUrl);
        return;
      }
      setNotice(`Statement ${statementFile ? `“${statementFile.name}” ` : ""}is ready for backend parsing.`);
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : "Unable to create the account.");
    } finally {
      setSavingAccount(false);
    }
  }

  function selectAccount(accountId: string) {
    setSelectedAccountId(accountId);
    localStorage.setItem(SELECTED_ACCOUNT_STORAGE_KEY, accountId);
  }

  function editAccountDetails(account: Account) {
    selectAccount(account.id);
    setEditingAccount(account);
    setAccountName(account.name);
    setBank(account.bank);
    setAccountNumber(account.number === "0000" ? "" : account.number);
    setFieldErrors({});
    setShowConnect(true);
  }

  function removeAccount(account: Account) {
    setDeletingAccount(account);
  }

  async function confirmDeleteAccount() {
    if (!deletingAccount) return;
    try {
      await deleteAccount(deletingAccount.id);
      const remaining = accounts.filter((current) => current.id !== deletingAccount.id);
      setAccounts(remaining);
      if (selectedAccountId === deletingAccount.id) {
        const next = remaining[0]?.id;
        setSelectedAccountId(next);
        if (next) localStorage.setItem(SELECTED_ACCOUNT_STORAGE_KEY, next);
        else localStorage.removeItem(SELECTED_ACCOUNT_STORAGE_KEY);
      }
      setDeletingAccount(null);
      setNotice("Account deleted.");
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : "Unable to delete the account.");
      setDeletingAccount(null);
    }
  }

  function openConnectModal() {
    setEditingAccount(null);
    setFieldErrors({});
    setShowConnect(true);
  }

  return (
    <div className="dashboard-shell">
      <DashboardNavbar />
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-header__greeting">
            <p className="dashboard-kicker">{displayDate(today())}</p>
          </div>
          <div className="dashboard-header__actions">
            <button className="dashboard-icon-button" type="button" aria-label="Notifications">
              <Icon name="bell" />
            </button>
            <button className="dashboard-header-avatar" type="button">U</button>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="dashboard-intro">
            <div>
              <p className="dashboard-kicker">Selected account overview</p>
              <h2>{selectedAccount ? selectedAccount.name : "Connect your first account."}</h2>
            </div>
            <label className="period-picker" aria-label="Date filter">
              <span>Period</span>
              <select value={dateRange} onChange={(event) => setDateRange(event.target.value)}>
                <option value="all">All statement dates</option>
                <option value="past-7">Past 7 days</option>
                <option value="past-30">Past 30 days</option>
                <option value="this-month">This month</option>
              </select>
              <Icon name="chevron-down" size={15} />
            </label>
          </section>

          {notice && (
            <div className="integration-notice" role="status">
              <Icon name="check" size={16} />
              <span>{notice}</span>
              <button type="button" aria-label="Dismiss notice" onClick={() => setNotice("")}>
                <Icon name="close" size={15} />
              </button>
            </div>
          )}

          {!selectedAccount && (
            <section className="data-source-panel">
              <div>
                <span className="data-source-panel__icon"><Icon name="link" size={18} /></span>
                <div>
                  <p className="panel-kicker">Secure data connection</p>
                  <h3>Bring in your real bank data</h3>
                  <p>Connect FNB through Banklink or upload a statement from any supported bank. Transactions will be classified and shown here after processing.</p>
                </div>
              </div>
              <button className="button button--primary" type="button" onClick={openConnectModal}>
                <Icon name="plus" size={15} /> Add bank account
              </button>
            </section>
          )}

          {selectedAccount && (
            <section className="selected-source-banner">
              <div>
                <span className="data-source-panel__icon">
                  <Icon name={selectedAccount.source === "banklink" ? "link" : "file"} size={18} />
                </span>
                <div>
                  <p className="panel-kicker">Showing active account</p>
                  <h3>{selectedAccount.name} · {selectedAccount.bank}</h3>
                  <p>
                    {selectedAccount.source === "banklink" ? "Banklink live feed" : `Statement import${selectedAccount.statementName ? ` · ${selectedAccount.statementName}` : ""}`} · {accountStatusLabel(selectedAccount)}
                  </p>
                </div>
              </div>
              <div className="data-source-panel__actions">
                {selectedAccount.source === "statement" && (
                  <button className="button button--outline" type="button" onClick={() => { setEditingAccount(selectedAccount); setBank(selectedAccount.bank); setAccountName(selectedAccount.name); setAccountNumber(selectedAccount.number === "0000" ? "" : selectedAccount.number); setMethod("statement"); setFieldErrors({}); setShowConnect(true); }}>
                    <Icon name="upload" size={15} /> Upload newer statement
                  </button>
                )}
                <button className="button button--outline" type="button" onClick={openConnectModal}>
                  Add another account
                </button>
              </div>
            </section>
          )}

          {selectedAccount && (
            <>
              {/* Metrics Row */}
              <section className="dashboard-metrics" aria-label="Financial summary">
                <MetricCard title="Selected balance" value={selectedAccount.balance ? formatCurrency(selectedAccount.balance) : "—"} icon="wallet" primary />
                <MetricCard title="Income" value={income ? formatCurrency(income) : "—"} icon="arrow-down-left" />
                <MetricCard title="Expenses" value={expenses ? formatCurrency(expenses) : "—"} icon="arrow-up-right-small" />
                <MetricCard title="Net savings" value={selectedTransactions.length ? formatCurrency(income - expenses) : "—"} icon="target" />
              </section>

              {/* Main Visuals Grid: Graph and Classification */}
              <section className="dashboard-grid dashboard-grid--main">
                {/* Financial Activity Section: Visual Graph */}
                <article className="dashboard-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="panel-kicker">Financial activity</p>
                      <h3>Income vs expenses</h3>
                    </div>
                  </div>
                  <FinancialActivityGraph transactions={selectedTransactions} />
                </article>

                {/* Classification Section: Spending categories */}
                <article className="dashboard-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="panel-kicker">Classification</p>
                      <h3>Spending categories</h3>
                    </div>
                    <Link
                      href="/transactions"
                      className="button button--outline"
                      style={{ padding: ".25rem .55rem", fontSize: ".65rem" }}
                    >
                      View all transactions
                    </Link>
                  </div>
                  <ClassificationBreakdown
                    categories={categories}
                    totalExpenses={expenses}
                  />
                </article>
              </section>
            </>
          )}

          {/* Cards & Accounts Section */}
          <section className="dashboard-section-heading">
            <div>
              <p className="panel-kicker">Your connected accounts</p>
              <h3>Cards & accounts</h3>
            </div>
            <button className="add-button" type="button" onClick={openConnectModal}>
              <Icon name="plus" size={16} /> Add account
            </button>
          </section>

          <section className="cards-layout">
            {accounts.length ? (
              <>
                <div className="card-rail">
                  {accounts.map((account) => (
                    <div className="account-card-wrap" key={account.id}>
                      <button
                        className={`account-card ${bankCardTheme(account.bank)} ${account.id === selectedAccountId ? "is-selected" : ""}`}
                        type="button"
                        onClick={() => selectAccount(account.id)}
                        aria-label={`Select ${account.name}`}
                      >
                        <div className="account-card__top">
                          <span className="card-brand-pill">{account.bank}</span>
                          <svg className="card-contactless" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M8.5 16.5a5 5 0 0 1 0-7M12 19a8.5 8.5 0 0 0 0-14M15.5 21.5a12 12 0 0 0 0-20" />
                          </svg>
                        </div>
                        <div className="card-emv-chip" aria-hidden="true" />
                        <strong>{account.balance ? formatCurrency(account.balance) : "Awaiting sync"}</strong>
                        <div className="account-card__bottom">
                          <span className="card-number-display">•••• {account.number}</span>
                          <span>{account.name}</span>
                        </div>
                        {account.id === selectedAccountId && (
                          <span className="card-selected-tag">Active</span>
                        )}
                      </button>
                      <div className="account-card-actions">
                        <button type="button" className="account-card-action" onClick={() => editAccountDetails(account)}>
                          Edit details
                        </button>
                        <button type="button" className="account-card-action account-card-action--danger" onClick={() => removeAccount(account)}>
                          <Icon name="close" size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected Card Details Panel */}
                <article className="dashboard-panel selected-card-detail" style={{ minWidth: 0 }}>
                  <div className="selected-card-detail__heading">
                    <div>
                      <p className="panel-kicker">Card details</p>
                      <h3>{selectedAccount?.name}</h3>
                    </div>
                    <span className="selected-badge">{selectedAccount ? accountStatusLabel(selectedAccount) : ""}</span>
                  </div>
                  {selectedAccount && (
                    <>
                      <div className="selected-card-detail__balance">
                        <span>Current ledger balance</span>
                        <strong>{selectedAccount.balance ? formatCurrency(selectedAccount.balance) : "Awaiting data"}</strong>
                      </div>
                      <div className="selected-card-detail__stats">
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 0 }}>
                          <span>Bank</span>
                          <b style={{ wordBreak: "break-word" }}>{selectedAccount.bank}</b>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 0 }}>
                          <span>Account number</span>
                          <b style={{ wordBreak: "break-word" }}>•••• •••• •••• {selectedAccount.number}</b>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 0 }}>
                          <span>Data connection</span>
                          <b style={{ wordBreak: "break-word" }}>{selectedAccount.source === "banklink" ? "Banklink API sync" : "Statement import"}</b>
                        </div>
                        {selectedAccount.statementName && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 0 }}>
                            <span>Statement file</span>
                            <b style={{ wordBreak: "break-all", overflowWrap: "anywhere" }}>{selectedAccount.statementName}</b>
                          </div>
                        )}
                        {selectedAccount.statementPeriodStart && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 0 }}>
                            <span>Statement period</span>
                            <b style={{ wordBreak: "break-word" }}>{displayDate(selectedAccount.statementPeriodStart)} – {displayDate(selectedAccount.statementPeriodEnd || selectedAccount.statementPeriodStart)}</b>
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 0 }}>
                          <span>Last updated</span>
                          <b style={{ wordBreak: "break-word" }}>{selectedAccount.lastSyncedAt ? new Date(selectedAccount.lastSyncedAt).toLocaleString("en-ZA") : "Not synced yet"}</b>
                        </div>
                      </div>
                    </>
                  )}
                </article>
              </>
            ) : (
              <div className="empty-accounts">
                <Icon name="wallet" size={25} />
                <h3>No connected accounts</h3>
                <p>Add an FNB Banklink connection or upload a statement from any supported bank.</p>
                <button className="add-button" type="button" onClick={openConnectModal}>
                  <Icon name="plus" size={16} /> Add account
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      {showConnect && (
        <ConnectionModal
          editing={Boolean(editingAccount)}
          bank={bank}
          method={method}
          accountName={accountName}
          accountNumber={accountNumber}
          statementFile={statementFile}
          savingAccount={savingAccount}
          fieldErrors={fieldErrors}
          onBankChange={chooseBank}
          onMethodChange={setMethod}
          onNameChange={setAccountName}
          onNumberChange={setAccountNumber}
          onFileChange={setStatementFile}
          onSubmit={connectAccount}
          onClose={() => { setShowConnect(false); setEditingAccount(null); setFieldErrors({}); }}
        />
      )}

      {deletingAccount && (
        <DeleteModal
          account={deletingAccount}
          onConfirm={confirmDeleteAccount}
          onCancel={() => setDeletingAccount(null)}
        />
      )}

      {successInfo && (
        <SuccessModal
          info={successInfo}
          onClose={() => setSuccessInfo(null)}
        />
      )}
    </div>
  );
}

function ConnectionModal({ editing, bank, method, accountName, accountNumber, statementFile, savingAccount, fieldErrors, onBankChange, onMethodChange, onNameChange, onNumberChange, onFileChange, onSubmit, onClose }: { editing: boolean; bank: string; method: AccountSource; accountName: string; accountNumber: string; statementFile: File | null; savingAccount: boolean; fieldErrors: Record<string, string>; onBankChange: (event: ChangeEvent<HTMLSelectElement>) => void; onMethodChange: (method: AccountSource) => void; onNameChange: (value: string) => void; onNumberChange: (value: string) => void; onFileChange: (file: File | null) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  const isFnb = bank === "FNB";
  
  return (
    <div className="dashboard-modal-backdrop">
      <section 
        className="dashboard-modal dashboard-modal--connection" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="connection-title"
        style={{ 
          maxHeight: "90vh", 
          overflowY: "auto", 
          marginTop: "2rem", 
          marginBottom: "2rem" 
        }}
      >
        <div className="dashboard-modal__heading">
          <div>
            <p className="panel-kicker">{editing ? "Edit account" : "Secure account setup"}</p>
            <h2 id="connection-title">{editing ? "Edit card details" : "Add bank account"}</h2>
          </div>
          <button className="dashboard-icon-button" type="button" aria-label="Close setup" onClick={onClose}>
            <Icon name="close" size={17} />
          </button>
        </div>
        <p className="dashboard-modal__copy">
          {editing ? "Update the account details or upload a newer statement. Existing transactions will be skipped automatically." : "Choose how FINATS should receive this account's data. Banklink credentials are never entered into FINATS."}
        </p>
        <form className="add-card-form" onSubmit={onSubmit} noValidate>
          <label>Bank
            <select value={bank} onChange={onBankChange}>
              {banks.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          
          <label className={fieldErrors.accountName ? "field-has-error" : ""} style={{ position: "relative", paddingBottom: fieldErrors.accountName ? "1.25rem" : undefined }}>
            Account label
            <input value={accountName} onChange={(event) => onNameChange(event.target.value)} placeholder="e.g. Main account" required />
            {fieldErrors.accountName && (
              <span 
                className="field-error" 
                style={{ position: "absolute", bottom: 0, left: 0, fontSize: "0.75rem", color: "#ef4444" }}
              >
                {fieldErrors.accountName}
              </span>
            )}
          </label>
          
          <label className={fieldErrors.accountNumber ? "field-has-error" : ""} style={{ position: "relative", paddingBottom: fieldErrors.accountNumber ? "1.25rem" : undefined }}>
            Last four digits
            <input value={accountNumber} onChange={(event) => onNumberChange(event.target.value)} inputMode="numeric" maxLength={4} placeholder="4821" required />
            {fieldErrors.accountNumber && (
              <span 
                className="field-error" 
                style={{ position: "absolute", bottom: 0, left: 0, fontSize: "0.75rem", color: "#ef4444" }}
              >
                {fieldErrors.accountNumber}
              </span>
            )}
          </label>
          
          {!editing && (
            <>
              <div className="connection-methods">
                <button type="button" className={`connection-method ${method === "banklink" ? "is-selected" : ""} ${!isFnb ? "is-disabled" : ""}`} disabled={!isFnb} onClick={() => onMethodChange("banklink")}>
                  <Icon name="link" size={17} />
                  <span>
                    <b>Connect with Banklink</b>
                    <small>{isFnb ? "Hosted Banklink sandbox consent" : "Not available for this bank yet"}</small>
                  </span>
                  {method === "banklink" && isFnb && <Icon name="check" size={15} />}
                </button>
                <button type="button" className={`connection-method ${method === "statement" ? "is-selected" : ""}`} onClick={() => onMethodChange("statement")}>
                  <Icon name="upload" size={17} />
                  <span>
                    <b>Upload bank statement</b>
                    <small>Import and classify transactions automatically</small>
                  </span>
                  {method === "statement" && <Icon name="check" size={15} />}
                </button>
              </div>
              {method === "statement" && (
                <label className={`statement-dropzone ${fieldErrors.statementFile ? "field-has-error" : ""}`}>
                  <Icon name="upload" size={22} />
                  <div style={{ wordBreak: "break-all", maxWidth: "100%", textAlign: "center", padding: "0 1rem" }}>
                    {statementFile ? statementFile.name : "Choose a CSV or PDF statement"}
                  </div>
                  <input type="file" accept=".csv,.pdf,text/csv,application/pdf" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} />
                  {fieldErrors.statementFile && (
                    <span className="field-error" style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#ef4444" }}>
                      {fieldErrors.statementFile}
                    </span>
                  )}
                </label>
              )}
              {method === "banklink" && (
                <p className="connection-consent">You will be redirected to Banklink's hosted consent page. Banklink credentials never enter FINATS.</p>
              )}
            </>
          )}
          {editing && method === "statement" && (
            <label className="statement-dropzone">
              <Icon name="upload" size={22} />
              <div style={{ wordBreak: "break-all", maxWidth: "100%", textAlign: "center", padding: "0 1rem" }}>
                {statementFile ? statementFile.name : "Choose a newer CSV or PDF statement"}
              </div>
              <input type="file" accept=".csv,.pdf,text/csv,application/pdf" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} />
            </label>
          )}
          <div className="dashboard-modal__actions">
            <button className="button button--outline" type="button" onClick={onClose}>Cancel</button>
            <button className="button button--primary" type="submit" disabled={savingAccount}>
              {savingAccount ? "Saving..." : editing && method === "statement" && statementFile ? "Import newer statement" : editing ? "Save changes" : method === "banklink" ? "Continue to Banklink" : "Import statement"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function MetricCard({ title, value, icon, primary = false }: { title: string; value: string; icon: IconName; primary?: boolean }) {
  return (
    <article className={`metric-card ${primary ? "metric-card--balance" : ""}`}>
      <div className="metric-card__top">
        <span>{title}</span>
        <span className={`metric-icon ${primary ? "" : "metric-icon--soft"}`}><Icon name={icon} size={16} /></span>
      </div>
      <strong>{value}</strong>
      <p className={`metric-change ${primary ? "metric-change--light" : ""}`}>
        {value === "—" ? "Awaiting imported data" : "Active account"}
      </p>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="dashboard-empty-state">
      <span className="dashboard-empty-state__icon"><Icon name="chart" size={20} /></span>
      <p>{text}</p>
    </div>
  );
}

function DeleteModal({ account, onConfirm, onCancel }: { account: Account; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="dashboard-modal-backdrop">
      <section className="dashboard-modal dashboard-modal--confirm" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <div className="confirm-icon-wrap confirm-icon-wrap--danger">
          <Icon name="trash" size={22} />
        </div>
        <h2 id="delete-title">Delete account?</h2>
        <p className="dashboard-modal__copy">
          Are you sure you want to delete <strong>{account.name}</strong> ({account.bank})? This will permanently remove the account and all its imported transactions.
        </p>
        <div className="dashboard-modal__actions">
          <button className="button button--outline" type="button" onClick={onCancel}>Cancel</button>
          <button className="button button--danger" type="button" onClick={onConfirm}>
            <Icon name="trash" size={14} /> Delete account
          </button>
        </div>
      </section>
    </div>
  );
}

function SuccessModal({ info, onClose }: { info: NonNullable<SuccessInfo>; onClose: () => void }) {
  return (
    <div className="dashboard-modal-backdrop">
      <section 
        className="dashboard-modal dashboard-modal--confirm" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="success-title"
        style={{
          maxWidth: "500px",
          maxHeight: "90vh",
          overflowY: "auto",
          marginTop: "2rem",
          marginBottom: "2rem"
        }}
      >
        <div className="confirm-icon-wrap confirm-icon-wrap--success">
          <Icon name="check" size={24} />
        </div>
        <h2 id="success-title">Account connected!</h2>
        <p className="dashboard-modal__copy" style={{ marginBottom: "1.5rem" }}>
          <strong>{info.accountName}</strong> ({info.bank}) is now linked to FINATS.
        </p>
        <div className="success-summary" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
          <div className="success-summary__row" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ flexShrink: 0 }}>Statement file</span>
            <b style={{ wordBreak: "break-all", overflowWrap: "anywhere", textAlign: "right", flex: 1 }}>{info.statementName}</b>
          </div>
          <div className="success-summary__row" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ flexShrink: 0 }}>Transactions imported</span>
            <b>{info.transactionCount}</b>
          </div>
        </div>
        <div className="dashboard-modal__actions">
          <button className="button button--primary" type="button" onClick={onClose}>
            View dashboard
          </button>
        </div>
      </section>
    </div>
  );
}

function FinancialActivityGraph({ transactions }: { transactions: AccountTransaction[] }) {
  if (!transactions.length) {
    return <EmptyState text="Income and expense activity will appear after transactions are imported." />;
  }

  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const uniqueDates = [...new Set(sorted.map((t) => t.date))];

  type Bucket = { label: string; income: number; expense: number };
  let buckets: Bucket[] = [];

  if (uniqueDates.length <= 7) {
    buckets = uniqueDates.map((date) => {
      const dayTxs = sorted.filter((t) => t.date === date);
      const inc = dayTxs.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
      const exp = dayTxs.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
      const d = new Date(`${date}T12:00:00`);
      const label = `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
      return { label, income: inc, expense: exp };
    });
  } else {
    const bucketCount = 6;
    const bucketSize = Math.ceil(sorted.length / bucketCount);
    for (let i = 0; i < sorted.length; i += bucketSize) {
      const slice = sorted.slice(i, i + bucketSize);
      const inc = slice.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
      const exp = slice.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
      const dStart = new Date(`${slice[0].date}T12:00:00`);
      const dEnd = new Date(`${slice[slice.length - 1].date}T12:00:00`);
      const label = slice[0].date === slice[slice.length - 1].date
        ? `${dStart.getDate()} ${MONTH_SHORT[dStart.getMonth()]}`
        : `${dStart.getDate()}–${dEnd.getDate()} ${MONTH_SHORT[dEnd.getMonth()]}`;
      buckets.push({ label, income: inc, expense: exp });
    }
  }

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
  const net = totalIncome - totalExpense;

  const maxVal = Math.max(...buckets.flatMap((b) => [b.income, b.expense]), 100);

  const svgWidth = 540;
  const svgHeight = 155;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 28;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const groupWidth = chartWidth / buckets.length;
  const barWidth = Math.min(Math.max(groupWidth * 0.32, 8), 24);

  return (
    <div className="financial-graph">
      <div className="financial-graph__metrics">
        <span className="financial-graph__metric-pill financial-graph__metric-pill--income">
          <Icon name="arrow-down-left" size={13} />
          Inflow: {formatCurrency(totalIncome)}
        </span>
        <span className="financial-graph__metric-pill financial-graph__metric-pill--expense">
          <Icon name="arrow-up-right-small" size={13} />
          Outflow: {formatCurrency(totalExpense)}
        </span>
        <span className="financial-graph__metric-pill financial-graph__metric-pill--net">
          Net: {net >= 0 ? "+" : ""}{formatCurrency(net)}
        </span>
      </div>

      <div className="financial-graph__svg-wrap">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="financial-graph__svg" preserveAspectRatio="none">
          {[0, 0.33, 0.66, 1].map((pct, idx) => {
            const y = paddingTop + chartHeight * (1 - pct);
            const val = maxVal * pct;
            return (
              <g key={idx}>
                <line x1={paddingLeft} y1={y} x2={svgWidth - paddingRight} y2={y} stroke="var(--border)" strokeDasharray="3 3" opacity={0.65} />
                <text x={paddingLeft - 6} y={y + 3} textAnchor="end" fontSize="9" fill="var(--foreground-muted)">
                  {val >= 1000 ? `${Math.round(val / 1000)}k` : Math.round(val)}
                </text>
              </g>
            );
          })}

          {buckets.map((b, i) => {
            const groupX = paddingLeft + i * groupWidth + (groupWidth - barWidth * 2 - 4) / 2;
            const incHeight = (b.income / maxVal) * chartHeight;
            const expHeight = (b.expense / maxVal) * chartHeight;
            const incY = paddingTop + chartHeight - incHeight;
            const expY = paddingTop + chartHeight - expHeight;
            const labelX = paddingLeft + i * groupWidth + groupWidth / 2;

            return (
              <g key={i}>
                {/* Income bar */}
                <rect
                  x={groupX}
                  y={incY}
                  width={barWidth}
                  height={Math.max(incHeight, b.income > 0 ? 3 : 0)}
                  rx="3"
                  fill="#10b981"
                >
                  <title>{`${b.label} Income: ${formatCurrency(b.income)}`}</title>
                </rect>

                {/* Expense bar */}
                <rect
                  x={groupX + barWidth + 4}
                  y={expY}
                  width={barWidth}
                  height={Math.max(expHeight, b.expense > 0 ? 3 : 0)}
                  rx="3"
                  fill="#f43f5e"
                >
                  <title>{`${b.label} Expense: ${formatCurrency(b.expense)}`}</title>
                </rect>

                {/* Date label */}
                <text x={labelX} y={svgHeight - 8} textAnchor="middle" fontSize="9" fill="var(--foreground-muted)">
                  {b.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="financial-graph__legend">
        <span><i className="financial-graph__dot financial-graph__dot--income" /> Income (Credits)</span>
        <span><i className="financial-graph__dot financial-graph__dot--expense" /> Expenses (Debits)</span>
      </div>
    </div>
  );
}

function ClassificationBreakdown({
  categories,
  totalExpenses,
}: {
  categories: Array<[string, number]>;
  totalExpenses: number;
}) {
  if (!categories.length) {
    return <EmptyState text="Classified expense categories will appear after transactions are imported." />;
  }

  return (
    <div className="classification-wrap">
      {/* Segmented Distribution Bar */}
      <div className="category-progress-track" title="Spending distribution">
        {categories.map(([cat, amt]) => {
          const pct = totalExpenses ? (amt / totalExpenses) * 100 : 0;
          const theme = getCategoryTheme(cat);
          return (
            <div
              key={cat}
              className="category-progress-segment"
              style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: theme.color }}
              title={`${cat}: ${formatCurrency(amt)} (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>

      {/* Category Cards Grid */}
      <div className="classification-cards">
        {categories.map(([category, amount]) => {
          const pct = totalExpenses ? Math.round((amount / totalExpenses) * 100) : 0;
          const theme = getCategoryTheme(category);

          return (
            <div
              key={category}
              className="category-card"
            >
              <div className="category-card__left">
                <span className="category-badge-dot" style={{ backgroundColor: theme.color }} />
                <div className="category-card__info">
                  <b>{category}</b>
                  <small>{pct}% of expenses</small>
                </div>
              </div>
              <div className="category-card__right">
                <strong>{formatCurrency(amount)}</strong>
                <small>{pct}% of total</small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}