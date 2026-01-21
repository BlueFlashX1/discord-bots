const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

class ProblemService {
  constructor() {
    this.problemsPath = path.join(__dirname, '../data/problems.json');
    this.problems = this.loadProblems();
    this.currentProblems = new Map(); // userId -> current problem
  }

  loadProblems() {
    try {
      if (fs.existsSync(this.problemsPath)) {
        const data = fs.readFileSync(this.problemsPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading problems:', error);
    }
    return [];
  }

  saveProblems() {
    try {
      const dir = path.dirname(this.problemsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.problemsPath, JSON.stringify(this.problems, null, 2));
    } catch (error) {
      console.error('Error saving problems:', error);
    }
  }

  async fetchLeetCodeProblem(difficulty = 'easy') {
    try {
      // LeetCode GraphQL API
      const query = `
        query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
          problemsetQuestionList: questionList(
            categorySlug: $categorySlug
            limit: $limit
            skip: $skip
            filters: $filters
          ) {
            total: totalNum
            questions: data {
              acRate
              difficulty
              freqBar
              frontendQuestionId: questionFrontendId
              isFavor
              paidOnly: isPaidOnly
              status
              title
              titleSlug
              topicTags {
                name
                id
                slug
              }
              hasSolution
              hasVideoSolution
            }
          }
        }
      `;

      const difficultyMap = {
        easy: 'EASY',
        medium: 'MEDIUM',
        hard: 'HARD',
      };

      const response = await axios.post(
        'https://leetcode.com/graphql/',
        {
          query,
          variables: {
            categorySlug: '',
            skip: Math.floor(Math.random() * 50),
            limit: 1,
            filters: {
              difficulty: difficultyMap[difficulty.toLowerCase()],
            },
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data?.data?.problemsetQuestionList?.questions?.length > 0) {
        const question = response.data.data.problemsetQuestionList.questions[0];
        return {
          id: question.frontendQuestionId,
          title: question.title,
          slug: question.titleSlug,
          difficulty: question.difficulty.toLowerCase(),
          url: `https://leetcode.com/problems/${question.titleSlug}/`,
          source: 'leetcode',
          tags: question.topicTags.map((t) => t.name),
        };
      }
    } catch (error) {
      console.error('Error fetching LeetCode problem:', error.message);
    }
    return null;
  }

  /**
   * Fetch a Codewars problem by kyu rank
   * According to Codewars API v1 docs: https://dev.codewars.com
   * - API is public (no auth required)
   * - Endpoint: /api/v1/code-challenges/{challenge} (by ID or slug)
   * - No random endpoint exists, so we use a curated list of popular kata slugs
   */
  async fetchCodewarsProblem(kyu = 8) {
    try {
      // Popular Codewars kata slugs organized by kyu rank
      // These are well-known kata that are commonly used for practice
      const kataSlugsByKyu = {
        8: [
          'multiply',
          'even-or-odd',
          'opposite-number',
          'convert-a-string-to-a-number',
          'remove-first-and-last-character',
          'sum-of-positive',
          'string-repeat',
          'remove-string-spaces',
          'grasshopper-summation',
          'counting-sheep',
        ],
        7: [
          'vowel-count',
          'disemvowel-trolls',
          'highest-and-lowest',
          'descending-order',
          'complementary-dna',
          'shortest-word',
          'exes-and-ohs',
          'square-every-digit',
          'mumbling',
          'get-the-middle-character',
        ],
        6: [
          'who-likes-it',
          'bit-counting',
          'your-order-please',
          'duplicate-encoder',
          'persistent-bugger',
          'take-a-ten-minute-walk',
          'replace-with-alphabet-position',
          'array-diff',
          'find-the-odd-int',
          'stop-gninnips-my-sdrow',
        ],
        5: [
          'simple-pig-latin',
          'human-readable-time',
          'moving-zeros-to-the-end',
          'rot13',
          'valid-parentheses',
          'pete-the-baker',
          'extract-the-domain-name-from-a-url',
          'rgb-to-hex-conversion',
          'where-my-anagrams-at',
          'directions-reduction',
        ],
        4: [
          'strip-comments',
          'strings-mix',
          'most-frequently-used-words-in-a-text',
          'roman-numerals-encoder',
          'sum-strings-as-numbers',
          'permutations',
          'twice-linear',
          'next-bigger-number-with-the-same-digits',
          'snail',
          'sum-of-intervals',
        ],
      };

      // Select random kata from appropriate kyu level
      const slugs = kataSlugsByKyu[kyu] || kataSlugsByKyu[8];
      const randomSlug = slugs[Math.floor(Math.random() * slugs.length)];

      // Fetch kata by slug (Codewars API v1)
      const response = await axios.get(
        `https://www.codewars.com/api/v1/code-challenges/${randomSlug}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data) {
        const kata = response.data;

        // Map Codewars rank to difficulty
        // Codewars uses kyu (8 kyu = easiest, 1 kyu = hardest) and dan (1-8 dan = expert)
        const rankId = kata.rank?.id || -8; // Default to 8 kyu if no rank
        const difficulty = this.kyuToDifficulty(rankId);

        // Structure problem according to Codewars API response
        return {
          id: kata.id,
          title: kata.name,
          slug: kata.slug,
          difficulty: difficulty,
          url: kata.url || `https://www.codewars.com/kata/${kata.slug}`,
          source: 'codewars',
          description: kata.description || '',
          tags: kata.tags || [],
          category: kata.category || 'algorithms',
          rank: {
            id: rankId,
            name: kata.rank?.name || '8 kyu',
            color: kata.rank?.color || 'white',
          },
          stats: {
            totalAttempts: kata.totalAttempts || 0,
            totalCompleted: kata.totalCompleted || 0,
            totalStars: kata.totalStars || 0,
            voteScore: kata.voteScore || 0,
          },
          languages: kata.languages || ['python'],
        };
      }
    } catch (error) {
      console.error('Error fetching Codewars problem:', error.message);
      if (error.response) {
        console.error('API Response:', error.response.status, error.response.data);
      }
    }
    return null;
  }

  /**
   * Convert Codewars kyu/dan rank to difficulty level
   * Codewars ranks: 8 kyu (easiest) -> 1 kyu -> 1 dan -> 8 dan (hardest)
   * Our difficulty: easy, medium, hard
   */
  kyuToDifficulty(rankId) {
    // rankId: negative = kyu, positive = dan
    // -8 to -1 = kyu (8 kyu easiest, 1 kyu hardest)
    // 1 to 8 = dan (1 dan to 8 dan, increasingly difficult)

    if (rankId >= 1) {
      // Dan ranks (1-8 dan) = hard
      return 'hard';
    } else if (rankId <= -1 && rankId >= -4) {
      // 1-4 kyu = hard
      return 'hard';
    } else if (rankId <= -5 && rankId >= -6) {
      // 5-6 kyu = medium
      return 'medium';
    } else {
      // 7-8 kyu = easy
      return 'easy';
    }
  }

  async getRandomProblem(difficulty = null, source = null) {
    // Try to get from cache first
    if (this.problems.length > 0) {
      let filtered = this.problems;

      if (difficulty) {
        filtered = filtered.filter((p) => p.difficulty === difficulty.toLowerCase());
      }

      if (source) {
        filtered = filtered.filter((p) => p.source === source.toLowerCase());
      }

      if (filtered.length > 0) {
        const random = filtered[Math.floor(Math.random() * filtered.length)];
        return random;
      }
    }

    // Fetch new problem
    let problem = null;

    if (source === 'leetcode' || !source) {
      problem = await this.fetchLeetCodeProblem(difficulty || 'easy');
    } else if (source === 'codewars') {
      // Map difficulty to Codewars kyu rank
      // For better variety, we use a range of kyu levels per difficulty
      let kyu;
      if (difficulty === 'hard') {
        // Hard: 1-4 kyu (pick random from this range)
        kyu = Math.floor(Math.random() * 4) + 1; // 1-4 kyu
      } else if (difficulty === 'medium') {
        // Medium: 5-6 kyu
        kyu = Math.floor(Math.random() * 2) + 5; // 5-6 kyu
      } else {
        // Easy: 7-8 kyu
        kyu = Math.floor(Math.random() * 2) + 7; // 7-8 kyu
      }
      problem = await this.fetchCodewarsProblem(kyu);
    }

    if (problem) {
      // Cache it
      this.problems.push(problem);
      this.saveProblems();
    }

    return problem;
  }

  setCurrentProblem(userId, problem) {
    this.currentProblems.set(userId, problem);
  }

  getCurrentProblem(userId) {
    return this.currentProblems.get(userId);
  }

  clearCurrentProblem(userId) {
    this.currentProblems.delete(userId);
  }
}

module.exports = ProblemService;
