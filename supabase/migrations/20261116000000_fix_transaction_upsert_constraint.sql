
drop index if exists public.transactions_external_id_idx;

create unique index if not exists transactions_external_id_idx
  on public.transactions(account_id, external_id);


create unique index if not exists classification_results_transaction_version_idx
  on public.classification_results(transaction_id, classifier_version);
