import type { Product } from "./types";

export const CATALOG: Product[] = [
  {
    id: "red-scarf",
    name: "Red Scarf",
    aliases: ["red scarf", "red scarves", "lal scarf", "red stole"],
    price: 180,
    hsn: "6214",
    unit: "pcs",
    color: "Red",
  },
  {
    id: "blue-dupatta",
    name: "Blue Dupatta",
    aliases: ["blue dupatta", "blue dupatte", "neela dupatta", "blue duppata"],
    price: 250,
    hsn: "6214",
    unit: "pcs",
    color: "Blue",
  },
  {
    id: "green-stole",
    name: "Green Stole",
    aliases: ["green stole", "green stoles", "hara stole", "green scarf"],
    price: 220,
    hsn: "6214",
    unit: "pcs",
    color: "Green",
  },
  {
    id: "black-kurta-m",
    name: "Black Kurta (M)",
    aliases: ["black kurta", "black kurtas", "kala kurta"],
    price: 450,
    hsn: "6204",
    unit: "pcs",
    color: "Black",
  },
  {
    id: "white-kurta-l",
    name: "White Kurta (L)",
    aliases: ["white kurta", "white kurtas", "safed kurta"],
    price: 480,
    hsn: "6204",
    unit: "pcs",
    color: "White",
  },
  {
    id: "maroon-dupatta",
    name: "Maroon Dupatta",
    aliases: ["maroon dupatta", "maroon dupatte", "wine dupatta"],
    price: 280,
    hsn: "6214",
    unit: "pcs",
    color: "Maroon",
  },
  {
    id: "beige-scarf",
    name: "Beige Scarf",
    aliases: ["beige scarf", "cream scarf", "offwhite scarf"],
    price: 190,
    hsn: "6214",
    unit: "pcs",
    color: "Beige",
  },
  {
    id: "pink-dupatta",
    name: "Pink Dupatta",
    aliases: ["pink dupatta", "pink dupatte", "gulabi dupatta"],
    price: 260,
    hsn: "6214",
    unit: "pcs",
    color: "Pink",
  },
  {
    id: "navy-stole",
    name: "Navy Stole",
    aliases: ["navy stole", "navy stoles", "dark blue stole"],
    price: 240,
    hsn: "6214",
    unit: "pcs",
    color: "Navy",
  },
  {
    id: "cotton-saree",
    name: "Cotton Saree",
    aliases: ["cotton saree", "cotton saari", "saree", "saari"],
    price: 850,
    hsn: "5407",
    unit: "pcs",
  },
];

export function findProduct(
  name: string,
  color?: string,
  size?: string,
): Product | undefined {
  const hay = `${color ?? ""} ${name} ${size ?? ""}`.toLowerCase().trim();
  const exact = CATALOG.find((p) =>
    p.aliases.some((a) => hay.includes(a) || a.includes(hay)),
  );
  if (exact) return exact;
  return CATALOG.find((p) => {
    const tokens = p.name.toLowerCase().split(/\s+/);
    return tokens.every((t) => hay.includes(t) || t.length <= 2);
  });
}
