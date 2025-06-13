// populate-aliases.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// --- CONFIGURATION ---
// Load environment variables from .env.local for local execution
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- DATA LOADING ---
const mainlotto: { sub_type_name: string; lottery_sub_type_id: number }[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'mainlotto.json'), 'utf-8')
);
const lotterySchedule: { name: string }[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'lottery_schedule.json'), 'utf-8')
);

/**
 * Normalizes a lottery name by removing common prefixes/suffixes and spaces
 * to make matching easier.
 * e.g., "หุ้นนิเคอิเช้าVIP" -> "นิเคอิเช้า"
 */
function normalizeName(name: string): string {
    return name
        .replace(/หวย/g, '')
        .replace(/หุ้น/g, '')
        .replace(/สลาก(กินแบ่ง)?/g, '')
        .replace(/(ธ\.?ก\.?ส\.?)/g, 'ธกส')
        .replace(/พิเศษ|VIP|STAR|EXTRA|HD|TV|ดิจิตอล/gi, '')
        .replace(/\s+/g, '') // Remove all spaces
        .trim();
}

async function main() {
    console.log('🚀 Starting the alias population script...');

    // --- STEP 1: Insert main names from mainlotto.json as primary aliases ---
    console.log('\n--- Step 1: Inserting primary aliases from mainlotto.json ---');
    
    const primaryAliases = mainlotto.map(item => ({
        lottery_sub_type_id: item.lottery_sub_type_id,
        alias_name: item.sub_type_name,
    }));

    const { error: primaryInsertError } = await supabase
        .from('lottery_name_aliases')
        .upsert(primaryAliases, { onConflict: 'lottery_sub_type_id, alias_name' });

    if (primaryInsertError) {
        console.error('Error inserting primary aliases:', primaryInsertError.message);
        return;
    }
    console.log(`✅ Successfully upserted ${primaryAliases.length} primary aliases.`);


    // --- STEP 2: Match and prepare additional aliases from lottery_schedule.json ---
    console.log('\n--- Step 2: Matching and preparing additional aliases from lottery_schedule.json ---');
    
    const additionalAliases: { lottery_sub_type_id: number; alias_name: string }[] = [];
    const scheduleNames = lotterySchedule.map(item => item.name);

    for (const scheduleName of scheduleNames) {
        const normalizedScheduleName = normalizeName(scheduleName);
        let bestMatch: { sub_type_name: string; lottery_sub_type_id: number } | null = null;
        let highestScore = 0;

        // Find the best match from mainlotto based on normalized names
        for (const mainLottery of mainlotto) {
            const normalizedMainName = normalizeName(mainLottery.sub_type_name);
            
            if (normalizedScheduleName === normalizedMainName) {
                bestMatch = mainLottery;
                break; // Found an exact match, no need to search further
            }
            // Simple scoring for partial matches (can be improved if needed)
            if (normalizedScheduleName.includes(normalizedMainName) && normalizedMainName.length > highestScore) {
                highestScore = normalizedMainName.length;
                bestMatch = mainLottery;
            } else if (normalizedMainName.includes(normalizedScheduleName) && normalizedScheduleName.length > highestScore) {
                 highestScore = normalizedScheduleName.length;
                 bestMatch = mainLottery;
            }
        }

        if (bestMatch) {
            console.log(`[MATCH] "${scheduleName}" matched with "${bestMatch.sub_type_name}" (ID: ${bestMatch.lottery_sub_type_id})`);
            additionalAliases.push({
                lottery_sub_type_id: bestMatch.lottery_sub_type_id,
                alias_name: scheduleName,
            });
        } else {
            console.warn(`[NO MATCH] Could not find a suitable match for "${scheduleName}"`);
        }
    }

    // --- STEP 3: Insert the matched additional aliases ---
    if (additionalAliases.length > 0) {
        console.log(`\n--- Step 3: Inserting ${additionalAliases.length} additional aliases ---`);
        
        const { error: additionalInsertError } = await supabase
            .from('lottery_name_aliases')
            .upsert(additionalAliases, { onConflict: 'lottery_sub_type_id, alias_name' });
        
        if (additionalInsertError) {
            console.error('Error inserting additional aliases:', additionalInsertError.message);
            return;
        }
        console.log(`✅ Successfully upserted ${additionalAliases.length} additional aliases.`);
    } else {
        console.log('\n--- Step 3: No new additional aliases to insert. ---');
    }

    console.log('\n✨ Alias population process completed successfully!');
}

main().catch(console.error);
