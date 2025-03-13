const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const { Collection } = require('discord.js');
const play = require('play-dl');

class MusicPlayer {
    constructor() {
        this.queues = new Collection();
        this.players = new Collection();
    }

    async join(message) {
        const voiceChannel = message.member.voice.channel;
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

            const searched = await play.search(query, { limit: 1 });
            if (searched.length === 0) return null;
            return searched[0].url;
        } catch (error) {
            console.error('Error searching for song:', error);
            return null;
        }
    }

    async play(message, query) {
        try {
            const guildId = message.guild.id;
            if (!this.queues.has(guildId)) {
                this.queues.set(guildId, []);
            }

            const songUrl = await this.search(query);
            if (!songUrl) {
                throw new Error('No song found!');
            }

            const queue = this.queues.get(guildId);
            const songInfo = await play.video_info(songUrl);
            const song = {
                title: songInfo.video_details.title,
                url: songUrl,
                requestedBy: message.author.tag
            };

            queue.push(song);

            if (queue.length === 1) {
                await this.join(message);
                await this.processQueue(message);
            } else {
                return `Added to queue: ${song.title}`;
            }
        } catch (error) {
            console.error('Error playing song:', error);
            throw error;
        }
    }

    async processQueue(message) {
        const guildId = message.guild.id;
        const queue = this.queues.get(guildId);
        const player = this.players.get(guildId);

        if (!queue || queue.length === 0) {
            return;
        }

        const currentSong = queue[0];
        try {
            const stream = await play.stream(currentSong.url);
            const resource = createAudioResource(stream.stream, {
                inputType: stream.type
            });

            player.play(resource);
            message.channel.send(`Now playing: ${currentSong.title}`);

            player.once(AudioPlayerStatus.Idle, () => {
                queue.shift();
                this.processQueue(message);
            });
        } catch (error) {
            console.error('Error processing queue:', error);
            queue.shift();
            this.processQueue(message);
        }
    }
}

module.exports = new MusicPlayer();