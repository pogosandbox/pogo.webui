
var express = require('express');
var app = express();
var http = require('http');
app.use(express.static(__dirname));

var fs = require('fs');
var https = require('https');
var options = {
    key  : fs.readFileSync('./certs/dev.cert.key'),
    cert : fs.readFileSync('./certs/dev.cert.crt')
};
server = https.createServer(options, app);

server.listen(443, "0.0.0.0", function() {
    var addr = server.address();
    console.log("Server listening at ", addr.address + ":" + addr.port);
});
