import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { phone, password, email, name, line_id, branch, credit_balance, role } = await request.json();

    // Validate required fields
    if (!phone || !password) {
      return new NextResponse(JSON.stringify({ error: 'เบอร์โทรศัพท์และรหัสผ่านเป็นข้อมูลที่จำเป็น' }), { status: 400 });
    }

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

    // 3. Check if phone number already exists
    const { data: existingUserByPhone } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingUserByPhone) {
      return new NextResponse(JSON.stringify({ error: 'เบอร์โทรศัพท์นี้ถูกใช้แล้ว' }), { status: 400 });
    }

    // 4. Create email if not provided (required for Supabase Auth)
    const userEmail = email || `${phone.replace(/[^0-9]/g, '')}@phone.local`;

    // 5. Check if email already exists (if provided)
    if (email) {
      const { data: existingUserByEmail } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUserByEmail) {
        return new NextResponse(JSON.stringify({ error: 'อีเมลนี้ถูกใช้แล้ว' }), { status: 400 });
      }
    }

    // 6. Create the new user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      phone: phone,
      password,
      email_confirm: true,
      phone_confirm: true,
    });

    if (authError) {
      throw new Error(`Auth Error: ${authError.message}`);
    }
    if (!authData.user) {
      throw new Error("Could not create user in authentication system.");
    }

    const newUserId = authData.user.id;

    // 7. Create the user's profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUserId,
        email: email || userEmail,
        phone,
        name,
        line_id,
        branch,
        credit_balance,
      });

    if (profileError) {
      throw new Error(`Profile Error: ${profileError.message}`);
    }

    // 8. Set the new user's role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role,
      });

    if (roleInsertError) {
      throw new Error(`Role Error: ${roleInsertError.message}`);
    }

    // 9. Log initial credit transaction if applicable
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
        console.warn(`Warning: Could not log initial credit transaction for user ${newUserId}:`, transactionError.message);
      }
    }

    return NextResponse.json({ 
      message: 'สร้างผู้ใช้สำเร็จ', 
      user: { 
        id: authData.user.id, 
        phone: authData.user.phone,
        email: authData.user.email 
      } 
    });

  } catch (error: any) {
    console.error('User creation failed:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
} 