# Grammar Bot - Budget Management Guide

## 💰 Understanding OpenAI Costs

### Pricing Model (gpt-4o-mini)

**Current Rates** (as of 2024):
- **Input tokens**: $0.150 per 1M tokens
- **Output tokens**: $0.600 per 1M tokens

**What are tokens?**
- ~1 token = 4 characters
- ~1 token = 0.75 words
- Example: "Hello world" = ~2 tokens

---

## 📊 Cost Breakdown

### Average Grammar Check

**Typical message**: "I has a good day yesterday with my friends"

1. **Input tokens** (~150 tokens):
   - System prompt: ~80 tokens
   - User message: ~10 tokens
   - JSON schema: ~60 tokens

2. **Output tokens** (~75 tokens):
   - JSON response with errors and corrections

**Total Cost**: ~$0.00004 per check
**In perspective**: **25,000 checks per $1**

### Real-World Usage Examples

#### Small Server (10-20 active users)
- **Daily messages checked**: ~100
- **Daily cost**: ~$0.004 (0.4 cents)
- **Monthly cost**: ~$0.12

**Recommended Limits**:
```env
DAILY_BUDGET_LIMIT=0.50
MONTHLY_BUDGET_LIMIT=10.00
```

#### Medium Server (50-100 active users)
- **Daily messages checked**: ~500
- **Daily cost**: ~$0.02 (2 cents)
- **Monthly cost**: ~$0.60

**Recommended Limits**:
```env
DAILY_BUDGET_LIMIT=2.00
MONTHLY_BUDGET_LIMIT=50.00
```

#### Large Server (200+ active users)
- **Daily messages checked**: ~2,000
- **Daily cost**: ~$0.08 (8 cents)
- **Monthly cost**: ~$2.40

**Recommended Limits**:
```env
DAILY_BUDGET_LIMIT=5.00
MONTHLY_BUDGET_LIMIT=100.00
```

#### Very Active Server (500+ users)
- **Daily messages checked**: ~5,000
- **Daily cost**: ~$0.20 (20 cents)
- **Monthly cost**: ~$6.00

**Recommended Limits**:
```env
DAILY_BUDGET_LIMIT=10.00
MONTHLY_BUDGET_LIMIT=200.00
```

---

## ⚙️ Budget Configuration

### Environment Variables

```env
# Set daily limit (USD)
DAILY_BUDGET_LIMIT=5.00

# Set monthly limit (USD)
MONTHLY_BUDGET_LIMIT=100.00

# Optional: Set warning threshold (default 80%)
BUDGET_WARNING_THRESHOLD=0.8
```

### How It Works

1. **Every API call is tracked**
   - Input tokens counted
   - Output tokens counted
   - Cost calculated: (input × $0.00015) + (output × $0.0006)

2. **Daily budget monitoring**
   - Current spending stored in MongoDB
   - Checked before each API call
   - Auto-disables when limit reached

3. **Automatic reset**
   - Daily budget resets at midnight UTC
   - Monthly budget resets on 1st of month
   - Warning notifications at 80% usage

---

## 📈 Monitoring Budget

### Check Current Spending

```bash
# View today's budget
mongo grammar_bot
db.budgettrackings.findOne({
  date: new Date().toISOString().split('T')[0]
})
```

Output:
```javascript
{
  _id: ObjectId("..."),
  date: "2024-12-25",
  totalCost: 0.45,
  totalCalls: 11250,
  averageCostPerCall: 0.00004,
  limit: 5.00,
  createdAt: ISODate("2024-12-25T00:00:00Z"),
  updatedAt: ISODate("2024-12-25T14:30:00Z")
}
```

### User-Facing Budget Display

Users see remaining budget in `/check` command footer:
```
Budget: $4.55 remaining today
```

### Admin Budget Report

