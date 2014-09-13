'use strict';

var AudioContext = (window.AudioContext || window.webkitAudioContext);
var audioCtx = new AudioContext();
var analyser = audioCtx.createAnalyser();

var canvas = document.getElementById('visualization');
var canvasCtx = canvas.getContext('2d');

var shuffleBuffer = null;
var source = null;

var drawVisual;

function visualize() {
    var WIDTH = canvas.width;
    var HEIGHT = canvas.height;

    analyser.fftSize = 2048;
    var bufferLength = analyser.fftSize;
    var dataArray = new Uint8Array(bufferLength);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    function draw() {
        drawVisual = window.requestAnimationFrame(draw);
        analyser.getByteTimeDomainData(dataArray);

        canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'rgb(98, 255, 0)';

        canvasCtx.beginPath();

        var sliceWidth = WIDTH * 1.0 / bufferLength;
        var x = 0;

        for (var i = 0; i < bufferLength; ++i) {
            var v = dataArray[i] / 128.0;
            var y = v * HEIGHT / 2;

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
    }

    draw();
}

function prepareBuffer() {
    source = audioCtx.createBufferSource();
    source.buffer = shuffleBuffer;
    source.connect(analyser);
    source.connect(audioCtx.destination);
    source.start(0);

    visualize();
}

function loadSound(url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    request.onload = function () {
        audioCtx.decodeAudioData(request.response, function (buffer) {
            shuffleBuffer = buffer;
            prepareBuffer();
        }, function () { console.log('Error.'); });
    };

    request.send();
}

loadSound('/audio/08 - Neon Tiger.mp3');
