// Demo data seed for TDS Asset Intelligence Platform.
// Run with: node --env-file=.env.local supabase/seed.mjs
// Requires the SQL migration (supabase/migrations/0001_init.sql) to already be applied.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "techdirectsupport9@gmail.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "TdsDemo!2026";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function insertInChunks(table, rows, size = 100) {
  const results = [];
  for (const part of chunk(rows, size)) {
    const { data, error } = await supabase.from(table).insert(part).select();
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
    results.push(...(data ?? []));
  }
  return results;
}

let allAuthUsersCache = null;

async function findAuthUserByEmail(email) {
  if (!allAuthUsersCache) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    allAuthUsersCache = data.users;
  }
  return allAuthUsersCache.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function createAuthUser(email, password, fullName) {
  const existing = await findAuthUserByEmail(email);
  if (existing) return existing;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`createUser(${email}) failed: ${error.message}`);
  allAuthUsersCache?.push(data.user);
  return data.user;
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function pick(arr, i) {
  return arr[i % arr.length];
}

async function main() {
  console.log("Seeding TDS Asset Intelligence Platform demo data...");

  // ---- Tenant ----
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({ name: "Tech Direct Support" })
    .select()
    .single();
  if (tenantError) throw new Error(tenantError.message);
  console.log("Created tenant:", tenant.id);

  // ---- Users ----
  const DEMO_PEOPLE = [
    { email: ADMIN_EMAIL, name: "TDS Admin", role: "admin", password: ADMIN_PASSWORD },
    { email: "sarah.mitchell@techdirectsupport.demo", name: "Sarah Mitchell", role: "asset_manager" },
    { email: "james.chen@techdirectsupport.demo", name: "James Chen", role: "operator" },
    { email: "priya.nair@techdirectsupport.demo", name: "Priya Nair", role: "operator" },
    { email: "liam.oconnor@techdirectsupport.demo", name: "Liam O'Connor", role: "viewer" },
    { email: "ava.thompson@techdirectsupport.demo", name: "Ava Thompson", role: "viewer" },
    { email: "noah.walker@techdirectsupport.demo", name: "Noah Walker", role: "viewer" },
    { email: "mia.robinson@techdirectsupport.demo", name: "Mia Robinson", role: "viewer" },
  ];

  const profiles = [];
  for (const person of DEMO_PEOPLE) {
    const authUser = await createAuthUser(person.email, person.password || "TdsDemo!2026", person.name);
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .insert({
        id: authUser.id,
        tenant_id: tenant.id,
        full_name: person.name,
        email: person.email,
        role: person.role,
        department: person.role === "viewer" ? pick(["Operations", "Finance", "Sales", "IT"], profiles.length) : "IT",
      })
      .select()
      .single();
    if (error) throw new Error(`user_profiles insert failed for ${person.email}: ${error.message}`);
    profiles.push(profile);
    console.log("  user:", person.email, person.role);
  }
  const admin = profiles[0];
  const staff = profiles.slice(1);

  // ---- Categories ----
  const CATEGORY_DEFS = [
    { name: "Laptops", code: "LAP", models: ["Dell Latitude 5440", "Lenovo ThinkPad T14", "HP EliteBook 840", "Apple MacBook Pro 14"] },
    { name: "Desktops", code: "DSK", models: ["Dell OptiPlex 7010", "HP ProDesk 600"] },
    { name: "Monitors", code: "MON", models: ["Dell P2422H", "LG 27UL850"] },
    { name: "Docking Stations", code: "DOC", models: ["Dell WD19S", "Lenovo ThinkPad USB-C Dock"] },
    { name: "Projectors", code: "PRJ", models: ["Epson EB-2247U", "BenQ MW612"] },
    { name: "Tablets", code: "TAB", models: ["iPad Air", "Samsung Galaxy Tab S9"] },
    { name: "Mobile Phones", code: "PHN", models: ["iPhone 14", "Samsung Galaxy S23"] },
    { name: "Networking Equipment", code: "NET", models: ["Cisco Catalyst 9200", "Ubiquiti UniFi Switch"] },
    { name: "AV Equipment", code: "AVE", models: ["Shure MXA920", "Poly Studio X50"] },
    { name: "Vehicles", code: "VEH", models: ["Toyota HiAce", "Ford Ranger"] },
  ];
  const categories = await insertInChunks(
    "asset_categories",
    CATEGORY_DEFS.map((c) => ({ tenant_id: tenant.id, name: c.name, code: c.code }))
  );
  console.log("Created", categories.length, "categories");

  // ---- Locations ----
  const LOCATION_DEFS = [
    { name: "Sydney HQ", address: "1 George St, Sydney NSW 2000", contact_name: "Sarah Mitchell", contact_phone: "02 9000 1000", lat: -33.8688, lng: 151.2093 },
    { name: "Melbourne Office", address: "120 Collins St, Melbourne VIC 3000", contact_name: "James Chen", contact_phone: "03 9000 2000", lat: -37.8136, lng: 144.9631 },
    { name: "Brisbane Warehouse", address: "45 Ann St, Brisbane QLD 4000", contact_name: "Priya Nair", contact_phone: "07 3000 3000", lat: -27.4698, lng: 153.0251 },
    { name: "Perth Site", address: "10 St Georges Tce, Perth WA 6000", contact_name: "Liam O'Connor", contact_phone: "08 9000 4000", lat: -31.9505, lng: 115.8605 },
  ];
  const locations = await insertInChunks(
    "locations",
    LOCATION_DEFS.map((l) => ({ tenant_id: tenant.id, ...l }))
  );
  console.log("Created", locations.length, "locations");
  const sydneyHQ = locations.find((l) => l.name === "Sydney HQ");

  // ---- Assets ----
  const STATUS_PLAN = [
    ["ordered", 5], ["received", 5], ["in_stock", 35], ["assigned", 55], ["in_use", 95],
    ["maintenance", 10], ["in_transit", 5], ["missing", 3], ["returned", 7], ["disposal", 15], ["written_off", 15],
  ];
  const statusSequence = STATUS_PLAN.flatMap(([status, count]) => Array(count).fill(status));

  const assetsToInsert = [];
  let serialCounter = 100000;
  let tagCounters = Object.fromEntries(CATEGORY_DEFS.map((c) => [c.code, 3000]));

  for (let i = 0; i < 250; i++) {
    const category = pick(CATEGORY_DEFS, i);
    const status = statusSequence[i];
    const location = pick(LOCATION_DEFS, i + 2);
    const model = pick(category.models, i);
    const [manufacturer, ...modelParts] = model.split(" ");
    const hasCustodian = !["ordered", "received", "in_stock", "returned", "disposal", "written_off"].includes(status) || i % 6 === 0;
    const custodian = hasCustodian ? pick(staff, i) : null;
    const tag = `${category.code}-${tagCounters[category.code]++}`;
    const warrantyMonths = pick([12, 24, 36], i);
    const purchaseDaysAgo = 30 + (i % 900);
    const purchaseDate = daysFromNow(-purchaseDaysAgo);
    const warrantyExpiry = daysFromNow(warrantyMonths * 30 - purchaseDaysAgo);
    const locRow = locations.find((l) => l.name === location.name);
    const jitterLat = (Math.random() - 0.5) * 0.01;
    const jitterLng = (Math.random() - 0.5) * 0.01;

    assetsToInsert.push({
      tenant_id: tenant.id,
      asset_tag: tag,
      name: model,
      category_id: categories.find((c) => c.code === category.code).id,
      manufacturer,
      model: modelParts.join(" "),
      serial_number: `SN${serialCounter++}`,
      purchase_date: purchaseDate,
      purchase_price: pick([899, 1299, 1899, 2499, 349, 599, 4200, 55000], i),
      supplier: pick(["Dell Direct", "Ingram Micro", "Data#3", "Officeworks Business"], i),
      assigned_to: custodian?.id ?? null,
      department: custodian?.department ?? null,
      cost_centre: custodian ? `CC-${1000 + (i % 8)}` : null,
      home_location_id: locRow.id,
      current_location_id: locRow.id,
      current_lat: locRow.lat + jitterLat,
      current_lng: locRow.lng + jitterLng,
      last_seen_at: new Date(Date.now() - (i % 72) * 3600 * 1000).toISOString(),
      warranty_provider: pick(["Dell TechDirect", "HP Care Pack", "Lenovo Premier", "Apple GSX"], i),
      warranty_start: purchaseDate,
      warranty_expiry: warrantyExpiry,
      status,
      archived: false,
    });
  }

  // Showcase assets for the demo script
  const lap1024Index = assetsToInsert.findIndex((a) => a.status === "missing");
  assetsToInsert[lap1024Index] = {
    ...assetsToInsert[lap1024Index],
    asset_tag: "LAP-1024",
    name: "Dell Latitude 5440",
    manufacturer: "Dell",
    model: "Latitude 5440",
    assigned_to: staff[0].id,
    department: staff[0].department,
    status: "missing",
  };

  const prj005Index = assetsToInsert.findIndex((a) => a.asset_tag.startsWith("PRJ-"));
  assetsToInsert[prj005Index] = {
    ...assetsToInsert[prj005Index],
    asset_tag: "PRJ-005",
    name: "Epson EB-2247U",
    manufacturer: "Epson",
    model: "EB-2247U",
    home_location_id: sydneyHQ.id,
    current_location_id: sydneyHQ.id,
    current_lat: sydneyHQ.lat,
    current_lng: sydneyHQ.lng,
    status: "in_use",
  };

  const insertedAssets = await insertInChunks("assets", assetsToInsert, 50);
  console.log("Created", insertedAssets.length, "assets");

  // ---- Lifecycle events (one per asset: creation into its current status) ----
  const lifecycleRows = insertedAssets.map((a) => ({
    tenant_id: tenant.id,
    asset_id: a.id,
    from_status: null,
    to_status: a.status,
    changed_by: admin.id,
    note: "Seeded demo record.",
  }));
  await insertInChunks("asset_lifecycle_events", lifecycleRows, 100);

  // ---- Geofence: Sydney HQ approved zone governing PRJ-005 ----
  const prj005 = insertedAssets.find((a) => a.asset_tag === "PRJ-005");
  const lap1024 = insertedAssets.find((a) => a.asset_tag === "LAP-1024");

  const { data: geofence, error: geofenceError } = await supabase
    .from("geofences")
    .insert({
      tenant_id: tenant.id,
      location_id: sydneyHQ.id,
      name: "Sydney HQ — approved zone",
      shape_type: "circle",
      shape: { center: [sydneyHQ.lat, sydneyHQ.lng], radius_m: 300 },
      enabled: true,
    })
    .select()
    .single();
  if (geofenceError) throw new Error(geofenceError.message);

  await supabase.from("geofence_assets").insert({ geofence_id: geofence.id, asset_id: prj005.id });
  console.log("Created geofence governing PRJ-005 at Sydney HQ");

  // ---- Alerts (exactly 5 open, matching the demo dashboard numbers) ----
  const missingAssets = insertedAssets.filter((a) => a.status === "missing");
  const warrantySoon = insertedAssets.find((a) => a.warranty_expiry && a.warranty_expiry <= daysFromNow(30) && a.warranty_expiry >= daysFromNow(0));
  const breachAsset = insertedAssets.find((a) => a.asset_tag.startsWith("VEH-"));

  const alertRows = [
    ...missingAssets.map((a) => ({
      tenant_id: tenant.id,
      type: "missing_asset",
      severity: "critical",
      asset_id: a.id,
      location_id: a.current_location_id,
      reason: `${a.name} (${a.asset_tag}) is marked missing and requires investigation.`,
      status: "open",
      details: {},
    })),
    warrantySoon && {
      tenant_id: tenant.id,
      type: "warranty_expiry",
      severity: "medium",
      asset_id: warrantySoon.id,
      location_id: warrantySoon.current_location_id,
      reason: `${warrantySoon.name} (${warrantySoon.asset_tag}) warranty expires on ${warrantySoon.warranty_expiry}.`,
      status: "open",
      details: {},
    },
    breachAsset && {
      tenant_id: tenant.id,
      type: "geofence_breach",
      severity: "critical",
      asset_id: breachAsset.id,
      location_id: breachAsset.current_location_id,
      reason: `${breachAsset.name} (${breachAsset.asset_tag}) left its approved zone.`,
      status: "open",
      details: { lat: breachAsset.current_lat, lng: breachAsset.current_lng },
    },
  ].filter(Boolean);

  await insertInChunks("alerts", alertRows, 20);
  console.log("Created", alertRows.length, "open alerts");

  // ---- Helpdesk tickets ----
  const ticketRows = [
    {
      tenant_id: tenant.id,
      subject: "Company laptop is missing",
      description: "My laptop has been stolen from the Sydney office. I last saw it at my desk yesterday afternoon.",
      status: "open",
      priority: "critical",
      category: "missing_asset",
      requester_id: staff[0].id,
      related_asset_id: lap1024.id,
    },
    {
      tenant_id: tenant.id,
      subject: "Projector not connecting in Boardroom 2",
      description: "The Epson projector in Boardroom 2 (Sydney HQ) won't accept an HDMI signal from the room PC.",
      status: "in_progress",
      priority: "medium",
      category: "asset_issue",
      requester_id: staff[1].id,
      related_asset_id: prj005.id,
      assigned_to: staff[2].id,
    },
    {
      tenant_id: tenant.id,
      subject: "Need a new dock for home office",
      description: "Requesting a docking station to support two external monitors at home.",
      status: "waiting",
      priority: "low",
      category: "general_support",
      requester_id: staff[3].id,
    },
    {
      tenant_id: tenant.id,
      subject: "Cannot locate warehouse forklift on the map",
      description: "The Brisbane warehouse forklift hasn't reported a location in two days.",
      status: "open",
      priority: "high",
      category: "tracking_issue",
      requester_id: staff[2].id,
    },
  ];
  const tickets = await insertInChunks("helpdesk_tickets", ticketRows, 10);
  const missingLaptopTicket = tickets.find((t) => t.subject.includes("missing"));
  if (missingLaptopTicket) {
    await supabase.from("ticket_comments").insert({
      tenant_id: tenant.id,
      ticket_id: missingLaptopTicket.id,
      author_id: staff[1].id,
      body: "Checking building security footage now — will update within the hour.",
      is_ai: false,
    });
  }
  console.log("Created", tickets.length, "helpdesk tickets");

  console.log("\nSeed complete.");
  console.log(`Log in with: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
