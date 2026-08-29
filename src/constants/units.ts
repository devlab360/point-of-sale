import { OptionItem } from "./common";

export interface UnitPreset {
  name: string;
  short: string;
  description?: string;
}

export const STANDARD_UNIT_PRESETS: UnitPreset[] = [
  { name: "Pieces", short: "pcs", description: "Single count items, apparel, electronics" },
  { name: "Kilograms", short: "kg", description: "Bulk groceries, produce, materials" },
  { name: "Grams", short: "gm", description: "Spices, loose tea, precision weight" },
  { name: "Liters", short: "ltr", description: "Liquids, oils, beverages" },
  { name: "Milliliters", short: "ml", description: "Cosmetics, perfumes, medicine" },
  { name: "Boxes", short: "box", description: "Cartons, packaged box units" },
  { name: "Packs", short: "pack", description: "Multipacks, blister packs" },
  { name: "Meters", short: "m", description: "Fabrics, wires, piping, ropes" },
  { name: "Pairs", short: "pair", description: "Shoes, footwear, socks, gloves" },
  { name: "Dozens", short: "doz", description: "Eggs, bakery, stationery" },
  { name: "Rolls", short: "roll", description: "Thermal receipt paper, foil, tape" },
  { name: "Sets", short: "set", description: "Product kits, combo bundles" },
  { name: "Hours", short: "hrs", description: "Labor services, equipment rental" },
  { name: "Days", short: "days", description: "Daily bookings, rental duration" },
];

export const STANDARD_UNIT_OPTIONS: OptionItem[] = STANDARD_UNIT_PRESETS.map((p) => ({
  value: p.short,
  label: `${p.name} (${p.short})`,
  description: p.description,
}));
