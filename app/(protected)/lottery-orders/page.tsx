"use client";

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Trash2, ArrowLeft, MoreHorizontal, Calendar, Hash, Tag, TicketIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { countryFlagImg } from "@/lib/utils/flags";

// Define types for orders
type OrderCategory = 'three' | 'two' | 'run';

interface Order {
  id: number;
  numbers: string;
  category: OrderCategory;
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
    const [isReversed, setIsReversed] = useState(false);
    // สำหรับ filter สามตัว
    const [threeDigitFilter, setThreeDigitFilter] = useState(0);

    // ตรวจสอบว่าเลขนี้ถูกเลือกไปแล้วหรือไม่
    const isNumberSelected = (num: string, category: OrderCategory) => {
      return orders.some(order => 
        order.numbers === num && order.category === category
      );
    };

    const maxDigits = useMemo(() => {
        if (activeDigitTab === 'three') return 3;
        if (activeDigitTab === 'two') return 2;
        return 1; // for 'run'
    }, [activeDigitTab]);

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

    const handleNumberPress = (num: string) => {
        if (currentInput.length < maxDigits) {
            const newInput = currentInput + num;
            setCurrentInput(newInput);

            if (newInput.length === maxDigits) {
                // Use a timeout to allow the user to see the last digit before it's added.
                setTimeout(() => {
                    const newOrder: Order = {
                        id: Date.now(),
                        numbers: newInput,
                        category: activeDigitTab,
                    };
                    setOrders(prev => [...prev, newOrder]);
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
                <div className="lg:col-span-3 bg-white p-4 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-gray-800">{orders.length} รายการ</h2>
                        <div>
                            <Button variant="ghost" size="sm" onClick={deleteAllOrders} disabled={orders.length === 0} className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed">
                                ลบทั้งหมด <Badge variant="destructive" className="ml-2">{orders.length}</Badge>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={deleteLastOrder} disabled={orders.length === 0} className="text-red-600 hover:text-red-800 ml-2 disabled:text-gray-400 disabled:cursor-not-allowed">
                                ลบล่าสุด <Badge variant="destructive" className="ml-2">1</Badge>
                            </Button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.keys(groupedOrders).length > 0 ? (
                            (Object.keys(groupedOrders) as OrderCategory[]).map(category => (
                                <Card key={category}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                                        <CardTitle className="text-sm font-medium text-blue-800">{categoryNames[category]}</CardTitle>
                                        <Badge variant="outline" className="text-blue-600">[{groupedOrders[category].length} รายการ]</Badge>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <ul>
                                            {groupedOrders[category].map((order, index) => (
                                                <li key={order.id} className="flex items-center justify-between px-3 py-1 hover:bg-gray-50">
                                                    <div className="flex items-center">
                                                        <span className="text-gray-500 w-6 text-sm">{index + 1}.</span>
                                                        <div className="flex gap-1">
                                                            {order.numbers.split('').map((num, i) => (
                                                                <span key={i} className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-800 font-medium rounded-sm">{num}</span>
                                                            ))}
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
                            ))
                        ) : (
                            <div className="md:col-span-2 lg:col-span-3 text-center py-10 text-gray-500">
                                ยังไม่มีรายการ
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Input */}
                <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-md flex flex-col">
                    {/* Main Tabs */}
                    <div className="flex border-b border-gray-200">
                        <button onClick={() => setActiveMainTab('manual')} className={`py-1.5 px-3 text-xs font-medium ${activeMainTab === 'manual' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>กดเลือกเอง</button>
                        <button onClick={() => setActiveMainTab('set')} className={`py-1.5 px-3 text-xs font-medium ${activeMainTab === 'set' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>ชุดตัวเลข</button>
                        <button onClick={() => setActiveMainTab('vin')} className={`py-1.5 px-3 text-xs font-medium ${activeMainTab === 'vin' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>จับวิน</button>
                    </div>

                    {/* Sub Tabs */}
                    <div className="flex justify-center bg-gray-100 p-0.5 rounded-md my-2">
                        <button onClick={() => { setActiveDigitTab('three'); setCurrentInput(''); }} className={`w-full py-1.5 px-2 text-xs rounded-md ${activeDigitTab === 'three' ? 'bg-white shadow font-semibold text-gray-800' : 'text-gray-600'}`}>สามตัว</button>
                        <button onClick={() => { setActiveDigitTab('two'); setCurrentInput(''); }} className={`w-full py-1.5 px-2 text-xs rounded-md ${activeDigitTab === 'two' ? 'bg-white shadow font-semibold text-gray-800' : 'text-gray-600'}`}>สองตัว</button>
                        <button onClick={() => { setActiveDigitTab('run'); setCurrentInput(''); }} className={`w-full py-1.5 px-2 text-xs rounded-md ${activeDigitTab === 'run' ? 'bg-white shadow font-semibold text-gray-800' : 'text-gray-600'}`}>เลขวิ่ง</button>
                    </div>

                    {/* ชุดตัวเลข */}
                    {activeMainTab === 'set' ? (
                      <div className="flex flex-col gap-2">
                        {/* กลับเลข และรางวัล */}
                        <div className="flex items-center gap-4 mb-1">
                          <div className="flex-1 flex items-center">
                            <input type="checkbox" id="reverse" checked={isReversed} onChange={(e) => setIsReversed(e.target.checked)} className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                            <label htmlFor="reverse" className="ml-1.5 block text-xs text-gray-900">กลับเลข</label>
                          </div>
                        </div>
                        {/* ปุ่มรางวัลบน/ล่าง/โต๊ด */}
                        <div className="flex gap-1.5 mb-1.5">
                          {activeDigitTab === 'three' && (
                            <>
                              <Button variant="outline" className="flex-1 flex flex-col items-center justify-center border-blue-200 bg-blue-50 text-blue-900 h-12 text-xs">สามตัวบน <span className="text-[9px] font-bold">x900</span></Button>
                              <Button variant="outline" className="flex-1 flex flex-col items-center justify-center border-blue-200 bg-blue-50 text-blue-900 h-12 text-xs">สามตัวโต๊ด <span className="text-[9px] font-bold">x120</span></Button>
                            </>
                          )}
                          {activeDigitTab === 'two' && (
                            <>
                              <Button variant="outline" className="flex-1 flex flex-col items-center justify-center border-blue-200 bg-blue-50 text-blue-900 h-12 text-xs">สองตัวบน <span className="text-[9px] font-bold">x90</span></Button>
                              <Button variant="outline" className="flex-1 flex flex-col items-center justify-center border-blue-200 bg-blue-50 text-blue-900 h-12 text-xs">สองตัวล่าง <span className="text-[9px] font-bold">x90</span></Button>
                            </>
                          )}
                          {activeDigitTab === 'run' && (
                            <>
                              <Button variant="outline" className="flex-1 flex flex-col items-center justify-center border-blue-200 bg-blue-50 text-blue-900 h-12 text-xs">วิ่งบน <span className="text-[9px] font-bold">x3</span></Button>
                              <Button variant="outline" className="flex-1 flex flex-col items-center justify-center border-blue-200 bg-blue-50 text-blue-900 h-12 text-xs">วิ่งล่าง <span className="text-[9px] font-bold">x4</span></Button>
                            </>
                          )}
                        </div>
                        {/* ตัวเลือกเพิ่มเติม (mock UI) */}
                        <details className="mb-1.5" open>
                          <summary className="font-bold text-xs mb-0.5 cursor-pointer">ปิดตัวเลือกเพิ่มเติม</summary>
                          <div className="grid grid-cols-3 gap-1.5 mt-1">
                            {activeDigitTab === 'three' && [
                              'เลขหาม', 'เบิ้ลหน้า', 'เบิ้ลหลัง', 'เลขเบิ้ลพี่น้อง', 'ตอง', 'ชุดเรียง'
                            ].map((txt, idx) => (
                              <Button key={txt} variant="outline" className={`text-[9px] h-8 ${idx === 0 ? 'col-span-2' : ''}`}>{txt}</Button>
                            ))}
                            {activeDigitTab === 'two' && [
                              'รูดหน้า', 'รูดหลัง', '19 ประตู', 'เลขเบิ้ล', 'สองตัวต่ำ', 'สองตัวสูง', 'สองตัวคี่', 'สองตัวคู่', 'พี่น้อง', 'น้องพี่'
                            ].map(txt => (
                              <Button key={txt} variant="outline" className="text-[9px] h-8">{txt}</Button>
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
                                    className={`h-7 w-12 text-[10px] font-mono px-0.5 ${threeDigitFilter === base ? 'border-blue-400 bg-blue-50 text-blue-900' : ''}`}
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
                                            setOrders(prev => [...prev, {id: Date.now(), numbers: val, category: 'three'}]);
                                          }}
                                        >{val}</Button>
                                      );
                                    })}
                                </div>
                              </div>
                            </>
                          )}
                          
                          {activeDigitTab === 'two' && (
                            <div className="overflow-y-auto max-h-60 pr-1">
                              <div className="grid grid-cols-5 gap-1.5">
                                {Array.from({length: 100}, (_, num) => 
                                  num.toString().padStart(2, '0')
                                ).map((num) => (
                                  <Button
                                    key={num}
                                    variant="outline"
                                    className={`h-8 text-xs font-mono justify-center ${
                                      isNumberSelected(num, 'two') ? 'border-red-500 border-2' : ''
                                    }`}
                                    onClick={() => {
                                      setOrders(prev => [...prev, {
                                        id: Date.now(),
                                        numbers: num,
                                        category: 'two'
                                      }]);
                                    }}
                                  >{num}</Button>
                                ))}
                              </div>
                            </div>
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
                                    setOrders(prev => [...prev, {id: Date.now(), numbers: num.toString(), category: 'run'}]);
                                  }}
                                >{num}</Button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* ปุ่มล่าง */}
                        <div className="flex items-center justify-between mt-3 border-t border-gray-200 pt-3">
                          <Button variant="outline" className="p-1.5 text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 h-8 w-8"><MoreHorizontal size={16} /></Button>
                          <Button variant="outline" className="py-1.5 px-3 text-xs text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 h-8">กลับหน้าหลัก</Button>
                          <Button className="py-1.5 px-6 text-xs bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 h-8">ใส่ราคา</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="my-1.5">
                          <div className="flex items-center">
                            <input type="checkbox" id="reverse" checked={isReversed} onChange={(e) => setIsReversed(e.target.checked)} className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                            <label htmlFor="reverse" className="ml-1.5 block text-xs text-gray-900">กลับเลข</label>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                            <button className="text-left p-1.5 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 h-10">
                              <span className="text-xs font-semibold text-blue-800">สามตัวบน</span>
                              <span className="text-[9px] text-blue-600 float-right font-bold">x900</span>
                            </button>
                            <button className="text-left p-1.5 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 h-10">
                              <span className="text-xs font-semibold text-blue-800">สามตัวโต๊ด</span>
                              <span className="text-[9px] text-blue-600 float-right font-bold">x120</span>
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-600 my-1.5">ดูตัวเลือกเพิ่มเติม</div>
                        <div className="flex-grow flex flex-col items-center justify-center">
                          <div className="flex justify-center gap-1.5 my-3">
                            {renderInputBoxes()}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[...'123456789'].map(n => 
                            <button key={n} onClick={() => handleNumberPress(n)} className="py-2 bg-white border border-gray-200 rounded-lg text-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 h-10">{n}</button>
                          )}
                          <button onClick={handleClearLastInput} className="py-2 bg-red-50 border-red-200 text-red-600 rounded-lg hover:bg-red-100 text-[10px] h-10">ลบล่าสุด</button>
                          <button onClick={() => handleNumberPress('0')} className="py-2 bg-white border border-gray-200 rounded-lg text-lg text-gray-700 hover:bg-gray-50 h-10">0</button>
                          <button onClick={handleBackspace} className="py-2 bg-red-50 border-red-200 text-red-600 rounded-lg hover:bg-red-100 flex items-center justify-center h-10">
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
    </div>
  );
};

export default LotteryOrderPage;
