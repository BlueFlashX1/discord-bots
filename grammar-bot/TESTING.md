# Grammar Bot - Testing Guide

## 🧪 Test Environment Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up test environment
cp .env.example .env.test

# Edit .env.test with test credentials
DISCORD_TOKEN=your_test_bot_token
CLIENT_ID=your_test_bot_client_id
OPENAI_API_KEY=your_test_openai_key
DAILY_BUDGET_LIMIT=1.00
MONTHLY_BUDGET_LIMIT=10.00
MONGODB_URI=mongodb://localhost:27017/grammar_bot_test
NODE_ENV=test

# 3. Start bot in test mode
npm start
```

---

## 📋 Test Cases (25+)

### 1. Auto-Detection Tests (7 tests)

#### 1.1 Basic Grammar Error Detection
**Test:** Send message with grammatical error
```
User: "I has a good day today"
Expected: Bot corrects to "I have a good day today"
Points: +5 points deducted (error penalty)
HP: -2 HP
```

#### 1.2 Clean Message Reward
**Test:** Send grammatically correct message
```
User: "I have a wonderful day today."
Expected: No correction
Points: +10 points (clean message bonus)
XP: +5 XP
```

#### 1.3 Cooldown System
**Test:** Send multiple messages rapidly
```
User: Message 1 (checked)
User: Message 2 within 30s (skipped - cooldown)
User: Message 3 after 30s (checked)
Expected: Only messages outside cooldown are checked
```

#### 1.4 Message Length Filter
**Test:** Send very short message
```
User: "ok"
Expected: No check (below MIN_MESSAGE_LENGTH=10)
```

#### 1.5 Level Up Trigger
**Test:** Accumulate 100 XP
```
User: Sends 20 clean messages (5 XP each)
Expected: Level up notification at 100 XP
New level: 2
HP restored to max
```

#### 1.6 Streak Tracking
**Test:** Send messages on consecutive days
```
Day 1: Send message (streak = 1)
Day 2: Send message (streak = 2)
Day 3: Skip (streak resets to 0)
Expected: Streak counter updates correctly
```

#### 1.7 Auto-Check Toggle
**Test:** Disable auto-checking
```
User: /toggle (disables)
User: Sends message with error
Expected: No correction (auto-check disabled)
User: /toggle (enables)
User: Sends message with error
Expected: Correction appears
```

---

### 2. Manual Commands Tests (8 tests)

#### 2.1 /check Command
**Test:** Manual grammar check
```
User: /check text:"I has a problem"
Expected:
- Correction shown
- Errors listed
- Quality grade displayed
- Budget remaining in footer
```

#### 2.2 /stats Command (Self)
**Test:** View own statistics
```
User: /stats
Expected:
- Level, points, HP displayed
- Accuracy percentage shown
- Streak information
- Message stats (total, clean)
- Common error types
```

#### 2.3 /stats Command (Other User)
**Test:** View another user's stats
```
User: /stats user:@OtherUser
Expected: Shows OtherUser's statistics
```

#### 2.4 /shop Command
**Test:** Browse shop
```
User: /shop
Expected:
- All 7 items listed with emojis
- Prices shown
- User's current points displayed
```

#### 2.5 /buy Command (Success)
**Test:** Purchase affordable item
```
User: /buy item:grammar_guru (500 points)
Prerequisites: User has 600+ points
Expected:
- Purchase successful
- Points deducted
- Item added to inventory
- Remaining points shown
```

#### 2.6 /buy Command (Insufficient Funds)
**Test:** Try to purchase expensive item
```
User: /buy item:platinum_badge (2000 points)
Prerequisites: User has 100 points
Expected: Error message "Insufficient points"
```

#### 2.7 /inventory Command
**Test:** View purchased items
```
User: /inventory
Expected:
- List of owned items with descriptions
- Active title shown
- Recent achievements listed
- Total items count
```

#### 2.8 /leaderboard Command
**Test:** View all leaderboard types
```
User: /leaderboard type:level
User: /leaderboard type:accuracy
User: /leaderboard type:streak
User: /leaderboard type:pvp
Expected: Different rankings for each type
User's rank shown in footer
```

---

### 3. Gamification Tests (5 tests)

#### 3.1 Points System
**Test:** Earn and lose points
```
Clean message: +10 points
Error found: -5 points
Quality bonus (95%+ accuracy): +50 points
Expected: Points accumulate/decrease correctly
```

#### 3.2 XP and Leveling
**Test:** Level progression
```
Start: Level 1, 0 XP
Clean messages: +5 XP each
At 100 XP: Level up to 2
At 250 XP: Level up to 3
Expected: XP requirements increase per level
```

#### 3.3 HP System
**Test:** HP depletion and restoration
```
Error found: -2 HP
Level up: HP restored to max
HP reaches 0: Warning message
Expected: HP never goes below 0
```

#### 3.4 Shop Item Usage
**Test:** Apply purchased title
```
User: /buy item:grammar_guru
Expected: Title "Grammar Guru" shown in stats
Title appears in /inventory
```

#### 3.5 Achievement Unlocking
**Test:** Unlock achievements
```
First message: "First Steps" unlocked
10 clean messages: "Clean Streak" unlocked
Reach level 5: "Rising Star" unlocked
Expected: Achievements shown in /inventory
```

---

### 4. PvP System Tests (3 tests)

#### 4.1 PvP Challenge Creation
**Test:** Challenge another user
```
User1: /pvp opponent:@User2 text:"This is my well-written sentence."
Expected:
- Challenge created
- 2-minute timer starts
- User2 notified
```

#### 4.2 PvP Battle Resolution (Win)
**Test:** Better grammar wins
```
User1: Submits text with 0 errors
User2: Submits text with 2 errors
Expected:
- User1 wins
- User1 gains points and pvp win
- User2 loses HP and gets pvp loss
```

#### 4.3 PvP Invalid Target
**Test:** Try to challenge bot or self
```
User: /pvp opponent:@BotName
Expected: Error "Cannot challenge bots"
User: /pvp opponent:@Self
Expected: Error "Cannot challenge yourself"
```

---

### 5. Budget Management Tests (3 tests)

#### 5.1 Daily Budget Tracking
**Test:** Monitor daily spending
```
Set DAILY_BUDGET_LIMIT=1.00
Run multiple checks
Expected: Budget tracked in database
Footer shows remaining budget
```

#### 5.2 Daily Limit Reached
**Test:** Exceed daily budget
```
Spend $1.00+ on checks
Next check attempt
Expected: Error message "Daily budget limit reached"
Auto-check disabled until midnight
```

#### 5.3 Budget Reset at Midnight
**Test:** Daily budget resets
```
Day 1: Spend $1.00 (limit reached)
Day 2 00:00: Budget resets to $0
Expected: Checks work again
```

---

### 6. Error Handling Tests (4 tests)

#### 6.1 Invalid Text Input
**Test:** Empty or very long text
```
User: /check text:""
Expected: Error "Text too short"
User: /check text:[5000 characters]
Expected: Error "Text too long (max 2000)"
```

#### 6.2 Database Connection Error
**Test:** MongoDB disconnected
```
Stop MongoDB
User: Sends message
Expected: Graceful error handling
Bot doesn't crash
```

#### 6.3 OpenAI API Error
**Test:** Invalid API key
```
Set invalid OPENAI_API_KEY
User: /check text:"test"
Expected: Error message shown
Budget not charged
```

#### 6.4 Rate Limit Handling
**Test:** OpenAI rate limit
```
Send many requests rapidly
Expected: Retry mechanism activates
User notified of delay
```

---

## 🔍 Integration Tests

### Message Flow Test
```
1. User joins server
2. User's first message checked
3. Error found and corrected
4. Points deducted, HP reduced
5. User improves next message
6. Clean message bonus awarded
7. Stats updated in database
8. Leaderboard reflects changes
```

### Shop Purchase Flow
```
1. User earns 500 points
2. /shop shows available items
3. /buy grammar_guru
4. Points deducted
5. Item added to inventory
6. /inventory shows new item
7. Title displayed in /stats
```

### PvP Battle Flow
```
1. User1 challenges User2
2. User2 has 2 minutes to respond
3. Both texts checked by AI
4. Grammar quality compared
5. Winner determined
6. Stats updated (wins/losses)
7. Points and HP adjusted
```

---

## 📊 Performance Tests

### Load Test
```bash
# Simulate 100 concurrent users
npm run load-test

