/**
 * Test Direct Lookups via queryDb (Supabase REST)
 * Location: backend/server/src/scripts/testDirectLookups.ts
 */
import 'dotenv/config';
import { userDb, ownerDb } from '../services/dbRepository.js';
async function main() {
    const phone = '+201001234567';
    console.log(`Looking up user by phone: ${phone}`);
    const user = await userDb.getByPhone(phone);
    console.log('User result:', user);
    if (user) {
        console.log(`Looking up owner by id: ${user.id}`);
        const owner = await ownerDb.getById(user.id);
        console.log('Owner result:', owner);
    }
}
main().catch(console.error);
