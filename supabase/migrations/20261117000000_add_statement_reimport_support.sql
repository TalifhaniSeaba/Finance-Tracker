alter table public.transactions
  add column if not exists transaction_fingerprint text;

-- Only backfill fingerprints that are unambiguous. Existing duplicate rows are
-- left nullable so this migration never deletes or silently changes history.
with fingerprints as (
  select
    id,
    md5(concat_ws('|', transaction_date::text, to_char(amount, 'FM9999999999990.00'), lower(trim(description)), lower(trim(coalesce(reference, ''))))) as fingerprint
  from public.transactions
  where transaction_fingerprint is null
), unique_fingerprints as (
  select fingerprint
  from fingerprints
  group by fingerprint
  having count(*) = 1
)
update public.transactions as transactions
set transaction_fingerprint = fingerprints.fingerprint
from fingerprints
join unique_fingerprints on unique_fingerprints.fingerprint = fingerprints.fingerprint
where transactions.id = fingerprints.id;

-- Keep this index non-partial so PostgREST can use it for
-- onConflict=account_id,transaction_fingerprint. PostgreSQL permits multiple
-- NULL values in a normal unique index, so legacy rows without fingerprints
-- remain valid.
create unique index if not exists transactions_account_fingerprint_idx
  on public.transactions(account_id, transaction_fingerprint);

create index if not exists transactions_fingerprint_idx
  on public.transactions(transaction_fingerprint)
  where transaction_fingerprint is not null;
