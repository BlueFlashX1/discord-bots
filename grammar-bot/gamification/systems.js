/**
 * Consolidated Gamification Systems
 * Points, Shop, Achievements, PvP
 */

const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

// ============================================================================
// POINTS SYSTEM
// ============================================================================

class PointsSystem {
  /**
   * Award quality bonus for clean message
   */
  static async awardQualityBonus(user, messageLength) {
    return await user.awardQualityBonus(messageLength);
  }

  /**
   * Apply error penalty
   */
  static async applyErrorPenalty(user, errorCount) {
    return await user.applyErrorPenalty(errorCount);
  }

  /**
   * Calculate level from XP
   */
  static calculateLevel(xp) {
    let level = 1;
    let xpNeeded = 100;

    while (xp >= xpNeeded) {
      xp -= xpNeeded;
      level += 1;
      xpNeeded = Math.floor(100 * Math.pow(level, 1.5));
    }

    return level;
  }

  /**
   * Get XP needed for next level
   */
  static getXpForLevel(level) {
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  /**
   * Create XP progress bar
   */
  static createProgressBar(current, max, length = 10) {
    const progress = Math.floor((current / max) * length);
    const empty = length - progress;

    return '█'.repeat(progress) + '░'.repeat(empty);
  }
}

// ============================================================================
// SHOP SYSTEM
// ============================================================================

class ShopSystem {
  /**
   * Get shop items from config
   */
  static getShopItems() {
    return (
      config.shop.items || [
        {
          id: 'scholar_title',
          name: 'Scholar Title',
          cost: 500,
          type: 'title',
          description: 'Display "Scholar" title',
        },
        {
          id: 'grammarian_title',
          name: 'Grammarian Title',
          cost: 1000,
          type: 'title',
          description: 'Display "Grammarian" title',
        },
        {
          id: 'perfectionist_title',
          name: 'Perfectionist Title',
          cost: 2000,
          type: 'title',
          description: 'Display "Perfectionist" title',
        },
        {
          id: 'dark_theme',
          name: 'Dark Theme',
          cost: 750,
          type: 'theme',
          description: 'Dark mode embeds',
        },
        {
          id: 'gold_theme',
          name: 'Gold Theme',
          cost: 1500,
          type: 'theme',
          description: 'Gold accent embeds',
        },
        {
          id: 'star_badge',
          name: 'Star Badge',
          cost: 1000,
          type: 'badge',
          description: 'Star badge on stats',
        },
        {
          id: 'crown_badge',
          name: 'Crown Badge',
          cost: 2500,
          type: 'badge',
          description: 'Crown badge on stats',
        },
      ]
    );
  }

  /**
   * Get items by type
   */
  static getItemsByType(type) {
    return this.getShopItems().filter((item) => item.type === type);
  }

  /**
   * Find item by ID
   */
  static findItem(itemId) {
    return this.getShopItems().find((item) => item.id === itemId);
  }

  /**
   * Purchase item
   */
  static async purchaseItem(user, itemId) {
    const item = this.findItem(itemId);

    if (!item) {
      throw new Error('Item not found');
    }

    return await user.purchaseItem(itemId, item.name, item.cost);
  }

  /**
   * Create shop embed
   */
  static createShopEmbed(userPoints) {
    const items = this.getShopItems();
    const embed = new EmbedBuilder()
      .setTitle('Grammar Shop')
      .setDescription('Purchase cosmetics with your points!')
      .setColor(config.colors.info);

    embed.addFields({
      name: 'Your Points',
      value: `${userPoints} points`,
      inline: false,
    });

    // Group by type
    const types = ['title', 'theme', 'badge'];
    types.forEach((type) => {
      const typeItems = items.filter((i) => i.type === type);
      if (typeItems.length > 0) {
        const itemList = typeItems
          .map((item) => {
            const affordable = userPoints >= item.cost ? '[Available]' : '[Not enough points]';
            return `${affordable} **${item.name}** - ${item.cost} pts\n_${item.description}_`;
          })
          .join('\n\n');

        embed.addFields({
          name: `${this.capitalize(type)}s`,
          value: itemList,
          inline: false,
        });
      }
    });

    return embed;
  }

