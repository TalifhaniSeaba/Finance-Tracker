
create policy classification_results_insert_own on public.classification_results for insert
with check (exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid()));

create policy classification_results_update_own on public.classification_results for update
using (exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid()))
with check (exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid()));

create policy classification_results_delete_own on public.classification_results for delete
using (exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid()));
