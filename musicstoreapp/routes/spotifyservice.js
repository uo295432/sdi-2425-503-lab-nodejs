const express = require("express");
const axios = require("axios");
const router = express.Router();

require("dotenv").config(); // ✅ Carga las variables de entorno

let spotifyToken = null;

async function getSpotifyToken() {
    const res = await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({ grant_type: "client_credentials" }),
        {
            headers: {
                Authorization: "Basic " + Buffer.from(
                    process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
                ).toString("base64"),
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }
    );
    spotifyToken = res.data.access_token;
}

getSpotifyToken();

router.get("/search", async (req, res) => {
    try {
        const query = req.query.q;
        if (!spotifyToken) await getSpotifyToken();

        const response = await axios.get("https://api.spotify.com/v1/search", {
            headers: {
                Authorization: `Bearer ${spotifyToken}`
            },
            params: {
                q: query,
                type: "artist",
                limit: 5
            }
        });

        res.json(response.data.artists.items);
    } catch (e) {
        res.status(500).json({ error: "Error al buscar en Spotify", details: e.toString() });
    }
});

module.exports = router;