  static capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// ============================================================================
// ACHIEVEMENTS SYSTEM
// ============================================================================

class AchievementsSystem {
  /**
   * Get all achievements
   */
  static getAllAchievements() {
    return [
      // Streak achievements
      {
        id: 'streak_7',
        name: 'Week Streak',
        description: '7-day clean message streak',
        requirement: { type: 'streak', value: 7 },
      },
      {
        id: 'streak_30',
        name: 'Month Streak',
        description: '30-day clean message streak',
        requirement: { type: 'streak', value: 30 },
      },
      {
        id: 'streak_100',
        name: 'Century Streak',
        description: '100-day clean message streak',
        requirement: { type: 'streak', value: 100 },
      },

      // Message achievements
      {
        id: 'messages_100',
        name: 'Centurion',
        description: '100 messages checked',
        requirement: { type: 'messages', value: 100 },
      },
      {
        id: 'messages_1000',
        name: 'Thousand',
        description: '1000 messages checked',
        requirement: { type: 'messages', value: 1000 },
      },

      // Accuracy achievements
      {
        id: 'accuracy_90',
        name: 'Sharp Shooter',
        description: '90%+ accuracy',
        requirement: { type: 'accuracy', value: 90 },
      },
      {
        id: 'accuracy_95',
        name: 'Perfectionist',
        description: '95%+ accuracy',
        requirement: { type: 'accuracy', value: 95 },
      },

      // Level achievements
      {
        id: 'level_10',
        name: 'Level 10',
        description: 'Reach level 10',
        requirement: { type: 'level', value: 10 },
      },
      {
        id: 'level_25',
        name: 'Level 25',
        description: 'Reach level 25',
        requirement: { type: 'level', value: 25 },
      },

      // PvP achievements
      {
        id: 'pvp_10',
        name: 'Duelist',
        description: 'Win 10 PvP battles',
        requirement: { type: 'pvp_wins', value: 10 },
      },
      {
        id: 'pvp_50',
        name: 'Champion',
        description: 'Win 50 PvP battles',
        requirement: { type: 'pvp_wins', value: 50 },
      },

      // Special achievements
      {
        id: 'no_errors_50',
        name: 'Flawless 50',
        description: '50 consecutive clean messages',
        requirement: { type: 'consecutive_clean', value: 50 },
      },
      {
        id: 'shop_master',
        name: 'Shop Master',
        description: 'Purchase 5 shop items',
        requirement: { type: 'shop_items', value: 5 },
      },
    ];
  }

  /**
   * Check and unlock achievements for user
   */
  static async checkAchievements(user) {
    const unlocked = [];
    const allAchievements = this.getAllAchievements();

    for (const achievement of allAchievements) {
      // Skip if already unlocked
      const achievements = user.achievements || [];
      if (achievements.some((a) => {
        const achId = typeof a === 'string' ? a : a.achievementId;
        return achId === achievement.id;
      })) {
        continue;
      }

      // Check requirement
      if (this.meetsRequirement(user, achievement.requirement)) {
        const wasUnlocked = await user.unlockAchievement(achievement.id, achievement.name);

        if (wasUnlocked) {
          unlocked.push(achievement);

          // Award bonus points
          user.points += 100;
          user.xp += 50;
          await user.save();
        }
      }
    }

    return unlocked;
  }

  /**
   * Check if user meets requirement
   */
  static meetsRequirement(user, requirement) {
    switch (requirement.type) {
      case 'streak':
        return user.streak >= requirement.value;

      case 'messages':
        return user.totalMessages >= requirement.value;

      case 'accuracy':
        const accuracy =
          user.totalMessages > 0 ? (user.cleanMessages / user.totalMessages) * 100 : 0;
        return accuracy >= requirement.value;

      case 'level':
        return user.level >= requirement.value;

      case 'pvp_wins':
        return user.pvpWins >= requirement.value;

      case 'shop_items':
        const shopItems = user.shopItems || user.inventory || [];
        return shopItems.length >= requirement.value;

      case 'consecutive_clean':
        // This would need additional tracking
        return false;

      default:
        return false;
    }
  }

  /**
   * Create achievement unlock embed
   */
  static createUnlockEmbed(achievement) {
    return new EmbedBuilder()
      .setTitle('Achievement Unlocked!')
      .setDescription(`**${achievement.name}**\n${achievement.description}`)
      .setColor(config.colors.success)
      .addFields({
        name: 'Bonus',
        value: '+100 points, +50 XP',
        inline: false,
      });
  }
}

// ============================================================================
// PVP SYSTEM
// ============================================================================

class PvPSystem {
  /**
   * Start PvP battle
   */
  static async createBattle(challenger, opponent) {
    return {
      id: `${challenger.userId}_${opponent.userId}_${Date.now()}`,
      challenger: {
        userId: challenger.userId,
        username: challenger.username,
        level: challenger.level,
        accuracy: parseFloat(challenger.accuracy),
      },
      opponent: {
        userId: opponent.userId,
        username: opponent.username,
        level: opponent.level,
        accuracy: parseFloat(opponent.accuracy),
      },
      status: 'pending',
      createdAt: new Date(),
    };
  }

  /**
   * Accept battle
   */
  static async acceptBattle(battle) {
    battle.status = 'active';
    battle.startedAt = new Date();
    return battle;
  }

