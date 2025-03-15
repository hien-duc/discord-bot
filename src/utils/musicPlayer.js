const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const { Collection } = require('discord.js');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');

// Utility function to add delay between requests
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const REQUEST_DELAY = 2000; // 2 seconds delay between requests
const MAX_RETRIES = 3; // Maximum number of retries for failed requests

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

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    await delay(REQUEST_DELAY * attempt); // Exponential backoff
                    const searched = await ytSearch(query);
                    if (!searched.videos.length) return null;
                    return searched.videos[0].url;
                } catch (error) {
                    if (attempt === MAX_RETRIES) throw error;
                    console.warn(`Search attempt ${attempt} failed, retrying...`);
                }
            }
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
            let songInfo;
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    await delay(REQUEST_DELAY * attempt); // Exponential backoff
                    songInfo = await ytdl.getInfo(songUrl);
                    break;
                } catch (error) {
                    if (error.statusCode === 410) {
                        throw new Error('This video is no longer available.');
                    }
                    if (attempt === MAX_RETRIES) throw error;
                    console.warn(`Get info attempt ${attempt} failed, retrying...`);
                }
            }

            const song = {
                title: songInfo.videoDetails.title,
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
            let stream;
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    await delay(REQUEST_DELAY * attempt); // Exponential backoff
                    stream = ytdl(currentSong.url, {
                        filter: 'audioonly',
                        quality: 'highestaudio',
                        highWaterMark: 1 << 25
                    });
                    break;
                } catch (error) {
                    if (error.statusCode === 410) {
                        await interaction.channel.send(`The song "${currentSong.title}" is no longer available, skipping...`);
                        queue.shift();
                        return this.processQueue(interaction);
                    }
                    if (attempt === MAX_RETRIES) throw error;
                    console.warn(`Stream attempt ${attempt} failed, retrying...`);
                }
            }
            const resource = createAudioResource(stream);

            player.play(resource);
            await interaction.channel.send(`Now playing: ${currentSong.title}`);

            player.once(AudioPlayerStatus.Idle, () => {
                queue.shift();
                this.processQueue(interaction);
            });
        } catch (error) {
            console.error('Error processing queue:', error);
            queue.shift();
            this.processQueue(interaction);
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