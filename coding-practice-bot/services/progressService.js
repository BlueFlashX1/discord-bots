const fs = require('fs');
const path = require('path');

class ProgressService {
  constructor() {
    this.progressPath = path.join(__dirname, '../data/progress.json');
    this.progress = this.loadProgress();
  }

  loadProgress() {
    try {
      if (fs.existsSync(this.progressPath)) {
        const data = fs.readFileSync(this.progressPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
    return {};
  }

  saveProgress() {
    try {
      const dir = path.dirname(this.progressPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.progressPath, JSON.stringify(this.progress, null, 2));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  getUserProgress(userId) {
    if (!this.progress[userId]) {
      this.progress[userId] = {
        solved: [],
        attempted: [],
        streak: 0,
        lastSolved: null,
        stats: {
          easy: 0,
          medium: 0,
          hard: 0,
        },
      };
    }
    return this.progress[userId];
  }

  markSolved(userId, problemId, difficulty) {
    const userProgress = this.getUserProgress(userId);

    if (!userProgress.solved.includes(problemId)) {
      userProgress.solved.push(problemId);
      userProgress.stats[difficulty] = (userProgress.stats[difficulty] || 0) + 1;

      // Update streak
      const today = new Date().toDateString();
      if (userProgress.lastSolved !== today) {
        userProgress.streak += 1;
        userProgress.lastSolved = today;
      }

      this.saveProgress();
    }
  }

  markAttempted(userId, problemId) {
    const userProgress = this.getUserProgress(userId);

    if (!userProgress.attempted.includes(problemId)) {
      userProgress.attempted.push(problemId);
      this.saveProgress();
    }
  }

  getStats(userId) {
    return this.getUserProgress(userId);
  }
}

module.exports = ProgressService;
