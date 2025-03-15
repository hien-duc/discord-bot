const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current song'),
    async execute(interaction) {
        try {
            if (!interaction.member.voice.channel) {
                return await interaction.editReply('You must be in a voice channel to use this command!');
            }

            const result = await musicPlayer.pause(interaction);
            await interaction.editReply(result);
        } catch (error) {
            console.error('Error in pause command:', error);
            await interaction.editReply('An error occurred while trying to pause the song.');
        }
    },
};