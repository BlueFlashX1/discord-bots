# Codewars API Setup & Integration

## Overview

This document explains how the Codewars API integration works in the coding practice bot, based on the official [Codewars API v1 documentation](https://dev.codewars.com).

---

## API Information

### Codewars API v1

- **Status**: Minimal and inconsistent (per official docs)
- **Authentication**: **NOT REQUIRED** - All endpoints are public
- **Content-Type**: `application/json`
- **Base URL**: `https://www.codewars.com/api/v1`
- **API v2**: Planned but no ETA

**Reference**: [Codewars API Documentation](https://dev.codewars.com/#introduction)

---

## Available Endpoints

### 1. Get Code Challenge

**Endpoint**: `GET /api/v1/code-challenges/{challenge}`

**Parameters**:

- `challenge`: Kata ID (string) or slug (string)

**Example**:

```bash
curl https://www.codewars.com/api/v1/code-challenges/valid-braces
curl https://www.codewars.com/api/v1/code-challenges/5277c8a221e209d3f6000b56
```

**Response Structure**:

```json
{
  "id": "5277c8a221e209d3f6000b56",
  "name": "Valid Braces",
  "slug": "valid-braces",
  "url": "http://www.codewars.com/kata/valid-braces",
  "category": "algorithms",
  "description": "Write a function called `validBraces`...",
  "tags": ["Algorithms", "Validation", "Logic", "Utilities"],
  "languages": ["javascript", "coffeescript"],
  "rank": {
    "id": -4,
    "name": "4 kyu",
    "color": "blue"
  },
  "createdBy": {
    "username": "xDranik",
    "url": "http://www.codewars.com/users/xDranik"
  },
  "approvedBy": {
    "username": "xDranik",
    "url": "http://www.codewars.com/users/xDranik"
  },
  "totalAttempts": 4911,
  "totalCompleted": 919,
  "totalStars": 12,
  "voteScore": 512,
  "publishedAt": "2013-11-05T00:07:31Z",
  "approvedAt": "2013-12-20T14:53:06Z"
}
```

### 2. Get User

**Endpoint**: `GET /api/v1/users/{user}`

**Note**: Not currently used in the bot, but available for future features.

### 3. List Completed Challenges

**Endpoint**: `GET /api/v1/users/{user}/code-challenges/completed?page={page}`

**Note**: Not currently used in the bot, but available for tracking user progress.

---

## Implementation Details

### Problem Fetching Strategy

**Challenge**: Codewars API v1 has **no random endpoint**. We can't fetch random problems directly.

**Solution**: Use a curated list of popular kata slugs organized by kyu rank, then fetch randomly from that list.

### Kyu Rank System

Codewars uses a unique ranking system:

- **Kyu Ranks** (Beginner to Intermediate):

  - `8 kyu` = Easiest (white)
  - `7-6 kyu` = Easy (yellow)
  - `5-4 kyu` = Medium (blue)
  - `3-2 kyu` = Hard (purple)
  - `1 kyu` = Very Hard (purple)

- **Dan Ranks** (Advanced):
  - `1-4 dan` = Expert (black)
  - `5-8 dan` = Master (red)

**Rank ID Format**:

- Negative numbers = Kyu (`-8` to `-1`)
- Positive numbers = Dan (`1` to `8`)

### Difficulty Mapping

Our bot maps Codewars ranks to standard difficulty levels:

| Codewars Rank | Difficulty | Rank ID Range |
| ------------- | ---------- | ------------- |
| 7-8 kyu       | Easy       | -8 to -7      |
| 5-6 kyu       | Medium     | -6 to -5      |
| 1-4 kyu       | Hard       | -4 to -1      |
| 1-8 dan       | Hard       | 1 to 8        |

### Kata Selection

The bot maintains curated lists of popular kata slugs by kyu rank:

- **8 kyu**: Basic problems (multiply, even-or-odd, etc.)
- **7 kyu**: String manipulation (vowel-count, disemvowel-trolls, etc.)
- **6 kyu**: Algorithms (who-likes-it, bit-counting, etc.)
- **5 kyu**: Intermediate (simple-pig-latin, human-readable-time, etc.)
- **4 kyu**: Advanced (strip-comments, strings-mix, etc.)

When a user requests a problem:

1. Bot selects appropriate kyu level based on difficulty
2. Randomly picks a kata slug from that level's list
3. Fetches full kata details using `/api/v1/code-challenges/{slug}`
4. Structures the response according to our problem format

---

## Problem Data Structure

### Codewars Problem Object

```javascript
{
  id: "5277c8a221e209d3f6000b56",           // Kata ID
  title: "Valid Braces",                     // Kata name
  slug: "valid-braces",                       // URL slug
  difficulty: "medium",                       // Mapped difficulty (easy/medium/hard)
  url: "https://www.codewars.com/kata/...",  // Full URL
  source: "codewars",                         // Source identifier
  description: "...",                         // Problem description (Markdown)
  tags: ["Algorithms", "Validation"],        // Problem tags
  category: "algorithms",                     // Problem category
  rank: {                                     // Codewars rank info
    id: -4,                                   // Rank ID (-8 to -1 for kyu, 1-8 for dan)
    name: "4 kyu",                            // Rank name
    color: "blue"                             // Rank color
  },
  stats: {                                    // Kata statistics
    totalAttempts: 4911,                      // Total attempts
    totalCompleted: 919,                      // Total completions
    totalStars: 12,                           // Bookmarks
    voteScore: 512                            // Vote score
  },
  languages: ["python", "javascript"]         // Available languages
}
```

---

## API Key (Optional)

### Why Optional?

According to Codewars API docs:

- **API v1 is public** - No authentication required
- All endpoints are accessible without a key
- Having a key **may** improve rate limits (not documented)

### How to Get API Key

**No API Key Required!**

Codewars API v1 is **completely public** and requires **no authentication**. The bot works perfectly without any API key.

**Note**: There is no need to add any API key to your `.env` file. All Codewars endpoints are accessible without authentication.

---

## Error Handling

### Common Errors

| Status Code | Meaning               | Solution                                |
| ----------- | --------------------- | --------------------------------------- |
| 400         | Bad Request           | Check kata slug/ID format               |
| 404         | Not Found             | Kata doesn't exist or slug is incorrect |
| 429         | Too Many Requests     | Rate limit exceeded, wait and retry     |
| 500         | Internal Server Error | Codewars server issue, retry later      |

### Implementation

The bot handles errors gracefully:

- Logs error details for debugging
- Returns `null` if fetch fails
- Falls back to cached problems if available
- Shows user-friendly error messages

---

## Rate Limiting

### Current Status

- **No documented rate limits** in API v1 docs
- **429 Too Many Requests** may occur with excessive requests
- **Recommendation**: Add delays between requests if fetching multiple problems

### Best Practices

1. **Cache problems** - Store fetched problems in `data/problems.json`
2. **Reuse cached problems** - Check cache before fetching new ones
3. **Respect rate limits** - Don't spam API requests
4. **Handle 429 errors** - Implement exponential backoff if needed

---

## Future Improvements

### Potential Enhancements

1. **Expand Kata Lists**

   - Add more kata slugs per kyu level
   - Organize by category/tags
   - Allow users to request specific kata

2. **User Progress Tracking**

   - Use `/api/v1/users/{user}/code-challenges/completed` endpoint
   - Track which Codewars problems user has solved
   - Avoid suggesting already-solved problems

3. **Difficulty Filtering**

   - Allow users to specify exact kyu rank
   - Filter by tags/categories
   - Filter by completion rate

4. **API v2 Migration**

   - When Codewars releases API v2, migrate to new endpoints
   - May include better random/problem selection features

5. **Webhook Integration**
   - Use Codewars webhooks to track user completions
   - Auto-update progress when user solves on Codewars website

---

## Testing

### Manual Testing

Test the Codewars integration:

```bash
# Test fetching a specific kata
curl https://www.codewars.com/api/v1/code-challenges/valid-braces

# Test with different kyu levels
# In Discord: /problem source:codewars difficulty:easy
# In Discord: /problem source:codewars difficulty:medium
# In Discord: /problem source:codewars difficulty:hard
```

### Expected Behavior

1. **Easy difficulty** → Fetches 7-8 kyu problems
2. **Medium difficulty** → Fetches 5-6 kyu problems
3. **Hard difficulty** → Fetches 1-4 kyu problems
4. **Problem embed** shows:
   - Title, difficulty, rank, tags
   - Codewars stats (completions, attempts, stars)
   - Description (truncated if too long)
   - Link to Codewars kata page

---

## References

- [Codewars API v1 Documentation](https://dev.codewars.com/#introduction)
- [Codewars Main Docs](https://docs.codewars.com)
- [Codewars Website](https://www.codewars.com)

---

## Troubleshooting

### Problem: "Failed to fetch a problem"

**Possible Causes**:

1. Kata slug doesn't exist
2. Network/API issue
3. Rate limiting

**Solutions**:

1. Check bot logs for specific error
2. Verify kata slug is in the curated list
3. Try again after a delay
4. Check Codewars API status

### Problem: "No problems found"

**Possible Causes**:

1. Cache is empty
2. All kata slugs failed to fetch

**Solutions**:

1. Clear `data/problems.json` to force fresh fetch
2. Check internet connection
3. Verify Codewars API is accessible

### Problem: Wrong difficulty mapping

**Possible Causes**:

1. Kyu rank mapping logic issue
2. Kata rank changed on Codewars

**Solutions**:

1. Check `kyuToDifficulty()` function
2. Verify kata rank in API response
3. Update mapping if needed

---

**Last Updated**: Based on Codewars API v1 documentation (2025)
