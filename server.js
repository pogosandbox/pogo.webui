
var express = require('express');
var app = express();
var http = require('http');
app.use(express.static(__dirname));

server = http.createServer(app);
server.listen(8080, "0.0.0.0", function() {
    console.log("Server listening");
});