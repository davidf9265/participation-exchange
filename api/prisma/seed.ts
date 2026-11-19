import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] as string });
const prisma = new PrismaClient({ adapter });

const creditUnions = [
  { id: 'cu-riverbend', name: 'Riverbend Federal Credit Union', charterNumber: '24118', state: 'OR' },
  { id: 'cu-lakeshore', name: 'Lakeshore Community CU', charterNumber: '60724', state: 'MI' },
  { id: 'cu-granite', name: 'Granite Peak Credit Union', charterNumber: '13905', state: 'CO' },
  { id: 'cu-harborlight', name: 'Harborlight FCU', charterNumber: '22470', state: 'MA' },
  { id: 'cu-sunbelt', name: 'Sunbelt Members CU', charterNumber: '68311', state: 'TX' },
  { id: 'cu-northpine', name: 'Northpine Savings FCU', charterNumber: '19082', state: 'MN' },
  { id: 'cu-cascadia', name: 'Cascadia First CU', charterNumber: '30556', state: 'WA' },
];

type SeedListing = {
  id: string;
  reference: string;
  sellerCuId: string;
  loanType: string;
  principalAmount: number;
  yieldRate: number;
  termMonths: number;
  riskGrade: 'A' | 'B' | 'C' | 'D';
  originatedAt: string;
};

/** Amounts are stored with two decimals; these are whole dollars. */
function money(value: number): string {
  return value.toFixed(2);
}

