class SoundManager {
    constructor() {
        this.main_weapon = '/assets/main_laser.wav';
        this.explosion_1 = '/assets/explosion.wav';
    }
    play(audioID) {
        let audio;
        switch(audioID) {
            case 'main-weapon':
                audio = new Audio(this.main_weapon);
                audio.play();
                break;
            case 'explosion-1':
                audio = new Audio(this.explosion_1);
                audio.play();
        }
    }
}