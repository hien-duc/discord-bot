const { DisTube } = require('distube');
const { EmbedBuilder } = require('discord.js');
const { YtDlpPlugin } = require('@distube/yt-dlp');

class MusicPlayer {
    constructor(client) {
        this.distube = new DisTube(client, {
            plugins: [new YtDlpPlugin()],
            leaveOnEmpty: true,
            leaveOnFinish: true,
            leaveOnStop: true,
            emitNewSongOnly: true,
            emitAddSongWhenCreatingQueue: false,
            emitAddListWhenCreatingQueue: false,
            ytdlOptions: {
                quality: 'highestaudio',
                highWaterMark: 1 << 25
            },
            searchSongs: 1,
            searchCooldown: 30,
            emptyCooldown: 60
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.distube
            .on('playSong', (queue, song) => {
                const embed = new EmbedBuilder()
                    .setTitle('Now Playing')
                    .setDescription(`🎵 **${song.name}**\n👤 Requested by: ${song.user.tag}\n⏱ Duration: ${song.formattedDuration}`)
                    .setColor('#00ff00')
                    .setThumbnail(song.thumbnail);
                queue.textChannel.send({ embeds: [embed] }).catch(console.error);
            })
            .on('addSong', (queue, song) => {
                const embed = new EmbedBuilder()
                    .setTitle('Added to Queue')
                    .setDescription(`🎵 **${song.name}**\n👤 Requested by: ${song.user.tag}\n⏱ Duration: ${song.formattedDuration}`)
                    .setColor('#00ff00')
                    .setThumbnail(song.thumbnail);
                queue.textChannel.send({ embeds: [embed] }).catch(console.error);
            })
            .on('error', (channel, error) => {
                console.error('DisTube error:', error);
                if (channel) {
                    const errorMessage = error.message.includes('Sign in to confirm your age') ?
                        'This video has age restrictions and cannot be played.' :
                        `An error occurred: ${error.message.slice(0, 1979)}`;
                    channel.send(errorMessage).catch(console.error);
                }
            })
            .on('disconnect', (queue) => {
                queue.textChannel.send('🔌 Disconnected from voice channel.').catch(console.error);
            })
            .on('empty', (queue) => {
                queue.textChannel.send('⚠️ Voice channel is empty! Leaving the channel...').catch(console.error);
            });
    }

    async play(interaction, query) {
        if (!interaction.member.voice.channel) {
            throw new Error('You must be in a voice channel!');
        }

        const queue = this.distube.getQueue(interaction.guildId);
        if (queue && queue.voice.channel.id !== interaction.member.voice.channel.id) {
            throw new Error('I\'m already playing in a different voice channel!');
        }

        try {
            await this.distube.play(interaction.member.voice.channel, query, {
                member: interaction.member,
                textChannel: interaction.channel,
                interaction
            });
        } catch (error) {
            console.error('Error playing song:', error);
            if (error.message.includes('Sign in to confirm your age')) {
                throw new Error('This video has age restrictions and cannot be played.');
            }
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
            await queue.stop();
            await this.distube.voices.get(interaction.guildId)?.leave();
            return 'Stopped the music and cleared the queue!';
        } catch (error) {
            console.error('Error stopping music:', error);
            throw error;
        }
    }

    async setVolume(interaction, volume) {
        const queue = this.distube.getQueue(interaction.guildId);
        if (!queue) {
            return 'No songs in the queue!';
        }

        try {
            queue.setVolume(volume);
            return `Volume set to ${volume}%`;
        } catch (error) {
            console.error('Error setting volume:', error);
            throw error;
        }
    }

    getQueue(guildId) {
        const queue = this.distube.getQueue(guildId);
        if (!queue) return [];
        return queue.songs.map(song => ({
            title: song.name,
            requestedBy: song.user.tag,
            duration: song.formattedDuration,
            thumbnail: song.thumbnail
        }));
    }
}

module.exports = MusicPlayer;