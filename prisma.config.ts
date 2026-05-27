import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // For migrations, set DATABASE_URL to the direct (port 5432) URL temporarily.
    // Runtime queries use the pooled URL via the PrismaPg adapter in src/lib/db/prisma.ts.
    url: env("DIRECT_URL"),
  },
});
