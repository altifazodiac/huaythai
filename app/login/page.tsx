// app/login/page.tsx
"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase/supabaseClient'; // Adjust the import path as necessary
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input'; 
import { Label } from '@/components/ui/label';

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    return true;
  };

  const handleLogin = async () => {
    setError(null);
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        router.push('/huaythai'); // Redirect to the lottery page after successful login
      }
    } catch (err: any) {
      if (err.message.includes('Invalid login credentials')) {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else {
        setError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-8 rounded-lg shadow-lg w-96"
      >
        <h1 className="text-2xl font-bold mb-4 text-center">เข้าสู่ระบบ</h1>
        <div className="mb-4">
          <Label htmlFor="email" className="text-sm font-medium">
            อีเมล
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            className="w-full p-2 mt-1"
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="password" className="text-sm font-medium">
            รหัสผ่าน
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            className="w-full p-2 mt-1"
          />
        </div>
        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}
        <Button
          onClick={handleLogin}
          disabled={loading}
          className={`w-full py-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? 'กำลังดำเนินการ...' : 'เข้าสู่ระบบ'}
        </Button>
        <p className="text-sm text-gray-600 mt-4 text-center">
          ยังไม่มีบัญชี?{' '}
          <a href="/signup" className="text-blue-600 hover:underline">
            สมัครสมาชิก
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;