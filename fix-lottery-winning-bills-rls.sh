#!/bin/bash

# Script to fix RLS policies for lottery_winning_bills table
echo "🔧 Fixing RLS policies for lottery_winning_bills table..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first."
    exit 1
fi

# Get the project URL from environment or prompt user
if [ -z "$SUPABASE_URL" ]; then
    echo "📝 Please enter your Supabase project URL:"
    read SUPABASE_URL
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "📝 Please enter your Supabase anon key:"
    read SUPABASE_ANON_KEY
fi

# Set environment variables
export SUPABASE_URL=$SUPABASE_URL
export SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

echo "🚀 Starting RLS policy fix..."

# Run the migration
supabase db push --include-all

if [ $? -eq 0 ]; then
    echo "✅ RLS policies fixed successfully!"
    echo "🔐 New policies have been applied:"
    echo "   - Enable read access for authenticated users"
    echo "   - Enable insert for authenticated users"
    echo "   - Enable update for authenticated users"
    echo "   - Enable delete for service role only"
    echo "⚡ Indexes have been created for better performance"
    echo "🔑 Permissions have been granted to authenticated and service_role"
else
    echo "❌ RLS policy fix failed. Please check the error messages above."
    exit 1
fi

echo "🎉 RLS policy fix complete! The lottery_winning_bills table should now be accessible."
echo "📝 If you still see 403 errors, please check your Supabase dashboard for RLS settings." 