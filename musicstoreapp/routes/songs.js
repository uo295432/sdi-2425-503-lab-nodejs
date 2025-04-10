const songsRepository = require("../repositories/songsRepository");
const {ObjectId} = require("mongodb");
module.exports = function (app,songsRepository) {
    // app.get("/songs", function (req, res) {
    //     let response = "";
    //     if(req.query.title!=null && typeof(req.query.title)!="undefined"){
    //         response = 'Titulo: ' + req.query.title + '<br>'
    //     }
    //     if(req.query.author!=null && typeof(req.query.author)!="undefined"){
    //         response = 'Autor: ' + req.query.author;
    //     }
    //     res.send(response);
    // });

    app.get('/songs/add', function (req, res) {
        res.render("songs/add.twig");
    });

    app.post('/songs/add',function(req,res){
        let song = {
            title: req.body.title,
            kind: req.body.kind,
            price: req.body.price,
            author: req.session.user
        }
        songsRepository.insertSong(song,function (result){
            if(result.songId!==null && result.songId!==undefined){
                if (req.files != null) {
                    let image = req.files.cover;
                    image.mv(app.get("uploadPath") + '/public/covers/' + result.songId + '.png')
                        .then(() => {
                            if (req.files.audio != null) {
                                let audio = req.files.audio;
                                audio.mv(app.get("uploadPath") + '/public/audios/' + result.songId + '.mp3')
                                    .then(res.redirect("/publications"))
                                    .catch(error => res.send("Error al subir el audio de la canción"))
                            }else {
                                res.redirect("/publications");
                            }
                        })
                        .catch(error => res.send("Error al subir la portada de la canción"))
                } else {
                    res.redirect("/publications");
                }
            } else {
                res.send("Error al insertar canción " + result.error);
            }
        });
    });

    app.get('/add', function(req, res) {
        let response = parseInt(req.query.num1) + parseInt(req.query.num2);
        res.send(String(response));
    });
    app.get('/songs/:id', function (req, res) {
        let songId = new ObjectId(req.params.id);
        let filter = {_id: songId};
        let options = {};

        songsRepository.findSong(filter, options).then(song => {
            if (song == null) {
                res.send("Canción no encontrada");
            } else {
                // Llamada a la API de cambio de divisa
                let settings = {
                    url: "https://api.currencyapi.com/v3/latest?apikey=cur_live_NTIWFxnnMRWh7etH66WK6QhEIYqU9NU5KkcHUeFw&base_currency=EUR&currencies=USD",
                    method: "get",
                };
                let rest = app.get("rest");

                rest(settings, function (error, response, body) {
                    if (error || response.statusCode !== 200) {
                        console.error("Error en la API de cambio de moneda:", error);
                        song.usd = "N/A";
                    } else {
                        let responseObject = JSON.parse(body);
                        let rateUSD = responseObject.data.USD.value;
                        let songValue = song.price / rateUSD;
                        song.usd = Math.round(songValue * 100) / 100;
                    }

                    if (song.author === req.session.user) {
                        res.render("songs/song.twig", {song: song, canPlay: true});
                    } else {
                        let purchaseFilter = {
                            user: req.session.user,
                            song_id: songId
                        };
                        songsRepository.getPurchases(purchaseFilter, {}).then(purchases => {
                            let canPlay = purchases.length > 0;
                            res.render("songs/song.twig", {song: song, canPlay: canPlay});
                        }).catch(error => {
                            res.send("Error al comprobar si la canción está comprada: " + error);
                        });
                    }
                });
            }
        }).catch(error => {
            res.send("Se ha producido un error al buscar la canción " + error);
        });
    });

    //Método antiguo
    // app.get('/songs/:id', function (req, res) {
    //     let songId = new ObjectId(req.params.id);
    //     let filter = {_id: songId};
    //     let options = {};
    //     songsRepository.findSong(filter, options).then(song => {
    //         if (song == null) {
    //             res.send("Canción no encontrada");
    //         } else if (song.author === req.session.user) {
    //             res.render("songs/song.twig", {song: song, canPlay: true});
    //         } else {
    //             let filter = {
    //                 user: req.session.user,
    //                 song_id: songId
    //             };
    //             songsRepository.getPurchases(filter, {}).then(purchases => {
    //                 let canPlay = purchases.length > 0;
    //                 res.render("songs/song.twig", {song: song, canPlay: canPlay});
    //             }).catch(error => {
    //                 res.send("Error al comprobar si la canción está comprada: " + error);
    //             });
    //         }
    //     }).catch(error => {
    //         res.send("Se ha producido un error al buscar la canción " + error)
    //     });
    // });

    app.get('/promo*', function (req, res) {
        res.send('Respuesta al patrón promo*');
    });
    app.get('/pro*ar', function (req, res) {
        res.send('Respuesta al patrón pro*ar');
    });

    app.get('/shop', function (req, res) {
        let filter = {};
        let options = {sort: {title: 1}};
        if (req.query.search != null && typeof (req.query.search) != "undefined" &&
            req.query.search != "") {
            filter = {"title": {$regex: ".*" + req.query.search + ".*"}};
        }
        let page = parseInt(req.query.page); // Es String !!!
        if (typeof req.query.page === "undefined" || req.query.page === null || req.query.page === "0") { //Puede no venir el param
            page = 1;
        }
        songsRepository.getSongsPg(filter, options, page).then(result => {
            let lastPage = result.total / 4;
            if (result.total % 4 > 0) { // Sobran decimales
                lastPage = lastPage + 1;
            }
            let pages = []; // paginas mostrar
            for (let i = page - 2; i <= page + 2; i++) {
                if (i > 0 && i <= lastPage) {
                    pages.push(i);
                }
            }
            let response = {
                songs: result.songs,
                pages: pages,
                currentPage: page
            }
            res.render("shop.twig", response);
        }).catch(error => {
            res.send("Se ha producido un error al listar las canciones del usuario " + error)
        });
    });

    app.post('/songs/buy/:id', function (req, res) {
        let songId = new ObjectId(req.params.id);

        // Primero obtener la canción
        songsRepository.findSong({_id: songId}, {}).then(song => {
            if (!song) {
                res.send("Canción no encontrada");
                return;
            }

            // Comprobamos si es el autor
            if (song.author === req.session.user) {
                res.redirect("/shop");
                return;
            }

            // Comprobamos si ya la ha comprado
            let purchaseFilter = {
                user: req.session.user,
                song_id: songId
            };
            songsRepository.getPurchases(purchaseFilter, {}).then(purchases => {
                if (purchases.length > 0) {
                    res.send("Ya has comprado esta canción");
                } else {
                    let shop = {
                        user: req.session.user,
                        song_id: songId
                    };
                    songsRepository.buySong(shop).then(result => {
                        if (result.insertedId === null || typeof result.insertedId === "undefined") {
                            res.send("Se ha producido un error al comprar la canción");
                        } else {
                            res.redirect("/purchases");
                        }
                    }).catch(error => {
                        res.send("Error al realizar la compra: " + error);
                    });
                }
            }).catch(error => {
                res.send("Error al comprobar si ya se ha comprado: " + error);
            });
        }).catch(error => {
            res.send("Error al comprobar la canción: " + error);
        });
    });

    app.get('/purchases', function (req, res) {
        let filter = {user: req.session.user};
        let options = {projection: {_id: 0, song_id: 1}};
        songsRepository.getPurchases(filter, options).then(purchasedIds => {
            const purchasedSongs = purchasedIds.map(song => song.song_id);
            let filter = {"_id": {$in: purchasedSongs}};
            let options = {sort: {title: 1}};
            songsRepository.getSongs(filter, options).then(songs => {
                res.render("purchases.twig", {songs: songs});
            }).catch(error => {
                res.send("Se ha producido un error al listar las publicaciones del usuario: " + error)
            });
        }).catch(error => {
            res.send("Se ha producido un error al listar las canciones del usuario " + error)
        });
    });

    app.get('/songs', function (req, res){
        let songs=[{
            "title":"Blank space",
            "price":"1.2"
        },{
            "title":"See You Again",
            "price":"1.3"
        },{
            "title":"Uptown Funk",
            "price":"1.1"
        }];

        let response={
            seller:'Tienda de canciones',
            songs:songs
        };
        res.render("shop.twig",response);
    });

    app.get('/songs/delete/:id', function (req, res) {
        let filter = {_id: new ObjectId(req.params.id)};
        songsRepository.deleteSong(filter, {}).then(result => {
            if (result === null || result.deletedCount === 0) {
                res.send("No se ha podido eliminar el registro");
            } else {
                res.redirect("/publications");
            }
        }).catch(error => {
            res.send("Se ha producido un error al intentar eliminar la canción: " + error)
        });
    });

    app.get('/publications', function (req, res) {
        let filter = {author : req.session.user};
        let options = {sort: {title: 1}};
        songsRepository.getSongs(filter, options).then(songs => {
            res.render("publications.twig", {songs: songs});
        }).catch(error => {
            res.send("Se ha producido un error al listar las publicaciones del usuario:" + error)
        });
    })
    app.get('/songs/edit/:id', function (req, res){
        let filter={_id:new ObjectId(req.params.id)};
        songsRepository.findSong(filter,{}).then(song =>{
            res.render("songs/edit.twig",{song:song});
        }).catch(error =>{
            res.send("Se ha producido un error al recuperar la canción"+error)
        });
    });
    app.post('/songs/edit/:id', function (req, res) {
        let song = {
            title: req.body.title,
            kind: req.body.kind,
            price: req.body.price,
            author: req.session.user
        }
        let songId = req.params.id;
        let filter = {_id: new ObjectId(songId)};
//que no se cree un documento nuevo, si no existe
        const options = {upsert: false}
        songsRepository.updateSong(song, filter, options).then(result => {
            step1UpdateCover(req.files, songId, function (result) {
                if (result == null) {
                    res.send("Error al actualizar la portada o el audio de la canción");
                } else {
                    res.redirect("/publications");
                }
            });
        }).catch(error => {
            res.send("Se ha producido un error al modificar la canción " + error)
        });
    })

    function step1UpdateCover(files, songId, callback) {
        if (files && files.cover != null) {
            let image = files.cover;
            image.mv(app.get("uploadPath") + '/public/covers/' + songId + '.png', function (err) {
                if (err) {
                    callback(null); // ERROR
                } else {
                    step2UpdateAudio(files, songId, callback); // SIGUIENTE
                }
            });
        } else {
            step2UpdateAudio(files, songId, callback); // SIGUIENTE
        }
    };
    function step2UpdateAudio(files, songId, callback) {
        if (files && files.audio != null) {
            let audio = files.audio;
            audio.mv(app.get("uploadPath") + '/public/audios/' + songId + '.mp3', function (err) {
                if (err) {
                    callback(null); // ERROR
                } else {
                    callback(true); // FIN
                }
            });
        } else {
            callback(true); // FIN
        }
    };

    app.get('/songs/:kind/:id', function(req, res) {
        let response = 'id: ' + req.params.id + '<br>'
            + 'Tipo de música: ' + req.params.kind;
        res.send(response);
    });

};