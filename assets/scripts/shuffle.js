'use strict';

/* global chroma */

var AudioContext = (window.AudioContext || window.webkitAudioContext);
var EventSource = (window.EventSource || null);

var Shuffle = {
    context: null,
    initialized: false,
    buffer: null,
    source: null,
    analyser: null,
    javascriptNode: null,
    canvas: null,
    canvasCtx: null,
    presets: [],
    presetIdx: 0
};

Shuffle.prepareBuffer = function () {
    var audio = document.getElementById('player'),
        self = this;

    audio.play();
    self.source = self.context.createMediaElementSource(audio);
    self.source.connect(self.analyser);
    self.analyser.connect(self.javascriptNode);
    self.source.connect(self.context.destination);
};

Shuffle.loadSound = function (url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    var self = this;
    request.onload = function () {
        self.context.decodeAudioData(request.response, function (buffer) {
            self.buffer = buffer;
            self.prepareBuffer();
        }, function () { console.log('Error.'); });
    };

    request.send();
};

Shuffle.initPresets = function () {
    var self = this;

    // frequency spectogram
    this.presets.push(function () {
        var analyser = self.analyser;
        var canvas = self.canvas;
        var ctx = self.canvasCtx;

        var gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(1, '#000000');
        gradient.addColorStop(0.75, '#ff0000');
        gradient.addColorStop(0.25, '#ffff00');
        gradient.addColorStop(0, '#ffffff');

        analyser.smoothingTimeConstant = 0.3;
        analyser.fftSize = 512;

        var array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = gradient;

        for (var i = 0, term = array.length; i < term; ++i) {
            var value = array[i];
            ctx.fillRect(i * 6, canvas.height - 25 - value, 3, canvas.height - 25);
        }
    });

    // time-domain spectrogram
    this.presets.push(function () {
        var analyser = self.analyser;
        var canvas = self.canvas;
        var ctx = self.canvasCtx;

        analyser.smoothingTimeConstant = 0;
        analyser.fftSize = 1024;

        var tempCanvas = document.createElement('canvas');
        var tempCtx = tempCanvas.getContext('2d');

        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;

        var hot = chroma.scale(['#000000', '#ff0000', '#ffff00', '#ffffff']).out('hex').domain([0, canvas.height - 25]);

        var array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);

        tempCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height);

        for (var i = 0; i < array.length; ++i) {
            var value = array[i];
            ctx.fillStyle = hot(value);

            ctx.fillRect(canvas.width - 1, canvas.height - i, 1, 1);
        }

        ctx.translate(-1, 0);
        ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    });
    //this.presetIdx = 1;
};

Shuffle.start = function (options) {
    this.context = new AudioContext();

    this.javascriptNode = this.context.createScriptProcessor ? this.context.createScriptProcessor(2048, 1, 1) : this.context.createJavaScriptNode(2048, 1, 1);

    this.javascriptNode.connect(this.context.destination);

    this.initPresets();

    var self = this;
    this.javascriptNode.onaudioprocess = function () {
        if (self.presets.length > 0 && self.presetIdx <= self.presets.length) {
            (self.presets[self.presetIdx])();
        }
    };

    this.analyser = this.context.createAnalyser();
    this.canvas = document.getElementById(options.canvas);
    this.canvas.width = options.width || this.canvas.width;
    this.canvas.height = options.height || this.canvas.height;

    this.canvasCtx = this.canvas.getContext('2d');
    this.trackDisplay = document.getElementById(options.trackDisplay);

    this.initialized = true;

    //this.loadSound('/shuffle');
    this.prepareBuffer();

    // Set up SSE
    if (!EventSource) {
        return;
    }

    this.source = new EventSource('/events');
    this.source.addEventListener('message', function (e) {
        self.trackDisplay.innerHTML = e.data;
        console.log(e.data);
    });
    this.source.addEventListener('error', function (e) {
        if (e.readyState === EventSource.CLOSED) {
            console.log('SSE channel closed.');
        }
    });
};

// Start shuffle :D
Shuffle.start({
    canvas: 'visualization',
    width: window.innerWidth - 20,
    height: (window.innerHeight > 500 ? 500 : window.innerHeight - 20),
    trackDisplay: 'track-display'
});
