module.exports = function (app) {
    app.get('/authors/add', function (req, res) {
        let rols=[{
            "name":"Cantante"
        },{
            "name":"Trompetista"
        },{
            "name":"Violinista"
        },{
            "name":"Saxofonista"
        },{
            "name":"Pianista"
        }];
        let response={
            seller:'Roles',
            rols:rols
        };
        res.render("authors/add.twig",response);
    });

    app.post('/authors/add',function(req,res){
        let response="Autor agregado: ";
        if(req.body.name!=null && typeof(req.body.name)!="undefined" && req.body.name.trim() !== ""){
            response += ('Nombre: ' + req.body.name + '<br>');
        }else{
            response += "Nombre no enviado en la petición" + '<br>';
        }
        if(req.body.group!=null && typeof(req.body.group)!="undefined" && req.body.group.trim() !== ""){
            response += ('Grupo: ' + req.body.group + '<br>');
        }else{
            response += "Grupo no enviado en la petición" + '<br>';
        }
        if(req.body.rol!=null && typeof(req.body.rol)!="undefined" && req.body.rol.trim() !== ""){
            response += ('Rol: ' + req.body.rol);
        }else{
            response += "Rol no enviado en la petición" + '<br>';
        }
        res.send(response);
    });

    app.get('/authors', function (req, res){
        let authors=[{
            "name":"Kurt",
            "group":"Nirvana",
            "rol":"Cantante"
        },{
            "name":"Eazy-E",
            "group":"NWA",
            "rol":"Rapero"
        },{
            "name":"Dr Dre",
            "group":"NWA",
            "rol":"DJ"
        }];

        let response={
            seller:'Autores',
            authors:authors
        };
        res.render("authors/authors.twig",response);
    });

    app.get('/aut*', function (req, res) {
        res.redirect('/authors/');
    });
    app.get('/authors/*', function (req, res) {
        res.redirect('/authors/');
    });
};