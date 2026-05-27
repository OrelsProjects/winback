import { Prisma, PrismaClient } from "@/generated-directory/client";
import { PrismaPg } from "@prisma/adapter-pg";

const WRITE_METHODS = [
  "create",
  "update",
  "upsert",
  "delete",
  "createMany",
  "createManyAndReturn",
  "updateMany",
  "deleteMany",
] as const;

const readonlyDirectoryClient = Prisma.defineExtension({
  name: "ReadonlyDirectoryClient",
  model: {
    $allModels: Object.fromEntries(
      WRITE_METHODS.map((method) => [
        method,
        function () {
          throw new Error(
            `Calling the \`${method}\` method on a readonly client is not allowed`,
          );
        },
      ]),
    ) as unknown as {
      [K in (typeof WRITE_METHODS)[number]]: (
        args: `Calling the \`${K}\` method on a readonly client is not allowed`,
      ) => never;
    },
  },
  query: {
    $executeRaw: async function () {
      throw new Error(
        "Calling the `$executeRaw` method on a readonly client is not allowed",
      );
    },
    $executeRawUnsafe: async function () {
      throw new Error(
        "Calling the `$executeRawUnsafe` method on a readonly client is not allowed",
      );
    },
    $queryRawUnsafe: async function () {
      throw new Error(
        "Calling the `$queryRawUnsafe` method on a readonly client is not allowed",
      );
    },
  },
});

const createDirectoryPrismaClient = () => {
  const connectionString = process.env.DIRECTORY_DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  }).$extends(readonlyDirectoryClient);
};

const globalForDirectory = globalThis as unknown as {
  directoryPrisma: ReturnType<typeof createDirectoryPrismaClient>;
};

export const directoryPrisma =
  globalForDirectory.directoryPrisma ?? createDirectoryPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForDirectory.directoryPrisma = directoryPrisma;
}
