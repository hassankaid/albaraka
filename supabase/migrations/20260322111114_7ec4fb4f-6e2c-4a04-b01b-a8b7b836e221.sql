-- Reclassify meta_ads leads to their granular source based on source_detail
UPDATE leads SET source = 'vsl_b' WHERE source = 'meta_ads' AND source_detail = 'vsl_b';
UPDATE leads SET source = 'webi' WHERE source = 'meta_ads' AND source_detail = 'vsl_webi';
-- Catch any remaining meta_ads with unknown detail as 'autre'
UPDATE leads SET source = 'autre' WHERE source = 'meta_ads';
