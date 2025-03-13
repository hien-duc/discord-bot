const Discord = require('discord.js');
const { SpotifyAPI, YouTubeAPI } = require('../api');

async function handleSearchAndPlay(message, args) {
    const query = args.join(' ');
    try {
        let songUrl;
        if (query.includes('spotify.com')) {
            songUrl = await SpotifyAPI.getSongUrl(query);
        } else if (query.includes('youtube.com')) {
            songUrl = query;
        } else {
            songUrl = await YouTubeAPI.searchSong(query);
        }
        if (songUrl) {
            message.channel.send(`Playing song: ${songUrl}`);
        } else {
            message.channel.send('Song not found.');
        }
    } catch (error) {
        console.error('Error searching or playing song:', error);
        message.channel.send('An error occurred while searching or playing the song.');
    }
}

module.exports = { handleSearchAndPlay };

const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES] });

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_BOT_TOKEN);