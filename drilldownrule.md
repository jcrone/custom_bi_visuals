# Drilldown Donut — "Other" Category Grouping Rule

## The Rule

**20% Tail Rule:** Starting from the smallest segments, combine all items whose cumulative total is < 20% of the level's total into a single **"Other"** segment.

**Exception:** If there are **6 or fewer** categories at a level, show them all — never create an "Other" group, even if some items fall under the 20% threshold.

## How It Works

1. If ≤ 6 categories at this level → show all, done
2. Sort categories by value ascending (smallest first)
3. Walk from the smallest, accumulating values
4. Stop when adding the next item would reach or exceed 20% of the level total
5. All accumulated items become children of a new "Other" segment
6. Clicking "Other" drills into those grouped items, applying the same rule recursively

## Example

A company has **9 product categories** with these revenue shares:

| Category | Revenue | % of Total |
|----------|---------|-----------|
| Electronics | $400K | 32.0% |
| Clothing | $250K | 20.0% |
| Home & Garden | $200K | 16.0% |
| Sports | $150K | 12.0% |
| Automotive | $100K | 8.0% |
| Books | $50K | 4.0% |
| Toys | $40K | 3.2% |
| Pet Supplies | $35K | 2.8% |
| Office | $25K | 2.0% |

**Step 1 — Sort smallest first and accumulate:**

Office (2%) + Pet Supplies (2.8%) + Toys (3.2%) + Books (4%) = **12% cumulative** → under 20%, so these 4 become **"Other"**.

**Donut shows 6 segments:**
Electronics (32%), Clothing (20%), Home & Garden (16%), Sports (12%), Automotive (8%), **Other (12%)**

**Step 2 — Click "Other":** Drills into the 4 grouped items:

| Category | Revenue | % of Other |
|----------|---------|-----------|
| Books | $50K | 33.3% |
| Toys | $40K | 26.7% |
| Pet Supplies | $35K | 23.3% |
| Office | $25K | 16.7% |

Since there are only **4 categories (≤ 6)**, the exception kicks in — all shown individually, no further "Other" grouping.
