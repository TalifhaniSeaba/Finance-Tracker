

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  role text not null default 'user',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'banklink',
  connection_method text not null check (connection_method in ('banklink', 'statement')),
  bank_name text not null,
  bank_code text,
  external_profile_id text,
  status text not null default 'pending' check (status in ('pending', 'connected', 'processing', 'failed', 'disconnected')),
  consented_at timestamptz,
  revoked_at timestamptz,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.bank_connections(id) on delete set null,
  external_account_id text,
  name text not null,
  account_type text not null default 'bank_account',
  account_last4 text check (account_last4 is null or account_last4 ~ '^[0-9]{4}$'),
  currency text not null default 'ZAR' check (char_length(currency) = 3),
  balance numeric(14, 2),
  status text not null default 'pending' check (status in ('pending', 'connected', 'processing', 'needs_review', 'failed', 'disconnected')),
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.bank_accounts(id) on delete cascade,
  external_id text,
  transaction_date date not null,
  description text not null,
  reference text,
  counterparty text,
  amount numeric(14, 2) not null check (amount <> 0),
  balance_after numeric(14, 2),
  transaction_type text not null default 'unknown' check (transaction_type in ('income', 'expense', 'transfer', 'unknown')),
  category text,
  classification_confidence numeric(5, 4) check (classification_confidence between 0 and 1),
  classification_source text,
  classification_status text not null default 'pending' check (classification_status in ('pending', 'classified', 'needs_review', 'failed')),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.classification_results (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  classifier_version text not null,
  transaction_type text not null check (transaction_type in ('income', 'expense', 'transfer', 'unknown')),
  category text,
  confidence numeric(5, 4) check (confidence between 0 and 1),
  source text not null default 'classifier',
  raw_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.statement_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.bank_accounts(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'needs_review', 'completed', 'failed')),
  error_message text,
  transaction_count integer not null default 0 check (transaction_count >= 0),
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'banklink',
  delivery_id text not null,
  event_type text,
  payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'failed', 'ignored')),
  error_message text,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  unique (provider, delivery_id)
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.bank_accounts(id) on delete cascade,
  category text not null,
  period_start date not null,
  period_end date not null,
  limit_amount numeric(14, 2) not null check (limit_amount > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (period_end >= period_start)
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.bank_accounts(id) on delete cascade,
  name text not null,
  target_amount numeric(14, 2) not null check (target_amount > 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  target_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.bank_accounts(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  file_name text,
  storage_path text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (period_end >= period_start)
);

create unique index if not exists bank_connections_user_external_profile_idx
  on public.bank_connections(user_id, external_profile_id)
  where external_profile_id is not null;
create index if not exists bank_connections_user_id_idx on public.bank_connections(user_id);
create index if not exists bank_accounts_user_id_idx on public.bank_accounts(user_id);
create index if not exists bank_accounts_connection_id_idx on public.bank_accounts(connection_id);
create unique index if not exists bank_accounts_external_id_idx
  on public.bank_accounts(connection_id, external_account_id)
  where external_account_id is not null;
create index if not exists transactions_account_date_idx on public.transactions(account_id, transaction_date desc);
create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index if not exists transactions_classification_status_idx on public.transactions(classification_status);
create unique index if not exists transactions_external_id_idx
  on public.transactions(account_id, external_id)
  where external_id is not null;
create index if not exists statement_imports_account_id_idx on public.statement_imports(account_id, created_at desc);
create index if not exists budgets_user_period_idx on public.budgets(user_id, period_start, period_end);
create index if not exists savings_goals_user_status_idx on public.savings_goals(user_id, status);
create index if not exists reports_user_created_idx on public.reports(user_id, created_at desc);

-- Keep application-managed timestamps consistent.
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists bank_connections_set_updated_at on public.bank_connections;
create trigger bank_connections_set_updated_at before update on public.bank_connections
for each row execute function public.set_updated_at();
drop trigger if exists bank_accounts_set_updated_at on public.bank_accounts;
create trigger bank_accounts_set_updated_at before update on public.bank_accounts
for each row execute function public.set_updated_at();
drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at before update on public.transactions
for each row execute function public.set_updated_at();
drop trigger if exists statement_imports_set_updated_at on public.statement_imports;
create trigger statement_imports_set_updated_at before update on public.statement_imports
for each row execute function public.set_updated_at();
drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at before update on public.budgets
for each row execute function public.set_updated_at();
drop trigger if exists savings_goals_set_updated_at on public.savings_goals;
create trigger savings_goals_set_updated_at before update on public.savings_goals
for each row execute function public.set_updated_at();
drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at before update on public.reports
for each row execute function public.set_updated_at();

-- RLS: users can access only rows belonging to their authenticated user.
alter table public.profiles enable row level security;
alter table public.bank_connections enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.classification_results enable row level security;
alter table public.statement_imports enable row level security;
alter table public.webhook_events enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.reports enable row level security;

create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy bank_connections_select_own on public.bank_connections for select using (auth.uid() = user_id);
create policy bank_connections_insert_own on public.bank_connections for insert with check (auth.uid() = user_id);
create policy bank_connections_update_own on public.bank_connections for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy bank_connections_delete_own on public.bank_connections for delete using (auth.uid() = user_id);

create policy bank_accounts_select_own on public.bank_accounts for select using (auth.uid() = user_id);
create policy bank_accounts_insert_own on public.bank_accounts for insert
with check (auth.uid() = user_id and (connection_id is null or exists (select 1 from public.bank_connections c where c.id = connection_id and c.user_id = auth.uid())));
create policy bank_accounts_update_own on public.bank_accounts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id and (connection_id is null or exists (select 1 from public.bank_connections c where c.id = connection_id and c.user_id = auth.uid())));
create policy bank_accounts_delete_own on public.bank_accounts for delete using (auth.uid() = user_id);

create policy transactions_select_own on public.transactions for select using (auth.uid() = user_id);
create policy transactions_insert_own on public.transactions for insert
with check (auth.uid() = user_id and exists (select 1 from public.bank_accounts a where a.id = account_id and a.user_id = auth.uid()));
create policy transactions_update_own on public.transactions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id and exists (select 1 from public.bank_accounts a where a.id = account_id and a.user_id = auth.uid()));
create policy transactions_delete_own on public.transactions for delete using (auth.uid() = user_id);

