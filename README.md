# Discord Music Bot

A feature-rich Discord music bot that allows you to play music in your Discord server's voice channels. The bot supports YouTube links and search queries, manages song queues, and provides an easy-to-use interface through slash commands.

## Features

- Play music from YouTube links or search queries
- Queue system for multiple songs
- Automatic voice channel management
- Slash command interface

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

3. Create a `.env` file in the root directory and add your Discord bot token:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   ```

4. Start the bot:
   ```bash
   pnpm start
   ```

## Usage

The bot uses slash commands for all interactions. Here's how to use the available commands:

### Playing Music

1. Join a voice channel in your Discord server
2. Use the `/play` command followed by your search query or YouTube URL:
   ```
   /play query: never gonna give you up
   ```
   or
   ```
   /play query: https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```

### Queue System

- Songs are automatically queued if something is already playing
- The bot will announce the currently playing song
- When a song finishes, the next song in the queue will automatically play

## Example Usage

1. Join a voice channel
2. Type `/play query: your favorite song`
3. The bot will:
   - Join your voice channel
   - Search for the song
   - Start playing the music
   - Display the current song title

If you add more songs while one is playing, they'll be added to the queue and played in order.

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.