let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let indexRouter = require('./routes/index');
let app = express();
let rest = require('request');
app.set('rest', rest);
let jwt = require('jsonwebtoken');
app.set('jwt', jwt);
let crypto = require('crypto');

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "POST, GET, DELETE, UPDATE, PUT");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type,Accept, token");
// Debemos especificar todas las headers que se aceptan. Content-Type , token
  next();
});

let expressSession = require('express-session');
app.use(expressSession({
  secret: 'abcdefg',
  resave: true,
  saveUninitialized: true
}));

let fileUpload = require('express-fileupload');
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
  createParentPath: true
}));

app.set('uploadPath', __dirname)
app.set('clave','abcdefg');
app.set('crypto',crypto)

let bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const { MongoClient } = require("mongodb");
const connectionStrings = "mongodb+srv://admin:sdi@musicstoreapp.hm8d9.mongodb.net/?retryWrites=true&w=majority&appName=musicstoreapp";
const dbClient = new MongoClient(connectionStrings);

const userSessionRouter = require('./routes/userSessionRouter');
const userAudiosRouter = require('./routes/userAudiosRouter');
app.use("/songs/add",userSessionRouter);
app.use("/publications",userSessionRouter);
app.use("/songs/buy",userSessionRouter);
app.use("/purchases",userSessionRouter);
app.use("/audios/",userAudiosRouter);
app.use("/shop/",userSessionRouter)

const userAuthorRouter = require('./routes/userAuthorRouter');
app.use("/songs/edit",userAuthorRouter);
app.use("/songs/delete",userAuthorRouter);

const userTokenRouter = require('./routes/userTokenRouter');
app.use("/api/v1.0/songs/", userTokenRouter);

let songsRepository = require("./repositories/songsRepository.js");
songsRepository.init(app, dbClient);
let favoritesRepository = require("./repositories/favoriteSongsRepository.js");
favoritesRepository.init(app, dbClient);
//app.set('connectionStrings', url)

const usersRepository = require("./repositories/usersRepository.js");
usersRepository.init(app, dbClient);
require("./routes/users.js")(app, usersRepository);
require("./routes/songs/favorites.js")(app,favoritesRepository);
require("./routes/songs.js")(app,songsRepository);
require("./routes/authors.js")(app);
require("./routes/api/songsAPIv1.0.js")(app, songsRepository, usersRepository)

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'twig');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  console.log("Se ha producido un error"+err);
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;