create policy classification_results_select_own on public.classification_results for select
using (exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid()));

create policy statement_imports_select_own on public.statement_imports for select using (auth.uid() = user_id);
create policy statement_imports_insert_own on public.statement_imports for insert
with check (auth.uid() = user_id and exists (select 1 from public.bank_accounts a where a.id = account_id and a.user_id = auth.uid()));
create policy statement_imports_update_own on public.statement_imports for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id and exists (select 1 from public.bank_accounts a where a.id = account_id and a.user_id = auth.uid()));
create policy statement_imports_delete_own on public.statement_imports for delete using (auth.uid() = user_id);

-- Webhook events are server-only. With RLS enabled and no client policies,
-- the backend service-role client is the only intended writer/reader.

create policy budgets_select_own on public.budgets for select
using (auth.uid() = user_id and (account_id is null or exists (select 1 from public.bank_accounts a where a.id = account_id and a.user_id = auth.uid())));
create policy budgets_insert_own on public.budgets for insert
with check (auth.uid() = user_id and (account_id is null or exists (select 1 from public.bank_accounts a where a.id = account_id and a.user_id = auth.uid())));
create policy budgets_update_own on public.budgets for update
using (auth.uid() = user_id) with check (auth.uid() = user_id and (account_id is null or exists (select 1 from public.bank_accounts a where a.id = account_id and a.user_id = auth.uid())));
create policy budgets_delete_own on public.budgets for delete using (auth.uid() = user_id);

create policy savings_goals_select_own on public.savings_goals for select
using (auth.uid() = user_id and (account_id is null or exists (select 1 from public.bank_accounts a where a.id = account_id and a.user_id = auth.uid())));
create policy savings_goals_insert_own on public.savings_goals for insert
with check (auth.uid() = user_id and (account_id is null or exists (select 1 from public.bank_accounts a where a.id = account_id and a.user_id = auth.uid())));
create policy savings_goals_update_own on public.savings_goals for update
using (auth.uid() = user_id) with check (auth.uid() = user_id and (account_id is null or exists (select 1 from public.bank_accounts a where a.id = account_id and a.user_id = auth.uid())));
create policy savings_goals_delete_own on public.savings_goals for delete using (auth.uid() = user_id);

create policy reports_select_own on public.reports for select
using (auth.uid() = user_id and (account_id is null or exists (select 1 from public.bank_accounts a where a.id = account_id and a.user_id = auth.uid())));
create policy reports_insert_own on public.reports for insert
with check (auth.uid() = user_id and (account_id is null or exists (select 1 from public.bank_accounts a where a.id = account_id and a.user_id = auth.uid())));
create policy reports_update_own on public.reports for update
using (auth.uid() = user_id) with check (auth.uid() = user_id and (account_id is null or exists (select 1 from public.bank_accounts a where a.id = account_id and a.user_id = auth.uid())));
create policy reports_delete_own on public.reports for delete using (auth.uid() = user_id);
