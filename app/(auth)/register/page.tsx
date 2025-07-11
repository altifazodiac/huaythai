// app/signup/page.tsx
"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase/supabaseClient';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

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

  const handleSignUp = async () => {
    setError(null);
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phone);
      console.log('📱 เบอร์โทรที่จัดรูปแบบแล้ว:', formattedPhone);

      const { data, error } = await supabase.auth.signUp({
        phone: formattedPhone,
        password,
        options: {
          data: { name },
        },
      });

      if (error) throw error;

      if (data.user) {
        toast.success('สมัครสมาชิกสำเร็จ! คุณสามารถใช้งานได้ทันที', {
          position: 'top-right',
          autoClose: 3000,
        });
        router.push('/homepage');
      }
    } catch (err: any) {
      if (err.message.includes('already registered')) {
        setError('เบอร์โทรศัพท์นี้มีผู้ใช้งานแล้ว กรุณาใช้เบอร์โทรศัพท์อื่น');
      } else {
        setError(err.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
      }
      console.error('Error:', err);
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