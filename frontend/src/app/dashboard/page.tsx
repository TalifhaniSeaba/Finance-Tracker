"use client";

import { ChangeEvent, FormEvent, ReactNode, useMemo, useState } from "react";
import DashboardNavbar from "../components/DashboardNavbar";

type IconName = "chart" | "wallet" | "target" | "file" | "bell" | "search" | "plus" | "chevron-down" | "more" | "arrow-down-left" | "arrow-up-right-small" | "close" | "upload" | "link" | "check";
type AccountSource = "banklink" | "statement";
type AccountStatus = "awaiting_banklink" | "statement_ready" | "connected";
type Account = { id: string; name: string; bank: string; number: string; source: AccountSource; status: AccountStatus; color: string; balance: number; statementName?: string };
type Transaction = { id: string; accountId: string; name: string; category: string; amount: number; type: "income" | "expense"; date: string };

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
  };
  return <svg {...common}>{paths[name]}</svg>;
}

const formatCurrency = (value: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(value);
const today = () => new Intl.DateTimeFormat("en-CA").format(new Date());
const displayDate = (value: string) => new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
const banks = ["FNB", "Absa", "Capitec", "Nedbank", "Standard Bank", "Discovery"];

function accountStatusLabel(account: Account) {
  if (account.status === "connected") return "Connected";
  return account.status === "awaiting_banklink" ? "Awaiting secure sync" : "Awaiting statement processing";
}

function isInDateRange(dateValue: string, range: string) {
  if (range === "all") return true;
  const date = new Date(`${dateValue}T12:00:00`);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (range === "past-7") start.setDate(start.getDate() - 6);
  if (range === "next-7") end.setDate(end.getDate() + 6);
  if (range === "this-month") { start.setDate(1); end.setMonth(end.getMonth() + 1, 0); }
  if (range === "next-month") { start.setMonth(start.getMonth() + 1, 1); end.setMonth(start.getMonth() + 1, 0); }
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [showConnect, setShowConnect] = useState(false);
  const [bank, setBank] = useState("FNB");
  const [method, setMethod] = useState<AccountSource>("banklink");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [dateRange, setDateRange] = useState("all");
  const [notice, setNotice] = useState("");

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const selectedTransactions = useMemo(() => transactions.filter((transaction) => transaction.accountId === selectedAccountId && isInDateRange(transaction.date, dateRange)), [selectedAccountId, dateRange, transactions]);
  const income = selectedTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = selectedTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const categories = useMemo(() => {
    const grouped = new Map<string, number>();
    selectedTransactions.filter((item) => item.type === "expense").forEach((item) => grouped.set(item.category, (grouped.get(item.category) ?? 0) + item.amount));
    return [...grouped.entries()].sort(([, first], [, second]) => second - first);
  }, [selectedTransactions]);

  function chooseBank(event: ChangeEvent<HTMLSelectElement>) {
    const nextBank = event.target.value;
    setBank(nextBank);
    if (nextBank !== "FNB") setMethod("statement");
  }

  function connectAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountName.trim()) return;
    const account: Account = { id: crypto.randomUUID(), name: accountName.trim(), bank, number: accountNumber.replace(/\D/g, "").slice(-4).padStart(4, "0"), source: method, status: method === "banklink" ? "awaiting_banklink" : "statement_ready", color: accounts.length % 2 ? "blue" : "green", balance: 0, statementName: statementFile?.name };
    setAccounts((current) => [...current, account]); setSelectedAccountId(account.id); setAccountName(""); setAccountNumber(""); setStatementFile(null); setShowConnect(false);
    setNotice(method === "banklink" ? "Banklink connection started. Live transaction data will appear after the secure backend connection completes." : `Statement ${statementFile ? `“${statementFile.name}” ` : ""}is ready for backend parsing.`);
  }

  return <div className="dashboard-shell"><DashboardNavbar />
    <main className="dashboard-main"><header className="dashboard-header"><div className="dashboard-header__greeting"><p className="dashboard-kicker">{displayDate(today())}</p></div><div className="dashboard-header__actions"><button className="dashboard-icon-button" type="button" aria-label="Notifications"><Icon name="bell" /></button><button className="dashboard-header-avatar" type="button">U</button></div></header>
      <div className="dashboard-content"><section className="dashboard-intro"><div><p className="dashboard-kicker">Selected account overview</p><h2>{selectedAccount ? selectedAccount.name : "Connect your first account."}</h2></div><label className="period-picker">View <select value={dateRange} onChange={(event) => setDateRange(event.target.value)}><option value="all">All history</option><option value="past-7">Past 7 days</option><option value="next-7">Next 7 days</option><option value="this-month">This month</option><option value="next-month">Next month</option></select><Icon name="chevron-down" size={15} /></label></section>
        {notice && <div className="integration-notice" role="status"><Icon name="check" size={16} /><span>{notice}</span><button type="button" aria-label="Dismiss notice" onClick={() => setNotice("")}><Icon name="close" size={15} /></button></div>}
        {!selectedAccount && <section className="data-source-panel"><div><span className="data-source-panel__icon"><Icon name="link" size={18} /></span><div><p className="panel-kicker">Secure data connection</p><h3>Bring in your real bank data</h3><p>Connect FNB through Banklink or upload a statement from any supported bank. Transactions will be classified and shown here after processing.</p></div></div><button className="button button--primary" type="button" onClick={() => setShowConnect(true)}><Icon name="plus" size={15} /> Add bank account</button></section>}
        {selectedAccount && <section className="selected-source-banner"><div><span className="data-source-panel__icon"><Icon name={selectedAccount.source === "banklink" ? "link" : "file"} size={18} /></span><div><p className="panel-kicker">Showing only this account</p><h3>{selectedAccount.name} · {selectedAccount.bank}</h3><p>{selectedAccount.source === "banklink" ? "Banklink connection" : `Statement import${selectedAccount.statementName ? ` · ${selectedAccount.statementName}` : ""}`} · {accountStatusLabel(selectedAccount)}</p></div></div><button className="button button--outline" type="button" onClick={() => setShowConnect(true)}>Add another account</button></section>}
        {selectedAccount && <><section className="dashboard-metrics" aria-label="Financial summary"><MetricCard title="Selected balance" value={selectedAccount.balance ? formatCurrency(selectedAccount.balance) : "—"} icon="wallet" primary /><MetricCard title="Income" value={income ? formatCurrency(income) : "—"} icon="arrow-down-left" /><MetricCard title="Expenses" value={expenses ? formatCurrency(expenses) : "—"} icon="arrow-up-right-small" /><MetricCard title="Net savings" value={selectedTransactions.length ? formatCurrency(income - expenses) : "—"} icon="target" /></section><section className="dashboard-grid dashboard-grid--main"><article className="dashboard-panel empty-data-panel"><div className="panel-heading"><div><p className="panel-kicker">Financial activity</p><h3>Income vs expenses</h3></div></div><EmptyState text="Income and expense analytics will appear here after transactions are imported." /></article><article className="dashboard-panel"><div className="panel-heading"><div><p className="panel-kicker">Classification</p><h3>Spending categories</h3></div></div>{categories.length ? <div className="spending-list spending-list--full">{categories.map(([category, amount], index) => <div className="spending-row" key={category}><span className={`spending-dot spending-dot--${["home", "food", "transport", "other"][index % 4]}`} /><span className="spending-row__name">{category}<small>{formatCurrency(amount)} spent</small></span><b>{expenses ? Math.round(amount / expenses * 100) : 0}%</b></div>)}</div> : <EmptyState text="Classified expense categories will appear after transactions are imported." />}</article></section></>}
        <section className="dashboard-section-heading"><div><p className="panel-kicker">Your connected accounts</p><h3>Cards & accounts</h3></div><button className="add-button" type="button" onClick={() => setShowConnect(true)}><Icon name="plus" size={16} /> Add account</button></section><section className="cards-layout">{accounts.length ? <div className="card-rail">{accounts.map((account) => <button className={`account-card account-card--${account.color} ${account.id === selectedAccountId ? "is-selected" : ""}`} type="button" key={account.id} onClick={() => setSelectedAccountId(account.id)}><div className="account-card__top"><span>{account.name}</span><b>{account.bank}</b></div><strong>{account.balance ? formatCurrency(account.balance) : "Awaiting data"}</strong><div className="account-card__bottom"><span>•••• {account.number}</span><span>{account.id === selectedAccountId ? "Selected" : "Select"}</span></div></button>)}</div> : <div className="empty-accounts"><Icon name="wallet" size={25} /><h3>No connected accounts</h3><p>Add an FNB Banklink connection or upload a statement from any bank.</p><button className="add-button" type="button" onClick={() => setShowConnect(true)}><Icon name="plus" size={16} /> Add account</button></div>}</section>
      </div></main>{showConnect && <ConnectionModal bank={bank} method={method} accountName={accountName} accountNumber={accountNumber} statementFile={statementFile} onBankChange={chooseBank} onMethodChange={setMethod} onNameChange={setAccountName} onNumberChange={setAccountNumber} onFileChange={setStatementFile} onSubmit={connectAccount} onClose={() => setShowConnect(false)} />}</div>;
}

