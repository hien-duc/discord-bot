const { Player } = require('discord-player');
const { Collection } = require('discord.js');

class MusicPlayer {
    constructor() {
        this.players = new Collection();
    }

    getPlayer(guild) {
        if (!this.players.has(guild.id)) {
            const player = new Player(guild.client);
            this.players.set(guild.id, player);
        }
        return this.players.get(guild.id);
    }

    async play(message, query) {
        try {
            const player = this.getPlayer(message.guild);

            if (!message.member.voice.channel) {
                throw new Error('You must be in a voice channel!');
            }

            await player.connect(message.member.voice.channel);

            const searchResult = await player.search(query, {
                requestedBy: message.author
            });

            if (!searchResult || !searchResult.tracks.length) {
                throw new Error('No results found!');
            }

            const queue = await player.createQueue(message.guild, {
                metadata: {
                    channel: message.channel
                },
                bufferingTimeout: 15000,
                leaveOnEnd: false,
                leaveOnStop: false
            });

            try {
                const track = searchResult.tracks[0];
                await queue.addTrack(track);

                if (!queue.playing) {
                    await queue.play();
                    return `Now playing: ${track.title}`;
                }
                return `Added to queue: ${track.title}`;
            } catch (error) {
                if (!queue.connection) queue.destroy();
                throw error;
            }
        } catch (error) {
            console.error('Error playing song:', error);
            throw error;
        }
    }

    getQueue(guildId) {
        const player = this.players.get(guildId);
        if (!player) return null;

        const queue = player.getQueue(guildId);
        if (!queue) return null;

        return queue.tracks.map(track => ({
            title: track.title,
            url: track.url,
            requestedBy: track.requestedBy.tag
        }));
    }

    async skip(interaction) {
        const queue = this.players.get(interaction.guild.id)?.getQueue(interaction.guild.id);
        if (!queue || !queue.playing) {
            return 'No songs in the queue!';
        }

        await queue.skip();
        return 'Skipped the current song!';
    }

    async stop(interaction) {
        const queue = this.players.get(interaction.guild.id)?.getQueue(interaction.guild.id);
        if (!queue || !queue.playing) {
            return 'No songs in the queue!';
        }

        queue.destroy();
        return 'Stopped playing and cleared the queue!';
    }

    async pause(interaction) {
        const queue = this.players.get(interaction.guild.id)?.getQueue(interaction.guild.id);
        if (!queue || !queue.playing) {
            return 'No song is currently playing!';
        }

        queue.setPaused(true);
        return 'Paused the current song!';
    }

    async resume(interaction) {
        const queue = this.players.get(interaction.guild.id)?.getQueue(interaction.guild.id);
        if (!queue || !queue.playing) {
            return 'No song is currently playing!';
        }

        queue.setPaused(false);
        return 'Resumed the current song!';
    }

    async setVolume(interaction, volume) {
        const queue = this.players.get(interaction.guild.id)?.getQueue(interaction.guild.id);
        if (!queue || !queue.playing) {
            return 'No song is currently playing!';
        }

        queue.setVolume(volume);
        return `Volume set to ${volume}%`;
    }
}

module.exports = new MusicPlayer();