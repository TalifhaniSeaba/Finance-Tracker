"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import DashboardNavbar from "../components/DashboardNavbar";
import {
  Account,
  AccountTransaction,
  listAccountTransactions,
  listAccounts,
} from "../services/accountServices";

type IconName = "search" | "arrow-down-left" | "arrow-up-right-small" | "wallet" | "target" | "close" | "file";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<IconName, ReactNode> = {
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    "arrow-down-left": (
      <>
        <path d="M17 7 7 17" />
        <path d="M7 8v9h9" />
      </>
    ),
    "arrow-up-right-small": (
      <>
        <path d="m7 17 10-10M9 7h8v8" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5z" />
        <path d="M4 8h15" />
        <path d="M16 12h4" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    file: (
      <>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

const SELECTED_ACCOUNT_STORAGE_KEY = "finats:selected-account-id";

const formatCurrency = (value: number, currency = "ZAR") =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

const displayDate = (value: string) => {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(date);
};

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

export default function TransactionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("all");
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    listAccounts()
      .then(({ accounts: saved }) => {
        setAccounts(saved);
        const savedId = localStorage.getItem(SELECTED_ACCOUNT_STORAGE_KEY);
        setSelectedAccountId(
          saved.some((account) => account.id === savedId)
            ? savedId ?? ""
            : saved[0]?.id ?? ""
        );
      })
      .catch(() => setAccounts([]));
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;
    listAccountTransactions(selectedAccountId)
      .then(({ transactions: saved }) => setTransactions(saved))
      .catch(() => setTransactions([]));
    localStorage.setItem(SELECTED_ACCOUNT_STORAGE_KEY, selectedAccountId);
  }, [selectedAccountId]);

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);

  
  const latestTransactionDate = useMemo(() => {
    if (!transactions.length) return undefined;
    return [...transactions].sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
  }, [transactions]);

  const categories = useMemo(
    () => [...new Set(transactions.map((transaction) => transaction.category))].sort(),
    [transactions]
  );

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const matchesSearch =
        !query ||
        [transaction.name, transaction.counterparty, transaction.reference, transaction.category].some(
          (value) => value?.toLowerCase().includes(query)
        );
      return (
        matchesSearch &&
        isInDateRange(transaction.date, range, latestTransactionDate) &&
        (type === "all" || transaction.type === type) &&
        (category === "all" || transaction.category === category)
      );
    });
  }, [transactions, search, range, type, category, latestTransactionDate]);

  
  const metrics = useMemo(() => {
    const totalInflow = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((acc, t) => acc + t.amount, 0);
    const totalOutflow = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((acc, t) => acc + t.amount, 0);
    return {
      inflow: totalInflow,
      outflow: totalOutflow,
      net: totalInflow - totalOutflow,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const isFilterActive = search !== "" || range !== "all" || type !== "all" || category !== "all";

  const clearFilters = () => {
    setSearch("");
    setRange("all");
    setType("all");
    setCategory("all");
  };

  return (
    <div className="dashboard-shell">
      <DashboardNavbar />
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-header__greeting">
            <p className="dashboard-kicker">Account activity</p>
            <h1>Transactions</h1>
          </div>
        </header>

        <div className="dashboard-content">
          {/* Summary metrics strip */}
          <section className="transactions-summary-strip" aria-label="Transaction activity overview">
            <div className="transactions-summary-stat transactions-summary-stat--income">
              <span>Total Inflow</span>
              <strong>+{formatCurrency(metrics.inflow)}</strong>
            </div>
            <div className="transactions-summary-stat transactions-summary-stat--expense">
              <span>Total Outflow</span>
              <strong>-{formatCurrency(metrics.outflow)}</strong>
            </div>
            <div className="transactions-summary-stat">
              <span>Net Movement</span>
              <strong>{metrics.net >= 0 ? "+" : ""}{formatCurrency(metrics.net)}</strong>
            </div>
            <div className="transactions-summary-stat">
              <span>Transactions Shown</span>
              <strong>{metrics.count}</strong>
            </div>
          </section>

          {/* Transactions Panel */}
          <section className="dashboard-panel transactions-panel transactions-page-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Transaction list</p>
                <h2>
                  {selectedAccount
                    ? `Transactions for ${selectedAccount.bank} · •••• ${selectedAccount.number}`
                    : "Transactions"}
                </h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: ".65rem" }}>
                <span className="transaction-count">{filteredTransactions.length} of {transactions.length} shown</span>
                {isFilterActive && (
                  <button
                    type="button"
                    className="button button--outline"
                    style={{ padding: ".25rem .6rem", fontSize: ".65rem" }}
                    onClick={clearFilters}
                  >
                    Reset filters
                  </button>
                )}
              </div>
            </div>

            {/* Filter controls */}
            <div className="transaction-filters">
              {accounts.length > 1 && (
                <label>
                  <span className="sr-only">Account</span>
                  <select
                    value={selectedAccountId}
                    onChange={(event) => setSelectedAccountId(event.target.value)}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} · {account.bank}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="transaction-search">
                <Icon name="search" size={15} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search description, merchant or reference"
                  aria-label="Search transactions"
                />
              </label>

              <label>
                <span className="sr-only">Date range</span>
                <select value={range} onChange={(event) => setRange(event.target.value)}>
                  <option value="all">All dates</option>
                  <option value="past-7">Past 7 days</option>
                  <option value="past-30">Past 30 days</option>
                  <option value="this-month">This month</option>
                </select>
              </label>

              <label>
                <span className="sr-only">Transaction type</span>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as "all" | "income" | "expense")}
                >
                  <option value="all">All types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expenses</option>
                </select>
              </label>

              <label>
                <span className="sr-only">Category</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="all">All categories</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Table or Empty State */}
            {filteredTransactions.length ? (
              <div className="transaction-table" role="table" aria-label="Imported transactions">
                <div className="transaction-table__head" role="row">
                  <span>Date</span>
                  <span>Description</span>
                  <span>Category</span>
                  <span>Type</span>
                  <span>Amount</span>
                  <span>Balance</span>
                </div>
                {filteredTransactions.map((transaction) => {
                  const theme = getCategoryTheme(transaction.category);
                  return (
                    <div className="transaction-table__row" role="row" key={transaction.id}>
                      <span>{displayDate(transaction.date)}</span>
                      <span>
                        <b>{transaction.name}</b>
                        <small>
                          {transaction.counterparty || transaction.reference || "Imported transaction"}
                        </small>
                      </span>
                      <span>
                        <span className={`category-pill ${theme.pillClass}`}>
                          <span
                            className="category-badge-dot"
                            style={{ backgroundColor: theme.color, width: ".4rem", height: ".4rem" }}
                          />
                          {transaction.category}
                        </span>
                      </span>
                      <span>
                        <span className={`type-badge type-badge--${transaction.type}`}>
                          {transaction.type}
                        </span>
                      </span>
                      <strong className={transaction.type === "income" ? "is-income" : ""}>
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </strong>
                      <span>
                        {transaction.balanceAfter == null
                          ? "—"
                          : formatCurrency(transaction.balanceAfter, transaction.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <p>No imported transactions match these filters.</p>
                {isFilterActive && (
                  <button
                    type="button"
                    className="button button--outline"
                    style={{ marginTop: ".75rem", padding: ".35rem .8rem", fontSize: ".7rem" }}
                    onClick={clearFilters}
                  >
                    Clear active filters
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}