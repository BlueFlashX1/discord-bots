# Code Submission Handling & Archiving

## How Submissions Are Handled

### Current Flow

1. **User submits code** via `/submit` command
2. **Bot validates** syntax and runs tests
3. **Result is displayed** with appropriate embed color
4. **Action taken** based on result

---

## Submission Results

### ✅ Success (Tests Passed)

**What happens:**

- ✅ Green embed with success message
- ✅ Problem marked as solved in progress
- ✅ Solution **archived** automatically
- ✅ Current problem cleared (can get new problem)
- ✅ Stats updated (solved count, difficulty breakdown)

**Archiving:**

- Solution code stored in `data/submissions.json`
- Includes: code, problem info, user info, timestamp, result
- Can be viewed later with `/solutions` command

### ⚠️ Failure (Tests Failed)

**What happens:**

- ⚠️ Orange embed with error message
- ❌ Problem **NOT** marked as solved
- ❌ Solution **NOT** archived
- ✅ Current problem **kept active** (can retry)
- ✅ Error details shown (which test failed, expected vs got)

**User can:**

- Fix the code and resubmit
- Keep trying until tests pass
- Problem stays active until solved or new problem requested

### ❌ Syntax Error

**What happens:**

- ❌ Red embed with syntax error
- ❌ Problem **NOT** marked as solved
- ❌ Solution **NOT** archived
- ✅ Current problem **kept active**
- ✅ Error details shown (line number, error message)

**User can:**

- Fix syntax error and resubmit
- Problem stays active

### ℹ️ Syntax Valid (No Tests)

**What happens:**

- ℹ️ Blue embed with validation message
- ⚠️ Problem **NOT** marked as solved (no tests to verify)
- ❌ Solution **NOT** archived (not verified as correct)
- ✅ Current problem **kept active**
- ℹ️ Note shown that manual verification needed

**User can:**

- Manually verify solution
- Get new problem if satisfied
- Or wait for problem with test cases

---

## Archiving System

### What Gets Archived

**Only successful solutions** (tests passed) are archived:

- ✅ User ID and username
- ✅ Problem information (ID, title, difficulty, source, URL)
- ✅ Solution code
- ✅ Test results (output, passed status)
- ✅ Timestamp
- ✅ Message ID and channel ID (if available)

### What Doesn't Get Archived

- ❌ Failed submissions
- ❌ Syntax errors
- ❌ Solutions without test verification

**Why?** We only archive verified correct solutions to maintain quality.

---

## Viewing Archived Solutions

### Commands

#### `/solutions my [limit]`

View your own successful solutions.

**Example:**

```
/solutions my limit:5
```

Shows your last 5 successful solutions.

#### `/solutions problem [problem_id] [limit]`

View all successful solutions for a specific problem.

**Example:**

```
/solutions problem problem_id:1 limit:10
```

Shows up to 10 solutions from different users for that problem.

#### `/solutions recent [limit]`

View recent successful solutions from all users.

**Example:**

```
/solutions recent limit:5
```

Shows the 5 most recent successful solutions (forum-style).

---

## Forum-Style Discussion Feature

### Current Implementation

Solutions are archived and can be viewed, but there's no discussion thread system yet.

### Proposed Enhancement: Discussion Threads

**Option 1: Auto-Create Threads (Recommended)**

When a solution is successfully archived:

1. Bot creates a forum-style thread in an archive channel
2. Thread title: `[Solved] Problem Title - by Username`
3. First message: Solution embed with code
4. Others can reply with:
   - Questions about the solution
   - Alternative solutions
   - Optimizations
   - Discussion

**Option 2: Manual Thread Creation**

- User can use `/archive-thread` after solving
- Creates thread with their solution
- Others can discuss

**Option 3: Channel-Based Archive**

- Dedicated `#solutions` channel
- Each successful solution posted there
- Users can reply to discuss
- Searchable by problem name

---

## Data Storage

### Files

- `data/submissions.json` - All archived successful solutions
- `data/progress.json` - User progress (solved problems, stats)
- `data/problems.json` - Cached problems

### Storage Limits

- **Submissions**: Last 1000 successful solutions (auto-pruned)
- **Progress**: Unlimited (per user)
- **Problems**: Unlimited (cached problems)

---

## Privacy & Security

### What's Stored

- ✅ Solution code (archived)
- ✅ User ID (for tracking)
- ✅ Username (for display)
- ✅ Problem information
- ✅ Timestamps

### What's NOT Stored

- ❌ Failed attempts (not archived)
- ❌ Personal information beyond Discord ID
- ❌ Code execution logs (temporary only)

### Code Privacy

- Solutions are stored locally in JSON
- Only successful solutions are archived
- Users can view their own solutions
- Problem solutions can be viewed by anyone (learning resource)

---

## Future Enhancements

### Potential Features

1. **Discussion Threads**

   - Auto-create threads for solutions
   - Enable community discussion
   - Share alternative approaches

2. **Solution Voting**

   - Upvote best solutions
   - Sort by popularity
   - Highlight top solutions

3. **Solution Comparison**

   - Compare your solution with others
   - See different approaches
   - Learn from community

4. **Export Solutions**

   - Export your solutions as files
   - Share solutions outside Discord
   - Create portfolio

5. **Solution Search**
   - Search by problem name
   - Search by difficulty
   - Search by user

---

## Example Workflow

### Successful Submission

````
User: /submit code:```python
def solution():
    return "Hello"
````

Bot Response:

```
🎉 All Tests Passed!

Output:
Test 0 passed
All tests passed!

📚 Archived
Solution archived! Use /solutions to view your solutions.
```

**What happened:**

1. Code validated ✅
2. Tests passed ✅
3. Problem marked solved ✅
4. Solution archived ✅
5. Stats updated ✅
6. Problem cleared ✅

### Failed Submission

````
User: /submit code:```python
def solution():
    return "Wrong"
````

Bot Response:

```
⚠️ Tests Failed

Error:
Test 0 failed: expected "Hello", got "Wrong"
```

**What happened:**

1. Code validated ✅
2. Tests failed ❌
3. Problem NOT marked solved ❌
4. Solution NOT archived ❌
5. Problem kept active ✅
6. User can retry ✅

---

## Summary

- ✅ **Success**: Archived, problem solved, stats updated
- ❌ **Failure**: Not archived, problem stays active, can retry
- 📚 **Archive**: Only successful solutions
- 🔍 **View**: Use `/solutions` commands
- 💬 **Discussion**: Not yet implemented (can be added)

The system is designed to:

- Archive only verified correct solutions
- Keep failed attempts private
- Enable learning from successful solutions
- Track progress accurately
