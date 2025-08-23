#!/bin/bash

echo "Running soft delete migration for lottery tickets..."

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI not found. Please install it first."
    echo "Visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Run the migration
echo "Applying migration: 20250101000000_create_soft_delete_lottery_ticket_function.sql"
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo "You can now soft delete lottery tickets without draw_date validation errors."
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi

echo ""
echo "Migration completed. The soft delete functionality should now work properly."
