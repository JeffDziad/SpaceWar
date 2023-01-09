const audioContext = new (window.AudioContext || window.webkitAudioContext)(),
    gainContext = audioContext.createGain();

class Sample {
    constructor(hz) {
        this.hz = hz;
    }
    initialize() {
        this.osc = audioContext.createOscillator();
        this.osc.frequency.value = this.hz;
    }
    start() {
        this.initialize();
        this.osc.connect(gainContext);
        this.osc.start();
    }
    stop() {
        this.osc.disconnect();
    }
    setHz(hz) {
        let now = audioContext.currentTime;
        this.osc.frequency.setValueAtTime(this.hz, now);
        this.osc.frequency.linearRampToValueAtTime(hz, now);
        this.hz = hz;
    }
}

class EngingSoundSynth {
    constructor(initial_hz_values) {
        this.init_vals = initial_hz_values;
        this.samples = [];
        this.initialize();
    }
    initialize() {
        for(let i = 0; i < this.init_vals.length; i++) {
            this.samples.push(new Sample(this.init_vals[i]));
        }
    }
}