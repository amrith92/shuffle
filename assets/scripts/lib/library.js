'use strict';

function Library(app) {
    var self = this;

    self.app = app;
    self.urls = [
        /* Alternative */
        'http://81.173.3.132:8082',
        'http://108.160.154.65:8000',
        'http://99.198.112.59:8000',
        'http://206.190.136.212:8851/Live',
        'http://192.99.8.170:9825/stream',
        'http://streaming.radionomy.com/TheBeatlesHQ',
        'http://streaming.radionomy.com/A1Indie-Radio',
        /* Country */
        'http://50.7.96.138:8039',
        'http://streaming.radionomy.com/NashvilleEdge',
        /* Folk */
        'http://173.192.198.244:8138',
        'http://164.138.29.82:8012',
        /* Pop */
        'http://164.138.29.82:8012',
        'http://91.250.77.13:9120'
    ];

    self.previousIdx = -1;
    self.currentIdx = 0;
}

Library.prototype.next = function () {
    var self = this,
        idx = Math.floor(Math.random() * (self.urls.length - 1)),
        prev = self.previousIdx;

    self.previousIdx = self.currentIdx;
    self.currentIdx = idx === prev ? Math.floor(Math.random() * (self.urls.length - 1)) : idx;
};

Library.prototype.current = function () {
    var self = this;
    return self.urls[self.currentIdx];
};

module.exports = Library;
