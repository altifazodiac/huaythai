import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Create ticket_sub_types table
    await supabase.from('ticket_sub_types').upsert([
      { id: '4e9ab25a-57f4-4c80-af65-b3eef322a908', type_name: 'สามตัวบน', type_number: 3 },
      { id: '8667f23d-d61d-41a7-8a30-6acd4d1b27cb', type_name: 'สามตัวหน้า', type_number: 3 },
      { id: 'cbab55e1-4585-45d3-937e-f0fba24f52f9', type_name: 'สามตัวหลัง', type_number: 3 },
      { id: '0638ce4b-cedb-41ff-ad18-b2c12a8b3a0c', type_name: 'สามตัวโต๊ด', type_number: 3 },
      { id: 'd4a2746f-1cc6-4dba-a6f4-c852846df2c4', type_name: 'สองตัวบน', type_number: 2 },
      { id: 'fca10de7-c4c4-451f-86d9-a3b78824c8f0', type_name: 'สองตัวล่าง', type_number: 2 },
      { id: '6b0540fd-cc70-457a-9457-7af8858ac9da', type_name: 'วิ่งบน', type_number: 1 },
      { id: '3374feb6-04b2-4990-85e5-b456ba9616e9', type_name: 'วิ่งล่าง', type_number: 1 }
    ])

    return NextResponse.json({
      status: 'success',
      message: 'Database setup completed successfully'
    })

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ 
      status: 'error',
      message: 'Failed to setup database'
    }, { status: 500 })
  }
}