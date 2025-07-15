"use client";

import { useState, useEffect, useRef } from "react";
import { Shield, AlertTriangle, CheckCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface SecurityMiddlewareProps {
  children: React.ReactNode;
  securityLevel?: "basic" | "advanced" | "banking";
  onSecurityPass?: () => void;
  requireCaptcha?: boolean;
  requireOTP?: boolean;
  className?: string;
}

interface SecurityState {
  isChecking: boolean;
  isBlocked: boolean;
  attempts: number;
  lastAttempt: number;
  suspiciousActivity: boolean;
  captchaVerified: boolean;
  otpVerified: boolean;
}

export function SecurityMiddleware({
  children,
  securityLevel = "banking",
  onSecurityPass,
  requireCaptcha = false,
  requireOTP = false,
  className
}: SecurityMiddlewareProps) {
  const [securityState, setSecurityState] = useState<SecurityState>({
    isChecking: false,
    isBlocked: false,
    attempts: 0,
    lastAttempt: 0,
    suspiciousActivity: false,
    captchaVerified: false,
    otpVerified: false
  });

  const [captchaInput, setCaptchaInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [captchaCode, setCaptchaCode] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const activityRef = useRef<{ clicks: number; lastClick: number; mouseMovements: number }>({
    clicks: 0,
    lastClick: 0,
    mouseMovements: 0
  });

  // Generate CAPTCHA code
  useEffect(() => {
    if (requireCaptcha) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let result = "";
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setCaptchaCode(result);
    }
  }, [requireCaptcha]);

  // Generate OTP code
  useEffect(() => {
    if (requireOTP) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setOtpCode(otp);
      toast.info(`รหัส OTP: ${otp} (สำหรับการทดสอบ)`, { duration: 10000 });
    }
  }, [requireOTP]);

  // Bot detection
  useEffect(() => {
    const handleClick = () => {
      const now = Date.now();
      activityRef.current.clicks++;
      
      // Detect rapid clicking
      if (now - activityRef.current.lastClick < 100) {
        setSecurityState(prev => ({
          ...prev,
          suspiciousActivity: true,
          attempts: prev.attempts + 1
        }));
        
        if (activityRef.current.clicks > 10) {
          setSecurityState(prev => ({ ...prev, isBlocked: true }));
          toast.error("ตรวจพบพฤติกรรมที่น่าสงสัย ระบบถูกบล็อกชั่วคราว");
        }
      }
      
      activityRef.current.lastClick = now;
    };

    const handleMouseMove = () => {
      activityRef.current.mouseMovements++;
      
      // Detect automated mouse movements
      if (activityRef.current.mouseMovements > 1000) {
        setSecurityState(prev => ({
          ...prev,
          suspiciousActivity: true
        }));
      }
    };

    if (securityLevel === "advanced" || securityLevel === "banking") {
      document.addEventListener('click', handleClick);
      document.addEventListener('mousemove', handleMouseMove);
      
      return () => {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [securityLevel]);

  // Security check timer
  useEffect(() => {
    if (securityLevel === "banking") {
      setSecurityState(prev => ({ ...prev, isChecking: true }));
      
      const timer = setTimeout(() => {
        setSecurityState(prev => ({ ...prev, isChecking: false }));
        onSecurityPass?.();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [securityLevel, onSecurityPass]);

  const handleCaptchaSubmit = () => {
    if (captchaInput.toUpperCase() === captchaCode) {
      setSecurityState(prev => ({ ...prev, captchaVerified: true }));
      toast.success("ยืนยัน CAPTCHA สำเร็จ");
    } else {
      toast.error("รหัส CAPTCHA ไม่ถูกต้อง");
      setCaptchaInput("");
    }
  };

  const handleOtpSubmit = () => {
    if (otpInput === otpCode) {
      setSecurityState(prev => ({ ...prev, otpVerified: true }));
      toast.success("ยืนยัน OTP สำเร็จ");
      setShowOtpInput(false);
    } else {
      toast.error("รหัส OTP ไม่ถูกต้อง");
      setOtpInput("");
    }
  };

  const resetSecurity = () => {
    setSecurityState({
      isChecking: false,
      isBlocked: false,
      attempts: 0,
      lastAttempt: 0,
      suspiciousActivity: false,
      captchaVerified: false,
      otpVerified: false
    });
    setCaptchaInput("");
    setOtpInput("");
    setShowOtpInput(false);
    activityRef.current = { clicks: 0, lastClick: 0, mouseMovements: 0 };
  };

  // Show security overlay
  if (securityState.isChecking) {
    return (
      <div className="fixed inset-0 bg-blue-50/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-xl border-2 border-blue-200">
          <div className="flex items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900">ตรวจสอบความปลอดภัย</h3>
              <p className="text-blue-700">กำลังตรวจสอบระบบความปลอดภัยระดับธนาคาร...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show blocked overlay
  if (securityState.isBlocked) {
    return (
      <div className="fixed inset-0 bg-red-50/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-xl border-2 border-red-200 max-w-md">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">ระบบถูกบล็อก</h3>
            <p className="text-red-700 mb-4">
              ตรวจพบพฤติกรรมที่น่าสงสัย กรุณารอ 30 วินาที แล้วลองใหม่อีกครั้ง
            </p>
            <Button onClick={resetSecurity} variant="outline">
              ลองใหม่
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show CAPTCHA verification
  if (requireCaptcha && !securityState.captchaVerified) {
    return (
      <div className="fixed inset-0 bg-gray-50/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-xl border-2 border-gray-200 max-w-md">
          <div className="text-center">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ยืนยันตัวตน</h3>
            
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <div className="text-2xl font-mono font-bold text-gray-800 tracking-wider">
                {captchaCode}
              </div>
            </div>
            
            <Input
              placeholder="กรอกรหัส CAPTCHA"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              className="mb-4 text-center text-lg font-mono"
              maxLength={6}
            />
            
            <Button onClick={handleCaptchaSubmit} className="w-full">
              ยืนยัน
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show OTP verification
  if (requireOTP && !securityState.otpVerified) {
    return (
      <div className="fixed inset-0 bg-gray-50/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-xl border-2 border-gray-200 max-w-md">
          <div className="text-center">
            <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ยืนยัน OTP</h3>
            
            {!showOtpInput ? (
              <div>
                <p className="text-gray-700 mb-4">
                  ระบบจะส่งรหัส OTP ไปยังเบอร์โทรศัพท์ของคุณ
                </p>
                <Button onClick={() => setShowOtpInput(true)} className="w-full">
                  ส่งรหัส OTP
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-gray-700 mb-4">
                  กรอกรหัส OTP ที่ได้รับ
                </p>
                <Input
                  placeholder="000000"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="mb-4 text-center text-lg font-mono"
                  maxLength={6}
                  type="text"
                />
                <Button onClick={handleOtpSubmit} className="w-full">
                  ยืนยัน OTP
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show suspicious activity warning
  if (securityState.suspiciousActivity) {
    return (
      <div className="fixed inset-0 bg-yellow-50/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-xl border-2 border-yellow-200 max-w-md">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">คำเตือน</h3>
            <p className="text-yellow-700 mb-4">
              ตรวจพบพฤติกรรมที่น่าสงสัย กรุณาดำเนินการอย่างระมัดระวัง
            </p>
            <Button onClick={resetSecurity} variant="outline">
              ดำเนินการต่อ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {children}
      
      {/* Security indicator */}
      {securityLevel === "banking" && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <span className="text-sm font-medium">ระบบความปลอดภัยระดับธนาคาร</span>
        </div>
      )}
    </div>
  );
}