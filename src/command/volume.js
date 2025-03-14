const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Adjust the volume of the music')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level (0-100)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100)
        ),
    async execute(interaction) {
        await interaction.deferReply();

        try {
            if (!interaction.member.voice.channel) {
                return await interaction.editReply('You must be in a voice channel to use this command!');
            }

            const volume = interaction.options.getInteger('level');
            const result = await musicPlayer.setVolume(interaction, volume);
            await interaction.editReply(result);
        } catch (error) {
            console.error('Error in volume command:', error);
            await interaction.editReply('An error occurred while trying to adjust the volume.');
        }
    },
};