function ConnectionModal({ bank, method, accountName, accountNumber, statementFile, onBankChange, onMethodChange, onNameChange, onNumberChange, onFileChange, onSubmit, onClose }: { bank: string; method: AccountSource; accountName: string; accountNumber: string; statementFile: File | null; onBankChange: (event: ChangeEvent<HTMLSelectElement>) => void; onMethodChange: (method: AccountSource) => void; onNameChange: (value: string) => void; onNumberChange: (value: string) => void; onFileChange: (file: File | null) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  const isFnb = bank === "FNB";
  return <div className="dashboard-modal-backdrop"><section className="dashboard-modal dashboard-modal--connection" role="dialog" aria-modal="true" aria-labelledby="connection-title"><div className="dashboard-modal__heading"><div><p className="panel-kicker">Secure account setup</p><h2 id="connection-title">Add bank account</h2></div><button className="dashboard-icon-button" type="button" aria-label="Close setup" onClick={onClose}><Icon name="close" size={17} /></button></div><p className="dashboard-modal__copy">Choose how FINATS should receive this account&apos;s data. Banklink credentials are never entered into FINATS.</p><form className="add-card-form" onSubmit={onSubmit}><label>Bank<select value={bank} onChange={onBankChange}>{banks.map((item) => <option key={item}>{item}</option>)}</select></label><label>Account label<input value={accountName} onChange={(event) => onNameChange(event.target.value)} placeholder="e.g. Main account" required /></label><label>Last four digits (optional)<input value={accountNumber} onChange={(event) => onNumberChange(event.target.value)} inputMode="numeric" maxLength={4} placeholder="4821" /></label><div className="connection-methods"><button type="button" className={`connection-method ${method === "banklink" ? "is-selected" : ""} ${!isFnb ? "is-disabled" : ""}`} disabled={!isFnb} onClick={() => onMethodChange("banklink")}><Icon name="link" size={17} /><span><b>Connect with Banklink</b><small>{isFnb ? "Available for FNB live connections" : "Not live for this bank yet"}</small></span>{method === "banklink" && isFnb && <Icon name="check" size={15} />}</button><button type="button" className={`connection-method ${method === "statement" ? "is-selected" : ""}`} onClick={() => onMethodChange("statement")}><Icon name="upload" size={17} /><span><b>Upload bank statement</b><small>Available for every listed bank</small></span>{method === "statement" && <Icon name="check" size={15} />}</button></div>{method === "statement" && <label className="statement-dropzone"><Icon name="upload" size={22} /><span>{statementFile ? statementFile.name : "Choose a PDF, CSV, XLS, or XLSX statement"}</span><input type="file" accept=".pdf,.csv,.xls,.xlsx" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} /></label>}{method === "banklink" && <p className="connection-consent">You&apos;ll continue through Banklink&apos;s secure authorization flow. This frontend currently creates the pending connection record; the backend will start the real link request.</p>}<div className="dashboard-modal__actions"><button className="button button--outline" type="button" onClick={onClose}>Cancel</button><button className="button button--primary" type="submit">{method === "banklink" ? "Continue to Banklink" : "Submit statement"}</button></div></form></section></div>;
}

function MetricCard({ title, value, icon, primary = false }: { title: string; value: string; icon: IconName; primary?: boolean }) { return <article className={`metric-card ${primary ? "metric-card--balance" : ""}`}><div className="metric-card__top"><span>{title}</span><span className={`metric-icon ${primary ? "" : "metric-icon--soft"}`}><Icon name={icon} size={16} /></span></div><strong>{value}</strong><p className={`metric-change ${primary ? "metric-change--light" : ""}`}>{value === "—" ? "Awaiting imported data" : "Selected account"}</p></article>; }
function EmptyState({ text }: { text: string }) { return <div className="dashboard-empty-state"><span className="dashboard-empty-state__icon"><Icon name="chart" size={20} /></span><p>{text}</p></div>; }
