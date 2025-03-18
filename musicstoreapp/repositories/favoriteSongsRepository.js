const {ObjectId} = require("mongodb");
module.exports = {
    mongoClient: null,
    app: null,
    database: "musicStore",
    collectionName: "favorite_songs",
    init: function (app, dbClient) {
        this.dbClient = dbClient;
        this.app = app;
    },
    getFavoriteSongs: async function (filter,options) {
        try {
            await this.dbClient.connect();
            const database = this.dbClient.db(this.database);
            const songsCollection = database.collection(this.collectionName);
            const songs = await songsCollection.find(filter,options).toArray();
            return songs;
        } catch (error) {
            throw (error);
        }
    },
    insertFavoriteSong: function (song, callbackFunction) {
        this.dbClient.connect()
            .then(() => {
                const database = this.dbClient.db(this.database);
                const songsCollection = database.collection(this.collectionName);
                songsCollection.insertOne(song)
                    .then(result => callbackFunction({songId: result.insertedId}))
                    .then(() => this.dbClient.close())
                    .catch(err => callbackFunction({error: err.message}));
            })
            .catch(err => callbackFunction({error: err.message}))
    },
    deleteFavoriteSong: async function (songId, callbackFunction) {
        try {
            await this.dbClient.connect();
            const database = this.dbClient.db(this.database);
            const songsCollection = database.collection(this.collectionName);

            const result = await songsCollection.deleteOne({ _id: new ObjectId(songId) });
            if (result.deletedCount === 1) {
                callbackFunction({ success: true, message: "Song deleted successfully" });
            } else {
                callbackFunction({ success: false, message: "Song not found" });
            }
        } catch (error) {
            callbackFunction({ error: error.message });
        }
    }
};