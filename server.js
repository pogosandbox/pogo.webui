require('dotenv').config({silent: true});

if (!process.env.PROVIDER) {
    console.log("Configure login in .env before starting.");
    process.exit();
}

var express = require('express');
var app = express();
var http = require('http');
app.use(express.static(__dirname));

var socketserver = require("./pogoserver/socket");
var pogo = require("./pogoserver/pogo");

// Connect to PoGo

var auth = {
    type: process.env.PROVIDER, 
    user: process.env.USER, 
    pass: process.env.PASSWORD
};

var position = {
    lat: process.env.LATITUDE,
    lng: process.env.LONGITUDE
}

pogo.login(auth, position).then(startSocketServer).catch(err => console.log(err));

// Start WebSocket Server

function startSocketServer() {
    console.log("start socket server...");

    socketserver.on("GetPokemonSettings", (client, msg) => {
        console.log("GetPokemonSettings");
        pogo.client.downloadItemTemplates().then(settings => {
            // Pokemon Settings
            settings = Array.from(settings.item_templates, s => s.pokemon_settings).filter(s => s != null && s.family_id != 0);
            // Format compatible with UI
            settings = Array.from(settings, s => {
                return {
                    PokemonId: s.pokemon_id,
                    EvolutionIds: { $values: s.evolution_ids },
                    CandyToEvolve: s.candy_to_evolve
                };
            });
            // Send it to client
            socketserver.send(client, "PokemonSettings", { Data: { $values: settings } });
        })
    });

    socketserver.on("PokemonList", (client, msg) => {

    });

    socketserver.on("EggsList", (client, msg) => {
        pogo.getInventory().then(inventory => {
            console.log(inventory);

            var incubators = Array.from(inventory.egg_incubators, i => i.egg_incubator).filter(i => i != null);
            incubators = [].concat.apply([], incubators);
            console.log(incubators);
            incubators = Array.from(incubators, i => {
                return {
                    ItemId: i.item_id,
                    StartKmWalked: i.start_km_walked,
                    TargetKmWalked: i.target_km_walked
                }
            });

            var eggs = Array.from(inventory.pokemon).filter(p => p.is_egg);
            console.log(eggs);
            eggs = Array.from(eggs, i => {
                return {
                    EggKmWalkedTarget: i.egg_km_walked_target,
                    EggKmWalkedStart: i.egg_km_walked_start
                }
            });

            socketserver.send(client, "EggsListEvent", { 
                PlayerKmWalked: inventory.player.km_walked,
                Incubators: { $values: incubators },
                UnusedEggs: { $values: eggs }
            });
        });
    });

    socketserver.on("InventoryList", (client, msg) => {
        pogo.getInventory().then(inventory => {
            var items = Array.from(inventory.items, item => {
                return {
                    ItemId: item.item_id,
                    Count: item.count,
                    Unseen: item.unseen
                };
            });

            socketserver.send(client, "InventoryListEvent", { Items: { $values: items } });
        });
    });

    socketserver.start(client => {
        console.log("New client connected.");

        socketserver.send(client, "UpdatePositionEvent", { Latitude: position.lat, Longitude: position.lng });
        
        pogo.client.getPlayer().then(player => {
            socketserver.setProfile({
                Profile: {
                    PlayerData: {
                        Username: player.player_data.username,
                        MaxPokemonStorage: player.player_data.max_pokemon_storage,
                        MaxItemStorage: player.player_data.max_item_storage
                    }
                }
            });
        });
    });

}

// Start HTTP Server

if (process.env.HTTPS == "true") {

    var fs = require('fs');
    var https = require('https');
    var options = {
        key  : fs.readFileSync('./certs/dev.cert.key'),
        cert : fs.readFileSync('./certs/dev.cert.crt')
    };
    var httpserver = https.createServer(options, app);

    httpserver.listen(443, "0.0.0.0", function() {
        var addr = server.address();
        console.log("Server listening at ", addr.address + ":" + addr.port);
    });

} else {

    httpserver = http.createServer(app);

    httpserver.listen(8080, "0.0.0.0", function() {
        var addr = httpserver.address();
        console.log("Server listening at ", addr.address + ":" + addr.port);
    });

}