-- Marketing Automation Engine - Database Setup
-- Run this script to create the database

CREATE DATABASE IF NOT EXISTS crm_marketing
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE crm_marketing;

-- Verify database creation
SELECT 'Database crm_marketing created successfully!' AS status;
