# New Features Summary

## ✅ Automatic Problem Posting

**What it does**: Bot automatically posts problems to your channel without you needing to request them.

**How to use**:
```
/settings autopost enabled:true channel:#your-channel
```

**Configuration**:
- Posts once per day by default (9 AM UTC)
- Configurable via `AUTO_POST_INTERVAL_HOURS` in `.env`
- Each user can have their own channel and preferences

---

## ✅ Difficulty Preferences

**What it does**: Set your preferred difficulty level for auto-posted problems.

**How to use**:
```
/settings difficulty level:medium
```

**Options**: `easy`, `medium`, `hard`

---

## ✅ Source Preferences

**What it does**: Choose which problem source to use (LeetCode, Codewars, or Random).

**How to use**:
```
/settings source source:codewars
```

**Options**: `leetcode`, `codewars`, `random`

---

## ✅ Codewars Mastery Tracking

**What it does**: Links your Codewars account and tracks your progress to recommend when to try harder difficulties.

**How to use**:
```
/settings codewars username:your_username
/settings mastery enabled:true
```

**Features**:
- Analyzes your Codewars rank and completion count
- Recommends difficulty increases based on progress
- Auto-post uses recommended difficulty when enabled

---

## ✅ Mastery Command

**What it does**: Check your Codewars progress and get personalized difficulty recommendations.

**How to use**:
```
/mastery
```

**Shows**:
- Current rank and honor
- Total completed kata
- Current difficulty level
- Recommended difficulty
- Explanation of recommendation
- Language-specific ranks

---

## ✅ Settings Management

**What it does**: View and manage all your preferences in one place.

**How to use**:
```
/settings view
```

**Shows**:
- Auto-post status and channel
- Preferred difficulty
- Preferred source
- Codewars username (if linked)
- Mastery tracking status

---

## 🎯 Complete Workflow

### Initial Setup

1. **Enable Auto-Post**:
   ```
   /settings autopost enabled:true channel:#coding-practice
   ```

2. **Set Preferences**:
   ```
   /settings difficulty level:medium
   /settings source source:codewars
   ```

3. **Link Codewars** (Optional but Recommended):
   ```
   /settings codewars username:your_username
   /settings mastery enabled:true
   ```

### Daily Usage

1. **Bot posts problem automatically** (once per day)
2. **You solve it**: Use `/submit` to validate
3. **Check progress**: Use `/mastery` to see recommendations
4. **Bot adjusts**: Next auto-post uses recommended difficulty

---

## 📊 Mastery Tracking Logic

### How Recommendations Work

The bot analyzes:
1. **Your Codewars rank** (kyu/dan system)
2. **Total completed problems**
3. **Combined logic** to recommend difficulty

### Recommendation Examples

| Rank | Completions | Current | Recommended | Reason |
|------|-------------|---------|-------------|--------|
| 8 kyu | 5 | Easy | Easy | Starting out |
| 7 kyu | 15 | Easy | Medium | Ready to step up |
| 6 kyu | 25 | Medium | Hard | Progressing well |
| 5 kyu | 30 | Medium | Hard | Ready for challenge |
| 4 kyu | 50 | Hard | Hard | Keep pushing |

---

## 🔧 Configuration

### Environment Variables

```env
# Auto-Post Interval (hours)
AUTO_POST_INTERVAL_HOURS=24  # Default: once per day
```

### User Settings

All stored in `data/preferences.json`:
- Auto-post enabled/disabled
- Channel ID
- Preferred difficulty
- Preferred source
- Codewars username
- Mastery tracking enabled/disabled

---

## 📝 Commands Reference

| Command | Purpose |
|---------|---------|
| `/settings autopost` | Enable/disable auto-posting |
| `/settings difficulty` | Set preferred difficulty |
| `/settings source` | Set preferred source |
| `/settings codewars` | Link Codewars username |
| `/settings mastery` | Enable/disable mastery tracking |
| `/settings view` | View all settings |
| `/mastery` | Check progress and recommendations |

---

## 🚀 Benefits

1. **No Manual Requests**: Problems appear automatically
2. **Personalized**: Each user has their own preferences
3. **Smart Recommendations**: Bot suggests when to level up
4. **Progress Tracking**: See your improvement over time
5. **Flexible**: Override recommendations if needed

---

**All features are now live!** 🎉
