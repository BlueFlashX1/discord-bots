const axios = require('axios');

class CodewarsProgress {
  constructor() {
    this.baseUrl = 'https://www.codewars.com/api/v1';
  }

  /**
   * Get user's Codewars profile and progress
   * Endpoint: GET /api/v1/users/{user}
   */
  async getUserProfile(username) {
    try {
      const response = await axios.get(`${this.baseUrl}/users/${username}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data) {
        return {
          username: response.data.username,
          honor: response.data.honor || 0,
          rank: response.data.ranks?.overall || null,
          languages: response.data.ranks?.languages || {},
          totalCompleted: response.data.codeChallenges?.totalCompleted || 0,
          totalAuthored: response.data.codeChallenges?.totalAuthored || 0,
        };
      }
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Codewars user "${username}" not found`);
      }
      console.error('Error fetching Codewars profile:', error.message);
      throw error;
    }
    return null;
  }

  /**
   * Get user's completed challenges
   * Endpoint: GET /api/v1/users/{user}/code-challenges/completed?page={page}
   */
  async getCompletedChallenges(username, page = 0) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/users/${username}/code-challenges/completed?page=${page}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data) {
        return {
          totalPages: response.data.totalPages || 0,
          totalItems: response.data.totalItems || 0,
          challenges: response.data.data || [],
        };
      }
    } catch (error) {
      console.error('Error fetching completed challenges:', error.message);
      throw error;
    }
    return null;
  }

  /**
   * Get all completed challenges (across all pages)
   */
  async getAllCompletedChallenges(username) {
    try {
      const firstPage = await this.getCompletedChallenges(username, 0);
      if (!firstPage || firstPage.totalPages === 0) {
        return [];
      }

      const allChallenges = [...firstPage.challenges];

      // Fetch remaining pages
      for (let page = 1; page < firstPage.totalPages; page++) {
        const pageData = await this.getCompletedChallenges(username, page);
        if (pageData && pageData.challenges) {
          allChallenges.push(...pageData.challenges);
        }
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      return allChallenges;
    } catch (error) {
      console.error('Error fetching all completed challenges:', error.message);
      return [];
    }
  }

  /**
   * Analyze mastery progress by difficulty/kyu rank
   * Uses profile data and completion count for recommendations
   */
  async analyzeMastery(username) {
    try {
      const profile = await this.getUserProfile(username);
      
      // Get completion count (first page only for performance)
      // Full list would require fetching all pages which is slow
      const firstPage = await this.getCompletedChallenges(username, 0);
      const totalCompleted = firstPage?.totalItems || profile.totalCompleted || 0;

      return {
        profile,
        totalCompleted,
        recommendation: this.getDifficultyRecommendation(profile, totalCompleted),
      };
    } catch (error) {
      console.error('Error analyzing mastery:', error.message);
      throw error;
    }
  }

  /**
   * Get difficulty recommendation based on progress
   */
  getDifficultyRecommendation(profile, totalCompleted) {
    const overallRank = profile.rank;
    if (!overallRank) {
      return {
        current: 'easy',
        recommended: 'easy',
        reason: 'Starting out - begin with easy problems',
      };
    }

    const rankId = overallRank.rank || -8;
    let currentDifficulty = 'easy';
    let recommendedDifficulty = 'easy';

    // Map rank to difficulty
    if (rankId >= 1 || (rankId <= -1 && rankId >= -4)) {
      currentDifficulty = 'hard';
      recommendedDifficulty = 'hard';
    } else if (rankId <= -5 && rankId >= -6) {
      currentDifficulty = 'medium';
      recommendedDifficulty = totalCompleted >= 20 ? 'hard' : 'medium';
    } else {
      currentDifficulty = 'easy';
      recommendedDifficulty = totalCompleted >= 15 ? 'medium' : 'easy';
    }

    let reason = '';
    if (recommendedDifficulty === 'hard' && currentDifficulty !== 'hard') {
      reason = `You've completed ${totalCompleted} problems and reached ${overallRank.name}. Try harder challenges!`;
    } else if (recommendedDifficulty === 'medium' && currentDifficulty === 'easy') {
      reason = `You've completed ${totalCompleted} problems. Ready to step up to medium difficulty!`;
    } else {
      reason = `Keep practicing at ${currentDifficulty} level. You're making great progress!`;
    }

    return {
      current: currentDifficulty,
      recommended: recommendedDifficulty,
      reason,
      rank: overallRank.name,
      honor: profile.honor,
    };
  }

  /**
   * Check if user has completed a specific kata
   */
  async hasCompletedKata(username, kataId) {
    try {
      const completed = await this.getAllCompletedChallenges(username);
      return completed.some((challenge) => challenge.id === kataId);
    } catch (error) {
      console.error('Error checking completed kata:', error.message);
      return false;
    }
  }
}

module.exports = CodewarsProgress;
