/**
 * Senior Community Synthetic Seed Data
 *
 * Creates a realistic single-tenant setup for development:
 * - 1 tenant (senior living community)
 * - 4 sites
 * - Standard set of stations per site (pizza, sandwich, salad bar, entree, soup, drinks, dessert)
 *
 * This is intentionally ID-stable + idempotent (safe to re-run).
 *
 * Run with:
 *   npx tsx src/db/seed-senior.ts
 *
 * Recommended:
 *   npm run db:seed           (reference data)
 *   npm run db:seed:senior    (this file)
 */

import { db, seedDatabase } from './index.js';
import { tenants, sites, stations } from './schema/index.js';

type StationTemplate = {
  code: string;
  stationName: string;
  stationType: (typeof stations.$inferInsert)['stationType'];
  serviceStyle: (typeof stations.$inferInsert)['serviceStyle'];
  requiresTempLog?: boolean;
  capacityCoversPerHour?: number;
  equipmentList?: string;
  notes?: string;
};

const TENANT_ID = 'TEN-SENIOR001';
const TENANT_CODE = 'OAKS';

const SITE_IDS = {
  main: 'SITE-OAKS-001',
  bistro: 'SITE-OAKS-002',
  assistedLiving: 'SITE-OAKS-003',
  memoryCare: 'SITE-OAKS-004',
} as const;

const STATIONS: StationTemplate[] = [
  {
    code: 'PIZZA',
    stationName: 'Pizza Station',
    stationType: 'À la Carte',
    serviceStyle: 'Counter Service',
    requiresTempLog: true,
    capacityCoversPerHour: 40,
    equipmentList: 'Pizza oven, prep table, hot holding cabinet',
  },
  {
    code: 'SANDWICH',
    stationName: 'Sandwich Station',
    stationType: 'À la Carte',
    serviceStyle: 'Counter Service',
    requiresTempLog: false,
    capacityCoversPerHour: 50,
    equipmentList: 'Cold well, panini press, slicer (if permitted)',
  },
  {
    code: 'SALAD',
    stationName: 'Salad Bar',
    stationType: 'Salad Bar',
    serviceStyle: 'Self-Service',
    requiresTempLog: true,
    capacityCoversPerHour: 60,
    equipmentList: 'Refrigerated salad bar, sneeze guard',
  },
  {
    code: 'ENTREE',
    stationName: 'Entrée Station',
    stationType: 'Steam Table',
    serviceStyle: 'Attended',
    requiresTempLog: true,
    capacityCoversPerHour: 70,
    equipmentList: 'Steam table, carving station (optional), heat lamps',
  },
  {
    code: 'SOUP',
    stationName: 'Soup Station',
    stationType: 'Steam Table',
    serviceStyle: 'Attended',
    requiresTempLog: true,
    capacityCoversPerHour: 50,
    equipmentList: 'Soup kettles, ladles, hot holding',
  },
  {
    code: 'DRINKS',
    stationName: 'Drink Station',
    stationType: 'Beverage',
    serviceStyle: 'Self-Service',
    requiresTempLog: false,
    capacityCoversPerHour: 100,
    equipmentList: 'Beverage dispenser, ice machine, coffee urns',
  },
  {
    code: 'DESSERT',
    stationName: 'Dessert Station',
    stationType: 'Dessert',
    serviceStyle: 'Attended',
    requiresTempLog: false,
    capacityCoversPerHour: 45,
    equipmentList: 'Display case (optional), plating station',
  },
];

function buildStationId(siteId: string, stationCode: string) {
  // Keep IDs readable and stable.
  // Example: STN-SITE-OAKS-001-PIZZA
  return `STN-${siteId}-${stationCode}`;
}

