/**
 * Fix test account passwords - run: npx tsx scripts/fix-test-passwords.ts
 */
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import "dotenv/config"

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    const hashedPassword = await bcrypt.hash('password123', 10)

    const testEmails = [
        'admin@glowyspot.com',
        'provider1@glowyspot.com',
        'provider2@glowyspot.com',
        'single_provider@glowyspot.com',
        'visitor1@glowyspot.com',
    ]

    for (const email of testEmails) {
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            await prisma.user.update({
                where: { email },
                data: { password: hashedPassword }
            })
            console.log(`✅ Jelszó frissítve: ${email}`)
        } else {
            console.log(`⚠️  Nem létezik a DB-ben: ${email}`)
        }
    }

    console.log('\n✅ Kész! Minden teszt fiók jelszava: password123')
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })
