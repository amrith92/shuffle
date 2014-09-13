'use strict';

var AudioContext = (window.AudioContext || window.webkitAudioContext);

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
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.analyser);
    this.analyser.connect(this.javascriptNode);
    this.source.connect(this.context.destination);
    this.source.start(0);
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

        var gradient = ctx.createLinearGradient(0, 0, 0, 300);
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
            ctx.fillRect(i * 5, 325 - value, 3, 325);
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

        var hot = chroma.scale(['#000000', '#ff0000', '#ffff00', '#ffffff']).out('hex').domain([0, 300]);

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
};

Shuffle.start = function (options) {
    this.context = new AudioContext();
    this.javascriptNode = this.context.createScriptProcessor(2048, 1, 1);
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
    this.canvasCtx = this.canvas.getContext('2d');

    this.initialized = true;

    this.loadSound('/audio/08 - Neon Tiger.mp3');
};

// Start shuffle :D
Shuffle.start({
    canvas: 'visualization'
});
