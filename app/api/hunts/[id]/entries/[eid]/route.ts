import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthSession,
  unauthorized,
  notFound,
} from "@/lib/auth-helpers";

// PATCH /api/hunts/[id]/entries/[eid] — update entry (record result, change status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eid: string }> }
) {
  const { id: huntId, eid } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const hunt = await prisma.hunt.findUnique({
    where: { id: huntId, userId: session.user.id },
  });
  if (!hunt) return notFound("Hunt not found");

  const entry = await prisma.huntEntry.findUnique({
    where: { id: eid, huntId },
  });
  if (!entry) return notFound("Entry not found");

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.resetResult === true) {
    // Clear result and revert to pending
    const oldResult = entry.result ? entry.result.toNumber() : 0;
    data.result = null;
    data.multiplier = null;
    data.status = "pending";
    if (oldResult > 0) {
      await prisma.hunt.update({
        where: { id: huntId },
        data: { totalWon: { decrement: oldResult } },
      });
    }
  } else if (body.result !== undefined) {
    const result = parseFloat(body.result);
    data.result = result;
    data.multiplier = entry.cost.toNumber() > 0 ? result / entry.cost.toNumber() : 0;
    data.status = "completed";

    // Update hunt totals
    const oldResult = entry.result ? entry.result.toNumber() : 0;
    const diff = result - oldResult;
    await prisma.hunt.update({
      where: { id: huntId },
      data: { totalWon: { increment: diff } },
    });

    // Auto-update GameStat (personal records)
    if (entry.gameSlug) {
      const multiplier = entry.cost.toNumber() > 0 ? result / entry.cost.toNumber() : 0;
      const betSize = entry.betSize.toNumber();
      const betKey = betSize.toFixed(2);
      const costNum = entry.cost.toNumber();

      const existing = await prisma.gameStat.findUnique({
        where: { userId_gameSlug: { userId: session.user.id, gameSlug: entry.gameSlug } },
      });

      if (existing) {
        const newTimesPlayed = existing.timesPlayed + 1;
        const newTotalWon = existing.totalWon.toNumber() + result;
        const newTotalSpent = existing.totalSpent.toNumber() + costNum;
        const newAvgMulti =
          (existing.avgMultiplier.toNumber() * existing.timesPlayed + multiplier) / newTimesPlayed;

        // Per-bet-size records
        const betRecords = (existing.betSizeRecords as Record<string, Record<string, number>>) || {};
        const prev = betRecords[betKey] || { bestWin: 0, bestMulti: 0, timesPlayed: 0, totalWon: 0 };
        betRecords[betKey] = {
          bestWin: Math.max(prev.bestWin, result),
          bestMulti: Math.max(prev.bestMulti, multiplier),
          timesPlayed: prev.timesPlayed + 1,
          totalWon: prev.totalWon + result,
        };

        await prisma.gameStat.update({
          where: { id: existing.id },
          data: {
            timesPlayed: newTimesPlayed,
            totalSpent: newTotalSpent,
            totalWon: newTotalWon,
            biggestWin: Math.max(existing.biggestWin.toNumber(), result),
            biggestMultiplier: Math.max(existing.biggestMultiplier.toNumber(), multiplier),
            biggestWinBet: result > existing.biggestWin.toNumber() ? betSize : existing.biggestWinBet,
            biggestMultiBet: multiplier > existing.biggestMultiplier.toNumber() ? betSize : existing.biggestMultiBet,
            avgMultiplier: newAvgMulti,
            betSizeRecords: betRecords,
          },
        });
      } else {
        await prisma.gameStat.create({
          data: {
            userId: session.user.id,
            gameSlug: entry.gameSlug,
            gameName: entry.gameName,
            timesPlayed: 1,
            totalSpent: costNum,
            totalWon: result,
            biggestWin: result,
            biggestMultiplier: multiplier,
            biggestWinBet: betSize,
            biggestMultiBet: betSize,
            avgMultiplier: multiplier,
            betSizeRecords: {
              [betKey]: { bestWin: result, bestMulti: multiplier, timesPlayed: 1, totalWon: result },
            },
          },
        });
      }
    }
  }

  if (body.status !== undefined) {
    data.status = body.status;
  }

  if (body.note !== undefined) data.note = body.note || null;
  if (body.betSize !== undefined) data.betSize = body.betSize;
  if (body.cost !== undefined) {
    const oldCost = entry.cost.toNumber();
    const newCost = parseFloat(body.cost);
    data.cost = newCost;
    await prisma.hunt.update({
      where: { id: huntId },
      data: { totalCost: { increment: newCost - oldCost } },
    });
  }

  const updated = await prisma.huntEntry.update({
    where: { id: eid },
    data,
  });

  return NextResponse.json(updated);
}

// DELETE /api/hunts/[id]/entries/[eid] — remove entry from hunt
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; eid: string }> }
) {
  const { id: huntId, eid } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const hunt = await prisma.hunt.findUnique({
    where: { id: huntId, userId: session.user.id },
  });
  if (!hunt) return notFound("Hunt not found");

  const entry = await prisma.huntEntry.findUnique({
    where: { id: eid, huntId },
  });
  if (!entry) return notFound("Entry not found");

  await prisma.huntEntry.delete({ where: { id: eid } });

  // Update hunt totals
  await prisma.hunt.update({
    where: { id: huntId },
    data: {
      totalCost: { decrement: entry.cost.toNumber() },
      totalWon: { decrement: entry.result?.toNumber() ?? 0 },
    },
  });

  return NextResponse.json({ ok: true });
}
