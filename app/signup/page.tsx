// app/signup/page.tsx
"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase/supabaseClient';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

const SignUpPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateInputs = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('กรุณากรอกอีเมลที่ถูกต้อง');
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

  const handleSignUp = async () => {
    setError(null);
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
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
        router.push('/huaythai');
      }
    } catch (err: any) {
      if (err.message.includes('already registered')) {
        setError('อีเมลนี้มีผู้ใช้งานแล้ว กรุณาใช้ที่อยู่อีเมลอื่น');
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
          type="email"
          placeholder="อีเมล"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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