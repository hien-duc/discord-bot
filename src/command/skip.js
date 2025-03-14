const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),
    async execute(interaction) {
        await interaction.deferReply();

        try {
            if (!interaction.member.voice.channel) {
                return await interaction.editReply('You must be in a voice channel to use this command!');
            }

            const result = await musicPlayer.skip(interaction);
            await interaction.editReply(result);
        } catch (error) {
            console.error('Error in skip command:', error);
            await interaction.editReply('An error occurred while trying to skip the song.');
        }
    },
};