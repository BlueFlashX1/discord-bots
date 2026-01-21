# Automatic Problem Posting Setup

## Overview

The coding practice bot can automatically post problems to your Discord channel without you needing to request them manually. Combined with mastery tracking, the bot will recommend when to try harder difficulties based on your Codewars progress.

---

## Quick Setup

### 1. Enable Auto-Post

```
/settings autopost enabled:true channel:#your-channel
```

This enables automatic problem posting to the specified channel.

### 2. Set Your Preferences

```
/settings difficulty level:medium
/settings source source:codewars
```

### 3. Link Codewars Account (Optional but Recommended)

```
/settings codewars username:your_codewars_username
/settings mastery enabled:true
```

This enables mastery tracking and smart difficulty recommendations.

---

## How It Works

### Automatic Posting

- **Default Schedule**: Posts once per day at 9 AM UTC
- **Configurable**: Set `AUTO_POST_INTERVAL_HOURS` in `.env` to change frequency
- **Per-User**: Each user can configure their own auto-post settings
- **Smart Difficulty**: If mastery tracking is enabled, bot uses recommended difficulty

### Mastery Tracking

When you link your Codewars username and enable mastery tracking:

1. **Bot analyzes your progress**:
   - Total completed kata
   - Current rank (kyu/dan)
   - Honor points
   - Language-specific ranks

2. **Bot recommends difficulty**:
   - Based on your rank and completion count
   - Suggests when to move up (easy → medium → hard)
   - Updates automatically as you progress

3. **Auto-post uses recommendations**:
   - If mastery tracking is enabled, auto-post uses recommended difficulty
   - Otherwise, uses your preferred difficulty setting

---

## Configuration Options

### Environment Variables

Add to `.env`:

```env
# Auto-Post Configuration
# Interval in hours between automatic problem posts (default: 24 = once per day)
AUTO_POST_INTERVAL_HOURS=24
```

**Examples**:
- `AUTO_POST_INTERVAL_HOURS=24` - Once per day (default)
- `AUTO_POST_INTERVAL_HOURS=12` - Twice per day
- `AUTO_POST_INTERVAL_HOURS=6` - Four times per day

### User Settings

Each user can configure:

- **Auto-Post**: Enable/disable and set channel
- **Difficulty**: Preferred difficulty (easy/medium/hard)
- **Source**: Preferred source (leetcode/codewars/random)
- **Codewars Username**: Link account for mastery tracking
- **Mastery Tracking**: Enable/disable smart recommendations

---

## Commands Reference

### `/settings autopost`

Enable or disable automatic problem posting.

**Options**:
- `enabled` (required): `true` or `false`
- `channel` (optional): Channel to post problems (required if enabling)

**Examples**:
```
/settings autopost enabled:true channel:#coding-practice
/settings autopost enabled:false
```

### `/settings difficulty`

Set your preferred difficulty level.

**Options**:
- `level` (required): `easy`, `medium`, or `hard`

**Example**:
```
/settings difficulty level:medium
```

### `/settings source`

Set your preferred problem source.

**Options**:
- `source` (required): `leetcode`, `codewars`, or `random`

**Example**:
```
/settings source source:codewars
```

### `/settings codewars`

Link your Codewars username for mastery tracking.

**Options**:
- `username` (required): Your Codewars username

**Example**:
```
/settings codewars username:my_username
```

**Note**: The bot will verify your username exists on Codewars.

### `/settings mastery`

Enable or disable mastery tracking and difficulty recommendations.

**Options**:
- `enabled` (required): `true` or `false`

**Example**:
```
/settings mastery enabled:true
```

**Note**: Requires Codewars username to be linked first.

### `/settings view`

View your current settings.

**Example**:
```
/settings view
```

### `/mastery`

Check your Codewars mastery progress and get difficulty recommendations.

**Example**:
```
/mastery
```

**Shows**:
- Current rank and honor
- Total completed kata
- Current difficulty level
- Recommended difficulty
- Why the recommendation was made
- Language-specific ranks

---

## Mastery Tracking Logic

### Difficulty Recommendations

The bot analyzes your Codewars progress and recommends difficulty based on:

1. **Overall Rank**:
   - 7-8 kyu → Easy
   - 5-6 kyu → Medium
   - 1-4 kyu → Hard
   - 1-8 dan → Hard

2. **Completion Count**:
   - Easy: < 15 completions → Stay easy
   - Easy: ≥ 15 completions → Try medium
   - Medium: < 20 completions → Stay medium
   - Medium: ≥ 20 completions → Try hard

3. **Combined Logic**:
   - If rank suggests higher difficulty AND completion count is sufficient → Recommend upgrade
   - Otherwise → Stay at current level

### Example Recommendations

**Scenario 1**: New user (8 kyu, 5 completions)
- **Current**: Easy
- **Recommended**: Easy
- **Reason**: "Keep practicing at easy level. You're making great progress!"

