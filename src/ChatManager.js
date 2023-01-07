// Handle socket chat 

class ChatManager {
    constructor(socket) {
        this.toggle_btn = document.getElementById("chat-toggle-btn");
        this.chat_send_btn = document.getElementById("chat-input-send");
        this.chat_input = document.getElementById("chat-input");
        this.chat_body = document.getElementById("chat-body");
        this.chat_output = document.getElementById("chat-output");
        this.socket = socket;
        this.displayed = false;
        this.active = false;
        this.sender = null;
        this.updateDisplayed = () => {
            this.displayed = !this.displayed;
            if(this.displayed) {
                this.chat_body.classList.add('chat-body-expanded');
            } else {
                this.chat_body.classList.remove('chat-body-expanded');
            }
        };
        this.sendChat = () => {
            if(this.active) {
                this.socket.emit('outgoing-chat', {sender: this.sender, msg: this.chat_input.value});
                this.appendChat(this.sender, this.chat_input.value);
                this.chat_input.value = "";
            } else {
                alert('You must join the game to chat.');
            }
            
        };
        this.toggle_btn.addEventListener('click', this.updateDisplayed.bind(this));
        this.chat_send_btn.addEventListener('click', this.sendChat.bind(this));
        socket.on('incoming-chat', (data) => {
            this.appendChat(data.sender, data.msg);
        });
    }
    activate(sender) {
        this.sender = sender;
        this.active = true;
    }
    appendChat(sender, msg) {
        let out = document.createElement('span');
        out.innerHTML = sender.player_name + ': ' + msg;
        out.style.width = "100%";
        out.style.color = "white";
        this.chat_output.appendChild(out, this.chat_output.firstChild);
    }
}