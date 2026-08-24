import type { ChatPanelMessage } from "@/components/ChatPanel/ChatPanel";
import type { ResultTableRow } from "@/components/ResultTable/ResultTable";

/**
 * Demo content for the AI chat result page, matching the design frame.
 * The live pipeline behind this is POST /api/recipe — see lib/types.ts for
 * the shape it returns.
 */

export const RESULT_CONVERSATION: ChatPanelMessage[] = [
  {
    id: "1",
    role: "user",
    text: "Help me prepare a blueberry cheesecake. List down the ingredients. Also,suggest some good canadian wine.",
  },
  {
    id: "2",
    role: "user",
    text: "I don’t like Digestive Biscuit. Suggest me something else.",
  },
  {
    id: "3",
    role: "ai",
    text: "I’ve updated the base to use crushed Oreo cookies (cream removed) instead of biscuits.\n\nIf you’d like, I can also adjust the butter or sugar quantity slightly to balance the sweetness.",
  },
  {
    id: "4",
    role: "user",
    text: "Oreo works! Can we make it a no-bake version too?",
  },
  {
    id: "5",
    role: "ai",
    text: "Absolutely. The filling now sets in the fridge with a little gelatin instead of baking — chill it for at least 6 hours, ideally overnight, so it slices cleanly.",
  },
  {
    id: "6",
    role: "user",
    text: "How many does it serve?",
  },
  {
    id: "7",
    role: "ai",
    text: "As written it’s a 9-inch cake — about 12 slices. Say the word and I’ll scale every quantity up or down.",
  },
  {
    id: "8",
    role: "user",
    text: "12 is perfect.",
  },
  {
    id: "9",
    role: "user",
    text: "Which of the wines pairs best with the blueberry topping?",
  },
  {
    id: "10",
    role: "ai",
    text: "The Inniskillin Icewine is my top pick — its sweetness and bright acidity balance the tangy cream cheese. If you’d prefer something lighter, the Mission Hill Riesling is a lovely match too.",
  },
  {
    id: "11",
    role: "user",
    text: "Is icewine easy to find near me in Toronto?",
  },
  {
    id: "12",
    role: "ai",
    text: "Yes — Inniskillin and Peller Estates are both Niagara wineries, so most LCBO stores carry the 375ml dessert bottles. I’ve kept both on your list below.",
  },
];

interface ResultTableData {
  title: string;
  columns: string[];
  rows: ResultTableRow[];
  groupFirstColumn?: boolean;
}

/**
 * Every row carries its category; ResultTable prints it once per group. That
 * way deleting the top row of a group promotes the label to the next row
 * rather than leaving the group unlabelled.
 */
export const INGREDIENTS_TABLE: ResultTableData = {
  title: "🫐 Blueberry Cheesecake – Ingredients",
  columns: ["CATEGORY", "ITEM", "QUANTITY"],
  groupFirstColumn: true,
  rows: [
    { id: "i1", cells: ["Biscuit Base", "Oreo Biscuits", "200g"] },
    { id: "i2", cells: ["Biscuit Base", "Unsalted butter (melted)", "100g"] },
    { id: "i3", cells: ["Biscuit Base", "Sugar (optional)", "1–2 tbsp"] },
    { id: "i4", cells: ["Cheesecake Filling", "Cream cheese", "500g"] },
    { id: "i5", cells: ["Cheesecake Filling", "Granulated sugar", "1 cup (200g)"] },
    { id: "i6", cells: ["Cheesecake Filling", "Heavy cream", "1 cup (240ml)"] },
    { id: "i7", cells: ["Cheesecake Filling", "Eggs", "2 large"] },
    { id: "i8", cells: ["Cheesecake Filling", "Vanilla extract", "1 tsp"] },
    { id: "i9", cells: ["Cheesecake Filling", "Lemon juice", "1 tbsp"] },
    { id: "i10", cells: ["Cheesecake Filling", "Cornflour", "1 tbsp"] },
    { id: "i11", cells: ["Blueberry Topping", "Blueberries (fresh/frozen)", "1½ cups"] },
    { id: "i12", cells: ["Blueberry Topping", "Sugar", "¼ cup"] },
    { id: "i13", cells: ["Blueberry Topping", "Lemon juice", "1 tbsp"] },
  ],
};

export const WINE_TABLE: ResultTableData = {
  title: "🍷 Canadian Wine Pairing",
  columns: ["Wine Name", "Type", "Origin", "Notes"],
  rows: [
    {
      id: "w1",
      cells: ["Inniskillin Icewine", "Icewine", "Ontario", "Rich, sweet, high acidity"],
    },
    {
      id: "w2",
      cells: [
        "Jackson-Triggs Vidal Icewine",
        "Icewine",
        "Canada",
        "Sweet, honey & tropical notes",
      ],
    },
    {
      id: "w3",
      cells: [
        "Mission Hill Reserve Riesling",
        "Riesling",
        "British Columbia",
        "Semi-sweet, crisp acidity",
      ],
    },
    {
      id: "w4",
      cells: ["Peller Estates Icewine", "Icewine", "Ontario", "Luxurious, dessert-forward"],
    },
  ],
};