Expected:
- All requests processed
- No crashes
- Response time < 2s
- Database handles load
```

### Budget Optimization Test
```
Run 1000 checks
Measure total cost
Expected: < $1.00 for 1000 checks (gpt-4o-mini)
```

---

## ✅ Pre-Deployment Checklist

- [ ] All 25+ test cases pass
- [ ] Auto-detection works with cooldowns
- [ ] All 8 commands respond correctly
- [ ] Shop purchases work
- [ ] Leaderboards display correctly
- [ ] PvP battles resolve properly
- [ ] Budget limits enforced
- [ ] Daily budget resets at midnight
- [ ] Migration script tested with Python data
- [ ] Error handling graceful
- [ ] No crashes under load
- [ ] OpenAI costs within expected range

---

## 🐛 Known Issues / Edge Cases

1. **PvP Battle Expiry**: Battles expire after 2 minutes (stored in memory)
2. **Timezone**: Budget resets at UTC midnight (configure for local timezone)
3. **First Message**: New users start with default 100 HP and 0 points
4. **Cooldown Bypass**: Users can use `/check` to bypass auto-detection cooldown

---

## 📝 Test Results Log Template

```
Date: YYYY-MM-DD
Tester: [Name]
Environment: [Test/Staging/Production]

Test Category: [Auto-Detection/Commands/Gamification/etc]
Test Case: [Test name]
Status: [✅ Pass / ❌ Fail]
Notes: [Any observations]

Total Tests: 25
Passed: X
Failed: Y
Success Rate: Z%
```

---

**Testing Status**: Ready for comprehensive testing
**Next Steps**: Run all test cases, document results, fix any failures
