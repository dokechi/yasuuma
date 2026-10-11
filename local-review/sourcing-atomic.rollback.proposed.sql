-- LOCAL REVIEW ONLY. Pause the save caller first; preserve receipts/data.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.command_center_apply_sourcing_review(text,text,text,text,timestamptz,timestamptz,uuid,jsonb) FROM service_role;
REVOKE INSERT ON public.command_center_mutation_receipts FROM service_role;
DROP FUNCTION public.command_center_apply_sourcing_review(text,text,text,text,timestamptz,timestamptz,uuid,jsonb);
-- Deliberately retain the receipt table and its rows. No business data deletion.
COMMIT;
