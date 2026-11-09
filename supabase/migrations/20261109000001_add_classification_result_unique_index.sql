create unique index if not exists classification_results_transaction_version_idx
  on public.classification_results(transaction_id, classifier_version);
