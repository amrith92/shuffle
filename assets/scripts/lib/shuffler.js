'use strict';

var icecast = require('icecast'),
    lame = require('lame'),
    uuid = require('node-uuid'),
    _ = require('underscore')._;

function Shuffler(app, library) {
    var self = this;

    self.app = app;
    self.encoder = lame.Encoder({channels: 2, bitDepth: 16, sampleRate: 44100});
    self.decoder = lame.Decoder();
    self.clients = [];
    self.sseClients = [];
    self.library = library;
    self.changeSourceCounter = 0;
    self.track = '';
    self.init();
}

Shuffler.prototype.init = function () {
    var self = this;

    self.encoder.on('data', function (data) {
        self.sendData(data);
    });

    self.decoder.on('format', function (/*format*/) {
        self.decoder.pipe(self.encoder);
    });

    self.shuffle();
};

Shuffler.prototype.shuffle = function () {
    var self = this;

    self.changeSourceCounter = 0;
    self.library.next();
    //console.log('current: ' + self.library.current());
    icecast.get(self.library.current(), function (res) {
        if (self.clients.length === 0) {
            res.end();
            self.shuffle();
        }

        res.on('data', function (data) {
            self.decoder.write(data);
        });

        res.on('metadata', function (metadata) {
            if (self.changeSourceCounter === 5) {
                res.end();
                self.shuffle();
            } else {
                ++self.changeSourceCounter;
            }
            self.track = icecast.parse(metadata).StreamTitle;
            self.publishTrackInfo();
        });
    });
};

Shuffler.prototype.sendData = function (data) {
    var self = this;

    self.clients.forEach(function (client) {
        client.response.write(data);
    });
};

Shuffler.prototype.getClient = function (ip) {
    var self = this;
    return _.find(self.clients, function (client) { return client.ip === ip; });
};

Shuffler.prototype.getSseClient = function (ip) {
    var self = this;
    return _.find(self.sseClients, function (client) { return client.ip === ip; });
};

Shuffler.prototype.addSseClient = function (request, response) {
    var self = this,
        ip = null,
        headers = { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' };
    
    if (request.cookies.sseid) {
        ip = request.cookies.sseid;
    } else {
        response.cookie('sseid', uuid.v4(), { maxAge: 6000, httpOnly: true });
    }

    if (!response.headers) {
        response.set(headers);
        self.publishTrackInfo();
    }

    if (!self.getSseClient(ip)) {
        self.sseClients.push({response: response, ip: ip});
    }

    request.connection.on('close', function () {
        self.removeSseClient(ip);
    });
};

Shuffler.prototype.addClient = function (request, response) {
    var self = this,
        ip = null,
        headers = { 'Content-Type': 'audio/mpeg', 'Connection': 'close', 'Transfer-Encoding': 'identity', 'Cache-Control': 'no-cache' };

    if (request.cookies.clientid) {
        ip = request.cookies.clientid;
    } else {
        response.cookie('clientid', uuid.v4(), { maxAge: 6000, httpOnly: true });
    }

    if (!response.headers) {
        response.set(headers);
    }

    if (!self.getClient(ip)) {
        self.clients.push({response: response, ip: ip});
        self.publishTrackInfo();
    }

    request.connection.on('close', function () {
        self.removeClient(ip);
    });
};

Shuffler.prototype.removeClient = function (ip) {
    var self = this;
    self.clients = _.reject(self.clients, function (client) { return client.ip === ip; });
};

Shuffler.prototype.removeSseClient = function (ip) {
    var self = this;
    self.sseClients = _.reject(self.sseClients, function (client) { return client.ip === ip; });
};

Shuffler.prototype.publishTrackInfo = function () {
    var self = this;
    
    //console.log('Writing metadata: ' + self.track);
    self.sseClients.forEach(function (client) {
        client.response.send('data: ' + self.track + '\n\n');
    });
};

module.exports = Shuffler;
