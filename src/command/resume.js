const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the current song'),
    async execute(interaction) {
        await interaction.deferReply();

        try {
            if (!interaction.member.voice.channel) {
                return await interaction.editReply('You must be in a voice channel to use this command!');
            }

            const result = await musicPlayer.resume(interaction);
            await interaction.editReply(result);
        } catch (error) {
            console.error('Error in resume command:', error);
            await interaction.editReply('An error occurred while trying to resume the song.');
        }
    },
};