import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2] || "admin@kingdomcompanion.app";
  const password = process.argv[3] || "admin123";
  const name = process.argv[4] || "Admin";

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", hashedPassword },
    create: {
      email,
      name,
      hashedPassword,
      role: "ADMIN",
      ageGroup: "ADULT",
      profile: {
        create: { displayName: name },
      },
    },
  });

  console.log(`Admin account ready:`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Role:     ${user.role}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
