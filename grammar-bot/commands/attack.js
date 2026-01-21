const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const { SkillsSystem } = require('../gamification/systems');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('attack')
    .setDescription('Attack another user with a grammar skill')
    .addUserOption((option) =>
      option.setName('target').setDescription('User to attack').setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('skill')
        .setDescription('Skill to use for the attack')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    try {
      const focused = interaction.options.getFocused().toLowerCase();
      const skills = SkillsSystem.getSkills();

      if (!skills || skills.length === 0) {
        console.warn('No skills found for autocomplete');
        await interaction.respond([]);
        return;
      }

      const filtered = skills
        .filter(
          (s) => s.name.toLowerCase().includes(focused) || s.id.toLowerCase().includes(focused)
        )
        .slice(0, 25);

      const choices = filtered.map((s) => ({
        name: `${s.name} - ${s.damage} dmg (${s.cost} pts)`,
        value: s.id,
      }));

      await interaction.respond(choices);
    } catch (error) {
      console.error('Error in attack autocomplete:', error);
      await interaction.respond([]).catch(() => {
        // Ignore if already responded
      });
    }
  },

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('target');
    const skillId = interaction.options.getString('skill');

    // Validation
    if (target.bot) {
      await interaction.editReply({ content: 'Cannot attack bots!' });
      return;
    }

    if (target.id === interaction.user.id) {
      await interaction.editReply({ content: 'Cannot attack yourself!' });
      return;
    }

    const { User } = getDatabase();

    try {
      const attacker = await User.findOrCreate(interaction.user.id, interaction.user.username);
      const targetUser = await User.findOrCreate(target.id, target.username);

      // Check if target has HP
      if (targetUser.hp <= 0) {
        await interaction.editReply({
          content: `${target.username} has no HP left and cannot be attacked!`,
        });
        return;
      }

      // Check if attacker has HP
      if (attacker.hp <= 0) {
        await interaction.editReply({
          content: 'You have no HP left and cannot attack!',
        });
        return;
      }

      // Execute attack
      const result = await SkillsSystem.executeAttack(attacker, targetUser, skillId);

      // Create result embed
      const embed = new EmbedBuilder()
        .setTitle('Attack Result')
        .setColor(config.colors.warning)
        .setDescription(
          `**${interaction.user.username}** used **${result.skill.name}** on **${target.username}**!`
        )
        .addFields(
          {
            name: 'Damage Dealt',
            value: `${result.damage} HP`,
            inline: true,
          },
          {
            name: 'Points Spent',
            value: `${result.skill.cost} pts`,
            inline: true,
          },
          {
            name: 'Remaining Points',
            value: `${result.attackerPoints} pts`,
            inline: true,
          },
          {
            name: `${target.username}'s HP`,
            value: `${result.targetHp}/${targetUser.maxHp}`,
            inline: true,
          },
          {
            name: `${interaction.user.username}'s HP`,
            value: `${attacker.hp}/${attacker.maxHp}`,
            inline: true,
          }
        )
        .setTimestamp();

      if (result.targetDefeated) {
        embed.setColor(config.colors.success);
        embed.addFields({
          name: 'Victory!',
          value: `${target.username} has been defeated!`,
          inline: false,
        });

        // Award victory bonus
        attacker.points += 50;
        attacker.xp += 25;
        await attacker.checkLevelUp();
        await attacker.save();
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in attack command:', error);
      await interaction.editReply({ content: `Error: ${error.message}` });
    }
  },
};
