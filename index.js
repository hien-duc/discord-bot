require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const MusicPlayer = require('./src/utils/musicPlayer');

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

// Initialize music player
MusicPlayer.initialize(client);

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
        if (!interaction.isRepliable()) {
            console.log('Interaction is not repliable');
            return;
        }

        await command.execute(interaction);
    } catch (error) {
        console.error('Error executing command:', error);
        let errorMessage = 'There was an error executing this command!';
        let shouldRespond = true;

        // Handle known error codes
        if (error.code === 10062 || error.code === 40060) {
            console.log(`Interaction error: ${error.code} - ${error.message}`);
            shouldRespond = false;
        }

        // Handle known error messages
        if (error.message === 'This video is no longer available.') {
            errorMessage = 'Sorry, this video is no longer available.';
        } else if (error.message === 'No song found!') {
            errorMessage = 'Could not find the requested song. Please try a different search term.';
        } else if (error.message.includes('voice channel')) {
            errorMessage = error.message;
        } else if (error.message.includes('Rate limit')) {
            errorMessage = 'Please wait a moment before trying again. The bot is experiencing high traffic.';
        } else if (error.name === 'UnrecoverableError' || error.name === 'PlayError') {
            console.error('YouTube API error:', error);
            errorMessage = 'Sorry, this video is unavailable. It might be region-restricted or no longer available.';
        } else if (error.message.includes('Could not extract video data')) {
            errorMessage = 'Could not extract video data. The video might be unavailable or region-restricted.';
        }

        if (shouldRespond) {
            try {
                if (!interaction.isRepliable()) {
                    console.log('Interaction is no longer repliable');
                    return;
                }

                const reply = {
                    content: errorMessage,
                    ephemeral: true
                };

                if (!interaction.replied) {
                    if (interaction.deferred) {
                        await interaction.editReply(reply);
                    } else {
                        await interaction.reply(reply);
                    }
                }
            } catch (e) {
                if (e.code === 10062) {
                    console.log('Unknown interaction - interaction expired');
                } else {
                    console.error('Error sending error response:', e);
                }
            }
        }
    }
});

// Error handling
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
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