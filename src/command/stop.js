const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playing and clear the queue'),
    async execute(interaction) {
        await interaction.deferReply();

        try {
            if (!interaction.member.voice.channel) {
                return await interaction.editReply('You must be in a voice channel to use this command!');
            }

            const result = await musicPlayer.stop(interaction);
            await interaction.editReply(result);
        } catch (error) {
            console.error('Error in stop command:', error);
            await interaction.editReply('An error occurred while trying to stop the music.');
        }
    },
};