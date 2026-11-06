"use client";

import { useState } from "react";
import Link from "next/link";

type NavIcon = "grid" | "arrow" | "chart" | "wallet" | "target" | "file" | "menu" | "close" | "help" | "more";

function NavIcon({ name }: { name: NavIcon }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    arrow: <><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 3-4 3 2 5-7" /></>,
    wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5z" /><path d="M4 8h15" /></>,
    target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.3 2.3 0 1 1 3.7 1.8c-.9.7-1.5 1-1.5 2.2M12 16.5h.01" /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

const items: { label: string; icon: NavIcon; active?: boolean }[] = [
  { label: "Overview", icon: "grid", active: true },
  { label: "Transactions", icon: "arrow" },
  { label: "Analytics", icon: "chart" },
  { label: "Budgets", icon: "wallet" },
  { label: "Savings goals", icon: "target" },
  { label: "Reports", icon: "file" },
];

export default function DashboardNavbar() {
  const [open, setOpen] = useState(false);
  return <>
    <aside className={`dashboard-sidebar ${open ? "dashboard-sidebar--open" : ""}`}>
      <div className="dashboard-sidebar__top"><Link className="brand dashboard-brand" href="/"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span>FINATS</span></Link><button className="dashboard-mobile-close" type="button" aria-label="Close navigation" onClick={() => setOpen(false)}><NavIcon name="close" /></button></div>
      <nav className="dashboard-nav" aria-label="Dashboard navigation"><p className="dashboard-nav__label">Workspace</p>{items.map((item) => <Link className={`dashboard-nav__item ${item.active ? "is-active" : ""}`} href={item.label === "Overview" ? "/dashboard" : `#${item.label.toLowerCase().replaceAll(" ", "-")}`} key={item.label} onClick={() => setOpen(false)}><NavIcon name={item.icon} /><span>{item.label}</span>{item.label === "Reports" && <span className="dashboard-nav__soon">Soon</span>}</Link>)}</nav>
      <div className="dashboard-sidebar__bottom"><button className="dashboard-help" type="button"><span className="dashboard-help__mark"><NavIcon name="help" /></span><span><b>Need a hand?</b><small>Explore the guide</small></span><NavIcon name="arrow" /></button><div className="dashboard-profile"><span className="dashboard-avatar">U</span><span><b>Personal account</b><small>Manual tracking</small></span><NavIcon name="more" /></div></div>
    </aside>
    {open && <button className="dashboard-sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <button className="dashboard-menu-button dashboard-menu-button--floating" type="button" aria-label="Open navigation" onClick={() => setOpen(true)}><NavIcon name="menu" /></button>
  </>;
}
