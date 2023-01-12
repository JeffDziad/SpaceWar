const audioContext = new (window.AudioContext || window.webkitAudioContext)(),
    gainContext = audioContext.createGain(),
    MAX_GAIN = 0.5;
    MIN_GAIN = 0.1;

class Sample {
    constructor(hz) {
        this.hz = hz;
        this.initialize();
    }
    initialize() {
        this.osc = audioContext.createOscillator();
        this.osc.frequency.value = this.hz;
    }
    start() {
        this.osc.connect(gainContext);
        this.osc.start();
    }
    stop() {
        this.osc.disconnect();
    }
    addHz(hz) {
        let now = audioContext.currentTime;
        this.osc.frequency.setValueAtTime(this.hz, now);
        this.osc.frequency.linearRampToValueAtTime(this.hz + hz, now);
    }
}

class EnginegSoundSynth {
    constructor(initial_hz_values) {
        this.init_vals = initial_hz_values;
        this.samples = [];
        this.rev_acc = 1;
        this.rev_decc = 1.2;
        this.rev_value = 0;
        this.rev_value_max = 50;
        this.last_thrust = performance.now();
        this.gain_speed = 0.05;
        this.engine_shutdown_MS = 1000;
        this.waiting_restart = false;
        this.initialize();
    }
    initialize() {
        gainContext.gain.value = MAX_GAIN;
        gainContext.connect(audioContext.destination);
        for(let i = 0; i < this.init_vals.length; i++) {
            this.samples.push(new Sample(this.init_vals[i]));
            this.samples[i].start();
        }
    }
    update(isThrusting) {
        if(isThrusting) {
            if(this.waiting_restart) {
                //! Idea 1
                gainContext.gain.value += this.gain_speed;
                if(gainContext.gain.value >= MAX_GAIN) {
                    this.waiting_restart = false;
                    gainContext.gain.value = MAX_GAIN;
                }

                //! Idea 2
                //gainContext.gain.value = MAX_GAIN;

                //! Idea 3
                //! CANT GET SMOOTH TRANSITION FOR FADE IN/OUT of GAIN
                // let now = audioContext.currentTime;
                // gainContext.gain.setValueAtTime(gainContext.gain.value, now);
                // gainContext.gain.linearRampToValueAtTime(MAX_GAIN, now + 0.3);
                this.waiting_restart = false;
            } else {
                this.last_thrust = performance.now();
                this.rev_value += this.rev_acc;
            }
        } else {
            this.rev_value -= this.rev_decc;

            if(performance.now() - this.last_thrust > this.engine_shutdown_MS) {
                this.waiting_restart = true;
                // silence gain
                let now = audioContext.currentTime;
                gainContext.gain.setValueAtTime(gainContext.gain.value, now);
                gainContext.gain.linearRampToValueAtTime(0, now + 0.5);
                if(gainContext.gain.value <= 0) gainContext.gain.value = 0;
            }
        }

        if(this.rev_value >= this.rev_value_max) this.rev_value = this.rev_value_max;
        if(this.rev_value <= 0) this.rev_value = 0;

        for(let i = 0; i < this.samples.length; i++) {
            this.samples[i].addHz(this.rev_value);
        }
    }
}