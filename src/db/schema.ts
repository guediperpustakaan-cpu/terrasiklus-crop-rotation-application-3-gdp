import {
  date,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const profiles = pgTable(
  "profiles",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("profiles_username_unique").on(table.username)],
);

export const farms = pgTable(
  "farms",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    location: varchar("location", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("farms_owner_id_idx").on(table.ownerId)],
);

export const plots = pgTable(
  "plots",
  {
    id: serial("id").primaryKey(),
    farmId: integer("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    area: real("area").notNull(),
    soilType: varchar("soil_type", { length: 120 }).notNull(),
  },
  (table) => [index("plots_farm_id_idx").on(table.farmId)],
);

export const plantFamilies = pgTable(
  "plant_families",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
  },
  (table) => [uniqueIndex("plant_families_name_unique").on(table.name)],
);

export const crops = pgTable(
  "crops",
  {
    id: serial("id").primaryKey(),
    commonName: varchar("common_name", { length: 120 }).notNull(),
    familyId: integer("family_id")
      .notNull()
      .references(() => plantFamilies.id, { onDelete: "restrict" }),
    nutrientDemand: varchar("nutrient_demand", { length: 24 }).notNull(),
  },
  (table) => [
    uniqueIndex("crops_common_name_unique").on(table.commonName),
    index("crops_family_id_idx").on(table.familyId),
  ],
);

export const plantings = pgTable(
  "plantings",
  {
    id: serial("id").primaryKey(),
    plotId: integer("plot_id")
      .notNull()
      .references(() => plots.id, { onDelete: "cascade" }),
    cropId: integer("crop_id")
      .notNull()
      .references(() => crops.id, { onDelete: "restrict" }),
    plantedOn: date("planted_on", { mode: "string" }).notNull(),
    harvestedOn: date("harvested_on", { mode: "string" }),
    notes: text("notes"),
  },
  (table) => [
    index("plantings_plot_planted_idx").on(table.plotId, table.plantedOn),
    index("plantings_crop_id_idx").on(table.cropId),
  ],
);

export const soilTests = pgTable(
  "soil_tests",
  {
    id: serial("id").primaryKey(),
    plotId: integer("plot_id")
      .notNull()
      .references(() => plots.id, { onDelete: "cascade" }),
    testedOn: date("tested_on", { mode: "string" }).notNull(),
    ph: real("ph").notNull(),
    n: real("n").notNull(),
    p: real("p").notNull(),
    k: real("k").notNull(),
    organicMatter: real("organic_matter").notNull(),
  },
  (table) => [index("soil_tests_plot_tested_idx").on(table.plotId, table.testedOn)],
);
