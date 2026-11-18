-- The original fingerprint index was partial, which PostgreSQL cannot match
-- to the upsert conflict target used by the statement importer.
drop index if exists public.transactions_account_fingerprint_idx;

create unique index if not exists transactions_account_fingerprint_idx
  on public.transactions(account_id, transaction_fingerprint);
