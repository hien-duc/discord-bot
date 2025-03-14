const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const { Collection } = require('discord.js');
const ytdl = require('ytdl-core');
// Remove unused 'pipeline' import

class MusicPlayer {
    constructor() {
        this.queues = new Collection();
        this.players = new Collection();
        this.requestQueue = [];
        this.isProcessingRequest = false;
        this.lastRequestTime = 0;
        this.retryCount = 0;
        this.cooldownPeriod = 2000; // 2 seconds between requests
        this.maxRetries = 3;
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

    async processRequestQueue() {
        if (this.isProcessingRequest || this.requestQueue.length === 0) return;

        this.isProcessingRequest = true;
        const currentTime = Date.now();
        const timeSinceLastRequest = currentTime - this.lastRequestTime;

        if (timeSinceLastRequest < this.cooldownPeriod) {
            await new Promise(resolve => setTimeout(resolve, this.cooldownPeriod - timeSinceLastRequest));
        }

        const request = this.requestQueue.shift();
        try {
            const result = await request.execute();
            request.resolve(result);
            this.retryCount = 0;
            this.lastRequestTime = Date.now();
        } catch (error) {
            if (error.statusCode === 429 && this.retryCount < this.maxRetries) {
                this.retryCount++;
                const backoffTime = Math.pow(2, this.retryCount) * 1000;
                await new Promise(resolve => setTimeout(resolve, backoffTime));
                this.requestQueue.unshift(request);
            } else {
                request.reject(error);
            }
        } finally {
            this.isProcessingRequest = false;
            this.processRequestQueue();
        }
    }

    async queueRequest(requestFn) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                execute: requestFn,
                resolve,
                reject
            });
            this.processRequestQueue();
        });
    }

    async search(query) {
        try {
            if (query.includes('youtube.com') || query.includes('youtu.be')) {
                return query;
            }

            const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
            const response = await fetch(searchUrl);
            const html = await response.text();
            const videoIdMatch = html.match(/\/watch\?v=([^"&]*)/);
            if (!videoIdMatch) return null;

            return `https://www.youtube.com/watch?v=${videoIdMatch[1]}`;
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
            const songInfo = await ytdl.getInfo(songUrl);

            const song = {
                title: songInfo.videoDetails.title,
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
            if (error.statusCode === 429) {
                throw new Error('We\'re being rate limited by YouTube. Please try again in a few moments.');
            }
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
            const stream = ytdl(currentSong.url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25,
                dlChunkSize: 0
            });

            const resource = createAudioResource(stream);

            player.play(resource);
            message.channel.send(`Now playing: ${currentSong.title}`);

            player.once(AudioPlayerStatus.Idle, () => {
                queue.shift();
                this.processQueue(message);
            });
        } catch (error) {
            console.error('Error processing queue:', error);
            if (error.statusCode === 429) {
                message.channel.send('Rate limit reached. Retrying in a few moments...');
                setTimeout(() => this.processQueue(message), 5000);
            } else {
                queue.shift();
                this.processQueue(message);
            }
        }
    }

    async skip(message) {
        const guildId = message.guild.id;
        const queue = this.queues.get(guildId);
        const player = this.players.get(guildId);

        if (!queue || queue.length === 0) {
            return 'No songs in the queue!';
        }

        player.stop();
        return 'Skipped the current song!';
    }

    async pause(message) {
        const guildId = message.guild.id;
        const player = this.players.get(guildId);

        if (player.state.status === AudioPlayerStatus.Playing) {
            player.pause();
            return 'Paused the current song!';
        }
        return 'No song is currently playing!';
    }

    async resume(message) {
        const guildId = message.guild.id;
        const player = this.players.get(guildId);

        if (player.state.status === AudioPlayerStatus.Paused) {
            player.unpause();
            return 'Resumed the current song!';
        }
        return 'The song is not paused!';
    }

    async stop(message) {
        const guildId = message.guild.id;
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

    async setVolume(message, volume) {
        const guildId = message.guild.id;
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