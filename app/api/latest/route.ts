import { NextResponse } from "next/server"
import { load } from "cheerio"
import type { CheerioAPI } from "cheerio"
import type { LottoDetailResponse, ApiErrorResponse } from "@/types/lottery"
import { parse, format } from "date-fns"
import { th } from "date-fns/locale"
import { createClient } from "@supabase/supabase-js"

// สร้าง Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

const supabase = createClient(supabaseUrl, supabaseKey)

// ข้อมูล mapping ระหว่าง API response กับ ticket_sub_types
const SUB_TYPE_MAPPING = {
  lastThreeDigits: "4e9ab25a-57f4-4c80-af65-b3eef322a908", // สามตัวบน
  runningNumberFrontThree: "8667f23d-d61d-41a7-8a30-6acd4d1b27cb", // สามตัวหน้า
  runningNumberBackThree: "cbab55e1-4585-45d3-937e-f0fba24f52f9", // สามตัวหลัง
  swappedThreeDigits: "0638ce4b-cedb-41ff-ad18-b2c12a8b3a0c", // สามตัวโต๊ด
  lastTwoDigits: "d4a2746f-1cc6-4dba-a6f4-c852846df2c4", // สองตัวบน
  runningNumberBackTwo: "fca10de7-c4c4-451f-86d9-a3b78824c8f0", // สองตัวล่าง
  lastOneDigitPrizeFirst: "6b0540fd-cc70-457a-9457-7af8858ac9da", // วิ่งบน
  lastOneDigitBackTwo: "3374feb6-04b2-4990-85e5-b456ba9616e9", // วิ่งล่าง
}

const scrapeText = (cheerio: CheerioAPI) => (selector: string) =>
  cheerio(selector)
    .map((_, el) => cheerio(el).text())
    .toArray()

const generateSwappedThreeDigits = (number: string): string[] => {
  const results: string[] = []
  const digits = number.split("")

  // Original number
  results.push(number)

  // All possible permutations for 3 digits (excluding original)
  const permutations = [
    [digits[1], digits[0], digits[2]].join(""),
    [digits[2], digits[0], digits[1]].join(""),
    [digits[0], digits[2], digits[1]].join(""),
    [digits[1], digits[2], digits[0]].join(""),
    [digits[2], digits[1], digits[0]].join(""),
  ]

  // Add unique permutations, excluding original if already added
  permutations.forEach((perm) => {
    if (!results.includes(perm)) {
      results.push(perm)
    }
  })

  return results
}

const getLatestLotteryId = async () => {
  try {
    const response = await fetch(`https://news.sanook.com/lotto/archive/page/1`)
    if (!response.ok) {
      throw new Error(`Failed to fetch lottery archive: ${response.status}`)
    }
    const html = await response.text()
    const $ = load(html)

    const latest =
      $("div.box-cell.box-cell--lotto.content > div > div > div > article.archive--lotto")
        .first()
        .find("div > div > a")
        .attr("href")
        ?.split("/")[5] || ""

    if (!latest) {
      throw new Error("Could not find latest lottery ID")
    }

    return latest
  } catch (error) {
    console.error("Error getting latest lottery ID:", error)
    throw error
  }
}

