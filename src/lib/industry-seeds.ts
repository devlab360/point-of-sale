import { v4 as uuidv4 } from "uuid";

type SeedData = {
  categories: { id: string; name: string; color: string; icon: string; count: number }[];
  units: { id: string; name: string; short: string }[];
  settings: { storeName: string; headerNote: string };
};

export const INDUSTRY_SEEDS: Record<string, SeedData> = {
  "Saloon & Spa": {
    categories: [
      { id: uuidv4(), name: "Haircut", color: "oklch(0.7 0.1 200)", icon: "✂️", count: 0 },
      {
        id: uuidv4(),
        name: "Facial & Skincare",
        color: "oklch(0.8 0.15 320)",
        icon: "💆",
        count: 0,
      },
      { id: uuidv4(), name: "Massage Therapy", color: "oklch(0.75 0.1 250)", icon: "🌿", count: 0 },
      { id: uuidv4(), name: "Products", color: "oklch(0.6 0.1 100)", icon: "🧴", count: 0 },
    ],
    units: [
      { id: uuidv4(), name: "Service", short: "svc" },
      { id: uuidv4(), name: "Bottle", short: "btl" },
    ],
    settings: { storeName: "My Saloon & Spa", headerNote: "Welcome to our Spa" },
  },
  "Grocery Shop": {
    categories: [
      { id: uuidv4(), name: "Vegetables", color: "oklch(0.65 0.15 150)", icon: "🥬", count: 0 },
      { id: uuidv4(), name: "Fruits", color: "oklch(0.7 0.15 40)", icon: "🍎", count: 0 },
      { id: uuidv4(), name: "Dairy & Bakery", color: "oklch(0.85 0.1 90)", icon: "🧀", count: 0 },
      { id: uuidv4(), name: "Snacks", color: "oklch(0.6 0.15 30)", icon: "🍪", count: 0 },
    ],
    units: [
      { id: uuidv4(), name: "Kilogram", short: "kg" },
      { id: uuidv4(), name: "Piece", short: "pcs" },
      { id: uuidv4(), name: "Liter", short: "L" },
    ],
    settings: { storeName: "Fresh Grocery", headerNote: "Thank you for shopping with us!" },
  },
  "Hotel & Restaurant": {
    categories: [
      { id: uuidv4(), name: "Appetizers", color: "oklch(0.7 0.15 40)", icon: "🥗", count: 0 },
      { id: uuidv4(), name: "Main Course", color: "oklch(0.6 0.15 30)", icon: "🍝", count: 0 },
      { id: uuidv4(), name: "Desserts", color: "oklch(0.8 0.1 320)", icon: "🍰", count: 0 },
      { id: uuidv4(), name: "Beverages", color: "oklch(0.7 0.1 200)", icon: "🍷", count: 0 },
    ],
    units: [
      { id: uuidv4(), name: "Serving", short: "srv" },
      { id: uuidv4(), name: "Glass", short: "gls" },
    ],
    settings: { storeName: "My Restaurant", headerNote: "Enjoy your meal!" },
  },
  "Beauty and Cosmetics": {
    categories: [
      { id: uuidv4(), name: "Makeup", color: "oklch(0.7 0.15 340)", icon: "💄", count: 0 },
      { id: uuidv4(), name: "Skincare", color: "oklch(0.8 0.1 320)", icon: "🧴", count: 0 },
      { id: uuidv4(), name: "Haircare", color: "oklch(0.6 0.1 200)", icon: "🧴", count: 0 },
      { id: uuidv4(), name: "Fragrances", color: "oklch(0.75 0.15 40)", icon: "✨", count: 0 },
    ],
    units: [
      { id: uuidv4(), name: "Piece", short: "pcs" },
      { id: uuidv4(), name: "Milliliter", short: "ml" },
    ],
    settings: { storeName: "Beauty Store", headerNote: "Discover your true beauty." },
  },
  "Super Market": {
    categories: [
      { id: uuidv4(), name: "Produce", color: "oklch(0.7 0.15 150)", icon: "🥦", count: 0 },
      { id: uuidv4(), name: "Meat & Poultry", color: "oklch(0.6 0.15 30)", icon: "🥩", count: 0 },
      { id: uuidv4(), name: "Pantry", color: "oklch(0.75 0.1 70)", icon: "🥫", count: 0 },
      { id: uuidv4(), name: "Household", color: "oklch(0.6 0.1 200)", icon: "🧻", count: 0 },
    ],
    units: [
      { id: uuidv4(), name: "Piece", short: "pcs" },
      { id: uuidv4(), name: "Kilogram", short: "kg" },
    ],
    settings: { storeName: "Supermarket", headerNote: "Everything you need under one roof!" },
  },
  "Hyper Market": {
    categories: [
      { id: uuidv4(), name: "Groceries", color: "oklch(0.7 0.1 150)", icon: "🛒", count: 0 },
      { id: uuidv4(), name: "Electronics", color: "oklch(0.6 0.1 220)", icon: "📱", count: 0 },
      { id: uuidv4(), name: "Clothing", color: "oklch(0.7 0.1 320)", icon: "👕", count: 0 },
      { id: uuidv4(), name: "Home & Living", color: "oklch(0.65 0.1 50)", icon: "🛋️", count: 0 },
    ],
    units: [{ id: uuidv4(), name: "Piece", short: "pcs" }],
    settings: { storeName: "Hypermarket", headerNote: "Big choices, bigger savings!" },
  },
  "Home Decor & Furniture": {
    categories: [
      { id: uuidv4(), name: "Living Room", color: "oklch(0.6 0.1 50)", icon: "🛋️", count: 0 },
      { id: uuidv4(), name: "Bedroom", color: "oklch(0.7 0.1 250)", icon: "🛏️", count: 0 },
      { id: uuidv4(), name: "Decor", color: "oklch(0.8 0.15 40)", icon: "🖼️", count: 0 },
      { id: uuidv4(), name: "Lighting", color: "oklch(0.85 0.1 90)", icon: "💡", count: 0 },
    ],
    units: [
      { id: uuidv4(), name: "Item", short: "itm" },
      { id: uuidv4(), name: "Set", short: "set" },
    ],
    settings: { storeName: "Home Decor", headerNote: "Making your house a home." },
  },
  Apparel: {
    categories: [
      { id: uuidv4(), name: "Men's Clothing", color: "oklch(0.6 0.1 220)", icon: "👔", count: 0 },
      { id: uuidv4(), name: "Women's Clothing", color: "oklch(0.7 0.1 340)", icon: "👗", count: 0 },
      { id: uuidv4(), name: "Kids", color: "oklch(0.75 0.15 150)", icon: "🧸", count: 0 },
      { id: uuidv4(), name: "Footwear", color: "oklch(0.6 0.1 30)", icon: "👟", count: 0 },
    ],
    units: [
      { id: uuidv4(), name: "Piece", short: "pcs" },
      { id: uuidv4(), name: "Pair", short: "pr" },
    ],
    settings: { storeName: "Apparel Store", headerNote: "Wear your style." },
  },
  Electronics: {
    categories: [
      { id: uuidv4(), name: "Smartphones", color: "oklch(0.6 0.1 220)", icon: "📱", count: 0 },
      { id: uuidv4(), name: "Laptops", color: "oklch(0.6 0.1 200)", icon: "💻", count: 0 },
      { id: uuidv4(), name: "Accessories", color: "oklch(0.5 0.1 250)", icon: "🎧", count: 0 },
      { id: uuidv4(), name: "Appliances", color: "oklch(0.7 0.1 50)", icon: "📺", count: 0 },
    ],
    units: [{ id: uuidv4(), name: "Unit", short: "unt" }],
    settings: { storeName: "Electronics Hub", headerNote: "Connecting the future." },
  },
  "Books & Toys": {
    categories: [
      { id: uuidv4(), name: "Fiction", color: "oklch(0.6 0.1 200)", icon: "📚", count: 0 },
      { id: uuidv4(), name: "Non-Fiction", color: "oklch(0.7 0.1 150)", icon: "📘", count: 0 },
      { id: uuidv4(), name: "Board Games", color: "oklch(0.8 0.15 40)", icon: "🎲", count: 0 },
      { id: uuidv4(), name: "Action Figures", color: "oklch(0.6 0.15 30)", icon: "🤖", count: 0 },
    ],
    units: [{ id: uuidv4(), name: "Item", short: "itm" }],
    settings: { storeName: "Books & Toys Store", headerNote: "Knowledge and fun in one place." },
  },
  "Pharmacy & Medical": {
    categories: [
      {
        id: uuidv4(),
        name: "Tablets & Capsules",
        color: "oklch(0.6 0.1 200)",
        icon: "💊",
        count: 0,
      },
      {
        id: uuidv4(),
        name: "Syrups & Liquids",
        color: "oklch(0.7 0.15 150)",
        icon: "🧴",
        count: 0,
      },
      { id: uuidv4(), name: "Injections", color: "oklch(0.6 0.1 250)", icon: "💉", count: 0 },
      { id: uuidv4(), name: "OTC & Wellness", color: "oklch(0.75 0.1 100)", icon: "🩹", count: 0 },
      { id: uuidv4(), name: "Medical Devices", color: "oklch(0.65 0.1 220)", icon: "🩺", count: 0 },
      { id: uuidv4(), name: "Personal Care", color: "oklch(0.8 0.15 320)", icon: "🧼", count: 0 },
    ],
    units: [
      { id: uuidv4(), name: "Strip", short: "str" },
      { id: uuidv4(), name: "Bottle", short: "btl" },
      { id: uuidv4(), name: "Piece", short: "pcs" },
      { id: uuidv4(), name: "Box", short: "box" },
      { id: uuidv4(), name: "Tube", short: "tube" },
      { id: uuidv4(), name: "Vial", short: "vial" },
    ],
    settings: { storeName: "My Pharmacy", headerNote: "Your health is our priority." },
  },
};
