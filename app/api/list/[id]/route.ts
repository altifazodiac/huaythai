import { NextResponse } from 'next/server';
   import { load } from 'cheerio';
   import { LottoOverviewResponse, ApiErrorResponse } from '@/types/lottery';

   export async function GET(
     request: Request,
     { params }: { params: { id: string } }
   ) {
     try {
       const page = parseInt(params.id, 10);
       if (!Number.isSafeInteger(page) || page < 1) {
         return NextResponse.json<ApiErrorResponse>(
           {
             status: 'crash',
             response: 'invalid positive integer',
           },
           { status: 400 }
         );
       }

       const $ = load(
         await fetch(`https://news.sanook.com/lotto/archive/page/${page}`).then((o) =>
           o.text()
         )
       );

       const res = $(
         'div.box-cell.box-cell--lotto.content > div > div > div > article.archive--lotto'
       )
         .map((_, element) => {
           const titleElement = $(
             'div.archive--lotto__body > div > a > div > h3.archive--lotto__head-lot',
             element
           );
           const linkElement = $('div > div > a', element);

           const id = linkElement.attr('href')?.split('/')[5] || '';
           const rawTitleText = titleElement.text();
           const parsedTitle = rawTitleText.substring(
             rawTitleText.indexOf('ตรวจหวย') + 8
           );

           return {
             id,
             url: `/lotto/${id}`,
             date: parsedTitle,
           };
         })
         .toArray();

       return NextResponse.json<LottoOverviewResponse>({
         status: 'success',
         response: res,
       });
     } catch (e) {
       return NextResponse.json<ApiErrorResponse>(
         {
           status: 'crash',
           response: 'api cannot fulfill your request at this time',
         },
         { status: 500 }
       );
     }
   }