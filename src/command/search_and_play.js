const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Search and play a song')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name or URL')
                .setRequired(true)
        ),
    async execute(interaction) {
        try {
            if (!interaction.member.voice.channel) {
                return await interaction.editReply('You must be in a voice channel to use this command!');
            }

            const query = interaction.options.getString('query');
            const result = await musicPlayer.play(interaction, query);

            if (result) {
                await interaction.editReply(result);
            } else {
                await interaction.editReply('Started playing the song!');
            }
        } catch (error) {
            console.error('Error in play command:', error);
            await interaction.editReply('An error occurred while trying to play the song.');
        }
    },
};