const { EmbedBuilder } = require('discord.js');

// Todoist brand colors
const COLORS = {
  primary: 0xe44332, // Todoist red
  success: 0x00ae86, // Todoist teal/green
  warning: 0xf39c12, // Orange
  info: 0x3498db, // Blue
  dark: 0x2c3e50, // Dark blue/gray
};

// Priority emojis and colors
const PRIORITY_EMOJI = {
  1: '🔵', // Normal
  2: '🟡', // High
  3: '🟠', // Very High
  4: '🔴', // Urgent
};

const PRIORITY_NAMES = {
  1: 'Normal',
  2: 'High',
  3: 'Very High',
  4: 'Urgent',
};

const PRIORITY_COLORS = {
  1: COLORS.info,
  2: COLORS.warning,
  3: 0xff6600, // Orange-red
  4: COLORS.primary, // Red
};

function createTaskEmbed(task, title, color = COLORS.success) {
  const embed = new EmbedBuilder().setTitle(title).setColor(color).setTimestamp();

  // Task content with priority emoji
  const priorityEmoji = PRIORITY_EMOJI[task.priority] || '🔵';
  const taskContent = `${priorityEmoji} **${task.content}**`;
  embed.addFields({ name: 'Task', value: taskContent, inline: false });

  // Due date
  if (task.due) {
    const dueDate = new Date(task.due.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    let dueDateStr = dueDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    // Add relative time indicator
    const daysDiff = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
    if (daysDiff === 0) {
      dueDateStr += ' (Today)';
    } else if (daysDiff === 1) {
      dueDateStr += ' (Tomorrow)';
    } else if (daysDiff === -1) {
      dueDateStr += ' (Yesterday - Overdue!)';
    } else if (daysDiff < 0) {
      dueDateStr += ` (${Math.abs(daysDiff)} days overdue!)`;
    } else if (daysDiff <= 7) {
      dueDateStr += ` (In ${daysDiff} days)`;
    }

    embed.addFields({ name: '📅 Due Date', value: dueDateStr, inline: true });
  } else {
    embed.addFields({ name: '📅 Due Date', value: 'No due date', inline: true });
  }

  // Priority
  const priorityName = PRIORITY_NAMES[task.priority] || 'Normal';
  embed.addFields({
    name: '⚡ Priority',
    value: `${PRIORITY_EMOJI[task.priority] || '🔵'} ${priorityName}`,
    inline: true,
  });

  // Project - will be added by caller if needed
  // Task ID in footer
  embed.setFooter({ text: `Task ID: ${task.id.substring(0, 8)}...` });

  return embed;
}

function createTaskListEmbed(tasks, title, color = COLORS.info) {
  const embed = new EmbedBuilder().setTitle(title).setColor(color).setTimestamp();

  if (tasks.length === 0) {
    embed.setDescription('✅ No tasks found!');
    embed.setColor(COLORS.success);
    return embed;
  }

  // Add task count
  embed.setDescription(`**Found ${tasks.length} task(s)**\n`);

  return embed;
}

function createDailyOverviewEmbed(tasks, _organized, _allTasks, _todoistService) {
  const embed = new EmbedBuilder()
    .setTitle('📋 Daily Task Overview')
    .setColor(COLORS.primary)
    .setDescription(`**Tasks due today: ${tasks.length}**`)
    .setTimestamp();

  if (tasks.length === 0) {
    embed.setDescription('✅ **No tasks due today!** 🎉');
    embed.setColor(COLORS.success);
    return embed;
  }

  return embed;
}

function formatTaskForEmbed(task, allTasks, todoistService) {
  const subtasks = todoistService.getSubTasksFromList(allTasks, task.id);
  const isCompleted = task.isCompleted || task.checked;
  const checkbox = isCompleted ? '✅' : '⬜';
  const priorityEmoji = PRIORITY_EMOJI[task.priority] || '';

  let taskText = `${checkbox} ${priorityEmoji} **${task.content}**`;

  // Add due date if exists
  if (task.due && !isCompleted) {
    const dueDate = new Date(task.due.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
    let dueStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (daysDiff === 0) {
      dueStr = '**TODAY**';
    } else if (daysDiff < 0) {
      dueStr = `**OVERDUE** (${Math.abs(daysDiff)}d)`;
    }

    taskText += ` - ${dueStr}`;
  }

  // Add subtasks
  if (subtasks.length > 0) {
    const incompleteSubtasks = subtasks.filter((st) => !st.isCompleted && !st.checked);
    if (incompleteSubtasks.length > 0) {
      taskText += `\n   📌 ${incompleteSubtasks.length} subtask(s)`;
    }
  }

  return taskText;
}

function createSuccessEmbed(title, description, color = COLORS.success) {
  return new EmbedBuilder()
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
}

function createErrorEmbed(message) {
  return new EmbedBuilder()
    .setTitle('❌ Error')
    .setDescription(message)
    .setColor(0xe74c3c) // Red
    .setTimestamp();
}

function createEmptyStateEmbed(title, message, color = COLORS.success) {
  return new EmbedBuilder()
    .setTitle(`✅ ${title}`)
    .setDescription(message)
    .setColor(color)
    .setTimestamp();
}

module.exports = {
  COLORS,
  PRIORITY_EMOJI,
  PRIORITY_NAMES,
  PRIORITY_COLORS,
  createTaskEmbed,
  createTaskListEmbed,
  createDailyOverviewEmbed,
  formatTaskForEmbed,
  createSuccessEmbed,
  createErrorEmbed,
  createEmptyStateEmbed,
};
