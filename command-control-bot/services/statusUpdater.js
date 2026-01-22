const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const processManager = require('./processManager');
const logger = require('./logger');

class StatusUpdater {
  constructor() {
    this.updateIntervals = new Map(); // processId -> intervalId
    this.threadLastOutput = new Map(); // processId -> lastOutputIndex
    logger.debug('StatusUpdater initialized');
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  getStatusEmbed(processData) {
    const { command, startTime, output, error, status, exitCode, endTime, processId } = processData;
    const elapsed = endTime ? endTime - startTime : Date.now() - startTime;
    logger.debug('Building status embed', { processId, status, elapsed, outputLines: output.length, errorLines: error.length });

    const embed = new EmbedBuilder()
      .setTitle(`${command.label} - ${status.toUpperCase()}`)
      .setDescription(command.description || 'No description')
      .addFields(
        { name: 'Status', value: status, inline: true },
        { name: 'Elapsed', value: this.formatDuration(elapsed), inline: true },
        { name: 'Directory', value: `\`${command.directory}\``, inline: false }
      )
      .setColor(this.getStatusColor(status))
      .setTimestamp();

    // Add output preview
    if (output.length > 0) {
      const lastOutput = output.slice(-5).join('\n');
      embed.addFields({
        name: 'Last Output',
        value: `\`\`\`\n${lastOutput.length > 500 ? lastOutput.slice(-500) + '...' : lastOutput}\n\`\`\``,
        inline: false,
      });
    }

    // Add error if any
    if (error.length > 0) {
      const lastError = error.slice(-5).join('\n');
      embed.addFields({
        name: 'Errors',
        value: `\`\`\`\n${lastError.length > 500 ? lastError.slice(-500) + '...' : lastError}\n\`\`\``,
        inline: false,
      });
    }

    // Add exit code if completed
    if (endTime && exitCode !== undefined) {
      embed.addFields({
        name: 'Exit Code',
        value: exitCode.toString(),
        inline: true,
      });
    }

    return embed;
  }

  getStatusColor(status) {
    const colors = {
      starting: 0x3498db,  // Blue
      running: 0x2ecc71,   // Green
      completed: 0x27ae60, // Dark green
      error: 0xe74c3c,     // Red
      stopped: 0x95a5a6,   // Gray
      timeout: 0xf39c12,   // Orange
    };
    return colors[status] || 0x95a5a6;
  }

  getActionButtons(processData) {
    const buttons = [];
    const { processId, status, command, thread } = processData;
    const finishedStates = ['completed', 'error', 'stopped', 'timeout'];

    // Stop button (only if running)
    if (status === 'running') {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`stop-${processId}`)
          .setLabel('Stop Process')
          .setStyle(ButtonStyle.Danger)
      );

      // Stream to thread button (only if running and no thread yet)
      if (!thread) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`thread-${processId}`)
            .setLabel('Stream to Thread')
            .setStyle(ButtonStyle.Secondary)
        );
      }
    }

    // Restart button (if finished)
    if (finishedStates.includes(status)) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`restart-${command.id}`)
          .setLabel('Restart')
          .setStyle(ButtonStyle.Success)
      );
    }

    // Logs button (if has output)
    if (processData.fullOutput?.length > 0 || processData.fullError?.length > 0) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`logs-${processId}`)
          .setLabel('View Logs')
          .setStyle(ButtonStyle.Primary)
      );
    }

    // Delete button (if finished)
    if (finishedStates.includes(status)) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`delete-${processData.message.id}`)
          .setLabel('Delete')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    return buttons.length > 0 ? new ActionRowBuilder().addComponents(buttons) : null;
  }

  async startUpdating(processId) {
    logger.debug('Starting status updates', { processId });

    const processData = processManager.getProcess(processId);
    if (!processData) {
      logger.warn('Cannot start updating: process not found', { processId });
      return;
    }

    // Update immediately
    await this.updateMessage(processId);

    // Set up interval for 5 second updates (Discord rate limit: 5 edits per 5 seconds)
    const intervalId = setInterval(async () => {
      const currentProcess = processManager.getProcess(processId);
      if (!currentProcess) {
        logger.debug('Process no longer exists, stopping updates', { processId });
        this.stopUpdating(processId);
        return;
      }

      // Stop updating if process finished
      if (['completed', 'error', 'stopped', 'timeout'].includes(currentProcess.status)) {
        logger.debug('Process finished, performing final update', { processId, status: currentProcess.status });
        await this.updateMessage(processId);
        // Stream final output to thread if enabled
        if (currentProcess.thread) {
          await this.streamToThread(processId);
        }
        this.stopUpdating(processId);
        // Schedule cleanup after TTL
        processManager.scheduleCleanup(processId);
        return;
      }

      // Stream output to thread if enabled
      if (currentProcess.thread) {
        await this.streamToThread(processId);
      }

      await this.updateMessage(processId);
    }, 5000);

    this.updateIntervals.set(processId, intervalId);
    logger.debug('Update interval started', { processId, intervalMs: 5000 });
  }

  stopUpdating(processId) {
    const intervalId = this.updateIntervals.get(processId);
    if (intervalId) {
      clearInterval(intervalId);
      this.updateIntervals.delete(processId);
      logger.debug('Update interval stopped', { processId });
    }
  }

  stopAll() {
    this.updateIntervals.forEach((intervalId, processId) => {
      clearInterval(intervalId);
      logger.debug('Stopped update interval during shutdown', { processId });
    });
    this.updateIntervals.clear();
    logger.info('All status update intervals stopped');
  }

  async updateMessage(processId) {
    const timer = logger.startTimer('updateMessage');
    try {
      const processData = processManager.getProcess(processId);
      if (!processData) {
        logger.debug('Cannot update message: process not found', { processId });
        return;
      }

      logger.debug('Updating Discord message', { processId, status: processData.status });

      const embed = this.getStatusEmbed(processData);
      const components = [];

      const actionRow = this.getActionButtons(processData);
      if (actionRow) {
        components.push(actionRow);
      }

      await processData.message.edit({
        embeds: [embed],
        components: components.length > 0 ? components : [],
      });

      timer.end({ processId });
    } catch (error) {
      logger.logError(error, { processId, action: 'updateMessage' });
    }
  }

  async createThread(processId) {
    logger.debug('Creating thread for process', { processId });
    try {
      const processData = processManager.getProcess(processId);
      if (!processData) {
        logger.warn('Cannot create thread: process not found', { processId });
        return null;
      }
      if (processData.thread) {
        logger.debug('Thread already exists', { processId, threadId: processData.thread.id });
        return processData.thread;
      }

      logger.debug('Starting thread on message', { processId, messageId: processData.message.id });

      const thread = await processData.message.startThread({
        name: `${processData.command.label} Output`,
        autoArchiveDuration: 60, // Archive after 1 hour of inactivity
        reason: 'Live output streaming for process',
      });

      processData.thread = thread;
      this.threadLastOutput.set(processId, { stdout: 0, stderr: 0 });

      await thread.send(`**Process started at ${new Date(processData.startTime).toLocaleString()}**\nStreaming live output...`);

      logger.info('Thread created for process', { processId, threadId: thread.id, threadName: thread.name });
      return thread;
    } catch (error) {
      logger.logError(error, { processId, action: 'createThread' });
      return null;
    }
  }

  async streamToThread(processId) {
    try {
      const processData = processManager.getProcess(processId);
      if (!processData || !processData.thread) return;

      const lastIndices = this.threadLastOutput.get(processId) || { stdout: 0, stderr: 0 };
      const fullOutput = processData.fullOutput || [];
      const fullError = processData.fullError || [];

      // Get new stdout lines
      const newStdout = fullOutput.slice(lastIndices.stdout);
      // Get new stderr lines
      const newStderr = fullError.slice(lastIndices.stderr);

      if (newStdout.length > 0 || newStderr.length > 0) {
        logger.debug('Streaming new output to thread', {
          processId,
          newStdoutLines: newStdout.length,
          newStderrLines: newStderr.length
        });
      }

      // Send new stdout in chunks (Discord message limit is 2000 chars)
      if (newStdout.length > 0) {
        const content = newStdout.join('\n');
        await this.sendInChunks(processData.thread, content, 'stdout');
        lastIndices.stdout = fullOutput.length;
      }

      // Send new stderr in chunks
      if (newStderr.length > 0) {
        const content = newStderr.join('\n');
        await this.sendInChunks(processData.thread, content, 'stderr');
        lastIndices.stderr = fullError.length;
      }

      this.threadLastOutput.set(processId, lastIndices);
    } catch (error) {
      logger.logError(error, { processId, action: 'streamToThread' });
    }
  }

  async sendInChunks(thread, content, type) {
    const maxLength = 1900; // Leave room for formatting
    const prefix = type === 'stderr' ? '[ERR] ' : '';

    // Split into chunks
    const chunks = [];
    let current = '';

    for (const line of content.split('\n')) {
      const lineWithPrefix = prefix + line;
      if (current.length + lineWithPrefix.length + 1 > maxLength) {
        if (current) chunks.push(current);
        current = lineWithPrefix;
      } else {
        current += (current ? '\n' : '') + lineWithPrefix;
      }
    }
    if (current) chunks.push(current);

    logger.debug('Sending chunks to thread', { threadId: thread.id, chunkCount: chunks.length, type });

    // Send each chunk
    for (const chunk of chunks) {
      try {
        await thread.send(`\`\`\`\n${chunk}\n\`\`\``);
      } catch (error) {
        // Thread might be archived or deleted
        logger.logError(error, { action: 'sendChunk', type, threadId: thread.id });
        break;
      }
    }
  }

  async closeThread(processId) {
    logger.debug('Closing thread', { processId });
    try {
      const processData = processManager.getProcess(processId);
      if (!processData || !processData.thread) {
        logger.debug('No thread to close', { processId });
        return;
      }

      const elapsed = processData.endTime
        ? this.formatDuration(processData.endTime - processData.startTime)
        : 'unknown';

      await processData.thread.send(
        `**Process ${processData.status}** after ${elapsed}` +
        (processData.exitCode !== undefined ? ` (exit code: ${processData.exitCode})` : '')
      );

      // Archive the thread
      await processData.thread.setArchived(true);

      this.threadLastOutput.delete(processId);
      logger.info('Thread closed for process', { processId, threadId: processData.thread.id });
    } catch (error) {
      logger.logError(error, { processId, action: 'closeThread' });
    }
  }
}

module.exports = new StatusUpdater();
