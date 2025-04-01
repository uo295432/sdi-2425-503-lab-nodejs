const {ObjectId} = require("mongodb");
module.exports = function (app, songsRepository,usersRepository) {
    // Middleware para extraer el usuario del token JWT
    function authToken(req, res, next) {
        let token = req.headers['token'];
        if (!token) {
            return res.status(403).json({ error: "Token no proporcionado" });
        }
        try {
            let decoded = app.get('jwt').verify(token, "secreto");
            req.user = decoded.user; // email del usuario
            next();
        } catch (err) {
            res.status(403).json({ error: "Token inválido" });
        }
    }
    app.get("/api/v1.0/songs", function (req, res) {
        let filter = {};
        let options = {};
        songsRepository.getSongs(filter, options).then(songs => {
            res.status(200);
            res.send({songs: songs})
        }).catch(error => {
            res.status(500);
            res.json({ error: "Se ha producido un error al recuperar las canciones." })
        });
    });
    app.get("/api/v1.0/songs/:id", function (req, res) {
        try {
            let songId = new ObjectId(req.params.id)
            let filter = {_id: songId};
            let options = {};
            songsRepository.findSong(filter, options).then(song => {
                if (song === null) {
                    res.status(404);
                    res.json({error: "ID inválido o no existe"})
                } else {
                    res.status(200);
                    res.json({song: song})
                }
            }).catch(error => {
                res.status(500);
                res.json({error: "Se ha producido un error a recuperar la canción."})
            });
        } catch (e) {
            res.status(500);
            res.json({error: "Se ha producido un error :" + e})
        }
    });
    app.delete('/api/v1.0/songs/:id', authToken, function (req, res) {
        try {
            let songId = new ObjectId(req.params.id);
            let filter = { _id: songId };

            songsRepository.findSong(filter, {}).then(song => {
                if (!song) {
                    res.status(404).json({ error: "ID inválido o la canción no existe." });
                } else if (song.author !== req.user) {
                    res.status(403).json({ error: "No tienes permiso para eliminar esta canción." });
                } else {
                    songsRepository.deleteSong(filter, {}).then(result => {
                        if (result.deletedCount === 0) {
                            res.status(500).json({ error: "No se ha podido eliminar la canción." });
                        } else {
                            res.status(200).json({ message: "Canción eliminada correctamente." });
                        }
                    }).catch(error => {
                        res.status(500).json({ error: "Error al eliminar la canción." });
                    });
                }
            }).catch(error => {
                res.status(500).json({ error: "Error al buscar la canción: " + error });
            });

        } catch (e) {
            res.status(500).json({ error: "ID inválido." });
        }
    });
    app.post('/api/v1.0/songs', authToken, function (req, res) {
        try {
            let song = {
                title: req.body.title,
                kind: req.body.kind,
                price: req.body.price,
                author: req.user
            };
            songsRepository.insertSong(song, function (songId) {
                if (songId === null) {
                    res.status(409);
                    res.json({ error: "No se ha podido crear la canción. El recurso ya existe." });
                } else {
                    res.status(201);
                    res.json({
                        message: "Canción añadida correctamente.",
                        _id: songId
                    });
                }
            });
        } catch (e) {
            res.status(500);
            res.json({ error: "Se ha producido un error al intentar crear la canción: " + e });
        }
    });

    app.put('/api/v1.0/songs/:id', authToken, function (req, res) {
        try {
            let songId = new ObjectId(req.params.id);
            let filter = { _id: songId };
            const options = { upsert: false };

            songsRepository.findSong(filter, {}).then(song => {
                if (!song) {
                    return res.status(404).json({ error: "Canción no encontrada." });
                }
                if (song.author !== req.user) {
                    return res.status(403).json({ error: "No tienes permiso para modificar esta canción." });
                }

                let updateFields = {};
                if (typeof req.body.title !== "undefined" && req.body.title !== null)
                    updateFields.title = req.body.title;
                if (typeof req.body.kind !== "undefined" && req.body.kind !== null)
                    updateFields.kind = req.body.kind;
                if (typeof req.body.price !== "undefined" && req.body.price !== null)
                    updateFields.price = req.body.price;

                songsRepository.updateSong(updateFields, filter, options).then(result => {
                    if (result === null) {
                        res.status(404);
                        res.json({ error: "ID inválido o no existe, no se ha actualizado la canción." });
                    } else if (result.modifiedCount == 0) {
                        res.status(409);
                        res.json({ error: "No se ha modificado ninguna canción." });
                    } else {
                        res.status(200);
                        res.json({
                            message: "Canción modificada correctamente.",
                            result: result
                        });
                    }
                }).catch(error => {
                    res.status(500);
                    res.json({ error: "Se ha producido un error al modificar la canción." });
                });
            });
        } catch (e) {
            res.status(500);
            res.json({ error: "Se ha producido un error al intentar modificar la canción: " + e });
        }
    });
    app.post('/api/v1.0/users/login', function (req, res) {
        try {
            let securePassword = app.get("crypto").createHmac('sha256', app.get('clave'))
                .update(req.body.password).digest('hex');
            let filter = {
                email: req.body.email,
                password: securePassword
            }
            let options = {};
        usersRepository.findUser(filter, options).then(user => {
            if (user == null) {
                res.status(401); //Unauthorized
                res.json({
                    message: "usuario no autorizado",
                    authenticated: false

                })

            } else {
                let token = app.get('jwt').sign(
                    {user: user.email, time: Date.now() / 1000},
                    "secreto");
                res.status(200);
                res.json({
                    message: "usuario autorizado",
                    authenticated: true,
                    token: token
                })
            }
        }).catch(error => {
            res.status(401);
            res.json({
                message: "Se ha producido un error al verificar credenciales",
                authenticated: false
            })
        })
    } catch (e)
    {
        res.status(500);
        res.json({
            message: "Se ha producido un error al verificar credenciales",
            authenticated: false
        })
    }
});

}