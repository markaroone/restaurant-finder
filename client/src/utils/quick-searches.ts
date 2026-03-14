import {
  Beef,
  Beer,
  Cake,
  Coffee,
  Croissant,
  EggFried,
  Fish,
  Flame,
  IceCream,
  type LucideIcon,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  Utensils,
  UtensilsCrossed,
  Wine,
} from 'lucide-react';

export type QuickSearchItem = {
  label: string;
  query: string;
  icon: LucideIcon;
};

// --- Time block pools ---

const MORNING_POOL: QuickSearchItem[] = [
  { label: 'Breakfast', query: 'breakfast spots', icon: EggFried },
  { label: 'Brunch', query: 'brunch places near me', icon: Croissant },
  { label: 'Coffee', query: 'coffee shops', icon: Coffee },
  { label: 'Bakery', query: 'bakeries', icon: Cake },
  { label: 'Sandwiches', query: 'sandwiches near me', icon: Sandwich },
];

const LUNCH_POOL: QuickSearchItem[] = [
  { label: 'Tacos', query: 'tacos near me', icon: Flame },
  { label: 'Salad', query: 'healthy salad', icon: Salad },
  { label: 'Sandwiches', query: 'sandwiches near me', icon: Sandwich },
  { label: 'Burgers', query: 'burgers near me', icon: Beef },
  { label: 'Soup', query: 'soup places', icon: Soup },
  { label: 'Sushi', query: 'sushi near me', icon: Fish },
];

const DINNER_POOL: QuickSearchItem[] = [
  { label: 'Italian', query: 'italian restaurants', icon: Wine },
  { label: 'Steakhouse', query: 'steakhouse', icon: Beef },
  { label: 'Sushi', query: 'sushi near me', icon: Fish },
  { label: 'BBQ', query: 'bbq restaurants', icon: Flame },
  { label: 'Seafood', query: 'seafood', icon: Fish },
  { label: 'Thai', query: 'thai food near me', icon: UtensilsCrossed },
  { label: 'Indian', query: 'indian restaurants', icon: Utensils },
];

const LATE_NIGHT_POOL: QuickSearchItem[] = [
  { label: 'Pizza', query: 'pizza nearby', icon: Pizza },
  { label: 'Late Night Diner', query: 'late night diner', icon: Coffee },
  { label: 'Fast Food', query: 'fast food', icon: Utensils },
  { label: 'Bars', query: 'bars near me', icon: Beer },
  { label: 'Dessert', query: 'dessert places', icon: IceCream },
];

const ANYTIME_POOL: QuickSearchItem[] = [
  { label: 'Healthy', query: 'healthy food', icon: Salad },
  { label: 'Vegetarian', query: 'vegetarian restaurants', icon: Salad },
  { label: 'Pizza', query: 'pizza nearby', icon: Pizza },
  { label: 'Burgers', query: 'burgers near me', icon: Beef },
  { label: 'Tacos', query: 'tacos near me', icon: Flame },
  { label: 'Thai', query: 'thai food near me', icon: UtensilsCrossed },
];

/**
 * Shuffles an array in place using Fisher-Yates and returns it.
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j] as T, arr[i] as T];
  }
  return arr;
}

/**
 * Returns exactly `limit` quick searches based on the current time of day.
 * It weights the selection heavily towards the current time block, filling
 * remaining slots with randomized options from the "Anytime" pool.
 */
export function getQuickSearches(
  currentDate: Date = new Date(),
  limit: number = 6,
): QuickSearchItem[] {
  const hour = currentDate.getHours();
  let primaryPool: QuickSearchItem[] = [];

  // Determine primary pool based on time block
  if (hour >= 6 && hour < 11) {
    primaryPool = MORNING_POOL; // 6am - 10:59am
  } else if (hour >= 11 && hour < 16) {
    primaryPool = LUNCH_POOL; // 11am - 3:59pm
  } else if (hour >= 16 && hour < 22) {
    primaryPool = DINNER_POOL; // 4pm - 9:59pm
  } else {
    primaryPool = LATE_NIGHT_POOL; // 10pm - 5:59am
  }

  // We want to pick up to 4 items from the primary pool
  const numPrimaryItems = Math.min(4, primaryPool.length);
  const selectedPrimary = shuffleArray(primaryPool).slice(0, numPrimaryItems);

  // Keep track of labels we've already picked to avoid duplicates
  const pickedLabels = new Set(selectedPrimary.map((item) => item.label));

  // Fill the rest of the slots from the anytime pool
  const availableAnytime = ANYTIME_POOL.filter(
    (item) => !pickedLabels.has(item.label),
  );

  const additionalItemsNeeded = Math.max(0, limit - selectedPrimary.length);
  const selectedAnytime = shuffleArray(availableAnytime).slice(
    0,
    additionalItemsNeeded,
  );

  // Combine and shuffle one last time so the "anytime" items aren't always at the end
  const finalSelection = [...selectedPrimary, ...selectedAnytime];
  return shuffleArray(finalSelection);
}
