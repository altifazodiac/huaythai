const bcrypt = require('bcrypt');

async function hashPassword(password: string) {
    const saltRounds = 10; // จำนวนรอบในการสร้าง salt
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}

// ใช้งาน
hashPassword('74108520').then(hashed => {
    console.log(hashed); // แสดงรหัสผ่านที่เข้ารหัสแล้ว
});