```bash
# Monthly spending summary
node scripts/budget-report.js

# Expected output:
December 2024 Budget Report
━━━━━━━━━━━━━━━━━━━━━━━━━
Total Spent: $12.34
Total Calls: 308,500
Average per Call: $0.00004
Days Remaining: 6
Projected Monthly: $15.75

Daily Breakdown:
  Dec 1:  $0.32 (8,000 calls)
  Dec 2:  $0.45 (11,250 calls)
  ...
```

---

## 🎯 Cost Optimization Strategies

### 1. Increase Cooldown Period

**Default**: 30 seconds
**Recommended**: 60-120 seconds for cost savings

```env
# Check each user max once per minute
AUTO_CHECK_COOLDOWN=60000

# Check each user max once per 2 minutes
AUTO_CHECK_COOLDOWN=120000
```

**Impact**: 50-66% cost reduction
**Trade-off**: Less frequent corrections

---

### 2. Increase Minimum Message Length

**Default**: 10 characters
**Recommended**: 20-30 characters

```env
# Only check messages 20+ characters
MIN_MESSAGE_LENGTH=20

# Only check messages 30+ characters
MIN_MESSAGE_LENGTH=30
```

**Impact**: 40-60% cost reduction
**Trade-off**: Short messages not checked

---

### 3. Manual-Only Mode

Disable auto-detection, require `/check` command:

```javascript
// events/messageCreate.js
// Comment out auto-detection logic
// Users must explicitly use /check
```

**Impact**: 90% cost reduction
**Trade-off**: Users must manually request checks

---

### 4. Channel Filtering

Only check specific channels:

```javascript
// events/messageCreate.js
const ALLOWED_CHANNELS = ['grammar-practice', 'writing-help'];

if (!ALLOWED_CHANNELS.includes(message.channel.name)) {
  return; // Skip this channel
}
```

**Impact**: Varies by channel activity
**Trade-off**: Limited coverage

---

### 5. User Opt-In System

Users must enable auto-check (default off):

```javascript
// Default autoCheckEnabled = false in User model
// Users run /toggle to enable
```

**Impact**: 70-80% cost reduction
**Trade-off**: Lower engagement

---

### 6. Time-Based Restrictions

Only check during specific hours:

```javascript
// Only check between 9 AM - 9 PM
const hour = new Date().getHours();
if (hour < 9 || hour > 21) {
  return; // Skip outside active hours
}
```

**Impact**: 50% cost reduction (12-hour window)
**Trade-off**: No overnight checking

---

## 🚨 Budget Alerts & Actions

### What Happens When Limits Are Reached?

#### Daily Limit Reached ($5.00/$5.00)
1. ✅ Auto-detection **disabled** for all users
2. ✅ `/check` command returns error message
3. ✅ Admin notification sent (if configured)
4. ✅ Resets automatically at midnight UTC

**User sees**:
```
❌ Daily budget limit reached!
Grammar checking will resume tomorrow.
Current usage: $5.00 / $5.00
```

#### 80% Warning ($4.00/$5.00)
1. ✅ Warning logged to console
2. ✅ Admin notification (if configured)
3. ✅ Continue normal operation

**Admin sees**:
```
⚠️  Budget Warning: 80% of daily limit used
Current: $4.00 / $5.00
Calls: 100,000
```

#### Monthly Limit Reached ($100/$100)
1. ✅ Auto-detection **disabled** until next month
2. ✅ `/check` command disabled
3. ✅ Admin notification
4. ✅ Resets on 1st of next month

---

## 📊 Budget Tracking Database Schema

```javascript
{
  date: "2024-12-25",           // YYYY-MM-DD
  totalCost: 4.55,              // USD spent today
  totalCalls: 113,750,          // API calls made
  averageCostPerCall: 0.00004,  // Average per call
  limit: 5.00,                  // Daily limit
  monthlyTotal: 45.67,          // Month-to-date spending
  monthlyLimit: 100.00,         // Monthly limit
  createdAt: Date,
  updatedAt: Date
}
```

---

## 💡 Best Practices