async function seedSeniorCommunity() {
  console.log('Seeding senior community synthetic data...\n');

  // Ensure reference data exists (units, categories, diet types, etc.)
  await seedDatabase(db);

  // ---------------------------------------------------------------------------
  // Tenant
  // ---------------------------------------------------------------------------
  console.log('Creating tenant...');
  await db
    .insert(tenants)
    .values({
      tenantId: TENANT_ID,
      tenantName: 'Oak Ridge Senior Living',
      tenantCode: TENANT_CODE,
      contactName: 'Jordan Lee',
      contactEmail: 'admin@oakridge.example.com',
      contactPhone: '555-0100',
      address: '100 Oak Ridge Way',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
      countryCode: 'US',
      defaultFoodCompSourceId: 'USDA-FDC',
      subscriptionTier: 'Standard',
      segment: 'Long-term Care',
      maxSites: 10,
      maxUsers: 100,
      createdDate: new Date().toISOString(),
      status: 'Active',
      notes: 'Synthetic tenant for senior community development/testing.',
    })
    .onConflictDoNothing();

  // ---------------------------------------------------------------------------
  // Sites (4)
  // ---------------------------------------------------------------------------
  console.log('Creating sites...');
  await db
    .insert(sites)
    .values([
      {
        siteId: SITE_IDS.main,
        tenantId: TENANT_ID,
        siteName: 'Main Kitchen (Production)',
        siteType: 'Kitchen',
        address: '100 Oak Ridge Way, Building A',
        capacitySeats: 0,
        hasProductionKitchen: true,
        storageDrySqft: 600,
        storageRefrigeratedSqft: 300,
        storageFreezerSqft: 200,
        managerName: 'Executive Chef Alex Rivera',
        phone: '555-0101',
        operatingHours: '5:00 AM - 8:00 PM',
        status: 'Active',
      },
      {
        siteId: SITE_IDS.bistro,
        tenantId: TENANT_ID,
        siteName: 'Bistro Dining Room',
        siteType: 'Dining Hall',
        address: '100 Oak Ridge Way, Building C',
        capacitySeats: 80,
        hasProductionKitchen: false,
        managerName: 'Dining Manager Casey Nguyen',
        phone: '555-0102',
        operatingHours: '7:00 AM - 7:00 PM',
        status: 'Active',
        notes: 'Primary independent-living dining venue.',
      },
      {
        siteId: SITE_IDS.assistedLiving,
        tenantId: TENANT_ID,
        siteName: 'Assisted Living Dining',
        siteType: 'Satellite',
        address: '100 Oak Ridge Way, Building D',
        capacitySeats: 60,
        hasProductionKitchen: false,
        managerName: 'AL Dining Lead Morgan Patel',
        phone: '555-0103',
        operatingHours: '7:00 AM - 6:30 PM',
        status: 'Active',
        notes: 'More support needs; simplified station flow.',
      },
      {
        siteId: SITE_IDS.memoryCare,
        tenantId: TENANT_ID,
        siteName: 'Memory Care Dining',
        siteType: 'Satellite',
        address: '100 Oak Ridge Way, Building E',
        capacitySeats: 40,
        hasProductionKitchen: false,
        managerName: 'MC Dining Lead Taylor Brooks',
        phone: '555-0104',
        operatingHours: '7:00 AM - 6:00 PM',
        status: 'Active',
        notes: 'Smaller service area; consistent options and calmer setup.',
      },
    ])
    .onConflictDoNothing();

  // ---------------------------------------------------------------------------
  // Stations (same set per dining site; optional for main production kitchen)
  // ---------------------------------------------------------------------------
  console.log('Creating stations...');
  const siteIdsForStations = [SITE_IDS.bistro, SITE_IDS.assistedLiving, SITE_IDS.memoryCare];

  const stationRows = siteIdsForStations.flatMap((siteId) =>
    STATIONS.map((st) => ({
      stationId: buildStationId(siteId, st.code),
      siteId,
      stationName: st.stationName,
      stationType: st.stationType,
      serviceStyle: st.serviceStyle,
      requiresTempLog: st.requiresTempLog ?? false,
      capacityCoversPerHour: st.capacityCoversPerHour ?? null,
      equipmentList: st.equipmentList ?? null,
      status: 'Active' as const,
      notes: st.notes ?? null,
    }))
  );

  await db.insert(stations).values(stationRows).onConflictDoNothing();

  console.log('\n✅ Senior community synthetic seed complete!');
  console.log('\n📋 Summary');
  console.log(`- Tenant: ${TENANT_CODE} (${TENANT_ID})`);
  console.log(`- Sites: 4`);
  console.log(`- Stations: ${stationRows.length} (${STATIONS.length} per dining site × ${siteIdsForStations.length} sites)`);
}

seedSeniorCommunity().catch((err) => {
  console.error('✗ Error seeding senior community data:', err);
  process.exitCode = 1;
});



