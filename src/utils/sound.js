// Game Sound Engine using Web Audio API for simple tones + External URLs for Music
class GameSound {
    constructor() {
        this.ctx = null;
        this.music = {};
        this.sounds = {
            correct: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
            wrong: 'https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3',
            click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
            finish: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
            countdown: 'https://assets.mixkit.co/active_storage/sfx/2006/2006-preview.mp3',
            start: 'https://assets.mixkit.co/active_storage/sfx/2010/2010-preview.mp3',
            timeout: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
            game_over: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3'
        };
        this.tracks = {
            racing: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
            quiz: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3'
        };
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    play(sfxName) {
        try {
            const audio = new Audio(this.sounds[sfxName]);
            audio.volume = 0.5;
            audio.play().catch(e => console.log("Audio play blocked", e));
        } catch (e) {}
    }

    playMusic(trackName) {
        if (this.music[trackName]) return;
        
        const audio = new Audio(this.tracks[trackName]);
        audio.loop = true;
        audio.volume = 0.2;
        audio.play().catch(e => console.log("Music play blocked", e));
        this.music[trackName] = audio;
    }

    stopMusic(trackName) {
        if (this.music[trackName]) {
            this.music[trackName].pause();
            this.music[trackName].currentTime = 0;
            delete this.music[trackName];
        }
    }

    stopAll() {
        Object.keys(this.music).forEach(track => this.stopMusic(track));
    }
}

export const gameSound = new GameSound();
