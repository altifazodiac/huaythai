// app/login/page.tsx
"use client";
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase/supabaseClient';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, easeOut } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Phone, Lock, Eye, EyeOff, Loader2, Sparkles, Zap, Ticket } from 'lucide-react';
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import type { Engine, ISourceOptions } from "tsparticles-engine";
import Image from "next/image"

const LoginPage = () => {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [dbTables, setDbTables] = useState<any[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const particlesInit = useCallback(async (engine: Engine) => { await loadFull(engine); }, []);

  // Particle: แดงเข้ม-แดงกลาง-แดงอ่อน-ขาว-เหลือง
  const particlesOptions: ISourceOptions = {
    fullScreen: { enable: false },
    background: { color: { value: "transparent" } },
    fpsLimit: 60,
    particles: {
      color: { value: ["#ff1439", "#ff6347", "#b91c1c", "#dc2626", "#fff", "#ffe066"] },
      number: { value: 60, density: { enable: true, area: 800 } },
      size: { value: { min: 2, max: 6 } },
      move: { enable: true, speed: 1.2, direction: "none", outModes: { default: "bounce" } },
      opacity: { value: 0.5, anim: { enable: true, speed: 1, opacity_min: 0.2, sync: false } },
      shape: { type: "circle" },
      links: { enable: true, color: "#ff1439", distance: 120, opacity: 0.2, width: 2 },
    },
    detectRetina: true,
  };

  const validateInputs = () => {
    if (!phone) { 
      setError('กรุณากรอกเบอร์โทรศัพท์'); 
      return false; 
    }
    
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
    setError(null); 
    return true;
  };

  function formatPhoneNumber(phoneInput: string): string {
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
  }

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('🚀 เริ่มล็อกอินด้วยเบอร์โทร:', phone);
    
    if (!validateInputs()) return;
    
    setLoading(true);
    setError(null);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      console.log('📱 เบอร์โทรที่จัดรูปแบบแล้ว:', formattedPhone);

      // ใช้ email authentication แทน phone authentication เนื่องจาก phone auth ยังไม่ได้เปิดใช้งาน
      // แปลงเบอร์โทรเป็น email format เพื่อหาผู้ใช้จาก profiles table
      const phoneAsEmail = `${formattedPhone.replace(/[^0-9]/g, '')}@phone.local`;

      // สร้างรูปแบบเบอร์โทรหลายรูปแบบเพื่อค้นหา
      const phoneFormats = [
        formattedPhone,  // +66999999999
        phone,           // 0999999999 (input เดิม)
        phone.replace(/^0/, '+66'), // +66999999999 จาก 0999999999
        formattedPhone.replace(/^\+66/, '0') // 0999999999 จาก +66999999999
      ];

      console.log('🔍 ค้นหาเบอร์โทรในรูปแบบต่างๆ:', phoneFormats);

      // หาผู้ใช้จาก phone number ใน profiles table โดยใช้ function
      let userProfile = null;
      let profileError = null;

      // ลองค้นหาด้วยรูปแบบต่างๆ โดยใช้ function lookup_user_by_phone
      for (const phoneFormat of phoneFormats) {
        const { data, error } = await supabase
          .rpc('lookup_user_by_phone', { phone_number: phoneFormat });

        if (data && data.length > 0) {
          userProfile = {
            email: data[0].user_email,
            phone: data[0].user_phone,
            name: null // function ไม่ return name เพื่อความปลอดภัย
          };
          console.log('✅ พบผู้ใช้ด้วยเบอร์โทร:', phoneFormat);
          break;
        } else if (error) {
          profileError = error;
          console.log('⚠️ Error searching with phone format', phoneFormat, ':', error.message);
        }
      }

      if (!userProfile) {
        console.error('❌ ไม่พบผู้ใช้ด้วยเบอร์โทรใดๆ');
        throw new Error('ไม่พบผู้ใช้ที่มีเบอร์โทรศัพท์นี้');
      }

      // ใช้ email ที่เก็บไว้ใน profile สำหรับ login
      const loginEmail = userProfile.email || phoneAsEmail;
      console.log('🔑 ใช้ email สำหรับ login:', loginEmail);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ 
        email: loginEmail,
        password 
      });

      if (signInError) {
        console.error('🚨 Login error:', signInError.message);
        throw signInError;
      }

      console.log('✅ Login successful:', data.user?.email);

      if (data.user && data.session) {
        // บันทึก login history
        try {
          const ip = await fetch("https://api.ipify.org?format=json").then(res => res.json()).then(d => d.ip).catch(() => null);
          const { error: historyError } = await supabase.from("login_history").insert([{
            user_id: data.user.id,
            email: userProfile.phone, // ใช้ phone แทน email ในการบันทึก
            ip_address: ip,
            user_agent: typeof window !== "undefined" ? window.navigator.userAgent : null,
          }]);
          if (historyError) {
            console.error('⚠️ History error:', historyError.message);
          }
        } catch (historyCatchError) {
            console.error('🚨 History error:', historyCatchError);
        }
        
        // ตรวจสอบ role ของผู้ใช้
        let userRole = null;
        try {
          // ดึง role จากตาราง user_roles ก่อน
          const { data: userRoleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', data.user.id)
            .single();

          if (roleError) {
            console.log('⚠️ Role query error:', roleError.message);
          }

          userRole = userRoleData?.role;
          
          // ถ้าไม่มี role ในตาราง user_roles ให้ fallback ไป user_metadata
          if (!userRole) {
            userRole = data.user.user_metadata?.role;
          }
        } catch (roleCheckError) {
          console.error('🚨 Role check error:', roleCheckError);
          // fallback ไป user_metadata
          userRole = data.user.user_metadata?.role;
        }

        console.log('🔍 User role:', userRole);
        console.log('🔄 Redirecting...');
        
        // รอให้ session อัปเดต
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // ตรวจสอบ session อีกครั้งก่อน redirect
        const { data: sessionCheck } = await supabase.auth.getSession();
        
        if (sessionCheck.session) {
          console.log('✅ Session confirmed');
          
          // ตรวจสอบ role และ redirect ตามสิทธิ์
          if (userRole === 'admin') {
            console.log('👑 Admin detected, redirecting to dashboard');
            router.push('/dashboard');
          } else {
            console.log('👤 Regular user, redirecting to homepage');
            router.push('/homepage');
          }
          
        } else {
          console.error('❌ Session validation failed');
          setError('เกิดข้อผิดพลาดในการยืนยันตัวตน กรุณาลองใหม่อีกครั้ง');
        }
      } else {
        console.error('❌ No user or session data');
        setError('ไม่ได้รับข้อมูลผู้ใช้หลังการล็อกอิน');
      }
    } catch (err: any) {
      console.error('🚨 Login error:', err.message);
      
      if (err.message.includes('Invalid login credentials')) {
        setError('เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง');
      } else if (err.message.includes('Phone not confirmed')) {
        setError('กรุณายืนยันเบอร์โทรศัพท์ของคุณก่อนเข้าสู่ระบบ');
      } else if (err.message.includes('ไม่พบผู้ใช้ที่มีเบอร์โทรศัพท์นี้')) {
        setError('ไม่พบผู้ใช้ที่มีเบอร์โทรศัพท์นี้ กรุณาตรวจสอบเบอร์โทรให้ถูกต้อง');
      } else {
        setError(err.message || 'เกิดข้อผิดพลาดที่ไม่รู้จัก');
      }
    } finally {
      setLoading(false);
      console.log('🏁 Login process completed');
    }
  };

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('🔄 เริ่มการรีเซ็ตรหัสผ่านสำหรับอีเมล:', resetEmail);
    
    if (!resetEmail) {
      setError('กรุณากรอกอีเมลสำหรับรีเซ็ตรหัสผ่าน');
      return;
    }

    // ตรวจสอบรูปแบบอีเมล
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setError('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }
    
    setResetLoading(true);
    setError(null);
    setResetMessage(null);

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('🚨 Reset password error:', error.message);
        throw error;
      }

      console.log('✅ Reset password email sent successfully');
      setResetMessage('ส่งอีเมลสำหรับรีเซ็ตรหัสผ่านแล้ว กรุณาตรวจสอบอีเมลของคุณ');
      
      // ล้างฟอร์มหลังจากส่งสำเร็จ
      setResetEmail('');
      
    } catch (err: any) {
      console.error('🚨 Reset password error:', err.message);
      setError(err.message || 'เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน');
    } finally {
      setResetLoading(false);
      console.log('🏁 Reset password process completed');
    }
  };

  const handleAdminAccess = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (adminPassword !== 'admin123') {
      setError('รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง');
      return;
    }
    
    setLoadingTables(true);
    setError(null);
    
    try {
      // Fetch tables from information_schema
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE')
        .order('table_name');

      if (error) {
        throw error;
      }

      setDbTables(data || []);
      console.log('📊 Database tables:', data);
      
    } catch (err: any) {
      console.error('🚨 Error fetching tables:', err.message);
      setError('ไม่สามารถดึงข้อมูลตารางได้: ' + err.message);
    } finally {
      setLoadingTables(false);
    }
  };

  const handleViewTable = async (tableName: string) => {
    try {
      console.log(`🔍 Viewing table: ${tableName}`);
      
      // Try to fetch first 10 rows from the selected table
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(10);

      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        alert(`ไม่สามารถดูข้อมูลตาราง ${tableName} ได้: ${error.message}`);
        return;
      }

      console.log(`Data from ${tableName}:`, data);
      alert(`ตาราง ${tableName} มีข้อมูล ${data?.length || 0} แถว\nดูข้อมูลใน Console สำหรับรายละเอียด`);
      
    } catch (err: any) {
      console.error('🚨 Error viewing table:', err);
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    }
  };

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 40 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.7, ease: easeOut } },
  };
  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 120 } },
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full relative overflow-hidden">
      {/* Animated neon gradient background */}
      <div className="absolute inset-0 z-0 animate-gradient-move bg-gradient-to-br from-red-900 via-red-700 via-40% to-red-400 opacity-95" />
      {/* Animated glowing lines */}
      <div className="absolute top-0 left-0 w-full h-2 z-10 bg-gradient-to-r from-red-400 via-red-700 to-red-900 animate-glow-x" />
      <div className="absolute bottom-0 right-0 w-full h-2 z-10 bg-gradient-to-l from-red-400 via-red-700 to-red-900 animate-glow-x" />
      {/* Particles */}
      <Particles id="tsparticles" init={particlesInit} options={particlesOptions} className="absolute inset-0 w-full h-full z-0" />

      {/* Main Card */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="relative z-20 mt-20 md:mt-32 w-full max-w-4xl bg-white/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[540px] backdrop-blur-md border-4 border-red-400/60"
        style={{ boxShadow: "0 0 40px 10px #ff1439, 0 0 0 4px #b91c1c" }}
      >
        {/* Image section */}
        <div className="w-full md:w-1/2 h-48 md:h-auto relative flex items-center justify-center bg-gradient-to-br from-red-800 via-red-600 to-red-300">
          <img
            src="https://wbvgdqiozztgqodtajui.supabase.co/storage/v1/object/public/images/BgLogin.png"
            alt="Login Background"
            className="w-full h-full object-cover object-center opacity-80"
            style={{ mixBlendMode: "screen", filter: "drop-shadow(0 0 40px #ff1439)" }}
          />
          {/* Overlay for better contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-red-900/70 to-transparent" />
          {/* Neon sparkles */}
          <Sparkles className="absolute top-6 left-6 text-red-400 animate-pulse" size={36} />
          <Zap className="absolute bottom-6 right-6 text-red-400 animate-blink" size={32} />
        </div>
        {/* Form section */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white/90">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } } }}
            className="w-full"
          >
          <Image
              src="https://wbvgdqiozztgqodtajui.supabase.co/storage/v1/object/public/images/Logo2.png"
              alt="logo"
              width={180}
              height={180}
              className={`
                rounded-full  
               animate-fade-in-up 
                ml-24
                shadow-md
              `}
              style={{ animationDelay: '0.2s' }}
            />
            <motion.h1 variants={itemVariants} className="text-4xl font-extrabold text-red-900 ">
              <span className="text-red-600  ">เข้าสู่ระบบ</span>
            </motion.h1>
            <motion.p variants={itemVariants} className="mt-2 text-md text-red-700 mb-8 font-semibold animate-glow-text2">
              ยินดีต้อนรับสู่ <span className="text-red-400 font-bold">สิงโตทองคำ 77</span>
            </motion.p>
            <form onSubmit={handleLogin} className="space-y-7">
              <motion.div variants={itemVariants}>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Phone className="h-6 w-6 text-red-400 animate-glow-text2" />
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-3 pl-12 pr-3 border-2 border-red-400 placeholder-red-400 text-red-900 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-500 transition-all bg-white/80 shadow-lg"
                    placeholder="เบอร์โทรศัพท์ (เช่น 0812345678)"
                    required
                  />
                </div>
              </motion.div>
              <motion.div variants={itemVariants}>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-6 w-6 text-red-400 animate-glow-text2" />
                  </span>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 pl-12 pr-12 border-2 border-red-400 placeholder-red-400 text-red-900 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-500 transition-all bg-white/80 shadow-lg"
                    placeholder="รหัสผ่าน"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-red-400 hover:text-red-700 animate-blink"
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                  </button>
                </div>
              </motion.div>
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto', marginTop: '0.5rem', marginBottom: '0.5rem' }}
                    exit={{ opacity: 0, y: -10, height: 0, marginTop: 0, marginBottom: 0 }}
                    className="text-red-600 text-base bg-red-100 p-3 rounded-md text-center border-2 border-red-300 shadow-lg animate-pulse"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
              <motion.div variants={itemVariants}>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 font-bold text-white text-xl bg-gradient-to-r from-red-700 via-red-400 to-red-900 hover:from-red-400 hover:to-red-700 rounded-lg shadow-xl focus:outline-none focus:ring-4 focus:ring-red-400 transition-all duration-150 ease-in-out flex items-center justify-center animate-glow-btn"
                  style={{ boxShadow: "0 0 24px 6px #ff1439, 0 0 0 4px #b91c1c" }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                      กำลังดำเนินการ...
                    </>
                  ) : (
                    'เข้าสู่ระบบ'
                  )}
                </Button>
              </motion.div>
              
              {/* Reset Password Section */}
              <motion.div variants={itemVariants} className="mt-6">
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowResetForm(!showResetForm)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium underline transition-colors"
                  >
                    ลืมรหัสผ่าน?
                  </button>
                </div>
                
                <AnimatePresence>
                  {showResetForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200"
                    >
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-red-700 mb-2">
                            อีเมลสำหรับรีเซ็ตรหัสผ่าน
                          </label>
                          <Input
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="w-full p-3 border border-red-300 placeholder-red-400 text-red-900 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-500 transition-all bg-white"
                            placeholder="กรอกอีเมลของคุณ"
                            required
                          />
                        </div>
                        
                        <AnimatePresence>
                          {resetMessage && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="text-green-600 text-sm bg-green-100 p-3 rounded-md text-center border border-green-300"
                            >
                              {resetMessage}
                            </motion.p>
                          )}
                        </AnimatePresence>
                        
                        <Button
                          type="submit"
                          disabled={resetLoading}
                          className="w-full py-2 font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-red-400 transition-all"
                        >
                          {resetLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              กำลังส่งอีเมล...
                            </>
                          ) : (
                            'ส่งอีเมลรีเซ็ตรหัสผ่าน'
                          )}
                        </Button>
                        
                        <div className="text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setShowResetForm(false);
                              setResetEmail('');
                              setResetMessage(null);
                              setError(null);
                            }}
                            className="text-red-600 hover:text-red-800 text-sm transition-colors"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              
              {/* Admin Panel Section */}
              <motion.div variants={itemVariants} className="mt-4">
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowAdminPanel(!showAdminPanel)}
                    className="text-red-600 hover:text-red-800 text-xs font-medium transition-colors"
                  >
                    ผู้ดูแลระบบ?
                  </button>
                </div>
                
                <AnimatePresence>
                  {showAdminPanel && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <form onSubmit={handleAdminAccess} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            รหัสผ่านผู้ดูแลระบบ
                          </label>
                          <Input
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            className="w-full p-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-500 transition-all bg-white"
                            placeholder="กรอกรหัสผ่านผู้ดูแลระบบ"
                            required
                          />
                        </div>
                        
                        <Button
                          type="submit"
                          disabled={loadingTables}
                          className="w-full py-2 font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all"
                        >
                          {loadingTables ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              กำลังดึงข้อมูล...
                            </>
                          ) : (
                            'ดูตาราง Supabase'
                          )}
                        </Button>
                        
                        {dbTables.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">ตารางในฐานข้อมูล:</h4>
                            <div className="max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-lg p-2">
                              {dbTables.map((table, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer"
                                  onClick={() => handleViewTable(table.table_name)}
                                >
                                  <span className="text-sm text-gray-900">{table.table_name}</span>
                                  <button
                                    type="button"
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    ดูข้อมูล
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAdminPanel(false);
                              setAdminPassword('');
                              setDbTables([]);
                              setError(null);
                            }}
                            className="text-gray-600 hover:text-gray-800 text-sm transition-colors"
                          >
                            ปิด
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </form>
          </motion.div>
        </div>
      </motion.div>
      {/* Neon logo floating */}
      <motion.div
        initial={{ opacity: 0, y: -40, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.8, type: "spring" }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-3"
      >
        <Ticket className="h-12 w-12 text-red-400 drop-shadow-neon animate-glow-text2" />
        <span className="text-3xl font-extrabold text-white drop-shadow-neon animate-glow-text">สิงโตทองคำ 77</span>
      </motion.div>
      {/* Custom CSS for animation */}
      <style>{`
        @keyframes gradient-move {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-move {
          background-size: 200% 200%;
          animation: gradient-move 7s ease-in-out infinite;
        }
        @keyframes glow-x {
          0%, 100% { filter: drop-shadow(0 0 16px #ff1439); opacity: 0.7; }
          50% { filter: drop-shadow(0 0 32px #ff6347); opacity: 1; }
        }
        .animate-glow-x { animation: glow-x 2s infinite alternate; }
        @keyframes glow-text {
          0%, 100% { text-shadow: 0 0 16px #ff1439, 0 0 32px #ff6347; }
          50% { text-shadow: 0 0 32px #fff, 0 0 64px #ff1439; }
        }
        .animate-glow-text { animation: glow-text 2s infinite alternate; }
        @keyframes glow-text2 {
          0%, 100% { filter: drop-shadow(0 0 8px #ff1439); }
          50% { filter: drop-shadow(0 0 24px #ff6347); }
        }
        .animate-glow-text2 { animation: glow-text2 1.5s infinite alternate; }
        .drop-shadow-neon { filter: drop-shadow(0 0 12px #ff1439) drop-shadow(0 0 24px #ff6347); }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .animate-blink { animation: blink 1.2s infinite; }
        @keyframes glow-btn {
          0%, 100% { box-shadow: 0 0 24px 6px #ff1439, 0 0 0 4px #b91c1c; }
          50% { box-shadow: 0 0 48px 12px #ff6347, 0 0 0 8px #ff1439; }
        }
        .animate-glow-btn { animation: glow-btn 1.5s infinite alternate; }
      `}</style>
    </div>
  );
};

export default LoginPage;
