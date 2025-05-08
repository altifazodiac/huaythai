export type LottoOverviewResponse = {
  status: "success" | "crash"
  response: {
    id: string
    url: string
    date: string
  }[]
}

export type LottoDetailResponse = {
  status: "success" | "crash"
  response: {
    date: string
    endpoint: string
    prizes: {
      id: string
      name: string
      reward: string
      amount: number
      number: string[]
    }[]
    runningNumbers: {
      id: string
      name: string
      reward: string
      amount: number
      number: string[]
    }[]
    specialNumbers: {
      lastThreeDigits: {
        id: string
        name: string
        numbers: string[]
      }
      swappedThreeDigits: {
        id: string
        name: string
        numbers: string[]
      }
      lastTwoDigits: {
        id: string
        name: string
        numbers: string[]
      }
      lastOneDigitPrizeFirst: {
        id: string
        name: string
        numbers: string[]
      }
      lastOneDigitBackTwo: {
        id: string
        name: string
        numbers: string[]
      }
    }
  }
}

export type ApiErrorResponse = {
  status: "success" | "crash"
  response: string
}
