import "dotenv/config";
import { PrismaClient } from "../src/generated/client";
import { LeadStatus } from "../src/generated/enums";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const lead = await prisma.lead.upsert({
    where: { userIdInWriteStack: "seed-lead-001" },
    update: {},
    create: {
      userIdInWriteStack: "seed-lead-001",
      email: "jane.doe@example.com",
      firstName: "Jane",
      lastName: "Doe",
      substackHandle: "janedoe",
      status: LeadStatus.CANCELED,
      lastPlanName: "Pro Monthly",
      subscriptionCanceledAt: new Date("2026-03-01T00:00:00.000Z"),
      signedUpAt: new Date("2025-06-15T00:00:00.000Z"),
      lastSyncedAt: new Date(),
    },
  });

  console.log("Seeded lead:", lead.email);

  const templates = [
    {
      name: "Warm churn",
      slug: "warm-churn",
      subject: "Hey {{firstName}}, we miss you at WriteStack",
      bodyJson: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Hi {{firstName}}," }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "I noticed you cancelled your {{lastPlanName}} plan a little while ago and wanted to reach out personally.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Is there anything I can help with, or feedback you'd like to share?",
              },
            ],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Best,\nOrel" }],
          },
        ],
      },
      bodyHtml:
        "<p>Hi {{firstName}},</p><p>I noticed you cancelled your {{lastPlanName}} plan a little while ago and wanted to reach out personally.</p><p>Is there anything I can help with, or feedback you'd like to share?</p><p>Best,<br>Orel</p>",
    },
    {
      name: "Warm reactivate",
      slug: "warm-reactivate",
      subject: "{{firstName}}, curious what brought you to WriteStack",
      bodyJson: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Hey {{firstName}}," }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "I saw you signed up for WriteStack but never started a paid plan — totally fine, just wanted to check in.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "What were you hoping to do with it? Always looking to improve.",
              },
            ],
          },
          { type: "paragraph", content: [{ type: "text", text: "Orel" }] },
        ],
      },
      bodyHtml:
        "<p>Hey {{firstName}},</p><p>I saw you signed up for WriteStack but never started a paid plan — totally fine, just wanted to check in.</p><p>What were you hoping to do with it? Always looking to improve.</p><p>Orel</p>",
    },
    {
      name: "Substack Outreach",
      slug: "substack-outreach",
      subject: "Saw your Substack @{{substackHandle}} — thought you'd like WriteStack",
      bodyJson: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Hi {{firstName}}," }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "I came across your Substack newsletter and thought WriteStack could be a great fit for growing your paid subscriber base.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Would love to show you around — happy to jump on a quick call.",
              },
            ],
          },
          { type: "paragraph", content: [{ type: "text", text: "Orel" }] },
        ],
      },
      bodyHtml:
        "<p>Hi {{firstName}},</p><p>I came across your Substack newsletter and thought WriteStack could be a great fit for growing your paid subscriber base.</p><p>Would love to show you around — happy to jump on a quick call.</p><p>Orel</p>",
    },
  ];

  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { slug: t.slug },
      update: t,
      create: t,
    });
    console.log("Seeded template:", t.name);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
