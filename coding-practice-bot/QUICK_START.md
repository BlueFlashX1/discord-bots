# Quick Start Guide - Auto-Post & Mastery Tracking

## 🚀 Get Started in 3 Steps

### Step 1: Enable Auto-Post

```
/settings autopost enabled:true channel:#your-channel
```

Replace `#your-channel` with your actual channel.

### Step 2: Set Your Preferences

```
/settings difficulty level:medium
/settings source source:codewars
```

### Step 3: Link Codewars (Optional but Recommended)

```
/settings codewars username:your_codewars_username
/settings mastery enabled:true
```

**Done!** The bot will now:
- ✅ Post problems automatically (once per day)
- ✅ Use your preferred difficulty and source
- ✅ Recommend when to try harder difficulties (if mastery tracking enabled)

---

## 📊 Check Your Progress

```
/mastery
```

Shows:
- Your current rank
- Total completed problems
- Recommended difficulty
- Why the recommendation was made

---

## ⚙️ View Your Settings

```
/settings view
```

Shows all your current preferences.

---

## 🎯 How It Works

1. **Bot posts problem automatically** (once per day at 9 AM UTC)
2. **You solve it** using `/submit`
3. **Bot tracks progress** (if Codewars linked)
4. **Bot recommends difficulty** based on your progress
5. **Next auto-post uses recommendation** (if mastery tracking enabled)

---

## 🔧 Customize Posting Frequency

Edit `.env`:

```env
AUTO_POST_INTERVAL_HOURS=12  # Post twice per day
```

Then restart the bot.

---

## 💡 Tips

- **Start Easy**: Begin with easy problems, let mastery tracking guide you
- **Link Codewars**: Get smart recommendations based on your actual progress
- **Check Mastery**: Use `/mastery` regularly to see your progress
- **Trust Recommendations**: Bot analyzes your real progress on Codewars

---

## ❓ Need Help?

- See full documentation: `docs/AUTO_POST_SETUP.md`
- Check settings: `/settings view`
- View mastery: `/mastery`