### 1. Start Conservative
```env
# Begin with low limits
DAILY_BUDGET_LIMIT=1.00
MONTHLY_BUDGET_LIMIT=25.00

# Increase gradually based on usage
```

### 2. Monitor First Week
- Track daily spending
- Calculate average cost per user
- Adjust limits accordingly

### 3. Set Realistic Limits
```
Formula:
Daily Limit = (Active Users × Expected Messages × $0.00004) × 2

Example (100 users, 5 messages/day):
$0.02 × 2 = $0.04/day → Set $0.50/day (safe buffer)
```

### 4. Enable Budget Warnings
```javascript
// Get notified at 80% usage
if (budgetUsage >= 0.80 * DAILY_BUDGET_LIMIT) {
  sendAdminAlert(`Budget warning: ${budgetUsage}/${DAILY_BUDGET_LIMIT}`);
}
```

### 5. Regular Audits
```bash
# Weekly budget review
node scripts/budget-report.js --week

# Identify high-usage users/channels
node scripts/usage-analysis.js
```

---

## 🔍 Usage Analysis

### Find Top Users by API Calls

```javascript
// scripts/usage-analysis.js
db.users.find()
  .sort({ totalMessages: -1 })
  .limit(10)
  .forEach(user => {
    print(`${user.username}: ${user.totalMessages} messages checked`);
  });
```

### Find Expensive Periods

```javascript
db.budgettrackings.find()
  .sort({ totalCost: -1 })
  .limit(5)
  .forEach(day => {
    print(`${day.date}: $${day.totalCost} (${day.totalCalls} calls)`);
  });
```

---

## 📞 Emergency Budget Actions

### Temporarily Disable Auto-Check

```javascript
// Quick disable (in messageCreate.js)
const AUTO_CHECK_ENABLED = false; // Set to false

// Or via environment variable
AUTO_CHECK_DISABLED=true npm start
```

### Manual Budget Reset (Use Carefully)

```javascript
// Reset daily budget
db.budgettrackings.updateOne(
  { date: new Date().toISOString().split('T')[0] },
  { $set: { totalCost: 0, totalCalls: 0 } }
);
```

### Increase Limit Mid-Day

```bash
# Stop bot
pm2 stop grammar-bot

# Edit .env
DAILY_BUDGET_LIMIT=10.00

# Restart bot
pm2 restart grammar-bot
```

---

## 📈 Expected Costs by Server Size

| Server Size | Daily Messages | Daily Cost | Monthly Cost | Recommended Limit |
|-------------|----------------|------------|--------------|-------------------|
| Tiny (1-10) | 20-50 | $0.001-0.002 | $0.03-0.06 | $0.25/day |
| Small (10-50) | 50-200 | $0.002-0.008 | $0.06-0.24 | $0.50/day |
| Medium (50-200) | 200-1,000 | $0.008-0.04 | $0.24-1.20 | $2.00/day |
| Large (200-500) | 1,000-5,000 | $0.04-0.20 | $1.20-6.00 | $5.00/day |
| Huge (500+) | 5,000+ | $0.20+ | $6.00+ | $10.00/day |

**All costs assume**:
- gpt-4o-mini model
- ~$0.00004 per check
- 30-second cooldown
- 10+ character minimum

---

## ✅ Budget Setup Checklist

- [ ] Set `DAILY_BUDGET_LIMIT` in `.env`
- [ ] Set `MONTHLY_BUDGET_LIMIT` in `.env`
- [ ] Configure `AUTO_CHECK_COOLDOWN` (30-120 seconds)
- [ ] Configure `MIN_MESSAGE_LENGTH` (10-30 characters)
- [ ] Test budget tracking with `/check` command
- [ ] Verify budget resets at midnight
- [ ] Set up admin notifications (optional)
- [ ] Create backup budget monitoring script
- [ ] Document expected costs for team
- [ ] Plan regular budget reviews

---

**Status**: Comprehensive budget management system ready
**Recommended Starting Point**: $2-5/day limit
**Monitoring**: Check weekly, adjust monthly
