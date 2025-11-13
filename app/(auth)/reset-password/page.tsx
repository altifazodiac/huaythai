"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const ResetPasswordPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if we have the reset token in the URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (!accessToken || !refreshToken) {
      setError('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่');
    }
  }, [searchParams]);

  const validateInputs = () => {
    if (!password) {
      setError('กรุณากรอกรหัสผ่านใหม่');
      return false;
    }
    
    if (password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return false;
    }
    
    setError(null);
    return true;
  };

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!validateInputs()) return;
    
    setLoading(true);
    setError(null);

    try {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      
      if (!accessToken || !refreshToken) {
        throw new Error('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุ');
      }

      // Set the session using the tokens from the URL
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        throw new Error('ลิงก์รีเซ็ตรหัสผ่านหมดอายุ กรุณาขอลิงก์ใหม่');
      }

      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      
    } catch (err: any) {
      console.error('🚨 Reset password error:', err.message);
      setError(err.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-900 via-red-700 to-red-400">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
        >
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">รีเซ็ตรหัสผ่านสำเร็จ!</h2>
            <p className="text-gray-600 mb-4">
              รหัสผ่านของคุณได้รับการอัปเดตเรียบร้อยแล้ว
            </p>
            <p className="text-sm text-gray-500">
              กำลังนำทางไปยังหน้าเข้าสู่ระบบ...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-900 via-red-700 to-red-400">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
      >
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-red-900 mb-2">รีเซ็ตรหัสผ่าน</h2>
          <p className="text-red-700">กรุณาตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ</p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              รหัสผ่านใหม่
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-red-400" />
              </span>
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 pl-12 pr-12 border-2 border-red-400 placeholder-red-400 text-red-900 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-500 transition-all"
                placeholder="กรุณากรอกรหัสผ่านใหม่"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-red-400 hover:text-red-700"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ยืนยันรหัสผ่านใหม่
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-red-400" />
              </span>
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 pl-12 pr-12 border-2 border-red-400 placeholder-red-400 text-red-900 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-500 transition-all"
                placeholder="กรุณายืนยันรหัสผ่านใหม่"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-red-400 hover:text-red-700"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-100 p-3 rounded-md text-center border border-red-300">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-bold text-white text-lg bg-gradient-to-r from-red-700 via-red-400 to-red-900 hover:from-red-400 hover:to-red-700 rounded-lg shadow-xl focus:outline-none focus:ring-4 focus:ring-red-400 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                กำลังอัปเดตรหัสผ่าน...
              </>
            ) : (
              'อัปเดตรหัสผ่าน'
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-red-600 hover:text-red-800 text-sm font-medium underline transition-colors"
            >
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
