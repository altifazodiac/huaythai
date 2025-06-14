import { supabase } from "./lib/supabaseClient";

const bcrypt = require('bcrypt');

async function hashPassword(password: string) {
    const saltRounds = 10; // จำนวนรอบในการสร้าง salt
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}

// ใช้งาน
hashPassword('987654321').then(hashed => {
    const { data, error } = await supabase.auth.update({
        password: '987654321' // Replace with the new password
      });
      console.log(data, error);
});










