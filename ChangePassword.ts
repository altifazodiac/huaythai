import bcrypt from 'bcrypt';

async function hashPassword(password: string) {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}

// ตัวอย่างการใช้งาน
hashPassword('Tumtam1808').then(hashed => {
  console.log('รหัสผ่านที่ถูก hash:', hashed);
});