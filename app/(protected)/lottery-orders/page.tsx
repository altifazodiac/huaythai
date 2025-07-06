"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Trash2, ArrowLeft, MoreHorizontal, Calendar, Hash, Tag, TicketIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { countryFlagImg } from "@/lib/utils/flags";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// Define types for orders
type OrderCategory = 'three' | 'two' | 'run';

// Define special pattern types for Thai lottery
type ThreeDigitPattern = 'ตอง' | 'เลขหาม' | 'เบิ้ลหน้า' | 'เบิ้ลหลัง' | 'เลขเบิ้ลพี่น้อง' | 'ชุดเรียง' | '';
type TwoDigitPattern = 'รูดหน้า' | 'รูดหลัง' | '19 ประตู' | 'เลขเบิ้ล' | 'สองตัวต่ำ' | 'สองตัวสูง' | 'สองตัวคี่' | 'สองตัวคู่' | 'พี่น้อง' | 'น้องพี่' | '';

interface Order {
  id: number;
  numbers: string;
  category: OrderCategory;
  pattern?: ThreeDigitPattern | TwoDigitPattern;
  isSpecialPattern?: boolean;
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
  drawing_time: string;
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
 

const LotteryOrderPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // Handle URL parameters from LotteryTypeGrid
    const [initialState] = useState(() => {
        const subType = searchParams.get('subType') ? Number(searchParams.get('subType')) : undefined;
        const drawParam = searchParams.get('draw');
        const drawRaw = drawParam ? JSON.parse(decodeURIComponent(drawParam)) : undefined;
        const draw = drawRaw ? normalizeDraw(drawRaw) : undefined;
        return { subType, draw };
    });
    
    // Supabase client
    const [supabase] = useState(() =>
        createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    );
    
    // Lottery data states
    const [subTypeObj, setSubTypeObj] = useState<LotterySubType | null>(null);
    const [selectedDraw, setSelectedDraw] = useState<AvailableDraw | null>(initialState.draw || null);
    const [selectedDrawDate, setSelectedDrawDate] = useState<Date | null>(initialState.draw?.date || null);
    const [loading, setLoading] = useState(false);
    
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

    useEffect(() => {
        const fetchPrizeData = async () => {
            if (initialState.subType) {
                const { data, error } = await supabase
                    .from('lottery_sub_number')
                    .select('id, digit_number, type_number, price_paid')
                    .eq('lottery_sub_type_id', initialState.subType);

                if (error) {
                    console.error('Error fetching prize data:', error);
                    setPrizeInfo([]);
                } else if (data) {
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
                    setPrizeInfo(mappedData);
                }
            }
        };
        fetchPrizeData();
    }, [initialState.subType, supabase]);
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
        
        // เลขเบิ้ลพี่น้อง: เลขที่มีตัวเลขที่ติดกันหรือใกล้เคียงกันเป็นคู่
        const digit1 = parseInt(number[0]);
        const digit2 = parseInt(number[1]);
        const digit3 = parseInt(number[2]);
        
