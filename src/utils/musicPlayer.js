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
            } else if (error.statusCode === 410) {
                throw new Error('This video is no longer available. Please try another one.');
            } else if (error.message?.includes('Video unavailable')) {
                throw new Error('This video is unavailable or restricted. Please try another one.');
            } else if (error.message?.includes('Sign in')) {
                throw new Error('This video requires age verification or sign-in. Please try another one.');
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
                dlChunkSize: 1024 * 1024, // 1MB chunks for better streaming
                liveBuffer: 40000, // Increased buffer for live streams
                requestOptions: {
                    headers: {
                        'Cookie': '',
                        'Accept': '*/*',
                        'Connection': 'keep-alive',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    maxRetries: 3,
                    maxReconnects: 3,
                    backoff: { inc: 500, max: 10000 }
                }
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
            const retryDelay = 5000;

            if (error.statusCode === 429) {
                message.channel.send('Rate limit reached. Retrying in a few moments...');
                setTimeout(() => this.processQueue(message), retryDelay);
            } else if (error.statusCode === 410) {
                message.channel.send(`Cannot play ${currentSong.title} - Video is no longer available. Skipping...`);
                queue.shift();
                this.processQueue(message);
            } else if (error.statusCode === 403) {
                message.channel.send(`Cannot play ${currentSong.title} - Video is age restricted or region locked. Skipping...`);
                queue.shift();
                this.processQueue(message);
            } else if (error.message?.includes('Video unavailable') || error.message?.includes('Sign in') || error.message?.includes('Private video')) {
                message.channel.send(`Cannot play ${currentSong.title} - Video is unavailable or restricted. Skipping...`);
                queue.shift();
                this.processQueue(message);
            } else {
                console.error('Detailed error:', error);
                message.channel.send(`Error playing ${currentSong.title}. Skipping...`);
                queue.shift();
                this.processQueue(message);
            }
        }
    }
}

module.exports = new MusicPlayer();