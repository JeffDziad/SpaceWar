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
                this.appendChat(this.sender.player_name, this.sender.colors.body, this.chat_input.value);
                this.chat_input.value = "";
            } else {
                this.appendChat(`[ Game ]`, 'orange', 'You must join the game to send chat messages!');
            }
            
        };
        this.toggle_btn.addEventListener('click', this.updateDisplayed.bind(this));
        this.chat_send_btn.addEventListener('click', this.sendChat.bind(this));
        socket.on('incoming-chat', (data) => {
            this.appendChat(data.sender.player_name, data.sender.colors.body, data.msg);
        });
    }
    activate(sender) {
        this.sender = sender;
        this.active = true;
    }
    appendChat(prefix, prefixColor, msg) {
        let container = document.createElement('div');
        container.style.width = "100%";
        container.style.display = "block";

        let name = document.createElement('span');
        name.innerHTML = prefix;
        name.style.color = `${prefixColor}`;
        name.style.display = 'inline-block';

        let message = document.createElement('span');
        message.classList.add('chat-message');
        message.innerHTML = ': ' + msg;

        container.appendChild(name);
        container.appendChild(message);

        this.chat_output.appendChild(container, this.chat_output.firstChild);

        this.chat_output.scrollTop = this.chat_output.scrollHeight;
    }
    isVisable() {
        return this.displayed;
    }
}