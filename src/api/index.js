const SpotifyWebApi = require('spotify-web-api-node');
const ytsr = require('ytsr');

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

async function getSongUrl(spotifyUrl) {
    try {
        const data = await spotifyApi.getTrack(spotifyUrl.split('/track/')[1].split('?')[0]);
        return data.body.external_urls.spotify;
    } catch (error) {
        console.error('Error getting Spotify song URL:', error);
        return null;
    }
}

async function searchSong(query) {
    try {
        const filters = await ytsr.getFilters(query);
        const filter = filters.get('Type').get('Video');
        const searchResults = await ytsr(filter.url, { limit: 1 });
        if (searchResults.items.length > 0) {
            return searchResults.items[0].url;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error searching YouTube song:', error);
        return null;
    }
}

module.exports = {
    SpotifyAPI: {
        getSongUrl
    },
    YouTubeAPI: {
        searchSong
    }
};