psql $DATABASE_URL -f database.sql
psql $DATABASE_URL -f db/migrations/V3__create_referrals_table.sql
