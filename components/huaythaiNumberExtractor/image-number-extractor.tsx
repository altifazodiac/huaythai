"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { recognizeThaiText } from "@/lib/ocr-service"
import Image from 'next/image';

interface ImageNumberExtractorProps {
  onTextExtracted: (text: string) => void
}

const ImageNumberExtractor = ({ onTextExtracted }: ImageNumberExtractorProps) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      setIsProcessing(true)
      setErrorMessage(null)
      try {
        const text = await recognizeThaiText(file) // 👈 ใช้แค่นี้ก็พอ
        const extractedText = extractRelevantText(text)

        if (!extractedText) {
          throw new Error("ไม่สามารถแยกข้อความที่เกี่ยวข้องได้")
        }

        onTextExtracted(extractedText)
      } catch (error) {
        console.error("OCR Error:", error)
        setErrorMessage("เกิดข้อผิดพลาดในการแปลงรูปภาพเป็นข้อความ")
      } finally {
        setIsProcessing(false)
        setProgress(0)
      }
    },
    [onTextExtracted],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg"],
    },
    maxFiles: 1,
  })

  const extractRelevantText = (text: string): string => {
    // แบ่งบรรทัดและกรอง
    const lines = text.split("\n")

    // รูปแบบที่ยอมรับ
    const patterns = [
      /^[A-Za-z.]+$/, // ชื่อผู้ใช้ (Mr.Jorn)
      /^\d{2,3}\s*=\s*\d+$/, // เลข 2-3 ตัว (123 = 50)
      /^\d{2,3}\s*=\s*\d+x\d+$/, // เลข 3 ตัวแบบโต๊ด (123 = 50x2)
      /^[บน|ล่าง|เต็ง|โต๊ด]+$/, // ประเภท
    ]

    return lines
      .map((line) => line.trim())
      .filter((line) => {
        // ตรวจสอบว่าตรงกับรูปแบบใดรูปแบบหนึ่ง
        return patterns.some((pattern) => pattern.test(line)) && line.length > 2 // กรองข้อความสั้นเกินไป
      })
      .join("\n")
  }
  
  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer 
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>วางไฟล์ที่นี่...</p>
        ) : (
          <p>ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
        )}
      </div>

      {isProcessing && (
        <div className="text-center py-4">
          <p>กำลังประมวลผลภาพ... {progress}%</p>
          <progress value={progress} max="100" className="w-full h-2 rounded bg-gray-200" />
        </div>
      )}

      {errorMessage && (
        <div className="text-center text-red-500">
          <p>{errorMessage}</p>
        </div>
      )}

      {preview && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">ภาพตัวอย่าง</h3>
          <Image
            src={preview || "/placeholder.svg"}
            alt="Uploaded preview"
            className="max-w-full h-auto rounded-lg border border-gray-200 max-h-60 object-contain"
          />
        </div>
      )}
    </div>
  )
}

export default ImageNumberExtractor
