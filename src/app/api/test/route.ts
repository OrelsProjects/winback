import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    await prisma.bestsellerDM.updateMany({
        where: {
            eligible: false,
        },
        data: {
            eligible: true,
        },
    });

    return NextResponse.json({ message: "Done" });
}