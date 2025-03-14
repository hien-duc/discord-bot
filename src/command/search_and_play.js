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
        await interaction.deferReply();

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
            let errorMessage = 'An error occurred while trying to play the song.';

            if (error.message?.includes('Status code: 429')) {
                errorMessage = 'YouTube rate limit reached. Please try again in a few minutes.';
            } else if (error.message?.includes('Status code: 410') || error.message?.includes('no longer available')) {
                errorMessage = 'This video is no longer available. Please try another one.';
            } else if (error.message?.includes('Video unavailable')) {
                errorMessage = 'This video is unavailable or restricted. Please try another one.';
            } else if (error.message?.includes('Sign in')) {
                errorMessage = 'This video requires age verification or sign-in. Please try another one.';
            }

            await interaction.editReply(errorMessage);
        }
    },
};