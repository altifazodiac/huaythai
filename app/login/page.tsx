// app/login/page.tsx
"use client";
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase/supabaseClient'; // ปรับ path ตามความเหมาะสม
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button"; // ตรวจสอบว่า path ถูกต้อง
import { Input } from '@/components/ui/input';  // ตรวจสอบว่า path ถูกต้อง
import { Label } from '@/components/ui/label'; // ตรวจสอบว่า path ถูกต้อง
import { User, Lock, Eye, EyeOff, Loader2, Droplet, Ticket } from 'lucide-react'; // ไอคอน User, Droplet สำหรับโลโก้ตัวอย่าง
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import type { Engine, ISourceOptions } from "tsparticles-engine";

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const particlesInit = useCallback(async (engine: Engine) => {
    await loadFull(engine);
  }, []);

  const particlesOptions: ISourceOptions = {
    fullScreen: { enable: true, zIndex: 0 },
    background: {
      // No background color here, using the main div's background
    },
    fpsLimit: 60,
    interactivity: {
      events: {
        onHover: { enable: true, mode: "bubble" },
        resize: true,
      },
      modes: {
        bubble: { distance: 200, duration: 2, opacity: 0.1, size: 2 },
      },
    },
    particles: {
      color: { value: "#a0aec0" },
      links: { enable: false },
      collisions: { enable: false },
      move: {
        direction: "none",
        enable: true,
        outModes: { default: "bounce" },
        random: true,
        speed: 0.5,
        straight: false,
      },
      number: {
        density: { enable: true, area: 1000 },
        value: 30,
      },
      opacity: { value: 0.3 },
      shape: { type: "circle" },
      size: { value: { min: 1, max: 2 } },
    },
    detectRetina: true,
  };

  const validateInputs = () => {
    if (!email) {
      setError('กรุณากรอกชื่อผู้ใช้หรืออีเมล');
      return false;
    }
    if (password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return false;
    }
    setError(null);
    return true;
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateInputs()) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password,
      });
      if (signInError) throw signInError;
      if (data.user) {
        await new Promise(resolve => setTimeout(resolve, 500));
        router.push('/huaythai'); // Adjust path as needed
      }
    } catch (err: any) {
      if (err.message.includes('Invalid login credentials')) {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      } else if (err.message.includes('Email not confirmed')) {
        setError('กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ');
      } else {
        setError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 100 } },
  };
  const navItemVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120 } },
  };

  if (!isMounted) {
    return null; // Or a loading spinner
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-sky-50 text-gray-800 p-4 relative overflow-hidden">
      <Particles id="tsparticles" init={particlesInit} options={particlesOptions} />
      {/* Top Navigation */}
      <motion.nav
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-6 md:px-12"
      > {/* Added missing > here */}
        <motion.div variants={navItemVariants} className="flex items-center space-x-2">
          <Ticket className="h-8 w-8 text-blue-600" /> {/* โลโก้ตัวอย่าง */}
          <span className="text-2xl font-bold text-gray-700">หวยออนไลน์</span> {/* ชื่อเว็บ/แอป */}
        </motion.div>
        <motion.div variants={navItemVariants} className="flex items-center space-x-4 md:space-x-6">
          <a href="#" className="text-sm text-gray-600 hover:text-blue-600">ติดต่อเรา</a>
          <a href="#" className="text-sm text-gray-600 hover:text-blue-600">เข้าสู่ระบบ</a>
          <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg">
            สมัครสมาชิก
          </Button>
        </motion.div>
      </motion.nav>
      {/* Main Content Card */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mt-24 md:mt-32 w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[550px]"
      > {/* Added missing > here */}
        {/* Left Section - Wave */}
        <div className="w-full md:w-1/2 p-2 md:p-0 relative overflow-hidden bg-gradient-to-br from-sky-100 via-indigo-100 to-purple-100 flex items-center justify-center">
          <div className="absolute inset-0 opacity-50">
            <div className="absolute -bottom-1/4 -left-1/4 w-full h-full bg-gradient-to-r from-blue-300 to-indigo-400 rounded-tr-[100%] opacity-70 transform rotate-[-15deg] scale-150"></div>
            <div className="absolute -top-1/4 -right-1/4 w-full h-full bg-gradient-to-l from-purple-300 to-pink-300 rounded-bl-[100%] opacity-60 transform rotate-[-10deg] scale-150"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.svg
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2, ease: "easeInOut", delay: 0.5}}
              viewBox="0 0 500 200"
              className="w-full h-auto absolute opacity-30"
              preserveAspectRatio="xMidYMid slice"
              style={{ filter: "blur(1px)"}}
            >
                <path d="M0,100 C100,0 150,200 250,100 S400,0 500,100 L500,200 L0,200 Z" fill="url(#waveGradient1)"/>
                <path d="M0,120 C80,50 180,180 250,120 S380,80 500,150 L500,200 L0,200 Z" fill="url(#waveGradient2)" style={{transform: "translateY(10px) translateX(20px)"}}/>
                <defs>
                    <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{stopColor: 'rgba(96, 165, 250, 0.4)', stopOpacity: 1}} />
                    <stop offset="100%" style={{stopColor: 'rgba(167, 139, 250, 0.4)', stopOpacity: 1}} />
                    </linearGradient>
                    <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{stopColor: 'rgba(125, 211, 252, 0.3)', stopOpacity: 1}} />
                    <stop offset="100%" style={{stopColor: 'rgba(192, 132, 252, 0.3)', stopOpacity: 1}} />
                    </linearGradient>
                </defs>
            </motion.svg>
          </div>
          <motion.div
             initial={{ opacity: 0, scale: 0.5 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.8, delay: 0.3, ease: [0, 0.71, 0.2, 1.01] }}
             className="z-10 text-center p-8"
           >
             {/* สามารถใส่ content เพิ่มเติมฝั่งซ้ายได้ เช่น ข้อความต้อนรับ หรือ branding */}
           </motion.div>
        </div>

        {/* Right Section - Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } } }}
            className="w-full"
          >
            <motion.h1 variants={itemVariants} className="text-3xl font-bold text-gray-800">
              เข้าสู่ระบบ
            </motion.h1>
            <motion.p variants={itemVariants} className="mt-1 text-sm text-gray-500 mb-8">
              กรุณากรอกข้อมูลเพื่อเข้าสู่ระบบ
            </motion.p>

            <form onSubmit={handleLogin} className="space-y-6">
              <motion.div variants={itemVariants}>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <User className="h-5 w-5 text-gray-400" />
                  </span>
                  <Input
                    id="username"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 pl-10 pr-3 border border-gray-300 placeholder-gray-400 text-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="อีเมล" // ตามรูป
                    required
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </span>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 pl-10 pr-10 border border-gray-300 placeholder-gray-400 text-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="รหัสผ่าน" // ตามรูป, อาจหมายถึง Password
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto', marginTop: '0.5rem', marginBottom: '0.5rem' }}
                    exit={{ opacity: 0, y: -10, height: 0, marginTop: 0, marginBottom: 0 }}
                    className="text-red-600 text-sm bg-red-100 p-3 rounded-md text-center border border-red-300"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.div variants={itemVariants}>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-150 ease-in-out flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      กำลังดำเนินการ...
                    </>
                  ) : (
                    'เข้าสู่ระบบ'
                  )}
                </Button>
              </motion.div>
            </form>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
