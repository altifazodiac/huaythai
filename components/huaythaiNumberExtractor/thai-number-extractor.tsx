"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import type { ToastOptions } from "react-toastify"
import UserDataDisplay from "./user-data-display"
import ImageNumberExtractor from "./image-number-extractor"

// Define interfaces for data structures
interface TwoDigitEntry {
  number: string
  a: string
  b: string | null
  type?: "บน" | "ล่าง"
}

interface ThreeDigitCEntry {
  number: string
  a: string
}

interface ThreeDigitDEntry {
  number: string
  d: string
}

interface UserData {
  [username: string]: {
    twoDigits: TwoDigitEntry[]
    threeDigitsC: ThreeDigitCEntry[]
    threeDigitsD: ThreeDigitDEntry[]
  }
}

function getPermutations(num: string): string[] {
  const digits: string[] = num.split("")
  const perms: Set<string> = new Set()
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        if (i !== j && j !== k && i !== k) {
          const perm: string = digits[i] + digits[j] + digits[k]
          if (perm !== num) perms.add(perm)
        }
      }
    }
  }
  return Array.from(perms)
}

const ThaiNumberExtractor = () => {
  const [inputText, setInputText] = useState<string>("")
  const [userData, setUserData] = useState<UserData>({})
  const [showImageUpload, setShowImageUpload] = useState(false)

  const toastOptions: ToastOptions = {
    position: "top-right",
    autoClose: 3000,
  }

  const extractUserData = (): void => {
    const newUserData: UserData = {}
    const lines: string[] = inputText.trim().split("\n")

    if (lines.length < 1) {
      setUserData({})
      return
    }

    const reserved: string[] = ["บน", "ล่าง", "เต็ง", "โต๊ด"]
    let username = ""
    let currentType: "บน" | "ล่าง" | null = null

    // Find username
    if (!reserved.includes(lines[0].trim())) {
      username = lines[0].trim()
    } else if (!reserved.includes(lines[lines.length - 1].trim())) {
      username = lines[lines.length - 1].trim()
    }

    if (!username) {
      toast.error("กรุณาระบุชื่อผู้ใช้ (ไม่ใช่ บน, ล่าง, เต็ง, โต๊ด)", toastOptions)
      setUserData({})
      return
    }

    newUserData[username] = {
      twoDigits: [],
      threeDigitsC: [],
      threeDigitsD: [],
    }

    const start: number = username === lines[0].trim() ? 1 : 0
    const end: number = username === lines[lines.length - 1].trim() ? lines.length - 1 : lines.length

    // Use Set to store unique entries
    const uniqueTwoDigits = new Set<string>()
    const uniqueThreeDigitsC = new Set<string>()

    for (let i: number = start; i < end; i++) {
      const line: string = lines[i].trim()

      if (line === "บน") {
        currentType = "บน"
        continue
      } else if (line === "ล่าง") {
        currentType = "ล่าง"
        continue
      }

      let number: string | undefined
      let a: string | undefined
      let b: string | null = null

      const fullMatch = line.match(/^(\d{2,3})\s*=\s*(\d+)x(\d+)$/)
      const singleMatch = line.match(/^(\d{2,3})\s*=\s*(\d+)$/)

      if (fullMatch) {
        number = fullMatch[1]
        a = fullMatch[2]
        b = fullMatch[3]
      } else if (singleMatch) {
        number = singleMatch[1]
        a = singleMatch[2]
        b = null
      }

      if (number && a) {
        const uniqueKey = `${number}-${a}-${currentType || ""}`

        if (number.length === 2) {
          if (!uniqueTwoDigits.has(uniqueKey)) {
            uniqueTwoDigits.add(uniqueKey)
            newUserData[username].twoDigits.push({
              number,
              a,
              b,
              type: currentType || undefined,
            })
          }
        } else if (number.length === 3) {
          if (!uniqueThreeDigitsC.has(uniqueKey)) {
            uniqueThreeDigitsC.add(uniqueKey)
            newUserData[username].threeDigitsC.push({ number, a })

            if (b) {
              const permutations = getPermutations(number)
              permutations.forEach((perm) => {
                newUserData[username].threeDigitsD.push({
                  number: perm,
                  d: b,
                })
              })
            }
          }
        }
      }
    }

    setUserData(newUserData)
  }

  // Handle deletion of an entry
  const handleDelete = (username: string, category: "twoDigits" | "threeDigitsC" | "threeDigitsD", index: number) => {
    setUserData((prev) => {
      const newData = { ...prev }
      if (newData[username]) {
        newData[username] = {
          ...newData[username],
          [category]: newData[username][category].filter((_, i) => i !== index),
        }
        // If all categories are empty, remove the user
        if (
          newData[username].twoDigits.length === 0 &&
          newData[username].threeDigitsC.length === 0 &&
          newData[username].threeDigitsD.length === 0
        ) {
          delete newData[username]
        }
      }
      return newData
    })
    toast.success("ลบรายการสำเร็จ", toastOptions)
  }

  useEffect(() => {
    if (inputText) {
      extractUserData()
    } else {
      setUserData({})
    }
  }, [inputText])

  return (
    <main className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-lg mt-6">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">ใส่ข้อความจาก Line ที่นี่</h1>
      <span className="text-sm text-gray-500 block text-center mb-4">(ชื่อผู้ใช้ไม่ใช่ บน, ล่าง, เต็ง, โต๊ด)</span>
      <div className="mb-6">
        <textarea
          value={inputText}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputText(e.target.value)}
          placeholder="วางข้อความจาก Line ที่นี่..."
          rows={10}
          className="w-full p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base resize-y"
        />
      </div>
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setShowImageUpload(!showImageUpload)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {showImageUpload ? "ปิดอัพโหลดรูปภาพ" : "อัพโหลดรูปภาพ"}
        </button>
      </div>

      {showImageUpload && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <ImageNumberExtractor
            onTextExtracted={(text) => {
              setInputText((prev) => (prev ? `${prev}\n${text}` : text))
              setShowImageUpload(false)
            }}
          />
        </div>
      )}
      <div className="flex flex-col gap-6">
        {Object.entries(userData).map(([username, data]) => (
          <UserDataDisplay
            key={username}
            username={username}
            data={data}
            onDelete={(category, index) => handleDelete(username, category, index)}
          />
        ))}
      </div>
    </main>
  )
}

export default ThaiNumberExtractor
