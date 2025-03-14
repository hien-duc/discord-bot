const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const musicPlayer = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Display the current song queue'),
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const queue = musicPlayer.getQueue(interaction.guild.id);
            if (!queue || queue.length === 0) {
                return await interaction.editReply('No songs in the queue!');
            }

            const embed = new EmbedBuilder()
                .setTitle('🎵 Current Queue')
                .setColor('#FF0000')
                .setTimestamp();

            const queueList = queue.map((song, index) =>
                `${index + 1}. ${song.title} (Requested by: ${song.requestedBy})`
            );

            embed.setDescription(queueList.join('\n'));
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in queue command:', error);
            await interaction.editReply('An error occurred while trying to display the queue.');
        }
    },
};