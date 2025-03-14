# Discord Music Bot

A feature-rich Discord music bot that allows you to play music in your Discord server's voice channels. The bot supports YouTube links and search queries, manages song queues, and provides an easy-to-use interface through slash commands.

## Features

- Play music from YouTube links or search queries
- Queue system for multiple songs
- Automatic voice channel management
- Slash command interface
- Volume control
- Pause and resume functionality
- Skip and stop commands

## Prerequisites

- Node.js (v16.9.0 or higher)
- pnpm package manager
- Discord Bot Token
- Discord Server with administrator permissions

## Setup

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd discord-bot
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env` file in the root directory and add your Discord bot token and client ID:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   ```

4. Deploy the slash commands:
   ```bash
   node deploy-commands.js
   ```
   Note: You need to run this command whenever you modify or add new slash commands.

5. Start the bot:
   ```bash
   pnpm start
   ```

## Usage

The bot uses slash commands for all interactions. Here's a comprehensive guide to all available commands:

### Music Playback Commands

1. `/play`
   - Play music from YouTube links or search queries
   - Usage: `/play query: <song name or URL>`
   - Example: `/play query: never gonna give you up`
   - The bot will join your voice channel automatically

2. `/pause`
   - Pause the currently playing song
   - The song can be resumed later using the resume command

3. `/resume`
   - Resume a paused song
   - Only works if there's a song that was previously paused

4. `/stop`
   - Stop the current playback and clear the queue
   - The bot will leave the voice channel

5. `/skip`
   - Skip the currently playing song
   - If there are songs in the queue, the next song will start playing

6. `/volume`
   - Adjust the playback volume
   - Usage: `/volume level: <0-100>`
   - Example: `/volume level: 50`

### Queue Management

1. `/queue`
   - Display the current song queue
   - Shows the currently playing song and upcoming songs
   - Each entry shows the song title and who requested it

### Voice Channel Behavior

- The bot automatically joins your voice channel when you use the `/play` command
- You must be in a voice channel to use music-related commands
- The bot will automatically leave the voice channel after a period of inactivity
- If you're in a different voice channel, the bot will move to your channel when you use `/play`

### Best Practices

1. Queue Management
   - Songs are automatically queued if something is already playing
   - Use `/queue` to check the current playlist
   - Use `/skip` to move to the next song
   - Use `/stop` to clear the entire queue

2. Volume Control
   - Start with 50% volume and adjust as needed
   - Keep volume below 100% to avoid distortion
   - Volume settings persist until the bot is restarted

3. Voice Channel Tips
   - Join a voice channel before using any music commands
   - Ensure the bot has permissions to join and speak in your channel
   - One bot instance can play in multiple servers simultaneously

## Troubleshooting

1. **Bot doesn't respond to commands**
   - Ensure the bot has proper permissions in your server
   - Check if the bot is online
   - Verify your Discord token is correct in the `.env` file

2. **No sound playing**
   - Make sure you're in a voice channel
   - Check if the bot has permission to join and speak in voice channels
   - Verify the YouTube link or search query is valid

3. **Bot disconnects unexpectedly**
   - Check your internet connection
   - Ensure the bot has stable internet access
   - Verify the bot has persistent permissions

4. **Queue issues**
   - If songs aren't queuing, check if the bot has proper permissions
   - Use `/queue` to verify your song was added
   - If the queue seems stuck, use `/stop` and start fresh

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.