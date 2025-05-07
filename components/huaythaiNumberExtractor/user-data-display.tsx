"use client"

import type React from "react"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Trash2 } from 'lucide-react'

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

interface UserDataEntry {
  twoDigits: TwoDigitEntry[]
  threeDigitsC: ThreeDigitCEntry[]
  threeDigitsD: ThreeDigitDEntry[]
}

interface UserDataDisplayProps {
  username: string
  data: UserDataEntry
  onDelete: (category: "twoDigits" | "threeDigitsC" | "threeDigitsD", index: number) => void
}

const UserDataDisplay = ({ username, data, onDelete }: UserDataDisplayProps) => {
  // Separate top and bottom two-digit entries
  const topTwoDigits = data.twoDigits.filter((item) => item.type === "บน" || !item.type)
  const bottomTwoDigits = data.twoDigits.filter((item) => item.type === "ล่าง")

  return (
    <div className="bg-gradient-to-b from-gray-100 to-gray-50 py-6 sm:py-8 lg:py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header Card */}
        <Card className="mb-6 border-none shadow-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-2xl overflow-hidden">
          <CardHeader className="py-4">
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">{username}</CardTitle>
          </CardHeader>
        </Card>

        {/* Data Sections */}
        <div className="space-y-6">
          {/* เลขบน */}
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow rounded-lg bg-white">
            <CardHeader className="pb-3">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                เลขบน <span className="text-sm text-gray-500">({topTwoDigits.length})</span>
              </h3>
            </CardHeader>
            <CardContent className="pt-0">
              {topTwoDigits.length > 0 ? (
                <ul className="space-y-2">
                  {topTwoDigits.map((item, index) => (
                    <li
                      key={`top-${index}`}
                      className="flex items-center justify-between p-3 bg-teal-50 rounded-md hover:bg-teal-100 transition-colors"
                    >
                      <span className="text-sm font-medium text-teal-900">
                        {item.number}: {item.a}฿
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-100"
                        onClick={() => onDelete("twoDigits", index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">ไม่มีเลขบน</p>
              )}
            </CardContent>
          </Card>

          {/* เลขล่าง */}
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow rounded-lg bg-white">
            <CardHeader className="pb-3">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                เลขล่าง <span className="text-sm text-gray-500">({bottomTwoDigits.length})</span>
              </h3>
            </CardHeader>
            <CardContent className="pt-0">
              {bottomTwoDigits.length > 0 ? (
                <ul className="space-y-2">
                  {bottomTwoDigits.map((item, index) => (
                    <li
                      key={`bottom-${index}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {item.number}: {item.a}฿
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-100"
                        onClick={() => onDelete("twoDigits", data.twoDigits.indexOf(item))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">ไม่มีเลขล่าง</p>
              )}
            </CardContent>
          </Card>

          <Separator className="my-4 bg-gray-200" />

          {/* เลขเต็ง */}
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow rounded-lg bg-white">
            <CardHeader className="pb-3">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                เลขเต็ง <span className="text-sm text-gray-500">({data.threeDigitsC.length})</span>
              </h3>
            </CardHeader>
            <CardContent className="pt-0">
              {data.threeDigitsC.length > 0 ? (
                <ul className="space-y-2">
                  {data.threeDigitsC.map((item, index) => (
                    <li
                      key={`c-${index}`}
                      className="flex items-center justify-between p-3 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
                    >
                      <span className="text-sm font-medium text-green-900">
                        {item.number}: {item.a}฿
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-100"
                        onClick={() => onDelete("threeDigitsC", index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">ไม่มีเลขเต็ง</p>
              )}
            </CardContent>
          </Card>

          {/* เลขโต๊ด */}
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow rounded-lg bg-white">
            <CardHeader className="pb-3">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                เลขโต๊ด <span className="text-sm text-gray-500">({data.threeDigitsD.length})</span>
              </h3>
            </CardHeader>
            <CardContent className="pt-0">
              {data.threeDigitsD.length > 0 ? (
                <ul className="space-y-2">
                  {data.threeDigitsD.map((item, index) => (
                    <li
                      key={`d-${index}`}
                      className="flex items-center justify-between p-3 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
                    >
                      <span className="text-sm font-medium text-purple-900">
                        {item.number}: {item.d}฿
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-100"
                        onClick={() => onDelete("threeDigitsD", index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">ไม่มีเลขโต๊ด</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default UserDataDisplay