        // เบิ้ลพี่น้องติดกัน: เช่น 112, 223, 334 หรือ 211, 322, 433
        if ((digit1 === digit2 && Math.abs(digit2 - digit3) === 1) || 
            (digit2 === digit3 && Math.abs(digit1 - digit2) === 1)) {
            return 'เลขเบิ้ลพี่น้อง';
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
                        pattern: 'ตอง',
                        isSpecialPattern: true
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
                                id: Date.now() + i*10 + j,
                                numbers: num,
                                category: 'three',
                                pattern: 'เลขหาม',
                                isSpecialPattern: true
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
                                id: Date.now() + i*10 + j,
                                numbers: num,
                                category: 'three',
                                pattern: 'เบิ้ลหน้า',
                                isSpecialPattern: true
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
                                id: Date.now() + i*10 + j,
                                numbers: num,
                                category: 'three',
                                pattern: 'เบิ้ลหลัง',
                                isSpecialPattern: true
                            });
                        }
                    }
                }
                break;
                
            case 'เลขเบิ้ลพี่น้อง':
                // สร้างเลขเบิ้ลพี่น้อง
                for (let i = 0; i <= 9; i++) {
                    for (let j = 0; j <= 9; j++) {
                        if (Math.abs(i - j) === 1) {
                            // เบิ้ลพี่น้องแบบ 112, 223, etc.
                            const num1 = `${i}${i}${j}`;
                            // เบิ้ลพี่น้องแบบ 122, 233, etc.
                            const num2 = `${i}${j}${j}`;
                            
                            newOrders.push({
                                id: Date.now() + i*10 + j,
                                numbers: num1,
                                category: 'three',
                                pattern: 'เลขเบิ้ลพี่น้อง',
                                isSpecialPattern: true
                            });
                            
                            newOrders.push({
                                id: Date.now() + i*10 + j + 100,
                                numbers: num2,
                                category: 'three',
                                pattern: 'เลขเบิ้ลพี่น้อง',
                                isSpecialPattern: true
                            });
                        }
                    }
                }
                break;
                
            case 'ชุดเรียง':
                // สร้างเลขเรียง
                for (let i = 0; i <= 7; i++) {
                    // เรียงจากน้อยไปมาก
                    const numAsc = `${i}${i+1}${i+2}`;
                    newOrders.push({
                        id: Date.now() + i,
                        numbers: numAsc,
                        category: 'three',
                        pattern: 'ชุดเรียง',
                        isSpecialPattern: true
                    });
                    
                    // เรียงจากมากไปน้อย
                    if (i >= 2) {
                        const numDesc = `${i}${i-1}${i-2}`;
                        newOrders.push({
                            id: Date.now() + i + 100,
                            numbers: numDesc,
                            category: 'three',
                            pattern: 'ชุดเรียง',
                            isSpecialPattern: true
                        });
                    }
                }
                // เพิ่มเลขเรียงที่เหลือ
                newOrders.push({
                    id: Date.now() + 8,
                    numbers: '890',
                    category: 'three',
                    pattern: 'ชุดเรียง',
                    isSpecialPattern: true
                });
                newOrders.push({
                    id: Date.now() + 9,
                    numbers: '901',
                    category: 'three',
                    pattern: 'ชุดเรียง',
                    isSpecialPattern: true
                });
                newOrders.push({
                    id: Date.now() + 10,
                    numbers: '098',
                    category: 'three',
                    pattern: 'ชุดเรียง',
                    isSpecialPattern: true
                });
                newOrders.push({
                    id: Date.now() + 11,
                    numbers: '109',
                    category: 'three',
                    pattern: 'ชุดเรียง',
                    isSpecialPattern: true
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
                            pattern: 'รูดหน้า',
                            isSpecialPattern: true
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
                            pattern: 'รูดหลัง',
                            isSpecialPattern: true
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
                                pattern: '19 ประตู',
                                isSpecialPattern: true
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
                                pattern: '19 ประตู',
                                isSpecialPattern: true
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
                        pattern: 'เลขเบิ้ล',
                        isSpecialPattern: true
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
                        pattern: 'สองตัวต่ำ',
                        isSpecialPattern: true
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
                        pattern: 'สองตัวสูง',
                        isSpecialPattern: true
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
                            pattern: 'สองตัวคี่',
                            isSpecialPattern: true
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
                            pattern: 'สองตัวคู่',
                            isSpecialPattern: true
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
                        pattern: 'พี่น้อง',
                        isSpecialPattern: true
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
                        pattern: 'น้องพี่',
                        isSpecialPattern: true
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
        if (displayName.includes('เลขเบิ้ลพี่น้อง')) return 'เลขเบิ้ลพี่น้อง';
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
        if (selectedPrizeIds.length > 0) {
            const newOrders: Order[] = [];
            selectedPrizeIds.forEach(prizeId => {
                const prize = prizeInfo.find(p => p.id === prizeId);
                if (!prize) return;
                newOrders.push({
                    id: Date.now() + Math.random(),
                    numbers: inputNumber,
                    category: prize.category as OrderCategory,
                    pattern: mapPrizeDisplayNameToPattern(prize.display_name),
                    isSpecialPattern: false,
                });
            });
            setOrders(prev => [...prev, ...newOrders]);
        } else {
            setOrders(prev => [
                ...prev,
                {
                    id: Date.now(),
                    numbers: inputNumber,
                    category: activeDigitTab,
                    pattern: activeDigitTab === 'three' ? identifyThreeDigitPattern(inputNumber) : '',
                    isSpecialPattern: false,
                },
            ]);
        }
    };

    const handleNumberPress = (num: string) => {
        if (currentInput.length < maxDigits) {
            const newInput = currentInput + num;
            setCurrentInput(newInput);
            if (newInput.length === maxDigits) {
                setTimeout(() => {
                    // เฉพาะรูดหน้า/รูดหลัง/19 ประตู
                    if (activeDigitTab === 'two' && (selectedTwoDigitPattern === 'รูดหน้า' || selectedTwoDigitPattern === 'รูดหลัง' || selectedTwoDigitPattern === '19 ประตู')) {
                        const newOrders = generateTwoDigitNumbersByPattern(selectedTwoDigitPattern, newInput);
                        setOrders(prev => [...prev, ...newOrders]);
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

    const renderInputBoxes = () => {
        const boxes = [];
        for (let i = 0; i < maxDigits; i++) {
            boxes.push(
                <div key={i} className="w-14 h-14 bg-gray-100 border-2 border-gray-200 rounded-md flex items-center justify-center text-2xl font-bold text-gray-700">
                    {currentInput[i] || ''}
                </div>
            );
        }
        return boxes;
    };

    const orderListContainerRef = useRef<HTMLDivElement>(null);
    const lastCardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (lastCardRef.current) {
            lastCardRef.current.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' });
        }
    }, [orders, selectedPrizeIds]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
        <header  className="bg-red-800 dark:bg-red-700 rounded-t-xl shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                           <TicketIcon className="w-12 h-12 text-red-100" />
                            <h1 className="text-sm md:text-lg font-bold text-white">สร้างรายการหวย</h1>
                        </div>
                        {subTypeObj && (
                            <div className="flex items-center gap-2 ml-4">
                                 {subTypeObj.country_origin && (
                            <img src={countryFlagImg(subTypeObj.country_origin)} alt={subTypeObj.country_origin} className="h-10 w-10 rounded-full object-cover border border-gray-300" />
                          )}
                                  <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold">
                                <span className="text-sm font-medium">{subTypeObj.sub_type_name}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {selectedDraw && (
                            <div className="text-sm text-white">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>งวด: {format(selectedDraw.date, 'd MMM yy', { locale: th })}</span>
                                </div>
                                <div className="text-xs opacity-90">
                                    เวลา: {selectedDraw.schedule.drawing_time}
                                </div>
                            </div>
                        )}
                         
                    </div>
                </div>
                {subTypeObj && selectedDraw && (
                    <div className="border-t border-red-500 py-2">
                        <div className="text-sm opacity-90 text-white">
                            กรอกรายการเลขเพื่อเพิ่มรายการสำหรับหวย 
                        </div>
                    </div>
                )}
            </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

                {/* Left Panel: Order List */}
                <div className="lg:col-span-3 bg-white p-4 rounded-lg shadow-md flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-gray-800">{orders.length} รายการ</h2>
                        <div>
                            <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteAll(true)} disabled={orders.length === 0} className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed">
                                ลบทั้งหมด <Badge variant="destructive" className="ml-2">{orders.length}</Badge>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={deleteLastOrder} disabled={orders.length === 0} className="text-red-600 hover:text-red-800 ml-2 disabled:text-gray-400 disabled:cursor-not-allowed">
                                ลบล่าสุด <Badge variant="destructive" className="ml-2">1</Badge>
                            </Button>
                        </div>
                    </div>
                    
                    <div
                      ref={orderListContainerRef}
                      className="flex flex-row gap-4 overflow-x-auto max-w-full pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                      style={{ WebkitOverflowScrolling: 'touch' }}
                    >
                      {selectedPrizeIds.length > 0 ? (
                        selectedPrizeIds.map((prizeId, idx) => {
                          const prize = prizeInfo.find((p) => p.id === prizeId);
                          if (!prize) return null;
                          const filteredOrders = orders.filter(order => {
                            if (order.category !== prize.category) return false;
                            const pattern = mapPrizeDisplayNameToPattern(prize.display_name);
                            if (pattern !== '') {
                                return order.pattern === pattern;
                            }
                            return true;
                          });
                          if (filteredOrders.length === 0) return null;
                          const isLast = idx === selectedPrizeIds.length - 1;
                          return (
                            <div key={prize.id} ref={isLast ? lastCardRef : undefined} className="min-w-[280px] flex-shrink-0">
                              <Card className="shadow-lg border border-red-100">
                                <CardHeader
                                  className="flex flex-row items-center justify-between space-y-0 pb-1 p-2 rounded-t-lg bg-gradient-to-r from-red-500 to-yellow-400 min-h-0"
                                >
                                  <div className="flex flex-col items-start">
                                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                      <span>{prize.display_name}</span>
                                      <span className="text-xs bg-white/30 text-white px-2 py-0.5 rounded-full font-semibold ml-2">x{prize.prize_rate}</span>
                                    </CardTitle>
                                    <Badge variant="destructive" className="mt-1 text-xs bg-white/80 text-red-700 border-none px-2 py-0.5 rounded-full">
                                      {filteredOrders.length} รายการ
                                    </Badge>
                                  </div>
                                  <div className="bg-red-500 border border-red-500 rounded-full w-8 h-8 flex items-center justify-center p-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label="ลบทั้งหมดของประเภทนี้"
                                      className="text-white hover:text-red-600"
                                      onClick={() => {
                                        const pattern = mapPrizeDisplayNameToPattern(prize.display_name);
                                        setConfirmDeleteType({ category: prize.category as OrderCategory, pattern, displayName: prize.display_name });
                                      }}
                                    >
                                      <Trash2 size={18} />
                                    </Button>
                                  </div>
                                    </CardHeader>
                                    <CardContent className="p-0 max-h-[calc(90vh-320px)] overflow-y-auto">
                                        <ul className="overflow-y-auto">
                                    {filteredOrders.map((order, index) => (
                                                <li key={order.id} className={`flex items-center justify-between px-3 py-1 hover:bg-gray-50 ${order.isSpecialPattern ? 'bg-yellow-50' : ''}`}>
                                                    <div className="flex items-center">
                                                        <span className="text-gray-500 w-6 text-sm">{index + 1}.</span>
                                                        <div className="flex gap-1">
                                                            {order.numbers.split('').map((num, i) => (
                                                                <span key={i} className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-800 font-medium rounded-sm">{num}</span>
                                                            ))}
                                            {order.pattern && (
                                              <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                                                {order.pattern}
                                              </span>
                                            )}
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" onClick={() => deleteOrder(order.id)} className="w-8 h-8 text-gray-400 hover:text-red-500">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>
                          );
                        })
                        ) : (
                        <div className="text-center py-10 text-gray-500 w-full">
                                ยังไม่มีรายการ
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Input */}
                <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-md flex flex-col">
                    {/* Main Tabs */}
                    <div className="flex border-b border-gray-200">
                        <button onClick={() => { setActiveMainTab('manual'); setSelectedDigitForTwoPattern(''); setSelectedTwoDigitPattern(''); }} className={`py-1.5 px-3 text-xs font-medium ${activeMainTab === 'manual' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>กดเลือกเอง</button>
                        <button onClick={() => { setActiveMainTab('set'); setSelectedDigitForTwoPattern(''); setSelectedTwoDigitPattern(''); }} className={`py-1.5 px-3 text-xs font-medium ${activeMainTab === 'set' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>ชุดตัวเลข</button>
                        <button onClick={() => { setActiveMainTab('vin'); setSelectedDigitForTwoPattern(''); setSelectedTwoDigitPattern(''); }} className={`py-1.5 px-3 text-xs font-medium ${activeMainTab === 'vin' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>จับวิน</button>
                    </div>

                    {/* Sub Tabs */}
                    <div className="flex justify-center bg-gray-100 p-0.5 rounded-md my-2">
                        <button onClick={() => { setActiveDigitTab('three'); setCurrentInput(''); setSelectedDigitForTwoPattern(''); setSelectedTwoDigitPattern(''); }} className={`w-full py-1.5 px-2 text-xs rounded-md ${activeDigitTab === 'three' ? 'bg-white shadow font-semibold text-gray-800' : 'text-gray-600'}`}>สามตัว</button>
                        <button onClick={() => { setActiveDigitTab('two'); setCurrentInput(''); setSelectedDigitForTwoPattern(''); setSelectedTwoDigitPattern(''); }} className={`w-full py-1.5 px-2 text-xs rounded-md ${activeDigitTab === 'two' ? 'bg-white shadow font-semibold text-gray-800' : 'text-gray-600'}`}>สองตัว</button>
                        <button onClick={() => { setActiveDigitTab('run'); setCurrentInput(''); setSelectedDigitForTwoPattern(''); setSelectedTwoDigitPattern(''); }} className={`w-full py-1.5 px-2 text-xs rounded-md ${activeDigitTab === 'run' ? 'bg-white shadow font-semibold text-gray-800' : 'text-gray-600'}`}>เลขวิ่ง</button>
                    </div>

                    {/* ชุดตัวเลข */}
                    {activeMainTab === 'set' ? (
                      <div className="flex flex-col gap-2">
                        {/* กลับเลข และรางวัล */}
                        <div className="flex items-center gap-4 mb-1">
                          <div className="flex-1 flex items-center">
                            <input type="checkbox" id="reverse" checked={isReversed} onChange={(e) => setIsReversed(e.target.checked)} className="h-3 w-3 text-red-600 border-gray-300 rounded focus:ring-red-500" />
                            <label htmlFor="reverse" className="ml-1.5 block text-xs text-gray-900">กลับเลข</label>
                          </div>
                        </div>
                        {/* ปุ่มรางวัลบน/ล่าง/โต๊ด */}
                        <div className="flex flex-col-2 gap-1.5 mt-1.5 ">
                          {prizeInfo
                            .filter((prize) => prize.category === activeDigitTab)
                            .map((prize) => (
                              <Button
                                key={prize.id}
                                variant={selectedPrizeIds.includes(prize.id) ? "secondary" : "outline"}
                                className={cn(
                                  "flex-1 w-full flex flex-row justify-center border-red-200 bg-red-50 text-red-900 h-12 text-xs gap-x-1 text-sm h-8",
                                  selectedPrizeIds.includes(prize.id) ? "border-2 border-red-500 bg-red-100" : ""
                                )}
                                onClick={() => {
                                  setSelectedPrizeIds((prev) =>
                                    prev.includes(prize.id)
                                      ? prev.filter((id) => id !== prize.id)
                                      : [...prev, prize.id]
                                  );
                                }}
                              >
                                <span>{prize.display_name}</span>
                                <span className="text-[9px] font-bold whitespace-nowrap">x{prize.prize_rate}</span>
                              </Button>
                            ))}
                        </div>
                        {/* ตัวเลือกเพิ่มเติม */}
                        <details className="mb-1.5" open={isMoreOptionsOpen} onToggle={(e) => setIsMoreOptionsOpen(e.currentTarget.open)}>
                          <summary className="font-bold text-xs mb-0.5 cursor-pointer">
                            {isMoreOptionsOpen ? 'ปิดตัวเลือกเพิ่มเติม' : 'เปิดตัวเลือกเพิ่มเติม'}
                          </summary>
                          <div className="grid grid-cols-3 gap-1.5 mt-1">
                            {activeDigitTab === 'three' && [
                              'ตอง','เลขหาม', 'เบิ้ลหน้า', 'เบิ้ลหลัง', 'เลขเบิ้ลพี่น้อง', 'ชุดเรียง'
                            ].map((txt, idx) => (
                              <Button 
                                key={txt} 
                                variant="outline" 
                                className={`text-sm h-8 w-full ${selectedPattern === txt ? 'bg-red-100 border-red-500' : ''} ${idx === 0 ? 'col-span-0' : ''}`}
                                onClick={() => {
                                  const pattern = txt as ThreeDigitPattern;
                                  const newOrders = generateNumbersByPattern(pattern);
                                  setOrders(prev => [...prev, ...newOrders]);
                                  setSelectedPattern(pattern);
                                }}
                              >{txt}</Button>
                            ))}
                            {activeDigitTab === 'two' && [
                              'รูดหน้า', 'รูดหลัง', '19 ประตู', 'เลขเบิ้ล', 'สองตัวต่ำ', 'สองตัวสูง', 'สองตัวคี่', 'สองตัวคู่', 'พี่น้อง', 'น้องพี่'
                            ].map(txt => (
                                <Button 
                                  key={txt} 
                                  variant="outline" 
                                  className="text-[9px] h-8"
                                  onClick={() => {
                                    const pattern = txt as TwoDigitPattern;
                                    let newOrders: Order[] = [];
                                    
                                    // สำหรับรูดหน้า, รูดหลัง, 19 ประตู ต้องมีตัวเลขเลือก
                                    if (pattern === 'รูดหน้า' || pattern === 'รูดหลัง' || pattern === '19 ประตู') {
                                      if (selectedDigitForTwoPattern) {
                                        newOrders = generateTwoDigitNumbersByPattern(pattern, selectedDigitForTwoPattern);
                                      } else {
                                        // ถ้าไม่มีตัวเลขเลือก ให้เลือกทุกตัวเลข 0-9
                                        for (let digit = 0; digit <= 9; digit++) {
                                          newOrders.push(...generateTwoDigitNumbersByPattern(pattern, digit.toString()));
                                        }
                                      }
                                    } else {
                                      // สำหรับรูปแบบอื่น ๆ ที่ไม่ต้องการตัวเลขเลือก
                                      newOrders = generateTwoDigitNumbersByPattern(pattern);
                                    }
                                    
                                    setOrders(prev => [...prev, ...newOrders]);
                                  }}
                                >{txt}</Button>
                            ))}
                          </div>
                        </details>
                        {/* Number Pad */}
                        <div className="flex flex-col gap-2">
                          {activeDigitTab === 'three' && (
                            <>
                              {/* Header Filter */}
                              <div className="flex flex-wrap gap-1 mb-1.5">
                                {Array.from({length: 10}, (_, i) => i*100).map(base => (
                                  <Button
                                    key={base}
                                    variant={threeDigitFilter === base ? "secondary" : "outline"}
                                    className={`h-7 w-12 text-[10px] font-mono px-0.5 ${threeDigitFilter === base ? 'border-red-400 bg-red-50 text-red-900' : ''}`}
                                    onClick={() => setThreeDigitFilter(base)}
                                  >{base.toString().padStart(3, '0')}</Button>
                                ))}
                              </div>
                              <div className="border-t my-1" />
                              <div className="overflow-y-auto max-h-60 pr-1">
                                <div className="grid grid-cols-5 gap-1.5">
                                  {Array.from({length: 100}, (_, i) => threeDigitFilter + i)
                                    .filter(num => num <= 999)
                                    .map(num => {
                                      const val = num.toString().padStart(3, '0');
                                      return (
                                        <Button
                                          key={val}
                                          variant="outline"
                                          className={`h-8 text-xs font-mono justify-center ${
                                            isNumberSelected(val, 'three') ? 'border-red-500 border-2' : ''
                                          }`}
                                          onClick={() => {
                                            handleAddOrder(val);
                                          }}
                                        >{val}</Button>
                                      );
                                    })}
                                </div>
                              </div>
                            </>
                          )}
                          
                          {activeDigitTab === 'two' && (
                            <>
                              {/* Digit Selection for Two Digit Patterns */}
                              <div className="mb-2">
                                <div className="text-xs text-gray-600 mb-1">เลือกตัวเลขสำหรับรูด (หรือไม่เลือกเพื่อใช้ทุกตัว):</div>
                                <div className="flex gap-1 mb-2">
                                  <Button 
                                    variant={selectedDigitForTwoPattern === '' ? "secondary" : "outline"}
                                    className="h-6 w-10 text-xs"
                                    onClick={() => setSelectedDigitForTwoPattern('')}
                                  >ทุกตัว</Button>
                                  {Array.from({length: 10}, (_, i) => i).map(digit => (
                                    <Button
                                      key={digit}
                                      variant={selectedDigitForTwoPattern === digit.toString() ? "secondary" : "outline"}
                                      className="h-6 w-6 text-xs"
                                      onClick={() => setSelectedDigitForTwoPattern(digit.toString())}
                                    >{digit}</Button>
                                  ))}
                                </div>
                                {selectedDigitForTwoPattern && (
                                  <div className="text-xs text-red-600 bg-red-50 p-1 rounded">
                                    เลือกตัวเลข: {selectedDigitForTwoPattern}
                                  </div>
                                )}
                              </div>
                              <div className="border-t my-1" />
                            <div className="overflow-y-auto max-h-60 pr-1">
                              <div className="grid grid-cols-5 gap-1.5">
                                {Array.from({length: 100}, (_, num) => 
                                  num.toString().padStart(2, '0')
                                ).map((num) => (
                                  <Button
                                    key={num}
                                    variant="outline"
                                    className={cn(
  'h-8 text-xs font-mono justify-center transition-all duration-200 transform hover:scale-105 hover:bg-red-50',
  isNumberSelected(num, 'two') ? 'border-red-500 border-2' : 'hover:border-red-300',
  'active:scale-95 active:bg-red-100'
)}
                                    onClick={() => {
                                        handleAddOrder(num);
                                    }}
                                  >{num}</Button>
                                ))}
                              </div>
                            </div>
                            </>
                          )}
                          
                          {activeDigitTab === 'run' && (
                            <div className="grid grid-cols-5 gap-2">
                              {Array.from({length: 10}, (_, i) => i).map(num => (
                                <Button
                                  key={num}
                                  variant="outline"
                                  className={`h-8 text-xs font-mono justify-center ${
                                    isNumberSelected(num.toString(), 'run') ? 'border-red-500 border-2' : ''
                                  }`}
                                  onClick={() => {
                                    handleAddOrder(num.toString());
                                  }}
                                >{num}</Button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* ปุ่มล่าง */}
                        <div className="flex items-center justify-between mt-3 border-t border-gray-200 pt-3">
                          <Button variant="outline" className="p-1.5 text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 h-8"><MoreHorizontal size={16} /></Button>
                          <Button variant="outline" className="py-1.5 px-3 text-xs text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 h-8">กลับหน้าหลัก</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="my-1.5 ">
                          <div className="flex items-center">
                            <input type="checkbox" id="reverse" checked={isReversed} onChange={(e) => setIsReversed(e.target.checked)} className="h-3 w-3 text-red-600 border-gray-300 rounded focus:ring-red-500" />
                            <label htmlFor="reverse" className="ml-1.5 block text-xs text-gray-900">กลับเลข</label>
                          </div>
                          <div className="flex flex-row gap-1.5 mt-1.5 w-full">
  {prizeInfo
    .filter((prize) => prize.category === activeDigitTab)
    .map((prize) => (
      <Button
        key={prize.id}
        variant={selectedPrizeIds.includes(prize.id) ? "secondary" : "outline"}
        className={cn(
          "flex-1 flex flex-row justify-between border-red-200 bg-red-50 text-red-900 h-12 text-xs gap-x-1 text-sm h-8",
          selectedPrizeIds.includes(prize.id) ? "border-2 border-red-500 bg-red-100" : ""
        )}
        onClick={() => {
          setSelectedPrizeIds((prev) =>
            prev.includes(prize.id)
              ? prev.filter((id) => id !== prize.id)
              : [...prev, prize.id]
          );
        }}
      >
        <span>{prize.display_name}</span>
        <span className="text-[9px] font-bold whitespace-nowrap">x{prize.prize_rate}</span>
      </Button>
    ))}
</div>
                        </div>
                         
                        <div className="flex-grow flex flex-col items-center justify-center">
                          {/* แสดงข้อมูลรูปแบบที่เลือก */}
                          {selectedTwoDigitPattern && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2 text-center">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-blue-800">
                                    รูปแบบที่เลือก: {selectedTwoDigitPattern}
                                  </div>
                                  <div className="text-xs text-blue-600 mt-1">
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
                                  className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
                                >
                                  ×
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex justify-center gap-1.5 my-3">
                            {renderInputBoxes()}
                          </div>
                        </div>
                        {/* ตัวเลือกเพิ่มเติม */}
                        {activeMainTab === 'manual' && (
                          <details className="mb-1.5" open={isMoreOptionsOpen} onToggle={(e) => setIsMoreOptionsOpen(e.currentTarget.open)}>
                            <summary className="font-bold text-xs mb-0.5 cursor-pointer">
                              {isMoreOptionsOpen ? 'ปิดตัวเลือกเพิ่มเติม' : 'เปิดตัวเลือกเพิ่มเติม'}
                            </summary>
                            <div className="grid grid-cols-3 gap-1.5 mt-1">
                              {activeDigitTab === 'three' && [
                                'ตอง','เลขหาม', 'เบิ้ลหน้า', 'เบิ้ลหลัง', 'เลขเบิ้ลพี่น้อง',  'ชุดเรียง'
                              ].map((txt, idx) => (
                                <Button 
                                  key={txt} 
                                  variant="outline" 
                                  className={cn(
  'text-[12px] bg-red-50 h-8 transition-all duration-200',
  selectedPattern === txt ? 'bg-red-100 border-red-500' : 'hover:bg-red-100 hover:border-red-300',
  idx === 0 ? 'col-span-0' : '',
  'active:bg-red-200 active:scale-95'
)}
                                  onClick={() => {
                                    const pattern = txt as ThreeDigitPattern;
                                    const newOrders = generateNumbersByPattern(pattern);
                                    setOrders(prev => [...prev, ...newOrders]);
                                    setSelectedPattern(pattern);
                                  }}
                                >{txt}</Button>
                              ))}
                              {activeDigitTab === 'two' && [
                                'รูดหน้า', 'รูดหลัง', '19 ประตู', 'เลขเบิ้ล', 'สองตัวต่ำ', 'สองตัวสูง', 'สองตัวคี่', 'สองตัวคู่', 'พี่น้อง', 'น้องพี่'
                              ].map(txt => (
                                <Button 
                                  key={txt} 
                                  variant="outline" 
                                  className={cn(
                                    'text-[12px] h-8',
                                    selectedTwoDigitPattern === txt ? 'bg-red-100 border-red-500' : ''
                                  )}
                                  onClick={() => {
                                    const pattern = txt as TwoDigitPattern;
                                    
                                    // ถ้าเป็นรูดหน้า/รูดหลัง/19 ประตู ให้ set เป็นรูปแบบที่เลือก
                                    if (pattern === 'รูดหน้า' || pattern === 'รูดหลัง' || pattern === '19 ประตู') {
                                      setSelectedTwoDigitPattern(pattern);
                                      setCurrentInput(''); // ล้างกล่องป้อน
                                    } else {
                                      // สำหรับรูปแบบอื่น ๆ ให้ทำงานแบบเดิม
                                      let newOrders: Order[] = [];
                                      newOrders = generateTwoDigitNumbersByPattern(pattern);
                                      setOrders(prev => [...prev, ...newOrders]);
                                    }
                                  }}
                                >{txt}</Button>
                              ))}
                            </div>
                          </details>
                        )}
                        <div className="grid grid-cols-3 gap-2">
                          {[...'123456789'].map(n => 
                            <button key={n} onClick={() => handleNumberPress(n)} className="py-2 bg-white border border-gray-200 rounded-lg text-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 h-10 transition-all duration-150 active:bg-gray-100 active:scale-95">{n}</button>
                          )}
                          <button onClick={handleClearLastInput} className="py-2 bg-red-50 border-red-200 text-red-600 rounded-lg hover:bg-red-100 text-[10px] h-10 transition-all duration-150 active:bg-red-200 active:scale-95">ลบล่าสุด</button>
                          <button onClick={() => handleNumberPress('0')} className="py-2 bg-white border border-gray-200 rounded-lg text-lg text-gray-700 hover:bg-gray-50 h-10">0</button>
                          <button onClick={handleBackspace} className="py-2 bg-red-50 border-red-200 text-red-600 rounded-lg hover:bg-red-100 flex items-center justify-center h-10 transition-all duration-150 active:bg-red-200 active:scale-95">
                            <ArrowLeft size={20} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-3 border-t border-gray-200 pt-3">
                          <button className="p-1.5 text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 h-8 w-8"><MoreHorizontal size={16} /></button>
                          <button className="py-1.5 px-3 text-xs text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 h-8">กลับหน้าหลัก</button>
                        </div>
                      </>
                    )}
                </div>
            </div>
        </main>
        {/* Dialog ยืนยันลบประเภท */}
        <Dialog open={!!confirmDeleteType} onOpenChange={open => { if (!open) setConfirmDeleteType(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ยืนยันการลบรายการ "{confirmDeleteType?.displayName}" ทั้งหมด?</DialogTitle>
            </DialogHeader>
            <div className="py-2 text-sm text-gray-700">คุณต้องการลบรายการทั้งหมดของประเภทนี้หรือไม่? ข้อมูลจะไม่สามารถกู้คืนได้</div>
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
            <div className="py-2 text-sm text-gray-700">คุณต้องการลบรายการทั้งหมดหรือไม่? ข้อมูลจะไม่สามารถกู้คืนได้</div>
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
