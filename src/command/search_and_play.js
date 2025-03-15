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
            if (!interaction.isRepliable()) {
                console.log('Interaction is no longer repliable');
                return;
            }

            await interaction.deferReply();

            if (!interaction.member.voice.channel) {
                return await interaction.editReply({ content: 'You must be in a voice channel to use this command!', ephemeral: true });
            }

            const query = interaction.options.getString('query');
            const result = await musicPlayer.play(interaction, query);

            if (!interaction.isRepliable()) {
                console.log('Interaction became non-repliable during execution');
                return;
            }

            if (result) {
                await interaction.editReply({ content: result });
            } else {
                await interaction.editReply({ content: 'Started playing the song!' });
            }
        } catch (error) {
            console.error('Error in play command:', error);
            if (interaction.isRepliable()) {
                try {
                    if (interaction.deferred) {
                        await interaction.editReply({ content: 'An error occurred while trying to play the song.', ephemeral: true });
                    } else {
                        await interaction.reply({ content: 'An error occurred while trying to play the song.', ephemeral: true });
                    }
                } catch (e) {
                    console.error('Error sending error response:', e);
                }
            }
        }
    },
};