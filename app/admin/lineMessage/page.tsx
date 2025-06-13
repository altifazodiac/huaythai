// app/admin/page.tsx
"use client"; // ต้องมีบรรทัดนี้เพราะเราใช้ State และ Event Handler

import { useState } from 'react';

export default function AdminPage() {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  const handleSendMessage = async () => {
    setStatus('กำลังส่ง...');
    try {
      // สำหรับการส่งแบบ Broadcast ให้ส่งแค่ message
      // สำหรับ Multicast คุณจะต้องดึง userIds มาจากฐานข้อมูลของคุณ
      // และส่งไปพร้อมกันใน body
      // const userIds = await fetchUserIdsFromYourDB();

      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: message 
          // userIds: userIds // <-- หากต้องการส่งแบบ Multicast ให้ใส่ข้อมูลนี้
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus(`ส่งสำเร็จ! ${result.message}`);
        setMessage('');
      } else {
        setStatus(`เกิดข้อผิดพลาด: ${result.error}`);
      }
    } catch (error) {
      setStatus('เกิดข้อผิดพลาดฝั่ง Client');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>หน้าสำหรับส่งข้อความ Broadcast</h1>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
        placeholder="พิมพ์ข้อความที่นี่..."
      />
      <button 
        onClick={handleSendMessage}
        style={{ padding: '10px 20px', cursor: 'pointer' }}
      >
        ส่งข้อความ
      </button>
      {status && <p>{status}</p>}
    </div>
  );
}