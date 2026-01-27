# Reddit Filter Command - Include/Exclude Keywords

**Date:** January 23, 2026  
**Command:** `/filter`

---

## Overview

The `/filter` command allows you to set both **include** (watch for) and **exclude** (filter out) keywords for any monitored subreddit. This provides fine-grained control over which Reddit posts are posted to Discord.

---

## Command Usage

```
/filter <subreddit> [include] [exclude]
```

### Parameters

- **subreddit** (required): The subreddit to configure (autocomplete available)
- **include** (optional): Keywords to watch for (comma-separated, or "all" to show all posts)
- **exclude** (optional): Keywords to exclude (comma-separated, posts with these will be filtered out)

---

## How It Works

### Filtering Logic

1. **Include Keywords** (positive filter):
   - If set: Post must contain **at least one** include keyword
   - If empty/not set: All posts are shown (no include filter)

2. **Exclude Keywords** (negative filter):
   - If set: Post must **not contain any** exclude keywords
   - If empty/not set: No exclusions (all posts pass)

3. **Combined Logic**:
   - Post is shown if: `(matches include keywords OR no include filter) AND (does not match exclude keywords)`

### Examples

#### Example 1: Include Only
```
/filter subreddit:Python include:tutorial,guide exclude:
```
**Result:** Shows posts containing "tutorial" OR "guide"

#### Example 2: Exclude Only
```
/filter subreddit:Python include:all exclude:spam,advertisement
```
**Result:** Shows all posts EXCEPT those containing "spam" or "advertisement"

#### Example 3: Both Include and Exclude
```
/filter subreddit:Python include:python,code exclude:homework,help
```
**Result:** Shows posts containing "python" OR "code", BUT excludes posts containing "homework" OR "help"

#### Example 4: Clear Filters
```
/filter subreddit:Python include:all exclude:
```
**Result:** Shows all posts (no filtering)

---

## Use Cases

### 1. Quality Filtering
**Problem:** Subreddit has good posts but also low-quality content  
**Solution:** Use exclude keywords to filter out unwanted content
```
/filter subreddit:Python include:all exclude:spam,clickbait,repost
```

### 2. Specific Topics
**Problem:** Only want posts about specific topics  
**Solution:** Use include keywords to watch for specific topics
```
/filter subreddit:Python include:tutorial,guide,best-practices exclude:
```

### 3. Refined Filtering
**Problem:** Want topic X but not subtopic Y  
**Solution:** Combine include and exclude
```
/filter subreddit:Python include:python exclude:homework,assignment
```

---

## Command Behavior

### Updating Filters

- **Only include provided:** Updates include keywords, leaves exclude unchanged
- **Only exclude provided:** Updates exclude keywords, leaves include unchanged
- **Both provided:** Updates both include and exclude keywords
- **"all" for include:** Clears include keywords (shows all posts)

### Autocomplete

- Subreddit field has autocomplete
- Shows all monitored subreddits
- Case-insensitive search

---

## Integration with Existing Commands

### `/reddit keywords` (Legacy)
- Still works for backward compatibility
- Only sets include keywords
- Use `/filter` for new setups (more flexible)

### `/reddit list`
- Now shows both include and exclude keyword counts
- Format: `(X include, Y exclude)`

---

## Technical Details

### Config Structure

```json
{
  "subreddits": {
    "Python": {
      "keywords": ["tutorial", "guide"],
      "excludeKeywords": ["spam", "advertisement"],
      "channel_id": "...",
      "min_score": 0,
      "enabled": true
    }
  }
}
```

### Filtering Implementation

**Location:** `services/redditMonitor.js`

```javascript
// Check include keywords (must match at least one)
const matchesInclude = matchesKeywords(title, keywords) || matchesKeywords(selftext, keywords);

// Check exclude keywords (must not match any)
const matchesExclude = matchesExcludeKeywords(title, excludeKeywords) || matchesExcludeKeywords(selftext, excludeKeywords);

// Post matches if: (includes match OR no include filter) AND (not excluded)
if (matchesInclude && !matchesExclude) {
  // Post to Discord
}
```

### Keyword Matching

- **Case-insensitive:** "Python" matches "python", "PYTHON", etc.
- **Substring matching:** "python" matches "python3", "pythonic", etc.
- **Title and body:** Checks both post title and selftext (if available)

---

## Migration

Existing subreddits are automatically migrated:
- `excludeKeywords: []` is added to all existing subreddits
- No data loss
- Backward compatible with existing `/reddit keywords` command

---

## Examples in Practice

### Scenario 1: Programming Subreddit
```
/filter subreddit:Python include:python,code exclude:homework,assignment
```
**Shows:** Posts about Python/code, but filters out homework/assignment posts

### Scenario 2: News Subreddit
```
/filter subreddit:news include:all exclude:opinion,editorial
```
**Shows:** All news posts except opinion pieces and editorials

### Scenario 3: Gaming Subreddit
```
/filter subreddit:gaming include:release,update exclude:leak,rumor
```
**Shows:** Official releases and updates, but filters out leaks and rumors

---

## Troubleshooting

### Posts Not Showing

1. **Check include keywords:** Post must match at least one include keyword (if set)
2. **Check exclude keywords:** Post must not match any exclude keywords
3. **Check min_score:** Post must meet minimum score requirement
4. **Check enabled:** Subreddit must be enabled (`/reddit toggle`)

### Too Many Posts

- Add more specific include keywords
- Add exclude keywords to filter unwanted content

### Too Few Posts

- Remove or broaden include keywords
- Remove exclude keywords that are too restrictive
- Use "all" for include to show all posts

---

## Related Commands

- `/reddit add` - Add a subreddit to monitor
- `/reddit keywords` - Set include keywords only (legacy)
- `/reddit list` - View all monitored subreddits and their filters
- `/reddit toggle` - Enable/disable a subreddit

---

**Last Updated:** 2026-01-23
