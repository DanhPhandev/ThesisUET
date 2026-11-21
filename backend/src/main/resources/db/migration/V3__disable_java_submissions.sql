-- Keep old Java submissions intact for history; disable only future Java runs/submissions.
-- Flyway runs this migration on existing databases as well as fresh installations.
UPDATE languages SET is_active = FALSE WHERE code = 'java';
