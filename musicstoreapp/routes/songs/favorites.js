const songsRepository = require("../../repositories/favoriteSongsRepository.js");
const {ObjectId} = require("mongodb");
module.exports = function (app,songsRepository) {
    app.get('/songs/favorites', async function (req, res) {
        try {
            const filter = { author: req.session.user }; // Asegúrate de que sea el usuario logueado
            const options = {};
            const favoriteSongs = await songsRepository.getFavoriteSongs(filter, options);
            const totalPrice = favoriteSongs.reduce((total, song) => total + song.price, 0);
            res.render('songs/favorites.twig', { songs: favoriteSongs, totalPrice: totalPrice });
        } catch (error) {
            res.send("Error al recuperar las canciones favoritas: " + error.message);
        }
    });
    // POST /songs/favorites/add/:song_id: Añadir canción a favoritos
    app.post('/songs/favorites/add/:song_id', function (req, res) {
        const songId = req.params.song_id;
        const { title, kind, price } = req.body; // Obtener los parámetros enviados desde el formulario

        // Crear el objeto para la canción favorita
        const favoriteSong = {
            songId: songId,
            title: title,
            kind: kind,
            price: parseFloat(price), // Asegúrate de que el precio sea un número
            date: new Date(),
            author: req.session.user // Usuario logueado
        };

        // Insertar la canción en la colección de favoritos
        songsRepository.insertFavoriteSong(favoriteSong, async function (result) {
            if (result.songId) {
                // Obtener las canciones favoritas y el precio total para renderizar
                const filter = { author: req.session.user };
                const options = {};
                try {
                    const favoriteSongs = await songsRepository.getFavoriteSongs(filter, options);
                    const totalPrice = favoriteSongs.reduce((total, song) => total + song.price, 0);
                    res.render('songs/favorites.twig', { songs: favoriteSongs, totalPrice: totalPrice });
                } catch (error) {
                    res.send("Error al obtener las canciones favoritas: " + error.message);
                }
            } else {
                res.send("Error al añadir la canción a favoritos: " + result.error);
            }
        });
    });

    // GET /songs/favorites/delete/:song_id: Eliminar canción de favoritos
    app.get('/songs/favorites/delete/:song_id', function (req, res) {
        const songId = req.params.song_id;
        songsRepository.deleteFavoriteSong(songId, async function (result) {
            if (result.success) {
                // Obtener las canciones favoritas y el precio total después de la eliminación
                const filter = { author: req.session.user };
                const options = {};
                try {
                    const favoriteSongs = await songsRepository.getFavoriteSongs(filter, options);
                    const totalPrice = favoriteSongs.reduce((total, song) => total + song.price, 0);
                    res.render('songs/favorites.twig', { songs: favoriteSongs, totalPrice: totalPrice });
                } catch (error) {
                    res.send("Error al obtener las canciones favoritas: " + error.message);
                }
            } else {
                res.send("Error al eliminar la canción de favoritos: " + result.message);
            }
        });
    });


}