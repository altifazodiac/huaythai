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

    // Try to get authorization from header first, then fallback to cookies
    const authHeader = request.headers.get('authorization');
    
    let supabase;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Use bearer token
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: authHeader } }
        }
      );
    } else {
      // Fallback to cookies
      const cookieStore = await cookies();
      supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    }

    // 1. Check if the current user is an admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
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

    // 7. Create the user's profile (use upsert to handle duplicates)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUserId,
        email: email || userEmail,
        phone,
        name,
        line_id,
        branch,
        credit_balance,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      // If profile creation fails, clean up auth user
      console.error('Profile creation failed, cleaning up auth user:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(`Profile Error: ${profileError.message}`);
    }

    // 8. Set the new user's role (use upsert to handle existing role from trigger)
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: newUserId,
        role,
      }, {
        onConflict: 'user_id'
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

// DELETE user endpoint
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return new NextResponse(JSON.stringify({ error: 'User ID is required' }), { status: 400 });
    }

    // Try to get authorization from header first, then fallback to cookies
    const authHeader = request.headers.get('authorization');
    
    let supabase;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Use bearer token
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: authHeader } }
        }
      );
    } else {
      // Fallback to cookies
      const cookieStore = await cookies();
      supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    }

    // 1. Check if the current user is an admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
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

    // 3. Delete user role first
    const { error: roleDeleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (roleDeleteError) {
      console.warn("Warning: Could not delete user role:", roleDeleteError.message);
    }

    // 4. Delete profile
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      console.warn("Warning: Could not delete profile:", profileDeleteError.message);
    }

    // 5. Delete from auth (admin function)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authDeleteError) {
      console.warn("Warning: Could not delete from auth:", authDeleteError.message);
    }

    return NextResponse.json({ message: 'ลบผู้ใช้สำเร็จ' });

  } catch (error: any) {
    console.error('User deletion failed:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// PUT user endpoint (for password reset)
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: 'User ID is required' }), { status: 400 });
    }

    // Read the request body once
    const requestBody = await request.json();
    const { action } = requestBody;

    // Try to get authorization from header first, then fallback to cookies
    const authHeader = request.headers.get('authorization');
    
    let supabase;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Use bearer token
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: authHeader } }
        }
      );
    } else {
      // Fallback to cookies
      const cookieStore = await cookies();
      supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    }

    // 1. Check if the current user is an admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
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

    if (action === 'reset_password') {
      // Generate new password
      const newPassword = Math.random().toString(36).slice(-8);
      
      // Reset password
      const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (resetError) {
        throw new Error(`Password reset failed: ${resetError.message}`);
      }

      return NextResponse.json({ 
        message: 'รีเซ็ตรหัสผ่านสำเร็จ',
        newPassword: newPassword
      });
    }

    if (action === 'update_user') {
      const { name, phone, email, line_id, branch, credit_balance, role } = requestBody;
      
      // Check if credit balance changed
      const { data: currentProfile } = await supabaseAdmin
        .from('profiles')
        .select('credit_balance')
        .eq('id', userId)
        .single();

      const currentCreditBalance = currentProfile?.credit_balance || 0;
      const creditChanged = currentCreditBalance !== credit_balance;
      const creditDifference = credit_balance - currentCreditBalance;

      // Update profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          name,
          phone,
          email,
          line_id,
          branch,
          credit_balance,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) {
        throw new Error(`Profile update failed: ${profileError.message}`);
      }

      // Log credit adjustment if credit changed
      if (creditChanged && creditDifference !== 0) {
        const { error: transactionError } = await supabaseAdmin
          .from('credit_transactions')
          .insert({
            user_id: userId,
            amount: Math.abs(creditDifference),
            transaction_type: creditDifference > 0 ? 'admin_topup' : 'admin_deduction',
            description: creditDifference > 0 
              ? `Admin เติมเครดิต ${Math.abs(creditDifference).toLocaleString()} บาท`
              : `Admin หักเครดิต ${Math.abs(creditDifference).toLocaleString()} บาท`
          });

        if (transactionError) {
          console.warn("Warning: Could not log credit adjustment transaction:", transactionError.message);
        }
      }

      // Update user role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: role,
          updated_at: new Date().toISOString()
        });

      if (roleError) {
        throw new Error(`Role update failed: ${roleError.message}`);
      }

      return NextResponse.json({ 
        message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ'
      });
    }

    return new NextResponse(JSON.stringify({ error: 'Invalid action' }), { status: 400 });

  } catch (error: any) {
    console.error('User update failed:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
} 