-- Backfill any legacy rows that were left without a fingerprint. The wider
-- format supports every value allowed by transactions.amount numeric(14,2).
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
