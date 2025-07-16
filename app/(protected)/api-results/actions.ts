"use server";

import { revalidatePath } from "next/cache";

export async function reloadLotteryResults() {
  try {
    const apiKey = process.env.INTERNAL_API_KEY;
    if (!apiKey) {
      throw new Error("API key is not configured on the server.");
    }
    
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/import-lottery-results`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ action: "scrape_and_import" }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return { success: false, message: data.message || "Failed to trigger reload." };
    }
    
    revalidatePath("/api-results");
    
    return { success: true, message: "Successfully reloaded lottery results." };

  } catch (error) {
    console.error("Error reloading lottery results:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message };
  }
} 