  /**
   * Complete battle with results
   */
  static async completeBattle(
    battle,
    challengerText,
    opponentText,
    challengerResult,
    opponentResult
  ) {
    // Calculate scores
    const challengerScore = this.calculateBattleScore(
      challengerResult.qualityScore,
      challengerText.length,
      battle.challenger.level
    );

    const opponentScore = this.calculateBattleScore(
      opponentResult.qualityScore,
      opponentText.length,
      battle.opponent.level
    );

    // Determine winner
    let result;
    if (challengerScore > opponentScore) {
      result = 'challenger_wins';
    } else if (opponentScore > challengerScore) {
      result = 'opponent_wins';
    } else {
      result = 'draw';
    }

    return {
      ...battle,
      status: 'completed',
      challengerScore,
      opponentScore,
      result,
      completedAt: new Date(),
    };
  }

  /**
   * Calculate battle score
   */
  static calculateBattleScore(qualityScore, messageLength, level) {
    const baseScore = qualityScore;
    const lengthBonus = Math.min(messageLength / 10, 20); // Max +20
    const levelBonus = level * 2; // +2 per level

    return baseScore + lengthBonus + levelBonus;
  }

  /**
   * Resolve battle and update user records
   */
  static async resolveBattle(challengerUser, opponentUser, challengerScore, opponentScore) {
    // Determine winner
    let challengerResult, opponentResult;

    if (challengerScore > opponentScore) {
      challengerResult = 'win';
      opponentResult = 'loss';
    } else if (opponentScore > challengerScore) {
      challengerResult = 'loss';
      opponentResult = 'win';
    } else {
      challengerResult = 'draw';
      opponentResult = 'draw';
    }

    // Record results for both users
    await challengerUser.recordPvpResult(challengerResult);
    await opponentUser.recordPvpResult(opponentResult);

    // Apply HP damage to loser (if not a draw)
    if (challengerResult === 'loss') {
      challengerUser.hp = Math.max(0, challengerUser.hp - 10);
      await challengerUser.save();
    } else if (opponentResult === 'loss') {
      opponentUser.hp = Math.max(0, opponentUser.hp - 10);
      await opponentUser.save();
    }

    return {
      challengerScore,
      opponentScore,
      result:
        challengerResult === 'win'
          ? 'challenger_wins'
          : opponentResult === 'win'
          ? 'opponent_wins'
          : 'draw',
      challengerResult,
      opponentResult,
    };
  }

  /**
   * Create battle result embed
   */
  static createBattleResultEmbed(battle) {
    const embed = new EmbedBuilder().setTitle('PvP Battle Results').setColor(config.colors.info);

    embed.addFields({
      name: `${battle.challenger.username} (Level ${battle.challenger.level})`,
      value: `Score: ${battle.challengerScore}`,
      inline: true,
    });

    embed.addFields({
      name: `${battle.opponent.username} (Level ${battle.opponent.level})`,
      value: `Score: ${battle.opponentScore}`,
      inline: true,
    });

    let resultText;
    if (battle.result === 'challenger_wins') {
      resultText = `**${battle.challenger.username} wins!**`;
    } else if (battle.result === 'opponent_wins') {
      resultText = `**${battle.opponent.username} wins!**`;
    } else {
      resultText = "**It's a draw!**";
    }

    embed.addFields({
      name: 'Result',
      value: resultText,
      inline: false,
    });

    return embed;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// ============================================================================
// SKILLS SYSTEM
// ============================================================================

class SkillsSystem {
  /**
   * Get available skills from config
   */
  static getSkills() {
    return config.skills?.items || [];
  }

  /**
   * Find skill by ID
   */
  static findSkill(skillId) {
    return this.getSkills().find((skill) => skill.id === skillId);
  }

  /**
   * Get skills by type
   */
  static getSkillsByType(type) {
    return this.getSkills().filter((skill) => skill.type === type);
  }

  /**
   * Check if user can use skill (has enough points)
   */
  static canUseSkill(user, skillId) {
    const skill = this.findSkill(skillId);
    if (!skill) return false;
    return user.points >= skill.cost;
  }

  /**
   * Execute skill attack
   */
  static async executeAttack(attacker, target, skillId) {
    const skill = this.findSkill(skillId);
    if (!skill) {
      throw new Error('Skill not found');
    }

    if (!this.canUseSkill(attacker, skillId)) {
      throw new Error(`Insufficient points! Need ${skill.cost} points to use ${skill.name}`);
    }

    // Deduct skill cost
    attacker.points -= skill.cost;
    attacker.updatedAt = new Date();
    await attacker.save();

    // Apply damage to target
    const damage = skill.damage;
    target.hp = Math.max(0, target.hp - damage);
    target.updatedAt = new Date();
    await target.save();

    return {
      skill,
      damage,
      attackerPoints: attacker.points,
      targetHp: target.hp,
      targetDefeated: target.hp <= 0,
    };
  }
}

module.exports = {
  PointsSystem,
  ShopSystem,
  AchievementsSystem,
  PvPSystem,
  SkillsSystem,
};
