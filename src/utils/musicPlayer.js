const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const { Collection } = require('discord.js');
const play = require('play-dl');

// Configure play-dl with YouTube cookie
play.setToken({
    youtube: {
        cookie: process.env.YOUTUBE_COOKIE || '' // Get cookie from environment variable
    }
});

// Utility function to add delay between requests
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const REQUEST_DELAY = 2000; // 2 seconds delay between requests

class MusicPlayer {
    constructor() {
        this.queues = new Collection();
        this.players = new Collection();
    }

    async join(interaction) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            throw new Error('You must be in a voice channel!');
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        if (!this.players.has(voiceChannel.guild.id)) {
            const player = createAudioPlayer();
            this.players.set(voiceChannel.guild.id, player);
            connection.subscribe(player);
        }

        return connection;
    }

    async search(query) {
        try {
            if (query.includes('youtube.com') || query.includes('youtu.be')) {
                return query;
            }

            await delay(REQUEST_DELAY);
            const searched = await play.search(query, { limit: 1 });
            if (searched.length === 0) return null;
            return searched[0].url;
        } catch (error) {
            console.error('Error searching for song:', error);
            return null;
        }
    }

    async play(interaction, query) {
        try {
            const guildId = interaction.guild.id;
            if (!this.queues.has(guildId)) {
                this.queues.set(guildId, []);
            }

            const songUrl = await this.search(query);
            if (!songUrl) {
                throw new Error('No song found!');
            }

            const queue = this.queues.get(guildId);
            await delay(REQUEST_DELAY);
            const songInfo = await play.video_info(songUrl);
            const song = {
                title: songInfo.video_details.title,
                url: songUrl,
                requestedBy: interaction.user.tag
            };

            queue.push(song);

            if (queue.length === 1) {
                await this.join(interaction);
                await this.processQueue(interaction);
            } else {
                return `Added to queue: ${song.title}`;
            }
        } catch (error) {
            console.error('Error playing song:', error);
            throw error;
        }
    }

    async processQueue(interaction) {
        const guildId = interaction.guild.id;
        const queue = this.queues.get(guildId);
        const player = this.players.get(guildId);

        if (!queue || queue.length === 0) {
            return;
        }

        const currentSong = queue[0];
        try {
            await delay(REQUEST_DELAY);
            const stream = await play.stream(currentSong.url);
            const resource = createAudioResource(stream.stream, {
                inputType: stream.type
            });

            player.play(resource);
            await interaction.channel.send(`Now playing: ${currentSong.title}`);

            player.once(AudioPlayerStatus.Idle, () => {
                queue.shift();
                this.processQueue(interaction);
            });
        } catch (error) {
            console.error('Error processing queue:', error);
            queue.shift();
            this.processQueue(message);
        }
    }

    async skip(interaction) {
        const guildId = interaction.guild.id;
        const queue = this.queues.get(guildId);
        const player = this.players.get(guildId);

        if (!queue || queue.length === 0) {
            return 'No songs in the queue!';
        }

        player.stop();
        return 'Skipped the current song!';
    }

    async pause(interaction) {
        const guildId = interaction.guild.id;
        const player = this.players.get(guildId);

        if (player.state.status === AudioPlayerStatus.Playing) {
            player.pause();
            return 'Paused the current song!';
        }
        return 'No song is currently playing!';
    }

    async resume(interaction) {
        const guildId = interaction.guild.id;
        const player = this.players.get(guildId);

        if (player.state.status === AudioPlayerStatus.Paused) {
            player.unpause();
            return 'Resumed the current song!';
        }
        return 'The song is not paused!';
    }

    async stop(interaction) {
        const guildId = interaction.guild.id;
        const queue = this.queues.get(guildId);
        const player = this.players.get(guildId);

        if (queue) {
            queue.length = 0;
        }

        player.stop();
        return 'Stopped playing and cleared the queue!';
    }

    getQueue(guildId) {
        return this.queues.get(guildId);
    }

    async setVolume(interaction, volume) {
        const guildId = interaction.guild.id;
        const player = this.players.get(guildId);
        const queue = this.queues.get(guildId);

        if (!queue || queue.length === 0) {
            return 'No songs are currently playing!';
        }

        if (player.state.status === AudioPlayerStatus.Playing ||
            player.state.status === AudioPlayerStatus.Paused) {
            const resource = player.state.resource;
            resource.volume.setVolume(volume / 100);
            return `Volume set to ${volume}%`;
        }
        return 'No song is currently playing!';
    }
}

module.exports = new MusicPlayer();