**Scenario 2**: Progressing user (6 kyu, 18 completions)
- **Current**: Medium
- **Recommended**: Medium
- **Reason**: "Keep practicing at medium level. You're making great progress!"

**Scenario 3**: Ready for upgrade (6 kyu, 25 completions)
- **Current**: Medium
- **Recommended**: Hard
- **Reason**: "You've completed 25 problems and reached 6 kyu. Try harder challenges!"

---

## Workflow Example

### Complete Setup Flow

1. **Enable Auto-Post**:
   ```
   /settings autopost enabled:true channel:#coding-practice
   ```

2. **Set Preferences**:
   ```
   /settings difficulty level:medium
   /settings source source:codewars
   ```

3. **Link Codewars**:
   ```
   /settings codewars username:my_username
   /settings mastery enabled:true
   ```

4. **Check Mastery**:
   ```
   /mastery
   ```

5. **Bot automatically posts**:
   - Once per day (or configured interval)
   - Uses recommended difficulty if mastery tracking enabled
   - Posts to your configured channel

### Daily Workflow

1. **Morning**: Bot posts problem automatically
2. **You solve it**: Use `/submit` to validate
3. **Progress tracked**: Bot updates your stats
4. **Next day**: Bot posts new problem (possibly at recommended difficulty)

---

## Troubleshooting

### Problem: Auto-post not working

**Check**:
1. Is auto-post enabled? (`/settings view`)
2. Is channel set correctly?
3. Check bot logs for errors
4. Verify bot has permissions in channel

**Solution**:
- Re-enable auto-post: `/settings autopost enabled:true channel:#your-channel`
- Check bot permissions: View Channel, Send Messages, Embed Links

### Problem: Mastery tracking not working

**Check**:
1. Is Codewars username linked? (`/settings view`)
2. Is mastery tracking enabled?
3. Is username correct? (Check with `/mastery`)

**Solution**:
- Link username: `/settings codewars username:your_username`
- Enable tracking: `/settings mastery enabled:true`
- Verify username exists on Codewars

### Problem: Wrong difficulty recommendations

**Check**:
1. What's your current rank? (`/mastery`)
2. How many problems have you completed?
3. Is mastery tracking enabled?

**Solution**:
- Recommendations update automatically as you progress
- You can override by setting preferred difficulty: `/settings difficulty level:hard`
- Check mastery again: `/mastery`

### Problem: Problems posted too frequently/rarely

**Solution**:
- Adjust `AUTO_POST_INTERVAL_HOURS` in `.env`
- Restart bot after changing
- Default is 24 hours (once per day)

---

## Advanced Configuration

### Multiple Users

Each user can have different settings:
- User A: Auto-post enabled, medium difficulty, LeetCode
- User B: Auto-post enabled, hard difficulty, Codewars with mastery tracking
- User C: Auto-post disabled, manual requests only

### Channel-Specific Settings

You can set different channels for different users:
- User A posts to `#coding-practice`
- User B posts to `#advanced-coding`

### Mastery Tracking Without Auto-Post

You can use mastery tracking without auto-post:
1. Enable mastery tracking: `/settings mastery enabled:true`
2. Keep auto-post disabled
3. Use `/mastery` to check recommendations
4. Manually request problems: `/problem difficulty:recommended`

---

## Best Practices

1. **Start with Easy**: Begin with easy problems, let mastery tracking guide you
2. **Link Codewars**: Enable mastery tracking for smart recommendations
3. **Check Mastery Regularly**: Use `/mastery` to see your progress
4. **Trust Recommendations**: Bot analyzes your actual progress
5. **Adjust as Needed**: You can override recommendations with `/settings difficulty`

---

## Data Storage

### User Preferences

Stored in: `data/preferences.json`

**Structure**:
```json
{
  "userId": {
    "autoPost": true,
    "autoPostChannel": "channel_id",
    "preferredDifficulty": "medium",
    "preferredSource": "codewars",
    "codewarsUsername": "username",
    "masteryTracking": true
  }
}
```

### Progress Data

Stored in: `data/progress.json`

Tracks:
- Solved problems
- Attempted problems
- Streak
- Difficulty stats

---

## API Usage

### Codewars API Calls

When mastery tracking is enabled, the bot makes API calls to:
- `GET /api/v1/users/{username}` - Get user profile
- `GET /api/v1/users/{username}/code-challenges/completed` - Get completed challenges

**Rate Limiting**:
- Bot includes delays between requests
- Caches results when possible
- Respects Codewars API limits

---

## Future Enhancements

Potential improvements:
- Custom posting schedules per user
- Multiple problems per post
- Progress-based problem selection
- Integration with more platforms (HackerRank, etc.)
- Leaderboards and competitions

---

**Last Updated**: 2025-01-21
