// app/signup/page.tsx
"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase/supabaseClient';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const SignUpPage = () => {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateInputs = () => {
    // ตรวจสอบรูปแบบเบอร์โทรศัพท์ไทย
    const phoneRegex = /^(\+66|66|0)[0-9]{8,9}$/;
    if (!phoneRegex.test(phone.replace(/[-\s]/g, ''))) {
      setError('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 0812345678 หรือ +66812345678)');
      return false;
    }

    if (password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return false;
    }

    if (!name.trim()) {
      setError('กรุณากรอกชื่อ');
      return false;
    }

    return true;
  };

  const formatPhoneNumber = (phoneInput: string) => {
    // ลบ space และ dash ออก
    let cleanPhone = phoneInput.replace(/[-\s]/g, '');
    
    // แปลง format ต่างๆ ให้เป็น international format
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '+66' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('66') && !cleanPhone.startsWith('+66')) {
      cleanPhone = '+' + cleanPhone;
    } else if (!cleanPhone.startsWith('+66')) {
      cleanPhone = '+66' + cleanPhone;
    }
    
    return cleanPhone;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateInputs()) return;
    
    setLoading(true);
    setError(null);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      console.log('📱 เบอร์โทรที่จัดรูปแบบแล้ว:', formattedPhone);

      // ตรวจสอบว่าเบอร์โทรนี้ถูกใช้แล้วหรือไม่
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('phone')
        .eq('phone', formattedPhone)
        .single();

      if (existingUser) {
        throw new Error('เบอร์โทรศัพท์นี้ถูกใช้แล้ว');
      }

      if (checkError && !checkError.message.includes('No rows')) {
        console.error('Check error:', checkError);
      }

      // ใช้ email authentication แทน phone authentication
      // แปลงเบอร์โทรเป็น email format
      const phoneAsEmail = `${formattedPhone.replace(/[^0-9]/g, '')}@phone.local`;

      // สร้างผู้ใช้ใหม่ด้วย email authentication
      const { data, error } = await supabase.auth.signUp({
        email: phoneAsEmail,
        password: password,
        options: {
          data: {
            name: name,
            phone: formattedPhone,
          }
        }
      });

      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      if (data.user) {
        // สร้าง profile สำหรับผู้ใช้ใหม่
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: phoneAsEmail,
            phone: formattedPhone,
            name: name,
            credit_balance: 0
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // ถ้าสร้าง profile ไม่ได้ ให้ลบ user ที่สร้างไปแล้ว
          await supabase.auth.admin.deleteUser(data.user.id);
          throw new Error('เกิดข้อผิดพลาดในการสร้างโปรไฟล์');
        }

        // สร้าง user role (default เป็น user)
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: 'user'
          });

        if (roleError) {
          console.error('Role creation error:', roleError);
          // ไม่ต้องหยุดการทำงานถ้าสร้าง role ไม่ได้
        }

        toast.success('สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบ...');
        
        // รอให้ session อัปเดต
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ตรวจสอบ session
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          router.push('/homepage');
        } else {
          toast.success('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
          router.push('/login');
        }
      } else {
        throw new Error('ไม่สามารถสร้างบัญชีผู้ใช้ได้');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      
      if (err.message.includes('User already registered')) {
        setError('เบอร์โทรศัพท์นี้ถูกใช้แล้ว');
      } else if (err.message.includes('เบอร์โทรศัพท์นี้ถูกใช้แล้ว')) {
        setError('เบอร์โทรศัพท์นี้ถูกใช้แล้ว');
      } else if (err.message.includes('Password should be at least')) {
        setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      } else {
        setError(err.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-lg w-80">
        <h1 className="text-xl font-semibold mb-4">สมัครสมาชิก</h1>
        <input
          type="text"
          placeholder="ชื่อ"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 mb-3 border rounded"
        />
        <input
          type="tel"
          placeholder="เบอร์โทรศัพท์ (เช่น 0812345678)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full p-2 mb-3 border rounded"
        />
        <input
          type="password"
          placeholder="รหัสผ่าน"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-3 border rounded"
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button
          onClick={handleSignUp}
          disabled={loading}
          className={`w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'กำลังดำเนินการ...' : 'สมัครสมาชิก'}
        </button>
        <p className="text-sm text-gray-600 mt-3 text-center">
          มีบัญชีแล้ว?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            เข้าสู่ระบบ
          </a>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;