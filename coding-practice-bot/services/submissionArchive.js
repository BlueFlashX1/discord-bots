const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

class SubmissionArchive {
  constructor() {
    this.archivePath = path.join(__dirname, '../data/submissions.json');
    this.submissions = this.loadSubmissions();
  }

  loadSubmissions() {
    try {
      if (fs.existsSync(this.archivePath)) {
        const data = fs.readFileSync(this.archivePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
    return [];
  }

  saveSubmissions() {
    try {
      const dir = path.dirname(this.archivePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.archivePath, JSON.stringify(this.submissions, null, 2));
    } catch (error) {
      console.error('Error saving submissions:', error);
    }
  }

  archiveSubmission(userId, username, problem, code, result, messageId = null, channelId = null) {
    const submission = {
      id: `${Date.now()}-${userId}-${Math.random().toString(36).substr(2, 9)}`,
      userId: userId,
      username: username,
      problemId: problem.id,
      problemTitle: problem.title,
      problemDifficulty: problem.difficulty,
      problemSource: problem.source,
      problemUrl: problem.url,
      code: code,
      result: {
        valid: result.valid,
        passed: result.passed,
        type: result.type,
        output: result.output,
        error: result.error,
      },
      timestamp: new Date().toISOString(),
      messageId: messageId,
      channelId: channelId,
    };

    this.submissions.push(submission);

    // Keep only last 1000 submissions to prevent file from growing too large
    if (this.submissions.length > 1000) {
      this.submissions = this.submissions.slice(-1000);
    }

    this.saveSubmissions();
    return submission;
  }

  getUserSubmissions(userId, limit = 10) {
    return this.submissions
      .filter((s) => s.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  getProblemSubmissions(problemId, limit = 10) {
    return this.submissions
      .filter((s) => s.problemId === problemId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  getSuccessfulSubmissions(problemId = null, limit = 10) {
    let filtered = this.submissions.filter((s) => s.result.passed === true);

    if (problemId) {
      filtered = filtered.filter((s) => s.problemId === problemId);
    }

    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
  }

  getSubmissionById(submissionId) {
    return this.submissions.find((s) => s.id === submissionId);
  }

  createArchiveEmbed(submission) {
    const codePreview =
      submission.code.length > 1000
        ? submission.code.substring(0, 1000) + '\n... (truncated)'
        : submission.code;

    const embed = new EmbedBuilder()
      .setTitle(`✅ Solution: ${submission.problemTitle}`)
      .setURL(submission.problemUrl)
      .setDescription(
        `**Solved by:** ${submission.username}\n` +
          `**Difficulty:** ${submission.problemDifficulty.toUpperCase()}\n` +
          `**Source:** ${submission.problemSource.toUpperCase()}\n` +
          `**Date:** ${new Date(submission.timestamp).toLocaleDateString()}`
      )
      .addFields({
        name: '📝 Solution Code',
        value: `\`\`\`python\n${codePreview}\n\`\`\``,
      })
      .setColor(0x00ff00)
      .setFooter({ text: `Submission ID: ${submission.id.substring(0, 20)}...` })
      .setTimestamp(new Date(submission.timestamp));

    if (submission.result.output) {
      const outputPreview =
        submission.result.output.length > 500
          ? submission.result.output.substring(0, 500) + '\n... (truncated)'
          : submission.result.output;

      embed.addFields({
        name: '📊 Test Output',
        value: `\`\`\`\n${outputPreview}\n\`\`\``,
      });
    }

    return embed;
  }
}

module.exports = SubmissionArchive;
