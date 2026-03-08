#!/bin/bash

# Apply partial access database migration
echo "Applying partial access database migration..."

# Get database URL from environment
DB_URL="${DATABASE_URL}"

if [ -z "$DB_URL" ]; then
    echo "Error: DATABASE_URL environment variable not set"
    exit 1
fi

# Apply the SQL migration
echo "Executing migration..."
psql "$DB_URL" -f migrations/add_partial_access.sql

if [ $? -eq 0 ]; then
    echo "Migration applied successfully!"
else
    echo "Migration failed. Please check the error above."
    exit 1
fi
