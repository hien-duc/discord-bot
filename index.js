require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Configure port for Render deployment
const PORT = process.env.PORT || 3000;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'src', 'command');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    }
}

// Event handler for when the bot is ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Interaction handler for slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        // Defer the reply immediately for commands that might take time
        if (['play', 'search'].includes(interaction.commandName)) {
            await interaction.deferReply();
        }
        await command.execute(interaction);
    } catch (error) {
        console.error('Error executing command:', error);
        let errorMessage = 'There was an error executing this command!';

        // Handle specific error types
        if (error.message?.includes('Status code: 429')) {
            errorMessage = 'YouTube rate limit reached. Please try again in a few minutes.';
        } else if (error.message?.includes('Video unavailable')) {
            errorMessage = 'This video is unavailable or restricted. Please try another one.';
        } else if (error.message?.includes('Sign in')) {
            errorMessage = 'This video requires age verification or sign-in. Please try another one.';
        } else if (error.code === 'VOICE_CONNECTION_ERROR') {
            errorMessage = 'Failed to connect to voice channel. Please check your connection.';
        } else if (error.code === 40060) {
            console.warn('Interaction already acknowledged, skipping error response');
            return;
        }

        const reply = {
            content: errorMessage,
            ephemeral: true
        };

        try {
            if (interaction.deferred) {
                await interaction.editReply(reply);
            } else if (!interaction.replied) {
                await interaction.reply(reply);
            }
        } catch (replyError) {
            console.error('Error sending reply:', replyError);
        }
    }
});

// Voice connection error handling
client.on('voiceStateUpdate', (oldState, newState) => {
    // Handle bot disconnection
    if (oldState.member.id === client.user.id && !newState.channelId) {
        const guildId = oldState.guild.id;
        // Clean up any music player resources if needed
        const musicPlayer = require('./src/utils/musicPlayer');
        musicPlayer.stop({ guild: { id: guildId } });
    }
});

// Error handling
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
    // Attempt to recover from common errors
    if (error.code === 'VOICE_CONNECTION_TIMEOUT') {
        console.log('Attempting to recover from voice connection timeout...');
    }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

// Start HTTP server to keep the bot alive
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Discord bot is running!');
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});