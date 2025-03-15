const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../utils/musicPlayer');

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

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
        let retryCount = 0;
        let lastError = null;

        while (retryCount < MAX_RETRIES) {
            try {
                // Check if interaction is still valid
                if (!interaction.isRepliable()) {
                    console.log(`Interaction is no longer repliable (attempt ${retryCount + 1})`);
                    return;
                }

                // Only defer on first attempt
                if (retryCount === 0 && !interaction.deferred) {
                    await interaction.deferReply();
                }

                if (!interaction.member.voice.channel) {
                    return await interaction.editReply({
                        content: 'You must be in a voice channel to use this command!',
                        flags: 64 // Using flags instead of ephemeral
                    });
                }

                const query = interaction.options.getString('query');
                const result = await musicPlayer.play(interaction, query);

                // Verify interaction is still valid after long operation
                if (!interaction.isRepliable()) {
                    console.log(`Interaction became non-repliable during execution (attempt ${retryCount + 1})`);
                    return;
                }

                await interaction.editReply({
                    content: result || 'Started playing the song!',
                    flags: result ? 64 : 0 // Use ephemeral for queue messages
                });

                return; // Success, exit retry loop

            } catch (error) {
                lastError = error;
                console.error(`Error in play command (attempt ${retryCount + 1}):`, error);

                // Don't retry for certain errors
                if (error.message === 'You must be in a voice channel!' ||
                    error.message === 'No song found!' ||
                    error.message === 'This video is no longer available.') {
                    break;
                }

                // Check if we should retry
                if (error.code === 10062 || error.code === 40060) {
                    if (retryCount < MAX_RETRIES - 1) {
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount)));
                        retryCount++;
                        continue;
                    }
                }

                break; // Exit retry loop for other errors
            }
        }

        // Handle final error response
        if (lastError && interaction.isRepliable()) {
            try {
                const errorMessage = lastError.message.includes('voice channel') ? lastError.message :
                    lastError.message === 'No song found!' ? 'Could not find the requested song. Please try a different search term.' :
                        lastError.message === 'This video is no longer available.' ? 'Sorry, this video is no longer available.' :
                            'An error occurred while trying to play the song.';

                if (interaction.deferred) {
                    await interaction.editReply({ content: errorMessage, flags: 64 });
                } else {
                    await interaction.reply({ content: errorMessage, flags: 64 });
                }
            } catch (e) {
                console.error('Error sending error response:', e);
            }
        }
    }
};
