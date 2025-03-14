const { Collection } = require('discord.js');
const musicPlayer = require('../utils/musicPlayer');

// Mock Discord.js classes and methods
const mockMessage = {
    member: {
        voice: {
            channel: {
                id: '123',
                guild: {
                    id: '456',
                    voiceAdapterCreator: {}
                }
            }
        }
    },
    guild: {
        id: '456'
    },
    author: {
        tag: 'TestUser#1234'
    },
    channel: {
        send: jest.fn()
    }
};

// Mock @discordjs/voice
jest.mock('@discordjs/voice', () => ({
    createAudioPlayer: jest.fn(() => ({
        play: jest.fn(),
        once: jest.fn(),
    })),
    createAudioResource: jest.fn(),
    joinVoiceChannel: jest.fn(() => ({
        subscribe: jest.fn()
    })),
    AudioPlayerStatus: {
        Idle: 'idle'
    }
}));

// Mock ytdl-core
jest.mock('ytdl-core', () => ({
    getInfo: jest.fn().mockResolvedValue({
        videoDetails: {
            title: 'Test Song'
        }
    }),
    default: jest.fn().mockReturnValue({})
}));

// Mock fetch
global.fetch = jest.fn().mockImplementation(async (url) => {
    if (url.includes('nonexistent')) {
        return { text: async () => '<html>no match</html>' };
    }
    return { text: async () => '<html>watch?v=test123</html>' };
});

describe('MusicPlayer', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        musicPlayer.queues = new Collection();
        musicPlayer.players = new Collection();
    });

    describe('join', () => {
        it('should successfully join a voice channel', async () => {
            const connection = await musicPlayer.join(mockMessage);
            expect(connection).toBeDefined();
        });

        it('should throw error if user is not in a voice channel', async () => {
            const messageWithoutVoice = {
                ...mockMessage,
                member: { voice: { channel: null } }
            };
            await expect(musicPlayer.join(messageWithoutVoice))
                .rejects
                .toThrow('You must be in a voice channel!');
        });
    });

    describe('search', () => {
        it('should return direct URL for YouTube links', async () => {
            const youtubeUrl = 'https://youtube.com/watch?v=test';
            const result = await musicPlayer.search(youtubeUrl);
            expect(result).toBe(youtubeUrl);
        });

        it('should search and return first result for keywords', async () => {
            const result = await musicPlayer.search('test song');
            expect(result).toBe('https://www.youtube.com/watch?v=test123');
        });

        it('should return null for failed searches', async () => {
            global.fetch.mockResolvedValueOnce({
                text: jest.fn().mockResolvedValue('<html>no match</html>')
            });
            const result = await musicPlayer.search('nonexistent song');
            expect(result).toBeNull();
        });
    });

    describe('play', () => {
        beforeEach(() => {
            global.fetch.mockImplementation(async (url) => {
                if (url.includes('nonexistent')) {
                    return { text: async () => '<html>no match</html>' };
                }
                return { text: async () => '<html>watch?v=test123</html>' };
            });
            require('ytdl-core').getInfo.mockImplementation(async (url) => {
                if (url.includes('rate-limit-test')) {
                    const error = new Error('Rate limit exceeded');
                    error.statusCode = 429;
                    throw error;
                }
                return {
                    videoDetails: {
                        title: 'Test Song'
                    }
                };
            });
            require('ytdl-core').default.mockReturnValue({});
        });

        it('should add song to queue and start playing if queue is empty', async () => {
            const result = await musicPlayer.play(mockMessage, 'test song');
            expect(musicPlayer.queues.get('456')).toHaveLength(1);
            expect(mockMessage.channel.send).toHaveBeenCalledWith('Now playing: Test Song');
        });

        it('should add song to queue without playing if queue is not empty', async () => {
            // Add a song to queue first
            await musicPlayer.play(mockMessage, 'first song');
            mockMessage.channel.send.mockClear();

            const result = await musicPlayer.play(mockMessage, 'second song');
            expect(result).toBe('Added to queue: Test Song');
            expect(musicPlayer.queues.get('456')).toHaveLength(2);
        });

        it('should throw error if no song is found', async () => {
            global.fetch.mockResolvedValueOnce({
                text: jest.fn().mockResolvedValue('<html>no match</html>')
            });
            await expect(musicPlayer.play(mockMessage, 'nonexistent song'))
                .rejects
                .toThrow('No song found!');
        });

        it('should handle rate limiting', async () => {
            await expect(musicPlayer.play(mockMessage, 'rate-limit-test'))
                .rejects
                .toThrow('We\'re being rate limited by YouTube. Please try again in a few moments.');
        });
    });

    describe('processQueue', () => {
        beforeEach(() => {
            global.fetch.mockImplementation(async (url) => {
                if (url.includes('nonexistent')) {
                    return { text: async () => '<html>no match</html>' };
                }
                return { text: async () => '<html>watch?v=test123</html>' };
            });
            require('ytdl-core').getInfo.mockImplementation(async (url) => {
                if (url.includes('rate-limit-test')) {
                    const error = new Error('Rate limit exceeded');
                    error.statusCode = 429;
                    throw error;
                }
                return {
                    videoDetails: {
                        title: 'Test Song'
                    }
                };
            });
            require('ytdl-core').default.mockReturnValue({});
        });

        afterEach(() => {
            // Clear any remaining songs from the queue
            const queue = musicPlayer.queues.get('456');
            if (queue) {
                queue.length = 0;
            }
        });

        it('should process next song in queue when current song ends', async () => {
            await musicPlayer.play(mockMessage, 'first song');
            await musicPlayer.play(mockMessage, 'second song');

            const player = musicPlayer.players.get('456');
            const onceHandler = player.once.mock.calls[0][1];

            // Simulate song end
            onceHandler();

            expect(musicPlayer.queues.get('456')).toHaveLength(1);
            expect(mockMessage.channel.send).toHaveBeenCalledWith('Now playing: Test Song');
        });
    });
});