const listings: SeedListing[] = [
  { id: 'lst-0001', reference: 'LP-2026-0001', sellerCuId: 'cu-lakeshore', loanType: 'AUTO', principalAmount: 1250000, yieldRate: 5.15, termMonths: 60, riskGrade: 'A', originatedAt: '2026-01-14' },
  { id: 'lst-0002', reference: 'LP-2026-0002', sellerCuId: 'cu-granite', loanType: 'COMMERCIAL_RE', principalAmount: 4800000, yieldRate: 7.4, termMonths: 84, riskGrade: 'B', originatedAt: '2026-01-22' },
  { id: 'lst-0003', reference: 'LP-2026-0003', sellerCuId: 'cu-harborlight', loanType: 'MORTGAGE', principalAmount: 3150000, yieldRate: 4.65, termMonths: 84, riskGrade: 'A', originatedAt: '2026-02-03' },
  { id: 'lst-0004', reference: 'LP-2026-0004', sellerCuId: 'cu-sunbelt', loanType: 'MEMBER_BUSINESS', principalAmount: 920000, yieldRate: 8.9, termMonths: 48, riskGrade: 'C', originatedAt: '2026-02-09' },
  { id: 'lst-0005', reference: 'LP-2026-0005', sellerCuId: 'cu-northpine', loanType: 'HELOC', principalAmount: 640000, yieldRate: 6.25, termMonths: 36, riskGrade: 'B', originatedAt: '2026-02-17' },
  { id: 'lst-0006', reference: 'LP-2026-0006', sellerCuId: 'cu-cascadia', loanType: 'SOLAR', principalAmount: 410000, yieldRate: 5.8, termMonths: 24, riskGrade: 'A', originatedAt: '2026-02-24' },
  { id: 'lst-0007', reference: 'LP-2026-0007', sellerCuId: 'cu-lakeshore', loanType: 'AUTO', principalAmount: 275000, yieldRate: 4.35, termMonths: 12, riskGrade: 'A', originatedAt: '2026-03-02' },
  { id: 'lst-0008', reference: 'LP-2026-0008', sellerCuId: 'cu-granite', loanType: 'MEMBER_BUSINESS', principalAmount: 2340000, yieldRate: 9.25, termMonths: 72, riskGrade: 'D', originatedAt: '2026-03-08' },
  { id: 'lst-0009', reference: 'LP-2026-0009', sellerCuId: 'cu-harborlight', loanType: 'MORTGAGE', principalAmount: 5200000, yieldRate: 4.95, termMonths: 84, riskGrade: 'B', originatedAt: '2026-03-15' },
  { id: 'lst-0010', reference: 'LP-2026-0010', sellerCuId: 'cu-sunbelt', loanType: 'COMMERCIAL_RE', principalAmount: 1875000, yieldRate: 7.85, termMonths: 60, riskGrade: 'C', originatedAt: '2026-03-21' },
  { id: 'lst-0011', reference: 'LP-2026-0011', sellerCuId: 'cu-northpine', loanType: 'AUTO', principalAmount: 730000, yieldRate: 5.5, termMonths: 48, riskGrade: 'B', originatedAt: '2026-03-29' },
  { id: 'lst-0012', reference: 'LP-2026-0012', sellerCuId: 'cu-cascadia', loanType: 'HELOC', principalAmount: 1120000, yieldRate: 6.7, termMonths: 36, riskGrade: 'B', originatedAt: '2026-04-04' },
  { id: 'lst-0013', reference: 'LP-2026-0013', sellerCuId: 'cu-lakeshore', loanType: 'MEMBER_BUSINESS', principalAmount: 3480000, yieldRate: 8.4, termMonths: 72, riskGrade: 'C', originatedAt: '2026-04-11' },
  { id: 'lst-0014', reference: 'LP-2026-0014', sellerCuId: 'cu-granite', loanType: 'SOLAR', principalAmount: 505000, yieldRate: 6.05, termMonths: 24, riskGrade: 'A', originatedAt: '2026-04-18' },
  { id: 'lst-0015', reference: 'LP-2026-0015', sellerCuId: 'cu-harborlight', loanType: 'AUTO', principalAmount: 1640000, yieldRate: 5.25, termMonths: 60, riskGrade: 'A', originatedAt: '2026-04-25' },
  { id: 'lst-0016', reference: 'LP-2026-0016', sellerCuId: 'cu-sunbelt', loanType: 'MORTGAGE', principalAmount: 2960000, yieldRate: 5.05, termMonths: 84, riskGrade: 'B', originatedAt: '2026-05-02' },
  { id: 'lst-0017', reference: 'LP-2026-0017', sellerCuId: 'cu-northpine', loanType: 'COMMERCIAL_RE', principalAmount: 4270000, yieldRate: 8.15, termMonths: 72, riskGrade: 'D', originatedAt: '2026-05-09' },
  { id: 'lst-0018', reference: 'LP-2026-0018', sellerCuId: 'cu-cascadia', loanType: 'MEMBER_BUSINESS', principalAmount: 860000, yieldRate: 9.05, termMonths: 48, riskGrade: 'D', originatedAt: '2026-05-16' },
  { id: 'lst-0019', reference: 'LP-2026-0019', sellerCuId: 'cu-lakeshore', loanType: 'HELOC', principalAmount: 1390000, yieldRate: 6.45, termMonths: 36, riskGrade: 'C', originatedAt: '2026-05-23' },
  { id: 'lst-0020', reference: 'LP-2026-0020', sellerCuId: 'cu-granite', loanType: 'AUTO', principalAmount: 250000, yieldRate: 3.55, termMonths: 12, riskGrade: 'A', originatedAt: '2026-05-30' },
  { id: 'lst-0021', reference: 'LP-2026-0021', sellerCuId: 'cu-harborlight', loanType: 'SOLAR', principalAmount: 675000, yieldRate: 5.95, termMonths: 24, riskGrade: 'B', originatedAt: '2026-06-06' },
  { id: 'lst-0022', reference: 'LP-2026-0022', sellerCuId: 'cu-sunbelt', loanType: 'MEMBER_BUSINESS', principalAmount: 2085000, yieldRate: 8.75, termMonths: 60, riskGrade: 'C', originatedAt: '2026-06-13' },
  { id: 'lst-0023', reference: 'LP-2026-0023', sellerCuId: 'cu-northpine', loanType: 'MORTGAGE', principalAmount: 3720000, yieldRate: 4.8, termMonths: 84, riskGrade: 'A', originatedAt: '2026-06-20' },
  { id: 'lst-0024', reference: 'LP-2026-0024', sellerCuId: 'cu-cascadia', loanType: 'COMMERCIAL_RE', principalAmount: 1530000, yieldRate: 7.6, termMonths: 60, riskGrade: 'D', originatedAt: '2026-06-27' },
  { id: 'lst-0025', reference: 'LP-2026-0025', sellerCuId: 'cu-riverbend', loanType: 'AUTO', principalAmount: 1180000, yieldRate: 5.35, termMonths: 60, riskGrade: 'A', originatedAt: '2026-04-08' },
  { id: 'lst-0026', reference: 'LP-2026-0026', sellerCuId: 'cu-riverbend', loanType: 'HELOC', principalAmount: 795000, yieldRate: 8.3, termMonths: 36, riskGrade: 'B', originatedAt: '2026-06-02' },
  { id: 'lst-0027', reference: 'LP-2019-0031', sellerCuId: 'cu-lakeshore', loanType: 'AUTO', principalAmount: 540000, yieldRate: 4.9, termMonths: 60, riskGrade: 'B', originatedAt: '2019-03-15' },
  { id: 'lst-0028', reference: 'LP-2020-0114', sellerCuId: 'cu-sunbelt', loanType: 'SOLAR', principalAmount: 310000, yieldRate: 5.7, termMonths: 36, riskGrade: 'A', originatedAt: '2020-11-02' },
  { id: 'lst-0029', reference: 'LP-2022-0207', sellerCuId: 'cu-granite', loanType: 'MEMBER_BUSINESS', principalAmount: 1465000, yieldRate: 8.05, termMonths: 24, riskGrade: 'C', originatedAt: '2022-06-20' },
];

