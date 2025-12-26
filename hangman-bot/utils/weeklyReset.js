/**
 * Weekly Reset Utility
 * Handles weekly points reset for all players (Mondays at 00:00)
 */

class WeeklyReset {
  constructor(Player) {
    this.Player = Player;
    this.resetJob = null;
  }

  /**
   * Start weekly reset scheduler
   */
  start() {
    console.log('📅 Weekly reset scheduler started');

    // Run check every hour
    this.resetJob = setInterval(() => {
      this.checkAndReset();
    }, 60 * 60 * 1000); // 1 hour

    // Also run immediately on start
    this.checkAndReset();
  }

  /**
   * Stop scheduler
   */
  stop() {
    if (this.resetJob) {
      clearInterval(this.resetJob);
      this.resetJob = null;
      console.log('📅 Weekly reset scheduler stopped');
    }
  }

  /**
   * Check if reset is needed and perform it
   */
  async checkAndReset() {
    try {
      const now = new Date();
      const lastMonday = this.getLastMonday(now);

      // Get all players
      let players;

      if (this.Player.find) {
        // MongoDB
        players = await this.Player.find({});
      } else if (this.Player.players) {
        // JSON mode
        players = Object.values(this.Player.players);
      } else {
        console.log('⚠️ Unable to fetch players for weekly reset');
        return;
      }

      let resetCount = 0;

      for (const player of players) {
        const lastReset = new Date(player.lastWeeklyReset);

        if (lastMonday > lastReset) {
          // Reset needed
          if (player.checkWeeklyReset) {
            // MongoDB model instance
            await player.checkWeeklyReset();
          } else {
            // JSON mode
            if (this.Player.checkWeeklyReset) {
              await this.Player.checkWeeklyReset(player.userId);
            }
          }

          resetCount++;
        }
      }

      if (resetCount > 0) {
        console.log(`🔄 Weekly reset completed for ${resetCount} player(s)`);
      }
    } catch (error) {
      console.error('❌ Error during weekly reset:', error);
    }
  }

  /**
   * Force reset all players (admin command)
   */
  async forceResetAll() {
    try {
      let players;

      if (this.Player.find) {
        players = await this.Player.find({});
      } else if (this.Player.players) {
        players = Object.values(this.Player.players);
      } else {
        throw new Error('Unable to fetch players');
      }

      let resetCount = 0;

      for (const player of players) {
        if (player.weeklyPoints && player.weeklyPoints > 0) {
          if (this.Player.updateOne) {
            // MongoDB
            await this.Player.updateOne(
              { userId: player.userId },
              {
                weeklyPoints: 0,
                lastWeeklyReset: new Date()
              }
            );
          } else if (this.Player.players) {
            // JSON mode
            this.Player.players[player.userId].weeklyPoints = 0;
            this.Player.players[player.userId].lastWeeklyReset = new Date().toISOString();
            this.Player.saveData();
          }

          resetCount++;
        }
      }

      console.log(`🔄 Force reset completed for ${resetCount} player(s)`);
      return resetCount;
    } catch (error) {
      console.error('❌ Error during force reset:', error);
      throw error;
    }
  }

  /**
   * Get reset status for a player
   */
  async getPlayerResetStatus(userId) {
    let player;

    if (this.Player.findOne) {
      player = await this.Player.findOne({ userId });
    } else if (this.Player.players) {
      player = this.Player.players[userId];
    }

    if (!player) {
      return null;
    }

    const now = new Date();
    const lastMonday = this.getLastMonday(now);
    const lastReset = new Date(player.lastWeeklyReset);
    const needsReset = lastMonday > lastReset;

    return {
      lastReset: lastReset,
      nextReset: this.getNextMonday(now),
      needsReset: needsReset,
      weeklyPoints: player.weeklyPoints
    };
  }

  /**
   * Get time until next reset
   */
  getTimeUntilReset() {
    const now = new Date();
    const nextMonday = this.getNextMonday(now);
    const diff = nextMonday - now;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return {
      days,
      hours,
      nextReset: nextMonday
    };
  }

  /**
   * Helper: Get last Monday 00:00
   */
  getLastMonday(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1; // If Sunday, go back 6 days
    d.setDate(d.getDate() - diff);
    return d;
  }

  /**
   * Helper: Get next Monday 00:00
   */
  getNextMonday(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const daysUntilMonday = day === 0 ? 1 : 8 - day;
    d.setDate(d.getDate() + daysUntilMonday);
    return d;
  }

  /**
   * Format time until reset for display
   */
  formatTimeUntilReset() {
    const time = this.getTimeUntilReset();

    if (time.days === 0) {
      return `${time.hours} hour${time.hours !== 1 ? 's' : ''}`;
    }

    return `${time.days} day${time.days !== 1 ? 's' : ''} and ${time.hours} hour${time.hours !== 1 ? 's' : ''}`;
  }
}

module.exports = WeeklyReset;
