-- Add code field to products table
ALTER TABLE products ADD COLUMN code text;

-- Add color field to categories table
ALTER TABLE categories ADD COLUMN color text DEFAULT '#6366f1';

-- Change min_stock default from 10 to 5
ALTER TABLE products ALTER COLUMN min_stock SET DEFAULT 5;