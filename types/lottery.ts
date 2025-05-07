export interface LottoOverviewResponse {
    status: string;
    response: {
      id: string;
      url: string;
      date: string;
    }[];
  }
  
  export interface LottoDetailResponse {
    status: 'success';
    response: {
      date: string;
      endpoint: string;
      prizes: {
        id: string;
        name: string;
        reward: string;
        amount: number;
        number: string[];
      }[];
      runningNumbers: {
        id: string;
        name: string;
        reward: string;
        amount: number;
        number: string[];
      }[];
      specialNumbers: {
        lastThreeDigits: {
          id: string;
          name: string;
          numbers: string[];
        };
        swappedThreeDigits: {
          id: string;
          name: string;
          numbers: string[];
        };
        lastTwoDigits: {
          id: string;
          name: string;
          numbers: string[];
        };
        lastOneDigitPrizeFirst: {
          id: string;
          name: string;
          numbers: string[];
        };
        lastOneDigitBackTwo: {
          id: string;
          name: string;
          numbers: string[];
        };
      };
    };
  }
  
  export interface ApiErrorResponse {
    status: 'crash';
    response: string;
  }