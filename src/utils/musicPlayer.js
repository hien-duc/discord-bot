const { DisTube } = require('distube');
const { EmbedBuilder } = require('discord.js');
const { YtDlpPlugin } = require('@distube/yt-dlp');

class MusicPlayer {
    constructor(client) {
        this.distube = new DisTube(client, {
            plugins: [new YtDlpPlugin()],
            leaveOnEmpty: true,
            leaveOnFinish: false,
            leaveOnStop: false,
            emitNewSongOnly: true,
            emitAddSongWhenCreatingQueue: false,
            emitAddListWhenCreatingQueue: false,
            ytdlOptions: {
                quality: 'highestaudio',
                highWaterMark: 1 << 25
            }
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.distube
            .on('playSong', (queue, song) => {
                const embed = new EmbedBuilder()
                    .setTitle('Now Playing')
                    .setDescription(`🎵 **${song.name}**\n👤 Requested by: ${song.user.tag}`)
                    .setColor('#00ff00');
                queue.textChannel.send({ embeds: [embed] });
            })
            .on('addSong', (queue, song) => {
                const embed = new EmbedBuilder()
                    .setTitle('Added to Queue')
                    .setDescription(`🎵 **${song.name}**\n👤 Requested by: ${song.user.tag}`)
                    .setColor('#00ff00');
                queue.textChannel.send({ embeds: [embed] });
            })
            .on('error', (channel, error) => {
                console.error('DisTube error:', error);
                if (channel) {
                    channel.send(`An error occurred: ${error.message.slice(0, 1979)}`);
                }
            });
    }

    async play(interaction, query) {
        if (!interaction.member.voice.channel) {
            throw new Error('You must be in a voice channel!');
        }

        try {
            await this.distube.play(interaction.member.voice.channel, query, {
                member: interaction.member,
                textChannel: interaction.channel,
                interaction
            });
        } catch (error) {
            console.error('Error playing song:', error);
            throw error;
        }
    }

    async skip(interaction) {
        const queue = this.distube.getQueue(interaction.guildId);
        if (!queue) {
            return 'No songs in the queue!';
        }

        try {
            await queue.skip();
            return 'Skipped the current song!';
        } catch (error) {
            console.error('Error skipping song:', error);
            throw error;
        }
    }

    async pause(interaction) {
        const queue = this.distube.getQueue(interaction.guildId);
        if (!queue) {
            return 'No songs in the queue!';
        }

        if (queue.paused) {
            return 'The song is already paused!';
        }

        try {
            queue.pause();
            return 'Paused the current song!';
        } catch (error) {
            console.error('Error pausing song:', error);
            throw error;
        }
    }

    async resume(interaction) {
        const queue = this.distube.getQueue(interaction.guildId);
        if (!queue) {
            return 'No songs in the queue!';
        }

        if (!queue.paused) {
            return 'The song is not paused!';
        }

        try {
            queue.resume();
            return 'Resumed the current song!';
        } catch (error) {
            console.error('Error resuming song:', error);
            throw error;
        }
    }

    async stop(interaction) {
        const queue = this.distube.getQueue(interaction.guildId);
        if (!queue) {
            return 'No songs in the queue!';
        }

        try {
            queue.stop();
            return 'Stopped the music and cleared the queue!';
        } catch (error) {
            console.error('Error stopping music:', error);
            throw error;
        }
    }
}

module.exports = MusicPlayer;