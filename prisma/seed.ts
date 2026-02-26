import { PrismaClient, Prisma } from "@prisma/client";

const WAGERRACE_DB_URL =
  "postgresql://neondb_owner:npg_YwLK7ruWc4So@ep-old-brook-ab6h7wyb-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require";

const WAGERRACE_IMAGE_BASE = "https://www.johnessyslots.com";

interface WagerraceGame {
  slug: string;
  name: string;
  provider: string;
  image_url: string | null;
  rtp: string | null;
  volatility: string | null;
  max_win: string | null;
  release_date: string | null;
}

function normalizeImageUrl(url: string | null): string | null {
  if (!url || url.trim() === "") return null;
  if (url.startsWith("https://") || url.startsWith("http://")) return url;
  if (url.startsWith("/")) return `${WAGERRACE_IMAGE_BASE}${url}`;
  return null;
}

function parseDecimal(val: string | null): Prisma.Decimal | null {
  if (!val || val.trim() === "") return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : new Prisma.Decimal(num);
}

function parseDate(val: string | null): Date | null {
  if (!val || val.trim() === "") return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  // Connect to Wagerrace DB (source)
  const source = new PrismaClient({ datasourceUrl: WAGERRACE_DB_URL });
  // Connect to BonusHunt DB (target — uses DATABASE_URL from .env)
  const target = new PrismaClient();

  console.log("Fetching games from Wagerrace DB...");
  const games: WagerraceGame[] = await source.$queryRaw`
    SELECT slug, name, provider, image_url, rtp, volatility, max_win, release_date
    FROM games
    ORDER BY name
  `;
  console.log(`Found ${games.length} games`);

  // Map to BonusHunt Game format
  const mapped = games
    .filter((g) => g.slug && g.name && g.provider)
    .map((g) => ({
      slug: g.slug,
      name: g.name,
      provider: g.provider,
      imageUrl: normalizeImageUrl(g.image_url),
      rtp: parseDecimal(g.rtp),
      volatility: g.volatility || null,
      maxWin: g.max_win || null,
      releaseDate: parseDate(g.release_date),
      source: "wagerrace",
    }));

  console.log(`Mapped ${mapped.length} valid games`);

  // Batch insert (500 at a time)
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const batch = mapped.slice(i, i + BATCH_SIZE);
    const result = await target.game.createMany({
      data: batch,
      skipDuplicates: true,
    });
    inserted += result.count;
    console.log(
      `Batch ${Math.floor(i / BATCH_SIZE) + 1}: inserted ${result.count} games (${inserted} total)`
    );
  }

  console.log(`\nDone! Inserted ${inserted} games into BonusHunt DB.`);

  // Stats
  const total = await target.game.count();
  const withImages = await target.game.count({
    where: { imageUrl: { not: null } },
  });
  console.log(`Total games in DB: ${total}`);
  console.log(`Games with images: ${withImages}`);

  await source.$disconnect();
  await target.$disconnect();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
