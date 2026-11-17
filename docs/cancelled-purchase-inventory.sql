-- Preserve purchase history and sale allocations; only available stock is suppressed.
CREATE OR REPLACE VIEW public.command_center_sourcing_inventory WITH (security_invoker = true) AS
 SELECT p.id,
    p.ordered_at,
    p.supplier_key,
    p.supplier_name,
    p.order_id,
    p.source_type,
    p.source_message_id,
    p.source_thread_id,
    p.source_subject,
    p.line_no,
    p.product_name,
    p.sku,
    p.variant,
    p.quantity,
    p.unit_price_yen,
    p.line_total_yen,
    p.order_subtotal_yen,
    p.order_shipping_yen,
    p.order_discount_yen,
    p.order_total_yen,
    p.status,
    p.source_url,
    p.metadata,
    p.created_at,
    p.updated_at,
    p.allocated_net_line_yen,
    p.allocated_net_unit_yen,
        CASE
            WHEN COALESCE((p.metadata ->> 'bundle_decomposed'::text)::boolean, false) THEN GREATEST(p.quantity - COALESCE(b.complete_sets_remaining, p.quantity), 0)
            ELSE LEAST(p.quantity, GREATEST(COALESCE(a.sold_quantity, 0), COALESCE(j.minimum_sold_quantity, 0)) + COALESCE(j.other_adjustment_quantity, 0))
        END AS sold_quantity,
        CASE
            WHEN p.status IN ('cancelled', 'returned') THEN 0
            WHEN COALESCE((p.metadata ->> 'bundle_decomposed'::text)::boolean, false) THEN COALESCE(b.complete_sets_remaining, p.quantity)
            ELSE GREATEST(p.quantity - GREATEST(COALESCE(a.sold_quantity, 0), COALESCE(j.minimum_sold_quantity, 0)) - COALESCE(j.other_adjustment_quantity, 0), 0)
        END AS remaining_quantity,
        CASE
            WHEN COALESCE((p.metadata ->> 'bundle_decomposed'::text)::boolean, false) THEN COALESCE(b.sold_amount_yen, 0)
            ELSE COALESCE(a.sold_amount_yen, 0)
        END AS sold_amount_yen,
        CASE
            WHEN COALESCE((p.metadata ->> 'bundle_decomposed'::text)::boolean, false) THEN COALESCE(b.matched_sales, 0)
            ELSE COALESCE(a.matched_sales, 0)
        END AS matched_sales,
        CASE
            WHEN COALESCE((p.metadata ->> 'bundle_decomposed'::text)::boolean, false) AND COALESCE(b.matched_sales, 0) > 0 THEN
            CASE
                WHEN COALESCE(b.non_exact, 0) = 0 THEN 'exact'::text
                ELSE 'review'::text
            END
            WHEN COALESCE(j.minimum_sold_quantity, 0) > COALESCE(a.sold_quantity, 0) OR COALESCE(j.other_adjustment_quantity, 0) > 0 THEN 'review'::text
            WHEN COALESCE(a.matched_sales, 0) = 0 THEN 'none'::text
            WHEN COALESCE(a.non_exact, 0) = 0 THEN 'exact'::text
            ELSE 'review'::text
        END AS inventory_match_status,
    GREATEST(0, COALESCE(j.minimum_sold_quantity, 0) - COALESCE(a.sold_quantity, 0)) + COALESCE(j.other_adjustment_quantity, 0) AS adjustment_quantity
   FROM command_center_sourcing_purchases p
     LEFT JOIN LATERAL ( SELECT sum(x.quantity)::integer AS sold_quantity,
            sum(COALESCE(x.allocated_sale_yen, 0))::integer AS sold_amount_yen,
            count(DISTINCT x.sale_row_id)::integer AS matched_sales,
            count(*) FILTER (WHERE x.confidence <> 'exact'::text)::integer AS non_exact
           FROM command_center_sourcing_sale_allocations x
          WHERE x.purchase_id = p.id) a ON true
     LEFT JOIN LATERAL ( SELECT max(x.quantity) FILTER (WHERE x.adjustment_type = 'minimum_sold_floor'::text) AS minimum_sold_quantity,
            COALESCE(sum(x.quantity) FILTER (WHERE x.adjustment_type <> 'minimum_sold_floor'::text), 0::bigint)::integer AS other_adjustment_quantity
           FROM command_center_sourcing_inventory_adjustments x
          WHERE x.purchase_id = p.id) j ON true
     LEFT JOIN LATERAL ( SELECT min(ci.remaining_quantity) AS complete_sets_remaining,
            sum(ci.sold_amount_yen)::integer AS sold_amount_yen,
            sum(ci.matched_sales)::integer AS matched_sales,
            count(*) FILTER (WHERE ci.inventory_match_status = 'review'::text)::integer AS non_exact
           FROM command_center_sourcing_bundle_component_inventory ci
          WHERE ci.purchase_id = p.id) b ON true;

