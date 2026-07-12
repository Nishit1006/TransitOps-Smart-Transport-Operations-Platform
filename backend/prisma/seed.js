import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const BCRYPT_SALT_ROUNDS = 10;
const DEMO_PASSWORD = "Password123!";

// All seeded accounts share the same demo password for simplicity — see README.
const USERS = [
  { name: "Ava Ahuja", email: "admin@transitops.com", role: "ADMIN" },
  { name: "Felix Ferreira", email: "fleet.manager@transitops.com", role: "FLEET_MANAGER" },
  { name: "Dana Diaz", email: "dispatcher@transitops.com", role: "DISPATCHER" },
  { name: "Sam Suresh", email: "safety.officer@transitops.com", role: "SAFETY_OFFICER" },
  { name: "Farah Fontaine", email: "financial.analyst@transitops.com", role: "FINANCIAL_ANALYST" },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_SALT_ROUNDS);

  for (const user of USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
        isActive: true,
        isEmailVerified: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash,
        isActive: true,
        isEmailVerified: true,
      },
    });
  }

  await prisma.orgSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  console.log("\nSeeded demo accounts (all share the same password):\n");
  console.log(`  Password: ${DEMO_PASSWORD}\n`);
  console.table(USERS.map((u) => ({ role: u.role, email: u.email, name: u.name })));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
