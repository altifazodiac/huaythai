"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import { Trash2, ArrowLeft, MoreHorizontal, Calendar, Hash, Tag, TicketIcon, Repeat, CoinsIcon, Coins, Ticket, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { countryFlagImg } from "@/lib/utils/flags";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { time } from 'console';
import { toast } from 'sonner';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { FaMoneyBill } from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useNumberCap } from '@/lib/contexts/NumberCapContext';
import NumberCapIndicator from '@/components/lottery/NumberCapIndicator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


// Define types for orders
type OrderCategory = 'three' | 'two' | 'run';

// Define special pattern types for Thai lottery
type ThreeDigitPattern = 'ตอง' | 'เลขหาม' | 'เบิ้ลหน้า' | 'เบิ้ลหลัง' | 'เบิ้ลพี่น้อง' | 'ชุดเรียง' | '';
type TwoDigitPattern = 'รูดหน้า' | 'รูดหลัง' | '19 ประตู' | 'เลขเบิ้ล' | 'สองตัวต่ำ' | 'สองตัวสูง' | 'สองตัวคี่' | 'สองตัวคู่' | 'พี่น้อง' | 'น้องพี่' | '';

interface Order {
  id: number;
  numbers: string;
  category: OrderCategory;
  prizeId: number;
  pattern?: ThreeDigitPattern | TwoDigitPattern;
  isSpecialPattern?: boolean;
  // เพิ่มข้อมูลราคาและจำนวนเงิน
  amount?: number;
  pricePaid?: number;
  totalPaid?: number;
  // เพิ่มอัตราจ่ายรางวัลที่ปรับแล้วสำหรับเลขอั้น
  effectivePrizeRate?: number;
  // เพิ่มสถานะเลขอั้น
  numberCapStatus?: { action: 'close' | 'half'; reason: string } | null;
};

// Lottery data interfaces (similar to LotteryTicketPage)
interface LotterySubType {
  lottery_sub_type_id: number;
  sub_type_name: string;
  country_origin?: string;
}

interface DrawingSchedule {
  schedule_id: number;
  lottery_sub_type_id: number;
  frequency_unit: string;
  frequency_value: number;
  draw_time: string;
  day_of_week: string;
  is_active: boolean;
  open_time: string;
  close_time: string;
}

interface AvailableDraw {
  date: Date;
  schedule: DrawingSchedule;
}

interface PrizeInfo {
  id: number;
  display_name: string;
  prize_rate: number;
  category: string;
}

// Helper function to normalize draw data
function normalizeDraw(draw: any): AvailableDraw {
  return {
    ...draw,
    date: draw?.date ? new Date(draw.date) : new Date(),
  };
}
function CurrentTime() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000); // อัปเดตทุก 1 วินาที
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-xs opacity-90">
      {now.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
    </div>
  );
}

// Helper function to generate unique permutations of a string
const getPermutations = (str: string): string[] => {
  if (str.length <= 1) return [str];

  const allPermutations = new Set<string>();

  const permute = (arr: string[], l: number, r: number) => {
    if (l === r) {
      allPermutations.add(arr.join(''));
    } else {
      for (let i = l; i <= r; i++) {
        [arr[l], arr[i]] = [arr[i], arr[l]]; // Swap
        permute(arr, l + 1, r);
        [arr[l], arr[i]] = [arr[i], arr[l]]; // Backtrack
      }
    }
  };

  permute(str.split(''), 0, str.length - 1);
  return Array.from(allPermutations);
};

const LotteryOrderPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Use authenticated Supabase client from AuthContext
  const { supabase, user, credit, fetchCredit } = useAuth();
  const { checkNumberStatus, fetchManagedNumbers, isUniversalNumberCapped, getUniversalNumberCapAction, getNumberCapStatsBySubType } = useNumberCap();
  const [isSaving, setIsSaving] = useState(false);

  // เพิ่ม state สำหรับเก็บข้อมูลเลขอั้นที่ดึงจากฐานข้อมูลโดยตรง
  const [managedNumbersCache, setManagedNumbersCache] = useState<any[]>([]);

  // ฟังก์ชันดึงข้อมูลเลขอั้นจากฐานข้อมูลโดยตรง
  const fetchDirectManagedNumbers = async (subTypeId: number, drawDate: string) => {
    try {
      console.log(`Fetching managed numbers for subType: ${subTypeId}, drawDate: ${drawDate}`);
      
      const { data, error } = await supabase
        .from('managed_numbers')
        .select('*')
        .eq('lottery_sub_type_id', subTypeId)
        .eq('draw_date', drawDate);

      if (error) {
        console.error('Error fetching managed numbers:', error);
        return [];
      }

      console.log(`Found ${data?.length || 0} managed numbers`);
      setManagedNumbersCache(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching managed numbers:', error);
      return [];
    }
  };

  // ฟังก์ชันตรวจสอบเลขอั้นโดยใช้ข้อมูลที่ดึงมาโดยตรง
  const getDirectNumberCapAction = (number: string, digitCount: number, typeNumber: string, subTypeId: number, drawDate: string) => {
    const managedNumber = managedNumbersCache.find(mn => 
      mn.lottery_sub_type_id === subTypeId &&
      mn.draw_date === drawDate &&
      mn.number === number &&
      mn.digit_count === digitCount &&
      mn.type_number === typeNumber
    );

    if (managedNumber) {
      console.log(`Found managed number: ${number} (${digitCount} digits, ${typeNumber}) - Action: ${managedNumber.action}`);
      return {
        action: managedNumber.action as 'close' | 'half',
        reason: managedNumber.reason
      };
    }

    return null;
  };

  // Handle URL parameters from LotteryTypeGrid
  const [initialState] = useState(() => {
    const subType = searchParams.get('subType') ? Number(searchParams.get('subType')) : undefined;
    const drawParam = searchParams.get('draw');
    const drawRaw = drawParam ? JSON.parse(decodeURIComponent(drawParam)) : undefined;
    const draw = drawRaw ? normalizeDraw(drawRaw) : undefined;
    return { subType, draw };
  });

  // Lottery data states
  const [subTypeObj, setSubTypeObj] = useState<LotterySubType | null>(null);
  const [selectedDraw, setSelectedDraw] = useState<AvailableDraw | null>(initialState.draw || null);
  const [selectedDrawDate, setSelectedDrawDate] = useState<Date | null>(initialState.draw?.date || null);
  const [loading, setLoading] = useState(false);
  const [billNumber] = useState(() => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  });
  const [billName, setBillName] = useState("");
  // Fetch lottery subtype data
  useEffect(() => {
    if (initialState.subType) {
      const fetchSubType = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('lottery_sub_types')
            .select('*')
            .eq('lottery_sub_type_id', initialState.subType)
            .single();

          if (error) {
            console.error('Error fetching subtype:', error);
            return;
          }

          if (data) {
            setSubTypeObj(data);
          }
        } catch (error) {
          console.error('Error:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchSubType();
    }
  }, [initialState.subType, supabase]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [activeMainTab, setActiveMainTab] = useState('manual'); // 'manual', 'set', 'vin'
  const [activeDigitTab, setActiveDigitTab] = useState<OrderCategory>('three');
  const [prizeInfo, setPrizeInfo] = useState<PrizeInfo[]>([]);
  const [selectedPrizeIds, setSelectedPrizeIds] = useState<number[]>([]);
  const [confirmDeleteType, setConfirmDeleteType] = useState<null | { category: OrderCategory, pattern: string, displayName: string }>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  // เพิ่ม state สำหรับจัดการช่องกรองจำนวนเงิน
  const [amountFilters, setAmountFilters] = useState<Record<number, string>>({});
  // เพิ่ม state สำหรับควบคุมการแสดงผล Right Panel
  const [showRightPanel, setShowRightPanel] = useState(true);
  // เพิ่ม state สำหรับจัดการข้อมูลราคาของแต่ละรายการ
  const [orderPrices, setOrderPrices] = useState<Record<number, { originalAmount?: string, amount?: string }>>({});
  // เพิ่ม state สำหรับจัดการ checkbox ของรายการที่เลือก
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  // เพิ่ม state สำหรับ checkbox ราคาที่กำหนดให้ทุกหมด
  const [applyToAll, setApplyToAll] = useState(false);
  const [focusedOrderId, setFocusedOrderId] = useState<number | null>(null);

  // Animation variants for Framer Motion
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };

  useEffect(() => {
    const fetchPrizeData = async () => {
      if (initialState.subType) {
        console.log(`Fetching prize data for subType: ${initialState.subType}`);
        
        const { data, error } = await supabase
          .from('lottery_sub_number')
          .select('id, digit_number, type_number, price_paid')
          .eq('lottery_sub_type_id', initialState.subType);

        if (error) {
          console.error('Error fetching prize data:', error);
          setPrizeInfo([]);
        } else if (data) {
          console.log(`Found ${data.length} prize configurations`);
          
          const mappedData: PrizeInfo[] = data.map((item: any) => {
            let category = '';
            let displayName = '';
            switch (item.digit_number) {
              case 3:
                category = 'three';
                displayName = `สามตัว${item.type_number}`;
                break;
              case 2:
                category = 'two';
                displayName = `สองตัว${item.type_number}`;
                break;
              case 1:
                category = 'run';
                displayName = `วิ่ง${item.type_number}`;
                // Correction for cases where type_number might already contain the prefix
                if (item.type_number.startsWith('วิ่ง')) {
                  displayName = item.type_number;
                }
                break;
            }
            return {
              id: item.id,
              display_name: displayName,
              prize_rate: parseFloat(item.price_paid),
              category: category,
            };
          });
          
          console.log('Mapped prize data:', mappedData);
          setPrizeInfo(mappedData);
        }
      }
    };
    fetchPrizeData();
  }, [initialState.subType, supabase]);

  // เพิ่ม useEffect สำหรับรีเซ็ตค่าเมื่อเปลี่ยนประเภทหวย
  useEffect(() => {
    setCurrentInput('');
    setSelectedPattern('');
    setSelectedTwoDigitPattern('');
    setSelectedDigitForTwoPattern('');
  }, [selectedPrizeIds]);

  // เพิ่ม useEffect สำหรับรีเซ็ตการเลือกรางวัลเมื่อเปลี่ยนประเภทหลัก
  useEffect(() => {
    setSelectedPrizeIds([]);
    setIsReversed(false); // รีเซ็ตปุ่มกลับเลขด้วย
  }, [activeDigitTab]);

  // โหลดข้อมูลเลขอั้นเมื่อเปลี่ยน subtype หรือ draw date
  useEffect(() => {
    if (initialState.subType && selectedDraw) {
      const drawDateStr = selectedDraw.date.toISOString().split('T')[0];
      console.log(`Loading managed numbers for subType: ${initialState.subType}, drawDate: ${drawDateStr}`);
      
      // ดึงข้อมูลเลขอั้นจากฐานข้อมูลโดยตรง
      fetchDirectManagedNumbers(initialState.subType, drawDateStr);
      
      // ยังคงเรียก fetchManagedNumbers เพื่อให้ context ทำงาน
      fetchManagedNumbers(initialState.subType, drawDateStr);
    }
  }, [initialState.subType, selectedDraw, fetchManagedNumbers]);

  const [isReversed, setIsReversed] = useState(false);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(true);

  // สำหรับ filter สามตัว
  const [threeDigitFilter, setThreeDigitFilter] = useState(0);

  // สำหรับ pattern เลขพิเศษ
  const [selectedPattern, setSelectedPattern] = useState<ThreeDigitPattern>('');

  // สำหรับเก็บตัวเลขที่เลือกไว้สำหรับการรูด (สองตัว)
  const [selectedDigitForTwoPattern, setSelectedDigitForTwoPattern] = useState<string>('');

  // สำหรับเก็บรูปแบบที่เลือกในการป้อนแบบ manual
  const [selectedTwoDigitPattern, setSelectedTwoDigitPattern] = useState<TwoDigitPattern>('');

  // ตรวจสอบว่าเลขนี้ถูกเลือกไปแล้วหรือไม่
  const isNumberSelected = (num: string, category: OrderCategory) => {
    return orders.some(order =>
      order.numbers === num && order.category === category
    );
  };

  const maxDigits = useMemo(() => {
    if (activeDigitTab === 'three') return 3;
    if (activeDigitTab === 'two') {
      // สำหรับรูดหน้า/รูดหลัง/19 ประตู ใช้กล่องเดียว
      if (selectedTwoDigitPattern === 'รูดหน้า' || selectedTwoDigitPattern === 'รูดหลัง' || selectedTwoDigitPattern === '19 ประตู') {
        return 1;
      }
      return 2;
    }
    return 1; // for 'run'
  }, [activeDigitTab, selectedTwoDigitPattern]);

  const groupedOrders = useMemo(() => {
    return orders.reduce((acc, order) => {
      const category = order.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(order);
      return acc;
    }, {} as Record<OrderCategory, Order[]>);
  }, [orders]);

  const categoryNames: Record<OrderCategory, string> = {
    three: 'สามตัวบน',
    two: 'สองตัวบน',
    run: 'วิ่งบน',
  };

  // ฟังก์ชันตรวจสอบรูปแบบเลขพิเศษสำหรับเลขสามตัว
  const identifyThreeDigitPattern = (number: string): ThreeDigitPattern => {
    if (number.length !== 3) return '';

    // ตอง (ตองสาม): เลขสามตัวที่เหมือนกันทั้งหมด เช่น 111, 222, 333
    if (number[0] === number[1] && number[1] === number[2]) {
      return 'ตอง';
    }

    // เลขหาม: เลขหน้าและเลขหลังเหมือนกัน โดยมีเลขกลางเป็นเลขอื่น
    if (number[0] === number[2] && number[0] !== number[1]) {
      return 'เลขหาม';
    }

    // เบิ้ลหน้า: เลขสองตัวแรกเหมือนกัน โดยที่หลักหน่วยเป็นเลขอื่น
    if (number[0] === number[1] && number[1] !== number[2]) {
      return 'เบิ้ลหน้า';
    }

    // เบิ้ลหลัง: เลขสองตัวสุดท้ายเหมือนกัน โดยที่หลักร้อยเป็นเลขอื่น
    if (number[1] === number[2] && number[0] !== number[1]) {
      return 'เบิ้ลหลัง';
    }

    // เบิ้ลพี่น้อง: เลขที่มีตัวเลขที่ติดกันหรือใกล้เคียงกันเป็นคู่
    const digit1 = parseInt(number[0]);
    const digit2 = parseInt(number[1]);
    const digit3 = parseInt(number[2]);

    // เบิ้ลพี่น้องติดกัน: เช่น 112, 223, 334 หรือ 211, 322, 433
    if ((digit1 === digit2 && Math.abs(digit2 - digit3) === 1) ||
      (digit2 === digit3 && Math.abs(digit1 - digit2) === 1)) {
      return 'เบิ้ลพี่น้อง';
    }

    // ชุดเรียง (เลขเรียง): เลขสามตัวที่เรียงลำดับกัน
    if ((digit1 + 1 === digit2 && digit2 + 1 === digit3) ||
      (digit1 - 1 === digit2 && digit2 - 1 === digit3)) {
      return 'ชุดเรียง';
    }

    return '';
  };

  // ฟังก์ชันสร้างเลขตามรูปแบบที่เลือก
  const generateNumbersByPattern = (pattern: ThreeDigitPattern): Order[] => {
    const newOrders: Order[] = [];

    switch (pattern) {
      case 'ตอง':
        // สร้างเลขตอง (000-999)
        for (let i = 0; i <= 9; i++) {
          const num = `${i}${i}${i}`;
          newOrders.push({
            id: Date.now() + i,
            numbers: num,
            category: 'three',
            prizeId: -1,
            pattern: 'ตอง',
            isSpecialPattern: true,
            effectivePrizeRate: 0, // จะถูกกำหนดใหม่ตอน assign prizeId
            numberCapStatus: null
          });
        }
        break;

      case 'เลขหาม':
        // สร้างเลขหาม (เลขหน้าและเลขหลังเหมือนกัน)
        for (let i = 0; i <= 9; i++) {
          for (let j = 0; j <= 9; j++) {
            if (i !== j) {
              const num = `${i}${j}${i}`;
              newOrders.push({
                id: Date.now() + i * 10 + j,
                numbers: num,
                category: 'three',
                prizeId: -1,
                pattern: 'เลขหาม',
                isSpecialPattern: true,
                effectivePrizeRate: 0,
                numberCapStatus: null
              });
            }
          }
        }
        break;

      case 'เบิ้ลหน้า':
        // สร้างเลขเบิ้ลหน้า
        for (let i = 0; i <= 9; i++) {
          for (let j = 0; j <= 9; j++) {
            if (i !== j) {
              const num = `${i}${i}${j}`;
              newOrders.push({
                id: Date.now() + i * 10 + j,
                numbers: num,
                category: 'three',
                prizeId: -1,
                pattern: 'เบิ้ลหน้า',
                isSpecialPattern: true,
                effectivePrizeRate: 0,
                numberCapStatus: null
              });
            }
          }
        }
        break;

      case 'เบิ้ลหลัง':
        // สร้างเลขเบิ้ลหลัง
        for (let i = 0; i <= 9; i++) {
          for (let j = 0; j <= 9; j++) {
            if (i !== j) {
              const num = `${i}${j}${j}`;
              newOrders.push({
                id: Date.now() + i * 10 + j,
                numbers: num,
                category: 'three',
                prizeId: -1,
                pattern: 'เบิ้ลหลัง',
                isSpecialPattern: true,
                effectivePrizeRate: 0,
                numberCapStatus: null
              });
            }
          }
        }
        break;

      case 'เบิ้ลพี่น้อง':
        // สร้างเบิ้ลพี่น้อง
        for (let i = 0; i <= 9; i++) {
          for (let j = 0; j <= 9; j++) {
            if (Math.abs(i - j) === 1) {
              // เบิ้ลพี่น้องแบบ 112, 223, etc.
              const num1 = `${i}${i}${j}`;
              // เบิ้ลพี่น้องแบบ 122, 233, etc.
              const num2 = `${i}${j}${j}`;

              newOrders.push({
                id: Date.now() + i * 10 + j,
                numbers: num1,
                category: 'three',
                prizeId: -1,
                pattern: 'เบิ้ลพี่น้อง',
                isSpecialPattern: true,
                effectivePrizeRate: 0,
                numberCapStatus: null
              });

              newOrders.push({
                id: Date.now() + i * 10 + j + 100,
                numbers: num2,
                category: 'three',
                prizeId: -1,
                pattern: 'เบิ้ลพี่น้อง',
                isSpecialPattern: true,
                effectivePrizeRate: 0,
                numberCapStatus: null
              });
            }
          }
        }
        break;

      case 'ชุดเรียง':
        // สร้างเลขเรียง
        for (let i = 0; i <= 7; i++) {
          // เรียงจากน้อยไปมาก
          const numAsc = `${i}${i + 1}${i + 2}`;
          newOrders.push({
            id: Date.now() + i,
            numbers: numAsc,
            category: 'three',
            prizeId: -1,
            pattern: 'ชุดเรียง',
            isSpecialPattern: true,
            effectivePrizeRate: 0,
            numberCapStatus: null
          });

          // เรียงจากมากไปน้อย
          if (i >= 2) {
            const numDesc = `${i}${i - 1}${i - 2}`;
            newOrders.push({
              id: Date.now() + i + 100,
              numbers: numDesc,
              category: 'three',
              prizeId: -1,
              pattern: 'ชุดเรียง',
              isSpecialPattern: true,
              effectivePrizeRate: 0,
              numberCapStatus: null
            });
          }
        }
        // เพิ่มเลขเรียงที่เหลือ
        newOrders.push({
          id: Date.now() + 8,
          numbers: '890',
          category: 'three',
          prizeId: -1,
          pattern: 'ชุดเรียง',
          isSpecialPattern: true,
          effectivePrizeRate: 0,
          numberCapStatus: null
        });
        newOrders.push({
          id: Date.now() + 9,
          numbers: '901',
          category: 'three',
          prizeId: -1,
          pattern: 'ชุดเรียง',
          isSpecialPattern: true,
          effectivePrizeRate: 0,
          numberCapStatus: null
        });
        newOrders.push({
          id: Date.now() + 10,
          numbers: '098',
          category: 'three',
          prizeId: -1,
          pattern: 'ชุดเรียง',
          isSpecialPattern: true,
          effectivePrizeRate: 0,
          numberCapStatus: null
        });
        newOrders.push({
          id: Date.now() + 11,
          numbers: '109',
          category: 'three',
          prizeId: -1,
          pattern: 'ชุดเรียง',
          isSpecialPattern: true,
          effectivePrizeRate: 0,
          numberCapStatus: null
        });
        break;
    }

    return newOrders;
  };

  // ฟังก์ชันสร้างเลขสองตัวตามรูปแบบที่เลือก
  const generateTwoDigitNumbersByPattern = (pattern: TwoDigitPattern, digit?: string): Order[] => {
    const newOrders: Order[] = [];

    switch (pattern) {
      case 'รูดหน้า':
        // รูดหน้า - เลขหนึ่งตัวอยู่หน้า คู่กับเลข 0-9 ด้านหลัง
        if (digit) {
          for (let i = 0; i <= 9; i++) {
            const num = `${digit}${i}`;
            newOrders.push({
              id: Date.now() + i,
              numbers: num,
              category: 'two',
              prizeId: -1,
              pattern: 'รูดหน้า',
              isSpecialPattern: true,
              effectivePrizeRate: 0,
              numberCapStatus: null
            });
          }
        }
        break;

      case 'รูดหลัง':
        // รูดหลัง - เลขหนึ่งตัวอยู่หลัง คู่กับเลข 0-9 ด้านหน้า
        if (digit) {
          for (let i = 0; i <= 9; i++) {
            const num = `${i}${digit}`;
            newOrders.push({
              id: Date.now() + i,
              numbers: num,
              category: 'two',
              prizeId: -1,
              pattern: 'รูดหลัง',
              isSpecialPattern: true,
              effectivePrizeRate: 0,
              numberCapStatus: null
            });
          }
        }
        break;

      case '19 ประตู':
        // 19 ประตู - รูดหน้า + รูดหลัง แต่ตัดเลขซ้ำออก
        if (digit) {
          const usedNumbers = new Set();

          // รูดหน้า
          for (let i = 0; i <= 9; i++) {
            const num = `${digit}${i}`;
            if (!usedNumbers.has(num)) {
              usedNumbers.add(num);
              newOrders.push({
                id: Date.now() + i,
                numbers: num,
                category: 'two',
                prizeId: -1,
                pattern: '19 ประตู',
                isSpecialPattern: true,
                effectivePrizeRate: 0,
                numberCapStatus: null
              });
            }
          }

          // รูดหลัง
          for (let i = 0; i <= 9; i++) {
            const num = `${i}${digit}`;
            if (!usedNumbers.has(num)) {
              usedNumbers.add(num);
              newOrders.push({
                id: Date.now() + i + 10,
                numbers: num,
                category: 'two',
                prizeId: -1,
                pattern: '19 ประตู',
                isSpecialPattern: true,
                effectivePrizeRate: 0,
                numberCapStatus: null
              });
            }
          }
        }
        break;

      case 'เลขเบิ้ล':
        // เลขเบิ้ล - เลขสองตัวเหมือนกัน
        for (let i = 0; i <= 9; i++) {
          const num = `${i}${i}`;
          newOrders.push({
            id: Date.now() + i,
            numbers: num,
            category: 'two',
            prizeId: -1,
            pattern: 'เลขเบิ้ล',
            isSpecialPattern: true,
            effectivePrizeRate: 0,
            numberCapStatus: null
          });
        }
        break;

      case 'สองตัวต่ำ':
        // สองตัวต่ำ - เลข 00-49
        for (let i = 0; i <= 49; i++) {
          const num = i.toString().padStart(2, '0');
          newOrders.push({
            id: Date.now() + i,
            numbers: num,
            category: 'two',
            prizeId: -1,
            pattern: 'สองตัวต่ำ',
            isSpecialPattern: true,
            effectivePrizeRate: 0,
            numberCapStatus: null
          });
        }
        break;

      case 'สองตัวสูง':
        // สองตัวสูง - เลข 50-99
        for (let i = 50; i <= 99; i++) {
          const num = i.toString();
          newOrders.push({
            id: Date.now() + i,
            numbers: num,
            category: 'two',
            prizeId: -1,
            pattern: 'สองตัวสูง',
            isSpecialPattern: true,
            effectivePrizeRate: 0,
            numberCapStatus: null
          });
        }
        break;

      case 'สองตัวคี่':
        // สองตัวคี่ - เลขที่หลักหน่วยเป็นเลขคี่
        for (let i = 0; i <= 9; i++) {
          for (let j = 1; j <= 9; j += 2) { // เลขคี่: 1, 3, 5, 7, 9
            const num = `${i}${j}`;
            newOrders.push({
              id: Date.now() + i * 10 + j,
              numbers: num,
              category: 'two',
              prizeId: -1,
              pattern: 'สองตัวคี่',
              isSpecialPattern: true,
              effectivePrizeRate: 0,
              numberCapStatus: null
            });
          }
        }
        break;

      case 'สองตัวคู่':
        // สองตัวคู่ - เลขที่หลักหน่วยเป็นเลขคู่
        for (let i = 0; i <= 9; i++) {
          for (let j = 0; j <= 8; j += 2) { // เลขคู่: 0, 2, 4, 6, 8
            const num = `${i}${j}`;
            newOrders.push({
              id: Date.now() + i * 10 + j,
              numbers: num,
              category: 'two',
              prizeId: -1,
              pattern: 'สองตัวคู่',
              isSpecialPattern: true,
              effectivePrizeRate: 0,
              numberCapStatus: null
            });
          }
        }
        break;

      case 'พี่น้อง':
        // พี่น้อง - เลขเรียงติดกันจากน้อยไปมาก
        for (let i = 0; i <= 8; i++) {
          const num = `${i}${i + 1}`;
          newOrders.push({
            id: Date.now() + i,
            numbers: num,
            category: 'two',
            prizeId: -1,
            pattern: 'พี่น้อง',
            isSpecialPattern: true,
            effectivePrizeRate: 0,
            numberCapStatus: null
          });
        }
        break;

      case 'น้องพี่':
        // น้องพี่ - เลขเรียงติดกันจากมากไปน้อย
        for (let i = 1; i <= 9; i++) {
          const num = `${i}${i - 1}`;
          newOrders.push({
            id: Date.now() + i,
            numbers: num,
            category: 'two',
            prizeId: -1,
            pattern: 'น้องพี่',
            isSpecialPattern: true,
            effectivePrizeRate: 0,
            numberCapStatus: null
          });
        }
        break;
    }

    return newOrders;
  };

  // เพิ่มฟังก์ชัน mapping
  const mapPrizeDisplayNameToPattern = (displayName: string): ThreeDigitPattern | TwoDigitPattern | '' => {
    if (displayName.includes('ตอง')) return 'ตอง';
    if (displayName.includes('เลขหาม')) return 'เลขหาม';
    if (displayName.includes('เบิ้ลหน้า')) return 'เบิ้ลหน้า';
    if (displayName.includes('เบิ้ลหลัง')) return 'เบิ้ลหลัง';
    if (displayName.includes('เบิ้ลพี่น้อง')) return 'เบิ้ลพี่น้อง';
    if (displayName.includes('ชุดเรียง')) return 'ชุดเรียง';
    if (displayName.includes('รูดหน้า')) return 'รูดหน้า';
    if (displayName.includes('รูดหลัง')) return 'รูดหลัง';
    if (displayName.includes('19 ประตู')) return '19 ประตู';
    if (displayName.includes('เลขเบิ้ล')) return 'เลขเบิ้ล';
    if (displayName.includes('สองตัวต่ำ')) return 'สองตัวต่ำ';
    if (displayName.includes('สองตัวสูง')) return 'สองตัวสูง';
    if (displayName.includes('สองตัวคี่')) return 'สองตัวคี่';
    if (displayName.includes('สองตัวคู่')) return 'สองตัวคู่';
    if (displayName.includes('พี่น้อง')) return 'พี่น้อง';
    if (displayName.includes('น้องพี่')) return 'น้องพี่';
    return '';
  };

  const handleAddOrder = (inputNumber: string) => {
    if (selectedPrizeIds.length === 0) {
      toast.error('กรุณาเลือกประเภทหวยก่อนเพิ่มรายการ');
      return;
    }

    const newOrders: Order[] = [];
    let blockedNumbers: { num: string, reason: string }[] = [];

    selectedPrizeIds.forEach(prizeId => {
      const prize = prizeInfo.find(p => p.id === prizeId);
      if (!prize) return;

      // If 'กลับเลข' is checked AND it's not a 'โต๊ด' prize, generate permutations.
      const isTote = prize.display_name.includes('โต๊ด');
      const numbersToAdd = isReversed && !isTote ? getPermutations(inputNumber) : [inputNumber];

      numbersToAdd.forEach(num => {
        let numberCapStatus = null;
        let effectivePrizeRate = prize.prize_rate;

        // ตรวจสอบเลขอั้นสำหรับทุกประเภทหวย
        if (initialState.subType && selectedDrawDate) {
          let digitCount = 3;
          let typeNumber = 'บน';
          if (prize.category === 'three') {
            digitCount = 3;
            typeNumber = prize.display_name.includes('โต๊ด') ? 'โต๊ด' : 'บน';
          } else if (prize.category === 'two') {
            digitCount = 2;
            typeNumber = prize.display_name.includes('ล่าง') ? 'ล่าง' : 'บน';
          } else if (prize.category === 'run') {
            digitCount = 1;
            typeNumber = prize.display_name.includes('ล่าง') ? 'วิ่งล่าง' : 'วิ่งบน';
          }
          const drawDate = selectedDrawDate.toISOString().split('T')[0];
          
          console.log(`Checking number cap for: ${num} (${digitCount} digits, ${typeNumber})`);
          
          // ใช้ฟังก์ชันตรวจสอบเลขอั้น
          let numberStatus = getDirectNumberCapAction(num, digitCount, typeNumber, initialState.subType, drawDate);
          if (!numberStatus) {
            numberStatus = getUniversalNumberCapAction(num, digitCount, typeNumber, initialState.subType, drawDate);
          }
          
          if (numberStatus) {
            console.log(`Number ${num} status: ${numberStatus.action} - ${numberStatus.reason}`);
            if (numberStatus.action === 'close') {
              blockedNumbers.push({ num, reason: numberStatus.reason });
              return; // ไม่เพิ่มเลขนี้
            } else if (numberStatus.action === 'half') {
              // 🔧 แก้ไขใหม่: หารครึ่งรางวัลแทนการหารครึ่งราคาซื้อ
              effectivePrizeRate = Math.floor(prize.prize_rate / 2);
              numberCapStatus = numberStatus;
              toast.warning(`✂️ เลข ${num} อยู่ในระบบหารครึ่งรางวัล (${numberStatus.reason})`, { duration: 4000 });
            }
          }
        }
        
        newOrders.push({
          id: Date.now() + Math.random(),
          numbers: num,
          category: prize.category as OrderCategory,
          prizeId: prize.id,
          pattern: prize.category === 'three' ? identifyThreeDigitPattern(num) : '',
          isSpecialPattern: false,
          effectivePrizeRate,
          numberCapStatus,
        });
      });
    });

    if (blockedNumbers.length > 0) {
      blockedNumbers.forEach(({ num, reason }) => {
        toast.warning(`🚫 เลข ${num} ถูกปิดรับ (${reason})`, { duration: 4000 });
      });
    }

    if (newOrders.length === 0) {
      toast.error('ไม่สามารถเพิ่มรายการได้');
      return;
    }

    setOrders(prev => [...prev, ...newOrders]);
    toast.success(`เพิ่ม ${newOrders.length} รายการสำเร็จ`);
  };

  const handleNumberPress = (num: string) => {
    if (currentInput.length < maxDigits) {
      const newInput = currentInput + num;
      setCurrentInput(newInput);
      if (newInput.length === maxDigits) {
        setTimeout(() => {
          if (activeDigitTab === 'two' && (selectedTwoDigitPattern === 'รูดหน้า' || selectedTwoDigitPattern === 'รูดหลัง' || selectedTwoDigitPattern === '19 ประตู')) {
            if (selectedPrizeIds.length === 0) {
              toast.error('กรุณาเลือกประเภทหวยสำหรับชุดเลข ' + selectedTwoDigitPattern);
              setCurrentInput('');
              return;
            }
            const generatedNumbers = generateTwoDigitNumbersByPattern(selectedTwoDigitPattern, newInput);
            const newOrders: Order[] = [];
            selectedPrizeIds.forEach(prizeId => {
              const prize = prizeInfo.find(p => p.id === prizeId);
              if (!prize || prize.category !== 'two') return;
              generatedNumbers.forEach(order => {
                newOrders.push({
                  ...order,
                  id: Date.now() + Math.random(),
                  prizeId: prize.id
                });
              });
            });
            setOrders(prev => [...prev, ...newOrders]);
            toast.success('เพิ่มรายการสำเร็จ');
          } else {
            handleAddOrder(newInput);
          }
          setCurrentInput('');
        }, 200);
      }
    }
  };

  const handleBackspace = () => {
    setCurrentInput(currentInput.slice(0, -1));
  };

  const handleClearLastInput = () => {
    setCurrentInput('');
    // ยกเลิกรูปแบบที่เลือกไว้ด้วย
    setSelectedTwoDigitPattern('');
  };

  const deleteOrder = (id: number) => {
    setOrders(orders.filter(order => order.id !== id));
  };

  const deleteLastOrder = () => {
    setOrders(orders.slice(0, -1));
  };

  const deleteAllOrders = () => {
    setOrders([]);
  };

  // เพิ่มฟังก์ชันสำหรับจัดการการกรองรายการตามจำนวนเงิน
  const handleAmountFilterChange = (prizeId: number, value: string) => {
    setAmountFilters(prev => ({
      ...prev,
      [prizeId]: value
    }));
  };

  // ฟังก์ชันกรองรายการตามจำนวนเงิน
  const getFilteredOrders = (orders: Order[], prizeId: number) => {
    const filterAmount = amountFilters[prizeId];
    if (!filterAmount || filterAmount === '') {
      return orders;
    }
    // สำหรับตอนนี้ให้แสดงทุกรายการ เนื่องจากยังไม่มีข้อมูลราคาในแต่ละ order
    // ในอนาคตสามารถเพิ่มการกรองตาม amount ได้
    return orders;
  };

  // เพิ่มฟังก์ชันสำหรับจัดการข้อมูลราคาของแต่ละรายการ
  const handleOrderPriceChange = (orderId: number, value: string) => {
    let processedValue = value.replace(/[^0-9]/g, '');
    if (processedValue.length > 1 && processedValue.startsWith('0')) {
      processedValue = processedValue.substring(1);
    }
    
    setOrderPrices(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        originalAmount: processedValue,
        amount: processedValue // For manual input, original and final are the same
      }
    }));
  };

  // Renamed for clarity: This calculates potential winnings, not the cost.
  const calculatePotentialWinnings = (orderId: number): number => {
    const orderPrice = orderPrices[orderId];
    if (!orderPrice) return 0;
    const amount = parseFloat(orderPrice.amount || '0');

    // Find the order and use its effective prize rate
    const order = orders.find(o => o.id === orderId);
    if (!order) return 0;

    // 🔧 แก้ไขใหม่: ใช้ effectivePrizeRate แทน prize_rate
    // effectivePrizeRate จะเป็นอัตราที่ปรับแล้วสำหรับเลขอั้น
    const effectiveRate = order.effectivePrizeRate || 0;
    
    return amount * effectiveRate;
  };

  // Calculates the total cost to be paid by summing up all amounts.
  const calculateTotalPayment = () => {
    return Object.values(orderPrices).reduce((total, currentOrder) => {
      const amount = parseFloat(currentOrder.amount || '0');
      return total + amount;
    }, 0);
  }

  // เพิ่มฟังก์ชันสำหรับจัดการ checkbox
  const handleOrderSelection = (orderId: number, checked: boolean) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };

  // เพิ่มฟังก์ชันสำหรับใส่ราคาแบบรวดเร็ว
  const handleQuickPriceSet = (price: number) => {
    let targetIds: number[] = [];

    if (applyToAll) {
      // ถ้าเลือก "ราคาที่กำหนดให้ทุกหมด" ให้ใส่ราคาให้ทุกรายการ
      targetIds = orders.map(order => order.id);
    } else {
      // ถ้าไม่เลือก ให้ใช้รายการที่เลือกด้วย checkbox
      targetIds = Array.from(selectedOrderIds);
      if (targetIds.length === 0) {
        toast.error('กรุณาเลือกรายการที่ต้องการใส่ราคา หรือเลือก "ราคาที่กำหนดให้ทุกหมด"');
        return;
      }
    }

    setOrderPrices(prev => {
      const newPrices = { ...prev };
      targetIds.forEach(orderId => {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          // 🔧 แก้ไขใหม่: ไม่หารครึ่งราคาซื้อ ให้ลูกค้าจ่ายเต็มราคา
          // เพราะได้ปรับอัตราจ่ายรางวัลไปแล้วใน handleAddOrder
          const finalPrice = price;

          newPrices[orderId] = {
            originalAmount: price.toString(),
            amount: finalPrice.toString()
          };
        }
      });
      return newPrices;
    });

    const message = applyToAll
      ? `ใส่ราคา ${price} บาท สำหรับทุกรายการ (${targetIds.length} รายการ)`
      : `ใส่ราคา ${price} บาท สำหรับ ${targetIds.length} รายการ`;
    toast.success(message);
  };

  // ฟังก์ชันตรวจสอบสถานะเลขอั้นของรายการ (Universal for all lottery types)
  const getOrderNumberStatus = (order: Order) => {
    // 🔧 แก้ไขใหม่: ใช้ข้อมูลจาก order.numberCapStatus โดยตรง
    // ไม่ต้องไปตรวจสอบใหม่ทุกครั้ง เพราะได้เก็บไว้ตอนสร้าง order แล้ว
    return order.numberCapStatus || null;
  };

  const renderInputBoxes = () => {
    const boxes = [];
    const total = maxDigits;
    for (let i = 0; i < total; i++) {
      let variants: any = {};
      if (total === 1) {
        variants = {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0, transition: { duration: 0.4, opacity: { duration: 0.5, delay: 0.05 } } },
          exit: { opacity: 0, y: 24, transition: { duration: 0.3, opacity: { duration: 0.3 } } },
        };
      } else if (total === 2) {
        if (i === 0) {
          variants = {
            initial: { opacity: 0, x: -24 },
            animate: { opacity: 1, x: 0, transition: { duration: 0.4, opacity: { duration: 0.5, delay: 0.05 } } },
            exit: { opacity: 0, x: -24, transition: { duration: 0.3, opacity: { duration: 0.3 } } },
          };
        } else {
          variants = {
            initial: { opacity: 0, x: 24 },
            animate: { opacity: 1, x: 0, transition: { duration: 0.4, opacity: { duration: 0.5, delay: 0.05 } } },
            exit: { opacity: 0, x: 24, transition: { duration: 0.3, opacity: { duration: 0.3 } } },
          };
        }
      } else if (total === 3) {
        if (i === 0) {
          variants = {
            initial: { opacity: 0, x: -24 },
            animate: { opacity: 1, x: 0, transition: { duration: 0.4, opacity: { duration: 0.5, delay: 0.05 } } },
            exit: { opacity: 0, x: -24, transition: { duration: 0.3, opacity: { duration: 0.3 } } },
          };
        } else if (i === 1) {
          variants = {
            initial: { opacity: 0, y: 24 },
            animate: { opacity: 1, y: 0, transition: { duration: 0.4, opacity: { duration: 0.5, delay: 0.05 } } },
            exit: { opacity: 0, y: 24, transition: { duration: 0.3, opacity: { duration: 0.3 } } },
          };
        } else {
          variants = {
            initial: { opacity: 0, x: 24 },
            animate: { opacity: 1, x: 0, transition: { duration: 0.4, opacity: { duration: 0.5, delay: 0.05 } } },
            exit: { opacity: 0, x: 24, transition: { duration: 0.3, opacity: { duration: 0.3 } } },
          };
        }
      }
      boxes.push(
        <motion.div
          key={i}
          {...{ initial: variants.initial, animate: variants.animate, exit: variants.exit }}
          className="w-14 h-14 bg-gray-100 border-2 border-gray-200 rounded-md flex items-center justify-center text-2xl font-bold text-gray-700"
        >
          {currentInput[i] || ''}
        </motion.div>
      );
    }
    return boxes;
  };

  const orderListContainerRef = useRef<HTMLDivElement>(null);
  const lastCardRef = useRef<HTMLDivElement>(null);

  // เพิ่ม ref object สำหรับแต่ละ card
  const lastOrderRefs = useRef<Record<number, HTMLLIElement | null>>({});

  useEffect(() => {
    if (lastCardRef.current) {
      lastCardRef.current.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' });
    }
  }, [orders, selectedPrizeIds]);

  // useEffect สำหรับ scroll
  useEffect(() => {
    // scroll ทุก card ที่มี order ใหม่
    Object.values(lastOrderRefs.current).forEach((el) => {
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    });
  }, [orders]);

  // Automatically switch back to the input panel if all orders are deleted
  useEffect(() => {
    if (orders.length === 0 && !showRightPanel) {
      setShowRightPanel(true);
    }
  }, [orders.length, showRightPanel]);

  const totalPayment = useMemo(() => calculateTotalPayment(), [orderPrices]);
  const isCreditSufficient = credit !== null && credit >= totalPayment;
  const creditAfterPayment = credit !== null ? credit - totalPayment : null;

  const allOrdersHaveAmount = orders.length > 0 && orders.every(order => Number(orderPrices[order.id]?.amount) > 0);

  const handleConfirmOrder = async () => {
    if (!user) {
      toast.error('กรุณาเข้าสู่ระบบเพื่อทำรายการ');
      return;
    }
    if (!selectedDraw) {
      toast.error('กรุณาเลือกงวดที่ต้องการซื้อ');
      return;
    }
    const selectedOrders = orders.filter(order => selectedOrderIds.has(order.id));
    if (selectedOrders.length === 0) {
      toast.error('กรุณาเลือกรายการที่ต้องการซื้อ');
      return;
    }
    const totalPayment = calculateTotalPayment();
    if (totalPayment <= 0) {
      toast.error('ยอดรวมต้องมากกว่า 0');
      return;
    }
    if (credit === null || credit < totalPayment) {
      toast.error('เครดิตไม่เพียงพอ');
      return;
    }
  
    setIsSaving(true);
    toast.info('กำลังบันทึกรายการ...');
  
    try {
      // ปรับปรุงการเตรียมข้อมูลให้ตรงกับ RPC function และรองรับระบบเลขอั้น
      const itemsToInsert = selectedOrders.map(order => {
        const prices = orderPrices[order.id];
        const finalAmount = prices?.amount || '0';
        const originalAmount = prices?.originalAmount || finalAmount;

        // ตรวจสอบและปรับปรุงข้อมูลให้ถูกต้อง
        const prize = prizeInfo.find(p => p.id === order.prizeId);
        if (!prize) {
          throw new Error(`ไม่พบข้อมูลรางวัลสำหรับ ID: ${order.prizeId}`);
        }

        return {
          lottery_sub_type_id: initialState.subType,
          lottery_sub_number_id: order.prizeId,
          numbers: [order.numbers], // เก็บเป็น array ของ string
          amount: finalAmount,
          original_amount: originalAmount,
          effective_prize_rate: order.effectivePrizeRate || prize.prize_rate,
          number_cap_action: order.numberCapStatus?.action || null,
          number_cap_status: order.numberCapStatus || null,
        };
      });
  
      console.log('Sending order data:', {
        p_user_id: user.id,
        p_bill_name: billName,
        p_bill_number: billNumber,
        p_draw_date: selectedDraw.date.toISOString().split('T')[0],
        p_draw_time: selectedDraw.schedule.draw_time,
        p_close_time: selectedDraw.schedule.close_time,
        p_total_amount: totalPayment,
        p_ticket_items: itemsToInsert,
      });

      const { error } = await supabase.rpc('handle_lottery_order', {
        p_user_id: user.id,
        p_bill_name: billName,
        p_bill_number: billNumber,
        p_draw_date: selectedDraw.date.toISOString().split('T')[0],
        p_draw_time: selectedDraw.schedule.draw_time,
        p_close_time: selectedDraw.schedule.close_time,
        p_total_amount: totalPayment,
        p_ticket_items: itemsToInsert,
      });
  
      if (error) {
        console.error('Error confirming order:', error);
        throw new Error(error.message);
      }
  
      toast.success('บันทึกรายการสำเร็จ!', {
        description: `เลขบิล: ${billNumber}`,
      });
  
      await fetchCredit(); // Refresh credit after purchase
  
      // Reset state after successful order
      setOrders(orders.filter(order => !selectedOrderIds.has(order.id)));
      setSelectedOrderIds(new Set());
      setOrderPrices({});
  
      // Redirect to preview page
      router.push(`/order-preview/${billNumber}`);
  
    } catch (error: any) {
      console.error('Order confirmation error:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึก', {
        description: error.message || 'กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAllOrders = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(new Set(orders.map(order => order.id)));
    } else {
      setSelectedOrderIds(new Set());
    }
  };

  // ฟังก์ชันปรับปรุง effectivePrizeRate และ numberCapStatus สำหรับ orders ใหม่
  const updateOrderWithPrizeAndCapStatus = (order: Order, prizeId: number): Order => {
    const prize = prizeInfo.find(p => p.id === prizeId);
    if (!prize) return order;

    let numberCapStatus = null;
    let effectivePrizeRate = prize.prize_rate;

    // ตรวจสอบเลขอั้นเช่นเดียวกับใน handleAddOrder
    if (initialState.subType && selectedDrawDate) {
      let digitCount = 3;
      let typeNumber = 'บน';
      
      if (prize.category === 'three') {
        digitCount = 3;
        typeNumber = prize.display_name.includes('โต๊ด') ? 'โต๊ด' : 'บน';
      } else if (prize.category === 'two') {
        digitCount = 2;
        typeNumber = prize.display_name.includes('ล่าง') ? 'ล่าง' : 'บน';
      } else if (prize.category === 'run') {
        digitCount = 1;
        typeNumber = prize.display_name.includes('ล่าง') ? 'วิ่งล่าง' : 'วิ่งบน';
      }
      
      const drawDate = selectedDrawDate.toISOString().split('T')[0];
      
      // ใช้ฟังก์ชันตรวจสอบเลขอั้น
      let numberStatus = getDirectNumberCapAction(order.numbers, digitCount, typeNumber, initialState.subType, drawDate);
      if (!numberStatus) {
        numberStatus = getUniversalNumberCapAction(order.numbers, digitCount, typeNumber, initialState.subType, drawDate);
      }
      
      if (numberStatus) {
        if (numberStatus.action === 'half') {
          effectivePrizeRate = Math.floor(prize.prize_rate / 2);
          numberCapStatus = numberStatus;
        }
        // ไม่ต้องจัดการกับ 'close' เพราะจะไม่เพิ่มเลขนี้อยู่แล้ว
      }
    }

    return {
      ...order,
      prizeId,
      effectivePrizeRate,
      numberCapStatus,
    };
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="bg-red-800 dark:bg-red-700 rounded-t-xl shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-0.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <TicketIcon className="w-12 h-12 text-red-100" />
                <h1 className="text-sm md:text-lg font-bold text-white">สร้างรายการหวย</h1>
              </div>

            </div>
            <div className="flex items-center gap-4">
              {subTypeObj && (
                <div className="flex items-center gap-2 ml-4">
                  {subTypeObj.country_origin && (
                    <img src={countryFlagImg(subTypeObj.country_origin)} alt={subTypeObj.country_origin} className="h-10 w-10 rounded-full object-cover border border-border" />
                  )}
                  <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold">
                    <span className="text-sm font-medium">{subTypeObj.sub_type_name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          {subTypeObj && selectedDraw && (
            <div className="border-t flex flex-row justify-between border-red-500 py-0.5">
              <div className="text-sm opacity-90 text-white">
                <label className="block text-md   mb-1 flex items-center gap-1 ">
                  <Ticket className="w-4 h-4" />
                  เลขบิล #{billNumber}
                </label>
                <div className="text-xs opacity-90">
                  <CurrentTime />
                </div>
              </div>
              {selectedDraw && (
                <div className="text-sm text-white">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>งวด: {format(selectedDraw.date, 'd MMM yy', { locale: th })}</span>
                  </div>
                  <div className="text-xs opacity-90">
                    เวลาหวยออก: {selectedDraw.schedule.draw_time}
                  </div>
                  {/* เพิ่มแสดงเวลาปิดรับแบบตรงๆ */}
                  <div className="text-xs opacity-90">
                    เวลาปิดรับ: {selectedDraw.schedule.close_time || 'ไม่ระบุ'}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-1 px-1">
        {/* แสดงตัวบ่งชี้เลขอั้นสำหรับทุกประเภทหวย */}
        {initialState.subType && selectedDrawDate && (
          <NumberCapIndicator 
          lottery_sub_type_id={initialState.subType} 
            drawDate={selectedDrawDate.toISOString().split('T')[0]}
            showStats={true}
            lotterySubTypeName={subTypeObj?.sub_type_name}
          />
        )}
        
        <div className={`grid ${!showRightPanel ? 'grid-cols-10' : 'grid-cols-5'} gap-2 md:gap-4`}>

          {/* Left Panel: Order List */}
          <div className={cn(
            "bg-card text-card-foreground p-2 md:p-4 rounded-lg shadow-md flex flex-col",
            showRightPanel ? "col-span-2 lg:col-span-3" : "col-span-7"
          )}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 md:mb-4 gap-2">
              <div className="flex flex-col md:flex-row justify-between items-center w-full gap-1">
                <div className="flex items-center gap-0.5 md:gap-2">
                  <h2 className="text-[10px] md:text-lg font-bold rounded-full px-1.5 py-0.5 bg-red-500 text-white">
                    {orders.length} รายการ
                  </h2>
                  <div className="flex flex-col items-center">
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteAll(true)} disabled={orders.length === 0} className="text-red-600 hover:text-red-800 disabled:text-muted-foreground disabled:cursor-not-allowed text-[10px] md:text-sm px-1.5 md:px-3 ml-auto md:ml-0 h-7 w-7">
                      <Trash2 className="h-6 w-6 transition-transform duration-300 group-hover:rotate-90 text-red-600" />
                      <Badge variant="destructive" className="absolute ml-5 mb-4 text-[8px] md:text-xs">
                        {orders.length}
                      </Badge>
                    </Button>
                    <h2 className="text-[10px] mt-[-6px] text-red-600 ml-2 md:ml-0">
                      Delete
                    </h2>
                  </div>
                </div>
                <Button
                  className="w-full md:w-auto group flex items-center gap-0.5 md:gap-2 bg-red-600 text-white hover:bg-red-700 transition-all duration-300 ease-in-out hover:scale-105 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400 text-[10px] md:text-sm px-1.5 md:px-3 py-0.5 md:py-2 md:mt-0 md:ml-auto h-7"
                  onClick={() => setShowRightPanel(false)}
                  disabled={orders.length === 0}
                >
                  <FaMoneyBill className="h-3 w-3 md:h-6 md:w-6 transition-transform duration-300 group-hover:rotate-90" />
                  <span>ใส่ราคาหวย</span>
                </Button>
              </div>
            </div>

            <div
              ref={orderListContainerRef}
              className="flex flex-col md:flex-row gap-2 overflow-x-auto max-w-full pb-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent md:overflow-y-visible overflow-y-auto max-h-[calc(70vh-100px)] md:max-h-screen"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <AnimatePresence>
                {(() => {
                  const uniquePrizeIdsInOrders = Array.from(new Set(orders.map(o => o.prizeId)));

                  if (uniquePrizeIdsInOrders.length === 0) {
                    return (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-6 text-muted-foreground w-full text-xs">
                        ยังไม่มีรายการ
                      </motion.div>
                    );
                  }

                  return uniquePrizeIdsInOrders.map((prizeId, idx) => {
                    const prize = prizeInfo.find((p) => p.id === prizeId);
                    if (!prize) return null;
                    const filteredOrders = orders.filter(order => order.prizeId === prizeId);

                    const isLast = idx === uniquePrizeIdsInOrders.length - 1;
 
                    return (
                      <motion.div
                        key={`order-card-${prize.id}`}
                        ref={isLast ? lastCardRef : undefined}
                        className="flex-shrink-0 w-full md:w-auto"
                        layout
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <Card className="shadow-lg border border-red-200 dark:border-red-900 w-full">
                          <CardHeader
                            className="flex flex-row items-center justify-between space-y-0 pb-0.5 p-1 rounded-t-lg bg-gradient-to-r from-red-900 to-red-700 min-h-0"
                          >
                            <div className="flex flex-col items-start">
                              <CardTitle className="text-[10px] md:text-sm font-bold text-white flex items-center">
                                <span>{prize.display_name}</span>
                                <span className="text-[8px] md:text-xs bg-white/30 text-white px-0.5 py-0.5 rounded-full ml-1">x{prize.prize_rate}</span>
                              </CardTitle>
                              <Badge variant="destructive" className="mt-0.5 text-[8px] md:text-xs bg-white/80 text-red-700 dark:bg-black/50 dark:text-red-400 border-none px-1 py-0.5 rounded-full">
                                {filteredOrders.length} รายการ
                              </Badge>
                            </div>
                            <div className="bg-red-500 border border-red-500 rounded-full w-5 h-5 flex items-center justify-center mt-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="ลบทั้งหมดของประเภทนี้"
                                className="text-white hover:text-red-600 p-0"
                                onClick={() => {
                                  setOrders(prev => prev.filter(order => order.prizeId !== prize.id));
                                }}
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-0 max-h-[calc(78vh-200px)] min-h-[calc(45vh-100px)] overflow-y-auto">
                            {/* ช่องระบุราคาทีละรายการ - แสดงเมื่ออยู่ใน Payment Panel */}
                            <AnimatePresence>
                              {!showRightPanel && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3, ease: "easeInOut" }}
                                  className="border-b border-border bg-muted/30 overflow-hidden"
                                >
                                 
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <ul className="overflow-y-auto">
                              <AnimatePresence>
                                {getFilteredOrders(filteredOrders, prize.id).map((order, index) => {
                                  const numberStatus = getOrderNumberStatus(order);
                                  const isCapped = numberStatus && (numberStatus.action === 'close' || numberStatus.action === 'half');
                                  const cappedBgClass =
                                    numberStatus?.action === 'close'
                                      ? 'bg-red-50 dark:bg-red-900/40'
                                      : numberStatus?.action === 'half'
                                      ? 'bg-yellow-50 dark:bg-yellow-900/40'
                                      : '';
                                  const liContent = (
                                  <motion.li
                                    key={order.id}
                                    ref={index === filteredOrders.length - 1
                                      ? (el) => { lastOrderRefs.current[prize.id] = el; }
                                      : undefined
                                    }
                                      className={`text-xs py-1 px-1 ${cappedBgClass}`}
                                    layout
                                    initial={{ opacity: 0, x: 24 }}
                                    animate={{ opacity: 1, x: 0, transition: { duration: 0.35 } }}
                                    exit={{ opacity: 0, y: 24, transition: { duration: 0.25 } }}
                                    variants={itemVariants}
                                  >
                                      <div className="flex items-center gap-2">
                                        {/* เพิ่ม checkbox สำหรับเลือกรายการ */}
                                        {!showRightPanel && (
                                          <input
                                            type="checkbox"
                                            checked={selectedOrderIds.has(order.id)}
                                            onChange={(e) => handleOrderSelection(order.id, e.target.checked)}
                                            className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2"
                                          />
                                        )}
                                      <span className="text-muted-foreground text-[14px] md:text-sm w-6 text-center">{index + 1}.</span>
                                      <div className="flex items-center">
                                          {order.numbers.split('').map((num, i) => (
                                          <span key={i} className="text-[14px] w-6 h-6 bg-gray-100 dark:bg-red-500 flex items-center justify-center rounded-md mr-0.5">{num}</span>
                                          ))}
                                          {/* แสดงตัวบ่งชี้เลขอั้น */}
                                          {(() => {
                                            if (numberStatus) {
                                              return (
                                                <div className="flex items-center ml-1">
                                                  {numberStatus.action === 'half' && (
                                                    <span className="text-xs bg-orange-100 text-orange-700 px-1 py-0.5 rounded flex items-center" title={numberStatus.reason}>
                                                      ✂️
                                                    </span>
                                                  )}
                                                  {numberStatus.action === 'close' && (
                                                    <span className="text-xs bg-red-100 text-red-700 px-1 py-0.5 rounded flex items-center" title={numberStatus.reason}>
                                                      🚫
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            }
                                            return null;
                                          })()}
                                            {!showRightPanel && (
                                          <>
                                                  <input
                                                    type="number"
                                                    placeholder="0"
                                                    value={orderPrices[order.id]?.amount || ''}
                                                    onChange={(e) => handleOrderPriceChange(order.id, e.target.value)}
                                                    onFocus={() => setFocusedOrderId(order.id)}
                                                    onBlur={() => setFocusedOrderId(null)}
                                              className="w-14 px-1 text-xs text-bold border border-border rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500 h-6 text-center"
                                                  />
                                              {orderPrices[order.id]?.originalAmount && orderPrices[order.id]?.originalAmount !== orderPrices[order.id]?.amount && (
                                                <del className="text-xs text-gray-500 mx-1">{orderPrices[order.id]?.originalAmount}</del>
                                              )}
                                            <div className="w-10 text-xs h-6 flex items-center justify-center font-medium text-gray-500">
                                              x{(order.effectivePrizeRate || 0).toLocaleString()}
                                            </div>
                                            <div className="w-14 text-xs h-6 flex items-center justify-center font-medium text-red-500">
                                                    {calculatePotentialWinnings(order.id).toLocaleString()}
                                                  </div>
                                          </>
                                            )}
                                        <Button variant="ghost" size="icon" onClick={() => deleteOrder(order.id)} className="w-6 h-6 text-muted-foreground hover:text-red-500 p-0 flex items-center justify-center">
                                          <Trash2 size={12} />
                                      </Button>
                                      </div>
                                    </div>
                                  </motion.li>
                                  );
                                  return isCapped ? (
                                    <TooltipProvider key={order.id}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>{liContent}</TooltipTrigger>
                                        <TooltipContent side="right" className="max-w-xs">
                                          <div className="font-bold">
                                            {numberStatus.action === 'close' ? 'เลขนี้ปิดรับ' : 'เลขนี้หารครึ่ง'}
                                          </div>
                                          <div className="text-xs text-muted-foreground">{numberStatus.reason}</div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : liContent;
                                })}
                              </AnimatePresence>
                            </ul>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  });
                })()}
              </AnimatePresence>
            </div>
          </div>


          {/* Right Panel: Input */}
          {showRightPanel && (
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="col-span-3 lg:col-span-2 bg-card text-card-foreground px-2 md:px-4 pb-4 md:pb-6 rounded-lg shadow-md flex flex-col"
            >
              {/* Main Tabs */}
              <div className="flex justify-center border-b border-border w-full mb-2 md:mb-3">
                <button onClick={() => { setActiveMainTab('manual'); setSelectedDigitForTwoPattern(''); setSelectedTwoDigitPattern(''); }} className={`flex-1 md:flex-none py-2 md:py-3 px-2 md:px-3 text-[14px] md:text-sm font-medium ${activeMainTab === 'manual' ? 'border-b-2 border-red-500 text-red-600 bg-red-50/50 md:bg-transparent' : 'text-muted-foreground hover:text-foreground'}`}>กดเลือกเอง</button>
                <button onClick={() => { setActiveMainTab('set'); setSelectedDigitForTwoPattern(''); setSelectedTwoDigitPattern(''); }} className={`flex-1 md:flex-none py-2 md:py-3 px-2 md:px-3 text-[14px] md:text-sm font-medium ${activeMainTab === 'set' ? 'border-b-2 border-red-500 text-red-600 bg-red-50/50 md:bg-transparent' : 'text-muted-foreground hover:text-foreground'}`}>ชุดตัวเลข</button>

              </div>

              {/* Sub Tabs */}
              <div className="flex justify-center bg-muted p-1 rounded-lg mb-2 md:mb-4">
                <button onClick={() => { setActiveDigitTab('three'); setCurrentInput(''); setSelectedDigitForTwoPattern(''); setSelectedTwoDigitPattern(''); }} className={`flex-1 py-1.5 md:py-2 px-2 md:px-3 text-[14px] md:text-sm rounded-md font-medium ${activeDigitTab === 'three' ? 'bg-background shadow-sm font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>สามตัว</button>
                <button onClick={() => { setActiveDigitTab('two'); setCurrentInput(''); setSelectedDigitForTwoPattern(''); setSelectedTwoDigitPattern(''); }} className={`flex-1 py-1.5 md:py-2 px-2 md:px-3 text-[14px] md:text-sm rounded-md font-medium ${activeDigitTab === 'two' ? 'bg-background shadow-sm font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>สองตัว</button>
                <button onClick={() => { setActiveDigitTab('run'); setCurrentInput(''); setSelectedDigitForTwoPattern(''); setSelectedTwoDigitPattern(''); }} className={`flex-1 py-1.5 md:py-2 px-2 md:px-3 text-[14px] md:text-sm rounded-md font-medium ${activeDigitTab === 'run' ? 'bg-background shadow-sm font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>เลขวิ่ง</button>
              </div>

              {/* ชุดตัวเลข */}
              {activeMainTab === 'set' ? (
                <div className="flex flex-col gap-2">

                  {/* ปุ่มรางวัลบน/ล่าง/โต๊ด */}
                  <motion.div className="grid grid-cols-2 md:flex md:flex-row w-full" variants={containerVariants} initial="hidden" animate="visible">
                    {prizeInfo
                      .filter((prize) => prize.category === activeDigitTab)
                      .map((prize) => (
                        <motion.div key={prize.id} variants={itemVariants}>
                          <Button
                            key={prize.id}
                            variant={selectedPrizeIds.includes(prize.id) ? "secondary" : "outline"}
                            className={cn(
                              "w-full min-w-[80px] flex flex-col md:flex-row justify-center items-center border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-950 dark:text-red-200 h-10 gap-y-0 md:gap-x-1 py-1 md:py-1",
                              selectedPrizeIds.includes(prize.id) ? "border-2 border-red-500 bg-red-400 dark:bg-red-900" : ""
                            )}
                            onClick={() => {
                              setSelectedPrizeIds((prev) =>
                                prev.includes(prize.id)
                                  ? prev.filter((id) => id !== prize.id)
                                  : [...prev, prize.id]
                              );
                            }}
                          >
                            <div className="flex flex-col-2">
                              <span className="font-medium md:font-normal text-[14px] md:text-xs">{prize.display_name}</span>
                              <span className="text-[8px] md:text-[14px] font-bold text-red-600 md:text-current md:whitespace-nowrap">x{prize.prize_rate}</span>
                            </div></Button>
                        </motion.div>
                      ))}
                    {/* กลับเลข และรางวัล */}
                    <div className="mb-2 md:mb-1">
                      <div className="flex items-center gap-1">
                        <div className="flex-1 md:flex-1 flex items-center">
                          <input
                            type="checkbox"
                            id="reverse-set"
                            checked={isReversed}
                            onChange={(e) => setIsReversed(e.target.checked)}
                            className="w-3.5 h-3.5 md:sr-only text-red-600 border-gray-300 rounded focus:ring-red-500 focus:ring-2 mr-2"
                          />
                          <label
                            htmlFor="reverse-set"
                            className={cn(
                              "flex items-center gap-1.5 md:gap-2 cursor-pointer rounded-md p-0 md:p-2 text-[14px] md:text-xs transition-colors",
                              "md:" + (isReversed
                                ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 font-semibold"
                                : "text-muted-foreground hover:bg-muted")
                            )}
                          >
                            <span className="md:hidden">กลับเลข</span>
                            <Repeat size={12} className="hidden md:inline" />
                            <span className="hidden md:inline">กลับเลข</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  {/* ตัวเลือกเพิ่มเติม */}
                  <details className="mb-2 md:mb-4" open={isMoreOptionsOpen} onToggle={(e) => setIsMoreOptionsOpen(e.currentTarget.open)}>
                    <summary className="flex items-center justify-between p-2 md:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <span className="font-medium text-[14px] md:text-sm">ตัวเลือกเพิ่มเติม</span>
                      <span className="text-xs text-muted-foreground">{isMoreOptionsOpen ? '▼' : '▶'}</span>
                    </summary>
                    <motion.div className="flex flex-row flex-wrap gap-1 md:gap-1.5 mt-1" variants={containerVariants} initial="hidden" animate="visible">
                      {activeDigitTab === 'three' && [
                        'ตอง', 'เลขหาม', 'เบิ้ลหน้า', 'เบิ้ลหลัง', 'เบิ้ลพี่น้อง', 'ชุดเรียง'
                      ].map((txt, idx) => (
                        <motion.div key={txt} variants={itemVariants}>
                          <Button
                            key={txt}
                            variant="outline"
                            className={`text-[14px] md:text-sm h-7 md:h-8 px-2 md:px-3 ${selectedPattern === txt ? 'bg-red-100 border-red-500 dark:bg-red-900 dark:border-red-700' : ''} ${idx === 0 ? 'col-span-0' : ''}`}
                            onClick={() => {
                              if (selectedPrizeIds.length === 0) {
                                toast.error('กรุณาเลือกประเภทหวยก่อนเพิ่มชุดตัวเลข');
                                return;
                              }
                              const pattern = txt as ThreeDigitPattern;
                              // เช็คว่ามี order ที่ pattern นี้อยู่แล้วหรือไม่
                              const alreadyAdded = orders.some(order => order.pattern === pattern && order.category === 'three');
                              if (alreadyAdded) {
                                if (!window.confirm('มีการเพิ่มรายการนี้ก่อนหน้า ต้องการเพิ่มอีกใช่หรือไม่?')) {
                                  setSelectedPattern('');
                                  return;
                                }
                              }
                              const generatedOrders = generateNumbersByPattern(pattern);
                              const newOrders: Order[] = [];
                              selectedPrizeIds.forEach(prizeId => {
                                const prize = prizeInfo.find(p => p.id === prizeId);
                                if (!prize || prize.category !== 'three') return;
                                generatedOrders.forEach(order => {
                                  const updatedOrder = updateOrderWithPrizeAndCapStatus(order, prize.id);
                                  newOrders.push({ ...updatedOrder, id: Date.now() + Math.random() });
                                });
                              });
                              setOrders(prev => [...prev, ...newOrders]);
                              setSelectedPattern('');
                              toast.success(`เพิ่มชุด "${pattern}" เรียบร้อยแล้ว`);
                            }}
                          >{txt}</Button>
                        </motion.div>
                      ))}
                      {activeDigitTab === 'two' && [
                        'รูดหน้า', 'รูดหลัง', '19 ประตู', 'เลขเบิ้ล', 'สองตัวต่ำ', 'สองตัวสูง', 'สองตัวคี่', 'สองตัวคู่', 'พี่น้อง', 'น้องพี่'
                      ].map(txt => (
                        <motion.div key={txt} variants={itemVariants}>
                          <Button
                            key={txt}
                            variant="outline"
                            className={cn(
                              'text-[14px] md:text-[14px] h-7 md:h-8 px-1.5 md:px-2',
                              selectedTwoDigitPattern === txt ? 'bg-red-100 border-red-500 dark:bg-red-900 dark:border-red-700' : ''
                            )}
                            onClick={() => {
                              if (selectedPrizeIds.length === 0) {
                                toast.error('กรุณาเลือกประเภทหวยสำหรับชุดเลขนี้');
                                return;
                              }
                              const pattern = txt as TwoDigitPattern;
                              if (pattern === 'รูดหน้า' || pattern === 'รูดหลัง' || pattern === '19 ประตู') {
                                setSelectedTwoDigitPattern(pattern);
                                setCurrentInput('');
                              } else {
                                // เช็คว่ามี order ที่ pattern นี้อยู่แล้วหรือไม่
                                const alreadyAdded = orders.some(order => order.pattern === pattern && order.category === 'two');
                                if (alreadyAdded) {
                                  if (!window.confirm('มีการเพิ่มรายการนี้ก่อนหน้า ต้องการเพิ่มอีกใช่หรือไม่?')) {
                                    setSelectedTwoDigitPattern('');
                                    return;
                                  }
                                }
                                let newOrders: Order[] = [];
                                const generated = generateTwoDigitNumbersByPattern(pattern);
                                selectedPrizeIds.forEach(prizeId => {
                                  const prize = prizeInfo.find(p => p.id === prizeId);
                                  if (!prize || prize.category !== 'two') return;
                                  generated.forEach(order => {
                                    const updatedOrder = updateOrderWithPrizeAndCapStatus(order, prize.id);
                                    newOrders.push({ ...updatedOrder, id: Date.now() + Math.random() });
                                  });
                                });
                                setOrders(prev => [...prev, ...newOrders]);
                                setSelectedTwoDigitPattern('');
                                toast.success(`เพิ่มชุด "${pattern}" เรียบร้อยแล้ว`);
                              }
                            }}
                          >{txt}</Button>
                        </motion.div>
                      ))}
                    </motion.div>
                  </details>
                  {/* Number Pad */}
                  <div className="flex flex-col gap-2">
                    {activeDigitTab === 'three' && (
                      <>
                        {/* Header Filter */}
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {Array.from({ length: 10 }, (_, i) => i * 100).map(base => (
                            <Button
                              key={base}
                              variant={threeDigitFilter === base ? "secondary" : "outline"}
                              className={`h-7 w-12 text-[14px] font-mono px-0.5 ${threeDigitFilter === base ? 'border-red-400 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-200' : ''}`}
                              onClick={() => setThreeDigitFilter(base)}
                            >{base.toString().padStart(3, '0')}</Button>
                          ))}
                        </div>
                        <div className="border-t border-border my-1" />
                        <div className="overflow-y-auto max-h-60 pr-1">
                          <div className="grid grid-cols-5 gap-1.5">
                            {Array.from({ length: 100 }, (_, i) => threeDigitFilter + i)
                              .filter(num => num <= 999)
                              .map(num => {
                                const val = num.toString().padStart(3, '0');
                                return (
                                  <div key={val}>
                                    <Button
                                      key={val}
                                      variant="outline"
                                      className={`h-8 text-xs font-mono justify-center ${isNumberSelected(val, 'three') ? 'border-red-500 border-2' : ''}`}
                                      onClick={() => {
                                        handleAddOrder(val);
                                      }}
                                    >{val}</Button>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </>
                    )}

                    {activeDigitTab === 'two' && (
                      <>
                        {/* Digit Selection for Two Digit Patterns */}
                        {["รูดหน้า", "รูดหลัง", "19 ประตู"].includes(selectedTwoDigitPattern) && (
                          <div className="mb-2">
                            <div className="text-xs text-muted-foreground mb-1">เลือกตัวเลขสำหรับรูด (หรือไม่เลือกเพื่อใช้ทุกตัว):</div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {Array.from({ length: 10 }, (_, i) => i).map(digit => (
                                <Button
                                  key={digit}
                                  variant={selectedDigitForTwoPattern === digit.toString() ? "secondary" : "outline"}
                                  className="h-6 w-6 text-xs"
                                  onClick={() => {
                                    setSelectedDigitForTwoPattern(digit.toString());
                                    if (["รูดหน้า", "รูดหลัง", "19 ประตู"].includes(selectedTwoDigitPattern) && selectedPrizeIds.length > 0) {
                                      const generatedNumbers = generateTwoDigitNumbersByPattern(selectedTwoDigitPattern, digit.toString());
                                      const newOrders: Order[] = [];
                                      selectedPrizeIds.forEach(prizeId => {
                                        const prize = prizeInfo.find(p => p.id === prizeId);
                                        if (!prize || prize.category !== 'two') return;
                                                                      generatedNumbers.forEach(order => {
                                const updatedOrder = updateOrderWithPrizeAndCapStatus(order, prize.id);
                                newOrders.push({ ...updatedOrder, id: Date.now() + Math.random() });
                              });
                                      });
                                      setOrders(prev => [...prev, ...newOrders]);
                                      toast.success('เพิ่มรายการสำเร็จ');
                                    }
                                  }}
                                >{digit}</Button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="border-t border-border my-1" />
                        <div className="overflow-y-auto max-h-60 pr-1">
                          <div className="grid grid-cols-5 gap-1.5">
                            {Array.from({ length: 100 }, (_, num) =>
                              num.toString().padStart(2, '0')
                            ).map((num) => (
                              <div key={num}>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'w-full h-8 text-xs font-mono justify-center transition-all duration-200 transform hover:scale-105 hover:bg-red-50 dark:hover:bg-red-950',
                                    isNumberSelected(num, 'two') ? 'border-red-500 border-2' : 'hover:border-red-300',
                                    'active:scale-95 active:bg-red-100 dark:active:bg-red-900'
                                  )}
                                  onClick={() => {
                                    handleAddOrder(num);
                                  }}
                                >{num}</Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {activeDigitTab === 'run' && (
                      <div className="grid grid-cols-5 gap-2">
                        {Array.from({ length: 10 }, (_, i) => i).map(num => (
                          <div key={num}>
                            <Button
                              key={num}
                              variant="outline"
                              className={`h-8 text-xs font-mono justify-center ${isNumberSelected(num.toString(), 'run') ? 'border-red-500 border-2' : ''}`}
                              onClick={() => {
                                handleAddOrder(num.toString());
                              }}
                            >{num}</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* ปุ่มล่าง 
                <div className="flex items-center justify-between mt-3 border-t border-border pt-3">
                  <Button variant="outline" className="p-1.5 text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 h-8"><MoreHorizontal size={16} /></Button>
                  <Button variant="outline" className="py-1.5 px-3 text-xs text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 h-8">กลับหน้าหลัก</Button>
                </div>*/}
                </div>
              ) : (
                <>
                  <div className="my-1.5">
                    <motion.div className="grid grid-cols-2 gap-1.5 mt-1.5 w-full" variants={containerVariants} initial="hidden" animate="visible">
                      {prizeInfo
                        .filter((prize) => prize.category === activeDigitTab)
                        .map((prize) => (
                          <motion.div key={prize.id} variants={itemVariants}>
                            <Button
                              key={prize.id}
                              variant={selectedPrizeIds.includes(prize.id) ? "secondary" : "outline"}
                              className={cn(
                                "w-full min-w-[60px] flex flex-col md:flex-row justify-center items-center border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-950 dark:text-red-200 h-8 md:h-8 text-[14px] md:text-xs gap-y-0 md:gap-x-1 py-1 md:py-1",
                                selectedPrizeIds.includes(prize.id) ? "border-2 border-red-500 bg-red-200 dark:bg-red-900 " : ""
                              )}
                              onClick={() => {
                                setSelectedPrizeIds((prev) =>
                                  prev.includes(prize.id)
                                    ? prev.filter((id) => id !== prize.id)
                                    : [...prev, prize.id]
                                );
                              }}
                            >
                              <div className="flex flex-col-2">
                                <span className="font-medium md:font-normal text-[14px] md:text-xs">{prize.display_name}</span>
                                <span className="text-[8px] font-bold text-red-600">x{prize.prize_rate}</span>
                              </div>
                            </Button>
                          </motion.div>
                        ))}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="reverse-manual"
                          checked={isReversed}
                          onChange={(e) => setIsReversed(e.target.checked)}
                          className="sr-only"
                        />
                        <label
                          htmlFor="reverse-manual"
                          className={cn(
                            "flex items-center gap-2 cursor-pointer rounded-md p-2 text-xs transition-colors",
                            isReversed
                              ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 font-semibold"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <Repeat size={14} />
                          <span>กลับเลข</span>
                        </label>
                      </div>
                    </motion.div>
                  </div>

                  <div className="flex-grow flex flex-col items-center justify-center">
                    {/* แสดงข้อมูลรูปแบบที่เลือก */}
                    {selectedTwoDigitPattern && (
                      <div className="bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800 rounded-lg p-2 mb-2 text-center">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-red-800 dark:text-red-300">
                              รูปแบบที่เลือก: {selectedTwoDigitPattern}
                            </div>
                            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                              กรุณาป้อนตัวเลข 1 ตัว เพื่อสร้างชุดเลข
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTwoDigitPattern('');
                              setCurrentInput('');
                            }}
                            className="h-6 w-6 p-0 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-center gap-1.5 mb-2">
                      {renderInputBoxes()}
                    </div>
                  </div>
                  {/* ตัวเลือกเพิ่มเติม */}
                  <details className="mb-1.5" open={isMoreOptionsOpen} onToggle={(e) => setIsMoreOptionsOpen(e.currentTarget.open)}>
                    <summary className="font-bold text-xs mb-0.5 cursor-pointer">
                      {isMoreOptionsOpen ? 'ปิดตัวเลือกเพิ่มเติม' : 'เปิดตัวเลือกเพิ่มเติม'}
                    </summary>
                    <div className="grid grid-cols-3 gap-1.5 mt-1">
                      {activeDigitTab === 'three' && [
                        'ตอง', 'เลขหาม', 'เบิ้ลหน้า', 'เบิ้ลหลัง', 'เบิ้ลพี่น้อง', 'ชุดเรียง'
                      ].map((txt, idx) => (
                        <Button
                          key={txt}
                          variant="outline"
                          className={cn(
                            'text-[14px] bg-red-50 h-8 transition-all duration-200',
                            selectedPattern === txt ? 'bg-red-100 border-red-500 dark:bg-red-900 dark:border-red-700' : 'hover:bg-red-100 hover:border-red-300 dark:hover:bg-red-950 dark:hover:border-red-800',
                            idx === 0 ? 'col-span-0' : '',
                            'active:bg-red-200 active:scale-95 dark:active:bg-red-800'
                          )}
                          onClick={() => {
                            if (selectedPrizeIds.length === 0) {
                              toast.error('กรุณาเลือกประเภทหวยก่อนเพิ่มชุดตัวเลข');
                              return;
                            }
                            const pattern = txt as ThreeDigitPattern;
                            // เช็คว่ามี order ที่ pattern นี้อยู่แล้วหรือไม่
                            const alreadyAdded = orders.some(order => order.pattern === pattern && order.category === 'three');
                            if (alreadyAdded) {
                              if (!window.confirm('มีการเพิ่มรายการนี้ก่อนหน้า ต้องการเพิ่มอีกใช่หรือไม่?')) {
                                setSelectedPattern('');
                                return;
                              }
                            }
                            const generatedOrders = generateNumbersByPattern(pattern);
                            const newOrders: Order[] = [];
                            selectedPrizeIds.forEach(prizeId => {
                              const prize = prizeInfo.find(p => p.id === prizeId);
                              if (!prize || prize.category !== 'three') return;
                                                          generatedOrders.forEach(order => {
                              const updatedOrder = updateOrderWithPrizeAndCapStatus(order, prize.id);
                              newOrders.push({ ...updatedOrder, id: Date.now() + Math.random() });
                            });
                            });
                            setOrders(prev => [...prev, ...newOrders]);
                            setSelectedPattern('');
                            toast.success(`เพิ่มชุด "${pattern}" เรียบร้อยแล้ว`);
                          }}
                        >
                          {txt}
                        </Button>
                      ))}
                      {activeDigitTab === 'two' && [
                        'รูดหน้า', 'รูดหลัง', '19 ประตู', 'เลขเบิ้ล', 'สองตัวต่ำ', 'สองตัวสูง', 'สองตัวคี่', 'สองตัวคู่', 'พี่น้อง', 'น้องพี่'
                      ].map(txt => (
                        <Button
                          key={txt}
                          variant="outline"
                          className={cn(
                            'text-[14px] h-8',
                            selectedTwoDigitPattern === txt ? 'bg-red-100 border-red-500 dark:bg-red-900 dark:border-red-700' : ''
                          )}
                          onClick={() => {
                            if (selectedPrizeIds.length === 0) {
                              toast.error('กรุณาเลือกประเภทหวยสำหรับชุดเลขนี้');
                              return;
                            }
                            const pattern = txt as TwoDigitPattern;
                            // ถ้าเป็นรูดหน้า/รูดหลัง/19 ประตู ให้ set เป็นรูปแบบที่เลือก
                            if (pattern === 'รูดหน้า' || pattern === 'รูดหลัง' || pattern === '19 ประตู') {
                              setSelectedTwoDigitPattern(pattern);
                              setCurrentInput('');
                            } else {
                              // เช็คว่ามี order ที่ pattern นี้อยู่แล้วหรือไม่
                              const alreadyAdded = orders.some(order => order.pattern === pattern && order.category === 'two');
                              if (alreadyAdded) {
                                if (!window.confirm('มีการเพิ่มรายการนี้ก่อนหน้า ต้องการเพิ่มอีกใช่หรือไม่?')) {
                                  setSelectedTwoDigitPattern('');
                                  return;
                                }
                              }
                              let newOrders: Order[] = [];
                              const generated = generateTwoDigitNumbersByPattern(pattern);
                              selectedPrizeIds.forEach(prizeId => {
                                const prize = prizeInfo.find(p => p.id === prizeId);
                                if (!prize || prize.category !== 'two') return;
                                generated.forEach(order => {
                                  const updatedOrder = updateOrderWithPrizeAndCapStatus(order, prize.id);
                                  newOrders.push({ ...updatedOrder, id: Date.now() + Math.random() });
                                });
                              });
                              setOrders(prev => [...prev, ...newOrders]);
                              setSelectedTwoDigitPattern('');
                              toast.success(`เพิ่มชุด "${pattern}" เรียบร้อยแล้ว`);
                            }
                          }}
                        >
                          {txt}
                        </Button>
                      ))}
                    </div>
                  </details>
                  <div className="grid grid-cols-3 gap-2 md:gap-2">
                    {/* Numbers 1-9 */}
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                      <button
                        key={n}
                        onClick={() => handleNumberPress(n.toString())}
                        className="h-10 md:h-10 bg-background border border-border rounded-lg text-[14px] md:text-lg font-semibold text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-150 active:bg-muted/80 active:scale-95"
                      >
                        {n}
                      </button>
                    ))}

                    {/* Bottom row: ลบล่าสุด, 0, Back arrow */}
                    <button
                      onClick={deleteLastOrder}
                      className="h-10 md:h-10 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 text-[14px] md:text-[14px] font-medium transition-all duration-150 active:bg-red-200 active:scale-95 dark:bg-red-950/50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 dark:active:bg-red-900"
                    >
                      ลบล่าสุด
                    </button>

                    <button
                      onClick={() => handleNumberPress('0')}
                      className="h-10 md:h-10 bg-background border border-border rounded-lg text-[14px] md:text-lg font-semibold text-foreground hover:bg-muted transition-all duration-150 active:bg-muted/80 active:scale-95"
                    >
                      0
                    </button>

                    <button
                      onClick={handleBackspace}
                      className="h-10 md:h-10 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 flex items-center justify-center transition-all duration-150 active:bg-red-200 active:scale-95 dark:bg-red-950/50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 dark:active:bg-red-900"
                    >
                      <ArrowLeft size={20} className="md:w-5 md:h-5" />
                    </button>
                  </div>
                  {/*<div className="flex items-center justify-between mt-3 border-t border-border pt-3">
                  <button className="p-1.5 text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 h-8 w-8"><MoreHorizontal size={16} /></button>
                  <button className="py-1.5 px-3 text-xs text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 h-8">กลับหน้าหลัก</button>
                </div>*/}
                </>
              )}
            </motion.div>
          )}

          {/* Right Panel: Payment - แสดงเมื่อ showRightPanel เป็น false */}
          {!showRightPanel && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="col-span-3 bg-card text-card-foreground px-1 md:px-4 pb-2 md:pb-6 rounded-lg shadow-md flex flex-col"
            >
              <div className="flex items-center justify-between mb-2 border-b border-border pb-1">
                <h2 className="text-xs md:text-lg font-bold text-foreground">{
                  (() => {
                    let title = "ชำระเครดิต";
                    const selectedIds = Array.from(selectedOrderIds);
                    const primaryOrderId = focusedOrderId ?? (selectedIds.length > 0 ? selectedIds[0] : null);

                    if (primaryOrderId !== null) {
                      const order = orders.find(o => o.id === primaryOrderId);
                      if (order) {
                        const prize = prizeInfo.find(p => p.id === order.prizeId);
                        if (prize) {
                          title = prize.display_name;
                        }
                      }
                    }
                    return title;
                  })()
                }</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRightPanel(true)}
                  className="text-muted-foreground hover:text-foreground text-xs md:text-sm px-1"
                >
                  ✕
                </Button>
              </div>

              {/* แสดงเลขที่เลือก */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 mb-2">
                <div className="flex gap-1 justify-center">
                  {(() => {
                    const selectedIds = Array.from(selectedOrderIds);

                    // Priority 1: Multiple items selected
                    if (selectedIds.length > 1) {
                      const countStr = selectedIds.length.toString();
                      return (
                        <motion.div
                          key="item-count"
                          initial={{ opacity: 0, y: 15, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 15, scale: 0.95 }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                          className="flex flex-col items-center justify-center p-3 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800/60 rounded-lg shadow-sm"
                        >
                          <span className="text-[14px] md:text-sm font-semibold text-red-500 dark:text-red-400">
                            จำนวน
                          </span>
                          <span className="text-sm md:text-xl font-bold text-red-700 dark:text-red-200 tracking-tight mt-0.5">
                            รายการ {countStr}
                          </span>
                        </motion.div>
                      );
                    }

                    // Determine which single order to display
                    let orderToShow = null;
                    let source: 'focus' | 'single-select' | 'default' = 'default';

                    if (focusedOrderId !== null) {
                      orderToShow = orders.find(order => order.id === focusedOrderId);
                      source = 'focus';
                    } else if (selectedIds.length === 1) {
                      orderToShow = orders.find(order => order.id === selectedIds[0]);
                      source = 'single-select';
                    } else if (orders.length > 0) {
                      orderToShow = orders[orders.length - 1];
                    }

                    // Render the display for a single order
                    if (orderToShow) {
                      const isSelected = source === 'focus' || source === 'single-select';
                      const bgColor = isSelected ? 'bg-red-200 dark:bg-red-700' : 'bg-gray-200 dark:bg-gray-700';
                      const textColor = isSelected ? 'text-red-800 dark:text-red-200' : 'text-foreground';

                      return orderToShow.numbers.split('').map((digit, index) => (
                        <div key={`${orderToShow?.id}-${index}`} className={`w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center text-base font-bold ${textColor}`}>
                          {digit}
                        </div>
                      ));
                    }

                    // Render placeholder if no orders exist
                    return (
                      <>
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-base font-bold">-</div>
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-base font-bold">-</div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Checkbox สำหรับราคาที่กำหนดให้ทุกหมด */}
              <div className="mb-2">
                <label className="flex items-center gap-1 text-[10px] md:text-sm">
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.size === orders.length && orders.length > 0}
                    onChange={e => handleSelectAllOrders(e.target.checked)}
                    className="w-3 h-3 md:w-4 md:h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2"
                  />
                  เลือกจำนวนทั้งหมด
                </label>
              </div>

              {/* ปุ่มราคาแบบรวดเร็ว */}
              <div className="grid grid-cols-3 gap-1 mb-3">
                {[5, 10, 20, 50, 100].map((price) => (
                  <Button
                    key={price}
                    variant="outline"
                    className="h-7 md:h-14 text-[10px] md:text-lg font-semibold border hover:bg-red-50 hover:border-red-500 hover:text-red-600 px-1"
                    onClick={() => handleQuickPriceSet(price)}
                  >
                    {price}
                  </Button>
                ))}
              </div>

              {/* ช่องระบุจำนวนเอง */}
              <div className="mb-3">
                <label className="block text-[10px] md:text-sm font-medium text-foreground mb-1">ระบุจำนวนเอง</label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    placeholder="จำนวนเงิน"
                    min="1"
                    max="10000"
                    className="flex-1 text-xs px-2 py-1 h-7"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = parseInt((e.target as HTMLInputElement).value);
                        if (value && value > 0) {
                          handleQuickPriceSet(value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    className="h-7 px-2 text-[10px] md:text-sm border hover:bg-red-50 hover:border-red-500 hover:text-red-600"
                    onClick={(e) => {
                      const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
                      const value = parseInt(input?.value || '0');
                      if (value && value > 0) {
                        handleQuickPriceSet(value);
                        input.value = '';
                      } else {
                        toast.error('กรุณาระบุจำนวนเงินที่ถูกต้อง');
                      }
                    }}
                  >
                    ใช้
                  </Button>
                </div>
              </div>

              {/* ช่องกรอกชื่อบิล */}
              <div className="mb-2">
                <label className="block text-[10px] md:text-sm font-medium text-foreground mb-0.5">ชื่อบิล/โพย (ไม่บังคับ)</label>
                <Input
                  type="text"
                  value={billName}
                  onChange={e => setBillName(e.target.value)}
                  placeholder="ระบุชื่อโพย เช่น โพยลูกค้า A"
                  maxLength={50}
                  className="w-full text-xs px-2 py-1 h-7"
                />
              </div>

              {/* สรุปยอดรวม */}
              <div className="mt-auto space-y-2">
                <div className="text-xs md:text-sm space-y-1 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-800">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ราคารวม</span>
                    <span className="font-semibold">{totalPayment.toLocaleString('en-US', { minimumFractionDigits: 0 })} </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">เครดิต</span>
                    <span className="font-semibold text-muted-foreground">{credit?.toLocaleString('en-US', { minimumFractionDigits: 0 }) ?? 'N/A'} </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1 mt-1">
                    <span className="font-bold">คงเหลือ</span>
                    <span className={`font-bold ${isCreditSufficient ? 'text-green-600' : 'text-red-600'}`}>
                      {creditAfterPayment?.toLocaleString('en-US', { minimumFractionDigits: 0 }) ?? 'N/A'} 
                    </span>
                  </div>
                </div>

                {/* ปุ่มดำเนินการ */}
                <div className="mt-4">
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-sm md:text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed relative"
                    disabled={
                      orders.length === 0 ||
                      !isCreditSufficient ||
                      totalPayment === 0 ||
                      isSaving ||
                      !allOrdersHaveAmount
                    }
                    onClick={handleConfirmOrder}
                  >
                    {isSaving && (
                      <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin mr-2" />
                    )}
                    {isSaving ? 'กำลังบันทึก...' : (isCreditSufficient ? 'ยืนยันการสั่งซื้อ' : 'เครดิตไม่พอ')}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isSaving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  กำลังบันทึกรายการ
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                กรุณารอสักครู่... กำลังสร้างรายการสั่งซื้อและเตรียมข้อมูลสรุป
              </div>
              <motion.div 
                className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div 
                  className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialog ยืนยันลบประเภท */}
      <Dialog open={!!confirmDeleteType} onOpenChange={open => { if (!open) setConfirmDeleteType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบรายการ "{confirmDeleteType?.displayName}" ทั้งหมด?</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-foreground">คุณต้องการลบรายการทั้งหมดของประเภทนี้หรือไม่? ข้อมูลจะไม่สามารถกู้คืนได้</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteType(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={() => {
              if (confirmDeleteType) {
                setOrders(prev => prev.filter(order =>
                  !(order.category === confirmDeleteType.category && (confirmDeleteType.pattern === '' || order.pattern === confirmDeleteType.pattern))
                ));
              }
              setConfirmDeleteType(null);
            }}>ลบ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog ยืนยันลบทั้งหมด */}
      <Dialog open={confirmDeleteAll} onOpenChange={open => { if (!open) setConfirmDeleteAll(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบรายการทั้งหมด?</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-foreground">คุณต้องการลบรายการทั้งหมดหรือไม่? ข้อมูลจะไม่สามารถกู้คืนได้</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteAll(false)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={() => {
              setOrders([]);
              setConfirmDeleteAll(false);
            }}>ลบทั้งหมด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LotteryOrderPage;
