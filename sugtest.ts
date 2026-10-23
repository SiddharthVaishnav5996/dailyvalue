import { suggestionItems } from "@/lib/catalog/suggestions";
import type { AIItem } from "@/lib/types";

function item(name: string, category: string, catalogId?: string): AIItem {
  return { rowIds: [], name, brandHint: null, category, department: "grocery",
    catalogId: catalogId ?? null, searchTerms: [], quantity: 1, packSize: null, estimatedPrice: null };
}

const cheesecake = [item("Cream Cheese","Dairy","cream-cheese"), item("Sugar","Pantry"), item("Eggs","Dairy"), item("Graham crackers","Bakery")];
const bbq = [item("Ground beef","Meat"), item("Burger buns","Bakery"), item("Cheddar","Dairy")];
const mattress = [item("Queen mattress","Furniture")];

for (const [label, items, q] of [["cheesecake", cheesecake, "blueberry cheesecake"],
                                 ["bbq", bbq, "backyard bbq for 6"],
                                 ["mattress", mattress, "queen mattress"]] as const) {
  const picks = suggestionItems(items as AIItem[], q);
  console.log(`\n${label} ("${q}") ->`);
  for (const p of picks) console.log(`   ${p.category.padEnd(12)} ${p.name}`);
}

// determinism + query sensitivity
const a = suggestionItems(cheesecake, "blueberry cheesecake").map(p=>p.name).join("|");
const b = suggestionItems(cheesecake, "blueberry cheesecake").map(p=>p.name).join("|");
const c = suggestionItems(cheesecake, "lemon cheesecake").map(p=>p.name).join("|");
console.log("\nsame query twice identical:", a === b);
console.log("different query differs:   ", a !== c);
