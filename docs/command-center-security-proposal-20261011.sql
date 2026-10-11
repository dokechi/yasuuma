-- REVIEW ONLY. Do not execute against production without separate approval.
-- The statements below intentionally remain comments. Confirm all role grants,
-- policies, dependencies and ledger API behavior in an isolated restored DB.
-- No authentication, credential, network or permission changes in this release.

-- Candidate service-only tables (RLS currently disabled; anon read/write grants):
-- public.command_center_sourcing_sale_allocations
-- public.command_center_sourcing_bundle_components
-- public.command_center_sourcing_component_sale_allocations
-- public.command_center_sourcing_inventory_adjustments

-- For each verified service-only table, a possible next-stage proposal is:
-- ALTER TABLE public.<reviewed_table> ENABLE ROW LEVEL SECURITY;
-- REVOKE ALL ON public.<reviewed_table> FROM PUBLIC, anon, authenticated;
-- Existing service_role access must be verified, not assumed or broadened.
-- No blanket client policy is proposed because browser ownership is unverified.

-- Views lacking security_invoker, with anon grants:
-- public.command_center_sourcing_inventory
-- public.command_center_sourcing_bundle_component_inventory
-- public.command_center_sourcing_bundle_component_summary
-- public.command_center_sourcing_bundle_summary

-- Possible next-stage proposal, only after dependency checks:
-- ALTER VIEW public.<reviewed_view> SET (security_invoker = true);
-- REVOKE ALL ON public.<reviewed_view> FROM PUBLIC, anon, authenticated;

-- Required isolated tests: anon/authenticated direct SELECT and mutations fail;
-- existing service API reads and saves succeed; underlying table RLS and grants
-- are respected; restore captured grants/options/policies for rollback.
-- Snapshot current grants/options/policies before authorizing any live change.
