"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LottoDetailResponse } from "@/types/lottery";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DirectionProvider } from "@radix-ui/react-direction";

export default function LatestResultsPage() {
  const [latestLottery, setLatestLottery] = useState<LottoDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestLottery = async () => {
      try {
        const response = await fetch('/api/latest');
        if (!response.ok) throw new Error('Failed to fetch latest lottery');
        const data: LottoDetailResponse = await response.json();
        setLatestLottery(data);
      } catch (error) {
        setError('Failed to load latest lottery results. Please try again later.');
        console.error("Failed to fetch latest lottery:", error);
      }
    };
    fetchLatestLottery();
  }, []);

  if (error) return <div className="container mx-auto p-4 text-red-500">{error}</div>;
  if (!latestLottery) return <div className="container mx-auto p-4">Loading...</div>;

  return (
    <DirectionProvider dir="ltr">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/">แดชบอร์ด</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>ผลสลากกินแบ่งล่าสุด</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">ผลสลากกินแบ่งล่าสุด</h1>
            <Card>
              <CardHeader>
                <CardTitle>ผลรางวัลวันที่: {latestLottery.response.date}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">สามตัวบน</h3>
                    <p className="text-lg">
                      {latestLottery.response.specialNumbers?.lastThreeDigits?.numbers.join(', ') || 'N/A'}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold">สองตัวบน</h3>
                    <p className="text-lg">
                      {latestLottery.response.specialNumbers?.lastTwoDigits?.numbers.join(', ') || 'N/A'}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold">สองตัวล่าง</h3>
                    <p className="text-lg">
                      {latestLottery.response.runningNumbers.find(r => r.id === 'runningNumberBackTwo')?.number.join(', ') || 'N/A'}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold">สามตัวหน้า</h3>
                    <p className="text-lg">
                      {latestLottery.response.runningNumbers.find(r => r.id === 'runningNumberFrontThree')?.number.join(', ') || 'N/A'}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold">สามตัวหลัง</h3>
                    <p className="text-lg">
                      {latestLottery.response.runningNumbers.find(r => r.id === 'runningNumberBackThree')?.number.join(', ') || 'N/A'}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold">สามตัวโต๊ด</h3>
                    <p className="text-lg">
                      {latestLottery.response.specialNumbers?.swappedThreeDigits?.numbers.join(', ') || 'N/A'}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold">วิ่งบน</h3>
                    <p className="text-lg">
                      {latestLottery.response.specialNumbers?.lastOneDigitPrizeFirst?.numbers.join(', ') || 'N/A'}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold">วิ่งล่าง</h3>
                    <p className="text-lg">
                      {latestLottery.response.specialNumbers?.lastOneDigitBackTwo?.numbers.join(', ') || 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DirectionProvider>
  );
}