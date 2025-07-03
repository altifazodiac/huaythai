"use client"

type LotteryResult = {
  id: number;
  created_at: string;
  draw_date: string;
  country: string;
  lottery_name: string;
  results: string[];
  source_url: string | null;
};

type Props = {
  groupedResults: Record<string, LotteryResult[]>;
};

export default function LotteryResultsClient({ groupedResults }: Props) {
  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800">ผลการออกรางวัล</h1>
          <p className="text-lg text-gray-500 mt-2">
            ข้อมูลล่าสุดจาก API
          </p>
        </header>

        {Object.keys(groupedResults).length === 0 ? (
          <div className="text-center bg-white p-8 rounded-lg shadow-md">
            <p className="text-xl text-gray-500">ยังไม่มีข้อมูลผลหวย</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(groupedResults).map(([date, resultsForDate]) => (
              <section key={date}>
                <h2 className="text-2xl font-semibold text-gray-700 mb-4 pb-2 border-b-2 border-indigo-500">
                  งวดวันที่{' '}
                  {new Date(date).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'UTC',
                  })}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {resultsForDate.map((result) => (
                    <div
                      key={result.id}
                      className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform transform hover:-translate-y-1"
                    >
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-xl font-bold text-indigo-700">
                            {result.lottery_name}
                          </h3>
                          <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            {result.country}
                          </span>
                        </div>
                        
                        <ul className="space-y-2 text-gray-600">
                          {result.results.map((prize, index) => (
                            <li key={index} className="flex items-center">
                              <svg className="w-4 h-4 mr-2 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                              <span>{prize}</span>
                            </li>
                          ))}
                        </ul>

                        {result.source_url && (
                          <div className="mt-4 text-right">
                            <a 
                              href={result.source_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-gray-400 hover:text-indigo-500"
                            >
                              แหล่งที่มา
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 