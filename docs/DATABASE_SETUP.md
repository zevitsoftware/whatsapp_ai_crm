# Phase 1.3: Database Setup

The backend requires a MySQL database named `crm_marketing`.

## Option 1: Using MySQL Command Line

```bash
mysql -u root -p
```

Then run:
```sql
CREATE DATABASE IF NOT EXISTS crm_marketing
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

## Option 2: Using SQL File

```bash
mysql -u root -p < backend/create-database.sql
```

## Option 3: Using MySQL Workbench or phpMyAdmin

1. Open your MySQL client
2. Create a new database named: `crm_marketing`
3. Character set: `utf8mb4`
4. Collation: `utf8mb4_unicode_ci`

## Verify Database Creation

Run the MySQL test:
```bash
cd backend
npm run test:mysql
```

You should see:
```
✅ Database 'crm_marketing' exists
```
