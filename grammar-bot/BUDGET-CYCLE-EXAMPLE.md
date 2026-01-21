# Budget Cycle Example: Mid-Month Payment

Example configuration for tracking budget from a specific payment date rather than calendar month.

---

## Your Scenario

- **Payment Date:** January 5, 2026
- **Total Budget:** $550.00
- **Cycle Period:** 30 days (Jan 5 - Feb 4, 2026)

---

## Current System (Calendar Month)

The current system tracks by **calendar month** (Jan 1-31, Feb 1-28, etc.):

```javascript
// Current: Tracks January 1-31
getMonthlyBudgetStatus(); // Returns all days in January
```

**Example Output:**

```
Monthly Budget: $45.67 / $550.00
8.3% used
Remaining: $504.33
Days Tracked: 12 (Jan 1-12)
```

---

## Payment Cycle Tracking (What You Need)

To track from **January 5, 2026** onwards:

### Option 1: Environment Variables

Add to `.env`:

```bash
# Payment cycle configuration
PAYMENT_CYCLE_START_DATE=2026-01-05
PAYMENT_CYCLE_BUDGET=550.00
PAYMENT_CYCLE_DAYS=30

# Current monthly limit (for calendar month tracking)
MONTHLY_BUDGET_LIMIT=550.00
```

### Option 2: Example Calculation

**Current Date:** January 17, 2026

**Days Since Payment:** 12 days (Jan 5 - Jan 17)

**Usage Calculation:**

```javascript
// Track from Jan 5 onwards
const cycleStart = new Date('2026-01-05');
const today = new Date('2026-01-17');
const daysInCycle = Math.ceil((today - cycleStart) / (1000 * 60 * 60 * 24)); // 12 days

// Get all budget entries from Jan 5 onwards
const cycleEntries = Object.entries(budgetData).filter(([date]) => {
  const entryDate = new Date(date);
  return entryDate >= cycleStart;
});

// Calculate total cost
const cycleTotal = cycleEntries.reduce((sum, [_, entry]) => {
  return sum + (entry.totalCost || 0);
}, 0);

// Example result
{
  cycleStart: '2026-01-05',
  cycleEnd: '2026-02-04',
  daysInCycle: 30,
  daysUsed: 12,
  totalCost: 45.67,
  budgetLimit: 550.00,
  remainingBudget: 504.33,
  usagePercentage: 8.3,
  avgCostPerDay: 3.81
}
```

---

## Example Budget Display

### Current (Calendar Month)

```
Monthly Budget
$45.67 / $550.00
8.3% used
Remaining: $504.33
Days: 12 (Jan 1-12)
```

### Payment Cycle (Jan 5 - Feb 4)

```
Payment Cycle Budget
$45.67 / $550.00
8.3% used
Remaining: $504.33
Cycle: Jan 5 - Feb 4 (12/30 days)
Avg: $3.81/day
```

---

## Implementation Example

Here's how the budget command would display your payment cycle:

```javascript
// In budget.js command
const cycleStatus = await budgetMonitor.getPaymentCycleStatus();

// Display
{
  name: 'Payment Cycle Budget',
  value: `$${cycleStatus.totalCost.toFixed(2)} / $${cycleStatus.budgetLimit.toFixed(2)}\n` +
         `${cycleStatus.usagePercentage}% used\n` +
         `Remaining: $${cycleStatus.remainingBudget.toFixed(2)}\n` +
         `Cycle: ${cycleStatus.cycleStart} - ${cycleStatus.cycleEnd}\n` +
         `Days: ${cycleStatus.daysUsed}/${cycleStatus.daysInCycle}`
}
```

**Example Output:**

```
Payment Cycle Budget
$45.67 / $550.00
8.3% used
Remaining: $504.33
Cycle: 2026-01-05 - 2026-02-04
Days: 12/30
Avg: $3.81/day
```

---

## Data Structure Example

**budget.json** would contain:

```json
{
  "2026-01-05": {
    "date": "2026-01-05",
    "totalCost": 3.45,
    "totalRequests": 45,
    ...
  },
  "2026-01-06": {
    "date": "2026-01-06",
    "totalCost": 4.12,
    "totalRequests": 52,
    ...
  },
  ...
  "2026-01-17": {
    "date": "2026-01-17",
    "totalCost": 2.89,
    "totalRequests": 38,
    ...
  }
}
```

**Payment Cycle Calculation:**

- Filter entries: `date >= "2026-01-05" AND date <= "2026-02-04"`
- Sum `totalCost`: $45.67
- Count days: 12 days used
- Remaining: $550.00 - $45.67 = $504.33

---

## Configuration Options

### Simple: Use Calendar Month

```bash
# .env
MONTHLY_BUDGET_LIMIT=550.00
```

- Tracks Jan 1-31, Feb 1-28, etc.
- Resets on 1st of each month

### Advanced: Payment Cycle

```bash
# .env
PAYMENT_CYCLE_START_DATE=2026-01-05
PAYMENT_CYCLE_BUDGET=550.00
PAYMENT_CYCLE_DAYS=30
```

- Tracks from payment date
- Resets every 30 days from start date
- More accurate for actual billing cycles

---

## Example Timeline

**Payment Cycle: January 5 - February 4, 2026**

| Date      | Daily Cost | Cycle Total | Remaining   | Days Used |
| --------- | ---------- | ----------- | ----------- | --------- |
| Jan 5     | $3.45      | $3.45       | $546.55     | 1/30      |
| Jan 6     | $4.12      | $7.57       | $542.43     | 2/30      |
| Jan 10    | $5.23      | $28.45      | $521.55     | 6/30      |
| Jan 17    | $2.89      | $45.67      | $504.33     | 12/30     |
| Jan 25    | $6.12      | $78.34      | $471.66     | 20/30     |
| Feb 1     | $4.56      | $125.23     | $424.77     | 27/30     |
| Feb 4     | $3.21      | $142.89     | $407.11     | 30/30     |
| **Feb 5** | **$0.00**  | **$0.00**   | **$550.00** | **RESET** |

---

## Next Steps

Would you like me to:

1. **Add payment cycle support** to `budgetMonitor.js`?

   - New method: `getPaymentCycleStatus()`
   - Reads `PAYMENT_CYCLE_START_DATE` from `.env`
   - Calculates usage from payment date

2. **Update budget command** to show both?

   - Calendar month (current)
   - Payment cycle (new)

3. **Auto-reset on cycle end**?
   - Automatically reset budget when cycle ends
   - Track multiple cycles in history

Let me know which approach you prefer!
