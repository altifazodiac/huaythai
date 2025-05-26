import { Suspense } from "react";
import LotteryTicketPage from "./LotteryTicketPage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LotteryTicketPage />
    </Suspense>
  );
} 