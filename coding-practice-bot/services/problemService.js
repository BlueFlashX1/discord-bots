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
        const parsed = JSON.parse(data);
        return this.dedupeProblemsById(parsed);
      }
    } catch (error) {
      console.error('Error loading problems:', error);
    }
    return [];
  }

  dedupeProblemsById(problems) {
    const seen = new Set();
    return (problems || []).filter((p) => {
      const id = p.id != null ? String(p.id) : p.slug || '';
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
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

  /**
   * Fetch a LeetCode problem by difficulty.
   * Uses LeetCode's public GraphQL API at leetcode.com/graphql.
   * - Random selection: picks a random skip offset (0-49) and fetches 1 question
   * - Filters by difficulty (EASY, MEDIUM, HARD)
   * - Returns metadata only (no problem description; user visits URL for full content)
   */
  async fetchLeetCodeProblem(difficulty = 'easy') {
    try {
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
   * Fetch a Codewars problem by kyu rank.
   * API: https://dev.codewars.com/#get-code-challenge
   * - Endpoint: GET /api/v1/code-challenges/{challenge} (ID or slug)
   * - No list/random endpoint; uses curated kata slugs, then fetches full CodeChallenge
   * - Response: id, name, slug, url, description, tags, rank, totalAttempts, totalCompleted, totalStars
   */
  async fetchCodewarsProblem(kyu = 8) {
    try {
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
          'reversed-strings',
          'square-n-sum',
          'return-negative',
          'basic-math-operations',
          'reversed-words',
          'digitize',
          'boolean-to-string',
          'abbreviate-a-two-word-name',
          'keep-hydrated',
          'century-from-year',
          'convert-number-to-reversed-array-of-digits',
          'is-n-divisible-by-x-and-y',
          'quarter-of-the-year',
          'beginner-lost-without-a-map',
          'convert-a-boolean-to-a-string',
          'transportation-on-vacation',
          'thinkful-number-dribble',
          'will-you-make-it',
          'double-char',
          'cockroach',
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
          'jaden-casing-strings',
          'isograms',
          'exes-and-ohs',
          'credit-card-mask',
          'two-to-one',
          'remove-the-minimum',
          'number-of-people-in-the-bus',
          'friend-or-foe',
          'list-filtering',
          'sort-array-by-string-length',
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
          'multiples-of-3-or-5',
          'counting-duplicates',
          'create-phone-number',
          'build-tower',
          'split-strings',
          'which-are-in',
          'unique-in-order',
          'tribonacci-sequence',
          'valid-braces',
          'detect-pangram',
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
          'string-incrementer',
          'first-non-repeating-character',
          'maximum-subarray-sum',
          'product-of-consecutive-fib-numbers',
          'calculating-with-functions',
          'int32-to-ipv4',
          'common-denominators',
          'fibonacci-streaming',
          'gap-in-primes',
          'merged-string-checker',
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
          'range-extraction',
          'magnet-particules-in-boxes',
          'matrix-determinant',
          'so-many-permutations',
          'permutation-average',
          'path-finder-number-1-can-you-reach-the-exit',
          'sort-binary-tree-by-levels',
          'matrix-addition',
          'escape-the-mines',
          'binary-multiple-of-3',
        ],
        3: [
          'last-digit-of-a-huge-number',
          'breadcrumb-generator',
          'screen-locking-patterns',
          'rail-fence-cipher',
          'battleship-field-validator',
          'alphabetic-anagrams',
          'last-digit-of-a-large-number',
          'prime-streaming-pg-13',
          'how-many-numbers-iii',
          'multinomial-coefficients',
        ],
        2: [
          'evaluate-mathematical-expression',
          'text-align-justify',
          'one-line-task-square-every-digit',
          'sudoku-solver',
          'insane-coloured-triangles',
          'infix-to-postfix-converter',
          'simplifying-multilinear-polynomials',
          'algebraic-lists',
          'replicate-new',
          'functional-lists',
        ],
        1: [
          'functional-curry',
          'functional-sql',
          'catching-car-mileage-numbers',
          'coding-with-squared-strings',
          'irreducible-sum-of-rationals',
          'faberge-easter-eggs-crush-test',
          'regular-expression-for-binary-numbers-divisible-by-n',
          'object-oriented-piracy',
          'can-you-get-the-loop',
          'assembler-interpreter-part-ii',
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

  async getRandomProblem(difficulty = null, source = null, excludeIds = []) {
    const excludeSet = new Set((excludeIds || []).map((id) => String(id)));

    if (this.problems.length > 0) {
      let filtered = this.problems;

      filtered = filtered.filter((p) => p.source !== 'codewars');

      if (difficulty) {
        filtered = filtered.filter((p) => p.difficulty === difficulty.toLowerCase());
      }

      if (source) {
        filtered = filtered.filter((p) => p.source === source.toLowerCase());
      }

      if (excludeSet.size > 0) {
        filtered = filtered.filter((p) => !excludeSet.has(String(p.id)));
      }

      if (filtered.length > 0) {
        const random = filtered[Math.floor(Math.random() * filtered.length)];
        return random;
      }
    }

    let problem = null;

    if (source === 'leetcode' || !source) {
      problem = await this.fetchLeetCodeProblem(difficulty || 'easy');
    }

    if (problem) {
      const existingIds = new Set(this.problems.map((p) => String(p.id)));
      if (!existingIds.has(String(problem.id))) {
        this.problems.push(problem);
        this.saveProblems();
      }
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
