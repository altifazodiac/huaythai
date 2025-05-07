import Tesseract from "tesseract.js"

/**
 * Recognizes Thai text from an image file using Tesseract OCR
 * @param file The image file to process
 * @returns A promise that resolves to the recognized text
 */
export async function recognizeThaiText(file: File): Promise<string> {
  try {
    const result = await Tesseract.recognize(file, "tha+eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          // You can use this to update progress if needed
          const progress = Math.round(m.progress * 100)
          // Update progress state if needed
        }
      },
    })

    return result.data.text
  } catch (error) {
    console.error("OCR Error:", error)
    throw new Error("Failed to recognize text from image")
  }
}

/**
 * Extracts numbers from Thai text
 * @param text The text to extract numbers from
 * @returns An array of extracted numbers
 */
export function extractNumbers(text: string): string[] {
  // Match patterns like "123 = 50" or "123 = 50x20"
  const numberPattern = /(\d{2,3})\s*=\s*\d+(?:x\d+)?/g
  const matches = text.match(numberPattern) || []

  return matches.map((match) => {
    const parts = match.split("=")
    return parts[0].trim()
  })
}

/**
 * Processes an image file to extract Thai lottery numbers
 * @param file The image file to process
 * @returns A promise that resolves to the extracted numbers and their values
 */
export async function processLotteryImage(file: File): Promise<{
  numbers: string[]
  text: string
}> {
  const text = await recognizeThaiText(file)
  const numbers = extractNumbers(text)

  return {
    numbers,
    text,
  }
}