// บันทึกข้อมูลลงใน Supabase
async function saveLotteryResultsToSupabase(date: string, endpoint: string, responseData: any) {
  try {
    console.log("Saving lottery results to Supabase...")

    // ตรวจสอบว่าตาราง lottery_draws และ lottery_results มีอยู่หรือไม่
    try {
      const { error: tableCheckError } = await supabase
        .from("lottery_draws")
        .select("id", { count: "exact", head: true })

      if (tableCheckError) {
        console.error("Table check error:", tableCheckError)
        return {
          success: false,
          error: "Tables do not exist. Please run setup first.",
          details: tableCheckError.message,
        }
      }
    } catch (tableError) {
      console.error("Table check error:", tableError)
      return {
        success: false,
        error: "Failed to check tables",
        details: tableError instanceof Error ? tableError.message : String(tableError),
      }
    }

    // ตรวจสอบว่ามีข้อมูลงวดนี้อยู่แล้วหรือไม่
    const { data: existingDraw, error: checkError } = await supabase
      .from("lottery_draws")
      .select("id")
      .eq("draw_date", date)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking existing draw:", checkError)
      return {
        success: false,
        error: "Failed to check existing draw",
        details: checkError.message,
      }
    }

    if (existingDraw) {
      console.log("Draw already exists, using existing draw ID:", existingDraw.id)
      // ไม่ต้องลบ/insert ซ้ำ
      return { success: true, drawId: existingDraw.id }
    } else {
      // 1. บันทึกข้อมูลงวด
      const { data: drawData, error: drawError } = await supabase
        .from("lottery_draws")
        .insert({ draw_date: date, endpoint })
        .select()
        .single()

      if (drawError) {
        console.error("Error inserting draw:", drawError)
        return {
          success: false,
          error: "Failed to insert draw",
          details: drawError.message,
        }
      }

      const drawId = drawData.id
      console.log("Created new draw with ID:", drawId)

      // 2. บันทึกผลรางวัลแต่ละประเภท
      const resultsToInsert = []

      // ดึงข้อมูลจาก specialNumbers
      if (responseData.specialNumbers) {
        // สามตัวบน
        if (responseData.specialNumbers.lastThreeDigits?.numbers) {
          for (const number of responseData.specialNumbers.lastThreeDigits.numbers) {
            resultsToInsert.push({
              draw_id: drawId,
              sub_type_id: "4e9ab25a-57f4-4c80-af65-b3eef322a908", // สามตัวบน
              number,
            })
          }
        }

        // สามตัวโต๊ด
        if (responseData.specialNumbers.swappedThreeDigits?.numbers) {
          for (const number of responseData.specialNumbers.swappedThreeDigits.numbers) {
            resultsToInsert.push({
              draw_id: drawId,
              sub_type_id: "0638ce4b-cedb-41ff-ad18-b2c12a8b3a0c", // สามตัวโต๊ด
              number,
            })
          }
        }

        // สองตัวบน
        if (responseData.specialNumbers.lastTwoDigits?.numbers) {
          for (const number of responseData.specialNumbers.lastTwoDigits.numbers) {
            resultsToInsert.push({
              draw_id: drawId,
              sub_type_id: "d4a2746f-1cc6-4dba-a6f4-c852846df2c4", // สองตัวบน
              number,
            })
          }
        }

        // วิ่งบน
        if (responseData.specialNumbers.lastOneDigitPrizeFirst?.numbers) {
          for (const number of responseData.specialNumbers.lastOneDigitPrizeFirst.numbers) {
            resultsToInsert.push({
              draw_id: drawId,
              sub_type_id: "6b0540fd-cc70-457a-9457-7af8858ac9da", // วิ่งบน
              number,
            })
          }
        }

        // วิ่งล่าง
        if (responseData.specialNumbers.lastOneDigitBackTwo?.numbers) {
          for (const number of responseData.specialNumbers.lastOneDigitBackTwo.numbers) {
            resultsToInsert.push({
              draw_id: drawId,
              sub_type_id: "3374feb6-04b2-4990-85e5-b456ba9616e9", // วิ่งล่าง
              number,
            })
          }
        }
      }

      // ดึงข้อมูลจาก runningNumbers
      if (responseData.runningNumbers) {
        for (const runningNumber of responseData.runningNumbers) {
          if (runningNumber.id === "runningNumberFrontThree" && runningNumber.number) {
            for (const number of runningNumber.number) {
              resultsToInsert.push({
                draw_id: drawId,
                sub_type_id: "8667f23d-d61d-41a7-8a30-6acd4d1b27cb", // สามตัวหน้า
                number,
              })
            }
          } else if (runningNumber.id === "runningNumberBackThree" && runningNumber.number) {
            for (const number of runningNumber.number) {
              resultsToInsert.push({
                draw_id: drawId,
                sub_type_id: "cbab55e1-4585-45d3-937e-f0fba24f52f9", // สามตัวหลัง
                number,
              })
            }
          } else if (runningNumber.id === "runningNumberBackTwo" && runningNumber.number) {
            for (const number of runningNumber.number) {
              resultsToInsert.push({
                draw_id: drawId,
                sub_type_id: "fca10de7-c4c4-451f-86d9-a3b78824c8f0", // สองตัวล่าง
                number,
              })
            }
          }
        }
      }

      console.log(`Inserting ${resultsToInsert.length} lottery results...`)

      // บันทึกผลรางวัลทั้งหมด
      if (resultsToInsert.length > 0) {
        // แบ่งการบันทึกเป็นชุดๆ ละ 100 รายการ เพื่อป้องกันการเกิด error จากการบันทึกข้อมูลมากเกินไป
        const chunkSize = 100
        for (let i = 0; i < resultsToInsert.length; i += chunkSize) {
          const chunk = resultsToInsert.slice(i, i + chunkSize)
          const { error: resultsError } = await supabase.from("lottery_results").insert(chunk)

          if (resultsError) {
            console.error("Error inserting results:", resultsError)
            return {
              success: false,
              error: "Failed to insert results",
              details: resultsError.message,
            }
          }
        }
      }

      console.log("Successfully saved lottery results to Supabase")
      return { success: true, drawId }
    }
  } catch (error) {
    console.error("Error saving to Supabase:", error)
    return {
      success: false,
      error: "Unexpected error saving to Supabase",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function GET() {
  let response: LottoDetailResponse | ApiErrorResponse
  try {
    console.log("Fetching latest lottery results...")

    // ตรวจสอบการเชื่อมต่อ Supabase
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables")
      response = {
        status: "crash",
        response: "Missing Supabase environment variables",
      }
      return NextResponse.json(response, { status: 500 })
    }

    const id = await getLatestLotteryId()
    if (!id) {
      response = {
        status: "crash",
        response: "could not find latest lottery",
      }
      return NextResponse.json(response, { status: 404 })
    }

    console.log("Latest lottery ID:", id)
    const url = `https://news.sanook.com/lotto/check/${id}`

    const fetchResponse = await fetch(url)
    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch lottery data: ${fetchResponse.status}`)
    }

    const html = await fetchResponse.text()
    const $ = load(html)
    const scraper = scrapeText($)

    // Extract and parse date
    const rawDate = $("#contentPrint > header > h2")
      .text()
      .substring($("#contentPrint > header > h2").text().indexOf(" ") + 1)
      .trim()

    console.log("Raw date:", rawDate)

    let date: string
    try {
      // Parse Thai date (e.g., "16 พฤษภาคม 2568") to ISO format (e.g., "2025-05-16")
      const parsedDate = parse(rawDate, "d MMMM yyyy", new Date(), { locale: th })
      if (isNaN(parsedDate.getTime())) {
        throw new Error("Invalid date parsed")
      }
      date = format(parsedDate, "yyyy-MM-dd")
      console.log("Parsed date:", date)
    } catch (error) {
      console.error("Date parsing error:", error, "Raw date:", rawDate)
      response = {
        status: "crash",
        response: "invalid date format",
      }
      return NextResponse.json(response, { status: 400 })
    }

    const [
      prizeFirst,
      prizeFirstNear,
      prizeSecond,
      prizeThird,
      prizeForth,
      prizeFifth,
      runningNumberFrontThree,
      runningNumberBackThree,
      runningNumberBackTwo,
    ] = await Promise.all([
      scraper(
        "#contentPrint > div.lottocheck__resize > div.lottocheck__sec.lottocheck__sec--bdnone > div.lottocheck__table > div:nth-child(1) > strong.lotto__number",
      ),
      scraper(
        "#contentPrint > div.lottocheck__resize > div.lottocheck__sec.lottocheck__sec--bdnone > div.lottocheck__sec--nearby > strong.lotto__number",
      ),
      scraper("#contentPrint > div.lottocheck__resize > div:nth-child(2) > div > span.lotto__number"),
      scraper("#contentPrint > div.lottocheck__resize > div:nth-child(3) > div > span"),
      scraper(
        "#contentPrint > div.lottocheck__resize > div.lottocheck__sec.lottocheck__sec--font-mini.lottocheck__sec--bdnoneads > div.lottocheck__box-item > span.lotto__number",
      ),
      scraper("#contentPrint > div.lottocheck__resize > div:nth-child(7) > div > span.lotto__number"),
      scraper(
        "#contentPrint > div.lottocheck__resize > div.lottocheck__sec.lottocheck__sec--bdnone > div.lottocheck__table > div:nth-child(2) > strong.lotto__number",
      ),
      scraper(
        "#contentPrint > div.lottocheck__resize > div.lottocheck__sec.lottocheck__sec--bdnone > div.lottocheck__table > div:nth-child(3) > strong.lotto__number",
      ),
      scraper(
        "#contentPrint > div.lottocheck__resize > div.lottocheck__sec.lottocheck__sec--bdnone > div.lottocheck__table > div:nth-child(4) > strong.lotto__number",
      ),
    ])

    console.log("Scraped data:", {
      prizeFirst,
      runningNumberFrontThree,
      runningNumberBackThree,
      runningNumberBackTwo,
    })

    // Extract last three, two, and one digits from prizeFirst
    const lastThreeDigits = prizeFirst.map((num) => num.slice(-3))
    const lastTwoDigits = prizeFirst.map((num) => num.slice(-2))
    const lastOneDigitPrizeFirst = prizeFirst.map((num) => num.slice(-1))

    // Extract last one digit from runningNumberBackTwo
    const lastOneDigitBackTwo = runningNumberBackTwo.map((num) => num.slice(-1))

    // Generate swapped three-digit numbers
    const swappedThreeDigits = lastThreeDigits.flatMap((num) => generateSwappedThreeDigits(num))

    const responseData = {
      date,
      endpoint: url,
      prizes: [
        {
          id: "prizeFirst",
          name: "รางวัลที่ 1",
          reward: "6000000",
          amount: prizeFirst.length,
          number: prizeFirst,
        },
        {
          id: "prizeFirstNear",
          name: "รางวัลข้างเคียงรางวัลที่ 1",
          reward: "100000",
          amount: prizeFirstNear.length,
          number: prizeFirstNear,
        },
        {
          id: "prizeSecond",
          name: "รางวัลที่ 2",
          reward: "200000",
          amount: prizeSecond.length,
          number: prizeSecond,
        },
        {
          id: "prizeThird",
          name: "รางวัลที่ 3",
          reward: "80000",
          amount: prizeThird.length,
          number: prizeThird,
        },
        {
          id: "prizeForth",
          name: "รางวัลที่ 4",
          reward: "40000",
          amount: prizeForth.length,
          number: prizeForth,
        },
        {
          id: "prizeFifth",
          name: "รางวัลที่ 5",
          reward: "20000",
          amount: prizeFifth.length,
          number: prizeFifth,
        },
      ],
      runningNumbers: [
        {
          id: "runningNumberFrontThree",
          name: "รางวัลเลขหน้า 3 ตัว",
          reward: "4000",
          amount: runningNumberFrontThree.length,
          number: runningNumberFrontThree,
        },
        {
          id: "runningNumberBackThree",
          name: "รางวัลเลขท้าย 3 ตัว",
          reward: "4000",
          amount: runningNumberBackThree.length,
          number: runningNumberBackThree,
        },
        {
          id: "runningNumberBackTwo",
          name: "รางวัลเลขท้าย 2 ตัว",
          reward: "2000",
          amount: runningNumberBackTwo.length,
          number: runningNumberBackTwo,
        },
      ],
      specialNumbers: {
        lastThreeDigits: {
          id: "lastThreeDigits",
          name: "เลขท้าย 3 ตัวของรางวัลที่ 1",
          numbers: lastThreeDigits,
        },
        swappedThreeDigits: {
          id: "swappedThreeDigits",
          name: "เลขท้าย 3 ตัวสลับตำแหน่งของรางวัลที่ 1",
          numbers: swappedThreeDigits,
        },
        lastTwoDigits: {
          id: "lastTwoDigits",
          name: "เลขท้าย 2 ตัวของรางวัลที่ 1",
          numbers: lastTwoDigits,
        },
        lastOneDigitPrizeFirst: {
          id: "lastOneDigitPrizeFirst",
          name: "เลขท้าย 1 ตัวของรางวัลที่ 1",
          numbers: lastOneDigitPrizeFirst,
        },
        lastOneDigitBackTwo: {
          id: "lastOneDigitBackTwo",
          name: "เลขท้าย 1 ตัวของเลขท้าย 2 ตัว",
          numbers: lastOneDigitBackTwo,
        },
      },
    }

    // บันทึกข้อมูลลงใน Supabase
    const saveResult = await saveLotteryResultsToSupabase(date, url, responseData)

    // ส่งข้อมูลกลับไปยัง client
    response = {
      status: "success",
      response: responseData,
      dbSaved: saveResult.success,
      dbDetails: saveResult.success ? undefined : saveResult.error,
    }

    return NextResponse.json(response)
  } catch (e) {
    console.error("API error:", e)
    response = {
      status: "crash",
      response: "api cannot fulfill your request at this time",
      details: e instanceof Error ? e.message : String(e),
    }
    return NextResponse.json(response, { status: 500 })
  }
}