// Slices already sold. `remainingAmount` is derived from these so that
// remainingAmount === principalAmount - sum(participations) always holds.
const participations = [
  { id: 'par-0001', listingId: 'lst-0002', buyerCuId: 'cu-riverbend', amount: 750000, purchasedAt: '2026-02-01' },
  { id: 'par-0002', listingId: 'lst-0002', buyerCuId: 'cu-cascadia', amount: 500000, purchasedAt: '2026-02-05' },
  { id: 'par-0003', listingId: 'lst-0003', buyerCuId: 'cu-riverbend', amount: 400000, purchasedAt: '2026-02-20' },
  { id: 'par-0004', listingId: 'lst-0005', buyerCuId: 'cu-lakeshore', amount: 140000, purchasedAt: '2026-03-01' },
  { id: 'par-0005', listingId: 'lst-0009', buyerCuId: 'cu-riverbend', amount: 1200000, purchasedAt: '2026-03-27' },
  { id: 'par-0006', listingId: 'lst-0009', buyerCuId: 'cu-sunbelt', amount: 800000, purchasedAt: '2026-04-02' },
  { id: 'par-0007', listingId: 'lst-0013', buyerCuId: 'cu-granite', amount: 980000, purchasedAt: '2026-04-30' },
  { id: 'par-0008', listingId: 'lst-0017', buyerCuId: 'cu-harborlight', amount: 1270000, purchasedAt: '2026-05-25' },
  { id: 'par-0009', listingId: 'lst-0022', buyerCuId: 'cu-northpine', amount: 585000, purchasedAt: '2026-06-28' },
];

function soldFor(listingId: string): number {
  return participations
    .filter((p) => p.listingId === listingId)
    .reduce((total, p) => total + p.amount, 0);
}

async function main() {
  const alreadySeeded = await prisma.creditUnion.count();
  if (alreadySeeded > 0) {
    console.log('Database already has data, nothing to seed.');
    return;
  }

  await prisma.creditUnion.createMany({ data: creditUnions });

  const listingRows: Prisma.ListingCreateManyInput[] = listings.map((listing) => ({
    ...listing,
    principalAmount: money(listing.principalAmount),
    remainingAmount: money(listing.principalAmount - soldFor(listing.id)),
    yieldRate: listing.yieldRate.toFixed(3),
    originatedAt: new Date(listing.originatedAt),
  }));
  await prisma.listing.createMany({ data: listingRows });

  await prisma.participation.createMany({
    data: participations.map((p) => ({
      ...p,
      amount: money(p.amount),
      purchasedAt: new Date(p.purchasedAt),
    })),
  });

  console.log(
    `Seeded ${creditUnions.length} credit unions, ${listings.length} listings, ${participations.length} participations.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
