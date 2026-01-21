# Code Submission Format Guide

## How Code Submission Works

The bot accepts Python code in **multiple formats** to make it flexible and user-friendly.

---

## 📝 Submission Methods

### Method 1: Code Blocks (Recommended for Short Solutions)

**Format:**

```
/submit code:```python
def solution(nums):
    return sum(nums)
```

```

**How it works:**
- The bot extracts code from the Python code block
- Validates syntax
- Runs tests (if available)

**Best for:**
- Solutions under 50 lines
- Quick submissions
- Simple problems

---

### Method 2: File Attachments (Recommended for Longer Solutions)

**Format:**
```

/submit file:[attach your_solution.py]

```

**How it works:**
1. Attach a `.py` file using Discord's file attachment
2. Bot downloads and reads the file
3. Validates and tests the code

**Best for:**
- Solutions over 50 lines
- Complex code with multiple functions
- When you want to keep code formatting

**Example:**
```

Your message: /submit file:[solution.py attached]

Bot response: ✅ Syntax Valid / 🎉 All Tests Passed

```

---

### Method 3: Inline Code (For Very Short Snippets)

**Format:**
```

/submit code:`print("Hello World")`

```

**How it works:**
- Bot extracts code from inline code blocks
- Combines multiple inline blocks if present

**Best for:**
- One-liners
- Very simple solutions
- Quick tests

---

## 🔄 Complete Workflow Example

### Step 1: Get a Problem
```

You: /problem difficulty:medium source:leetcode

Bot: 📝 Two Sum
     Difficulty: MEDIUM
     Source: LEETCODE
     [View Problem](https://leetcode.com/problems/two-sum/)

```

### Step 2: Write Your Solution

**Option A - Code Block:**
```python
def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
```

**Option B - File:**
Create `solution.py`:

```python
def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
```

### Step 3: Submit

**Code Block Submission:**

```
/submit code:```python
def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
```

```

**File Submission:**
```

/submit file:[solution.py attached]

```

### Step 4: Get Results

**Success:**
```

🎉 All Tests Passed!

Output:
Test 0 passed
Test 1 passed
All tests passed!

```

**Syntax Error:**
```

❌ Syntax Error

Error:
Line 3: invalid syntax

```

**Test Failure:**
```

⚠️ Tests Failed

Error:
Test 0 failed: expected [0, 1], got [1, 2]

```

---

## ⚙️ How Validation Works

### 1. Syntax Validation
- Bot writes your code to a temporary file
- Runs `python3 -m py_compile` to check syntax
- Reports any syntax errors with line numbers

### 2. Test Execution (If Available)
- If problem has test cases, bot wraps your code
- Runs tests and checks outputs
- Reports which tests passed/failed

### 3. Security
- Code runs in temporary directory
- Files are cleaned up after validation
- No permanent storage of your code
- No network access from test execution

---

## 💡 Tips & Best Practices

### ✅ DO:
- Use code blocks for short solutions
- Use file attachments for longer code
- Test your code locally first
- Format code properly (indentation matters!)

### ❌ DON'T:
- Submit code with syntax errors (bot will catch them)
- Include print statements for debugging (they'll show in output)
- Submit empty code
- Attach non-Python files

---

## 🎯 Example Submissions

### Example 1: Simple Function (Code Block)
```

/submit code:```python
def add(a, b):
    return a + b

```
```

### Example 2: Complex Solution (File)

```
Create: fibonacci.py
def fibonacci(n):
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

Submit: /submit file:[fibonacci.py]
```

### Example 3: Multiple Functions (File Recommended)

```
Create: solution.py
def helper_function(x):
    return x * 2

def main_solution(data):
    processed = [helper_function(item) for item in data]
    return sum(processed)

Submit: /submit file:[solution.py]
```

---

## 🔍 Troubleshooting

### "No active problem!"

- **Solution:** Use `/problem` first to get a problem

### "Code is too short or empty!"

- **Solution:** Make sure you're providing actual code, not just whitespace

### "Please attach a .py file!"

- **Solution:** File must have `.py` extension

### "Failed to read file"

- **Solution:** Check file is accessible, try re-uploading

### Syntax errors

- **Solution:** Fix the reported syntax error and resubmit

---

## 📊 What Happens After Submission?

1. **Syntax Check** → Validates Python syntax
2. **Test Execution** → Runs tests if available
3. **Progress Update** → Marks problem as solved (if tests pass)
4. **Stats Update** → Updates your statistics
5. **Problem Cleared** → Removes current problem (on success)

---

## 🎓 Learning Tips

1. **Start with Easy Problems** → Build confidence
2. **Read Error Messages** → They tell you what's wrong
3. **Test Locally First** → Catch errors before submitting
4. **Check Your Stats** → Track your progress with `/stats`
5. **Practice Daily** → Build a streak!

---

**Remember:** The bot is here to help you practice. Don't worry about getting it right the first time - that's what practice is for! 🚀
