import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, password, name, phone, line_id, branch, credit_balance, role } = await request.json();

    // Create a Supabase client configured to use cookies for the current session
    const supabase = createRouteHandlerClient({ cookies });

    // 1. Check if the current user is an admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized: No user session found.' }), { status: 401 });
    }

    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || userRole?.role !== 'admin') {
      return new NextResponse(JSON.stringify({ error: 'Forbidden: This action requires admin privileges.' }), { status: 403 });
    }

    // 2. Use the service role client for admin operations
    // This is crucial for operations requiring elevated privileges.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 3. Create the new user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm user's email
    });

    if (authError) {
      throw new Error(`Auth Error: ${authError.message}`);
    }
    if (!authData.user) {
      throw new Error("Could not create user in authentication system.");
    }

    const newUserId = authData.user.id;

    // 4. Create the user's profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUserId,
        email,
        name,
        phone,
        line_id,
        branch,
        credit_balance,
      });

    if (profileError) {
      throw new Error(`Profile Error: ${profileError.message}`);
    }

    // 5. Set the new user's role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role,
      });

    if (roleInsertError) {
      throw new Error(`Role Error: ${roleInsertError.message}`);
    }

    // 6. Log initial credit transaction if applicable
    if (credit_balance > 0) {
      const { error: transactionError } = await supabaseAdmin
        .from('credit_transactions')
        .insert({
          user_id: newUserId,
          amount: credit_balance,
          transaction_type: 'initial_credit',
          description: `เครดิตเริ่มต้นจากการสร้างบัญชีโดย Admin`
        });

      if (transactionError) {
        // Log a warning but don't fail the entire request
        console.warn(`Warning: Could not log initial credit transaction for user ${newUserId}:`, transactionError.message);
      }
    }

    return NextResponse.json({ message: 'User created successfully', user: authData.user });

  } catch (error: any) {
    console.error('User creation failed:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
} 