class LeaderboardEntry {
    constructor(playerName, playerColor, initScore) {
        this.playerName = playerName;
        this.playerColor = playerColor;
        this.score = initScore;
    }
    getHTML() {
        return `
            <div class="leaderboard-entry" style="background-color: ${this.playerColor}">
                <span>${this.playerName}</span><span style="float: right; font-size: 20px;">${this.score}</span>
            </div>
        `;
    }
    update(newScore) {
        this.score = newScore;
    }
}

class Leaderboard {
    constructor() {
        // objs of LeaderboardEntry
        this.entries = {};
    }
    addEntry(socketID, playerName, playerColor, initScore) {
        this.entries[socketID] = new LeaderboardEntry(playerName, playerColor, initScore);
    }
    removeEntry(socketID) {
        delete this.entries[socketID];
    }
    updateEntry(socketID, newScore) {
        this.entries[socketID].update(newScore);
    }
    getEntryArray() {
        let out = [];
        for(const e in this.entries) {
            out.push(this.entries[e]);
        }
        return out;
    }
    getFormattedEntriesHTML() {
        let arr = this.getEntryArray();
        arr.sort(sortByScore);
        let out = "";
        for(let i = 0; i < arr.length; i++) {
            out += arr[i].getHTML();
        }
        // for(const sid in this.entries) {
        //     out += this.entries[sid].getHTML();
        // }
        return out;
    }
}

const sortByScore = (p1, p2) => {
    if(p1.score < p2.score) return -1;
    if(p1.score > p2.score) return 1;
    return 0;
}