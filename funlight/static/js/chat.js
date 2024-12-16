class ChatManager {
    constructor() {
        this.socket = io();
        this.messageTemplate = document.getElementById('message-template');
        this.messagesContainer = document.getElementById('messages');
        this.messageInput = document.getElementById('message-input');
        this.uploadButton = document.querySelector('.upload-btn');
        this.emojiButton = document.querySelector('.emoji-btn');
        this.uploadPreview = document.getElementById('upload-preview');
        this.selectedFiles = [];

        this.initializeEventListeners();
        this.initializeSocketEvents();
        this.initializeAutoResize();
    }

    initializeEventListeners() {
        // Message input handling
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // File upload handling
        this.uploadButton.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt';
            input.onchange = (e) => this.handleFileSelect(e);
            input.click();
        });

        // Emoji picker
        this.emojiButton.addEventListener('click', () => {
            // TODO: Implement emoji picker
        });
    }

    initializeSocketEvents() {
        this.socket.on('message', (data) => {
            this.addMessage(data);
        });

        this.socket.on('typing', (data) => {
            this.showTypingIndicator(data);
        });

        this.socket.on('stop_typing', (data) => {
            this.hideTypingIndicator(data);
        });
    }

    initializeAutoResize() {
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = (this.messageInput.scrollHeight) + 'px';
        });
    }

    sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content && this.selectedFiles.length === 0) return;

        const formData = new FormData();
        if (content) {
            formData.append('content', content);
        }
        
        this.selectedFiles.forEach(file => {
            formData.append('files[]', file);
        });

        fetch('/api/messages', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.messageInput.value = '';
                this.messageInput.style.height = 'auto';
                this.clearUploadPreview();
            }
        })
        .catch(error => {
            console.error('Error sending message:', error);
            this.showError('Failed to send message');
        });
    }

    addMessage(message) {
        const messageElement = this.messageTemplate.content.cloneNode(true);
        
        const avatar = messageElement.querySelector('.message-avatar');
        avatar.src = message.author.avatar || '/static/img/default-avatar.png';
        avatar.alt = message.author.username;

        messageElement.querySelector('.message-author').textContent = message.author.username;
        messageElement.querySelector('.message-timestamp').textContent = this.formatTimestamp(message.timestamp);
        
        const messageText = messageElement.querySelector('.message-text');
        messageText.innerHTML = this.formatMessage(message.content);

        if (message.attachments && message.attachments.length > 0) {
            const attachmentsContainer = messageElement.querySelector('.message-attachments');
            message.attachments.forEach(attachment => {
                const attachmentElement = this.createAttachmentElement(attachment);
                attachmentsContainer.appendChild(attachmentElement);
            });
        }

        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    formatMessage(content) {
        // Convert markdown to HTML
        return marked.parse(content, { breaks: true });
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    }

    handleFileSelect(event) {
        this.selectedFiles = Array.from(event.target.files);
        this.updateUploadPreview();
    }

    updateUploadPreview() {
        this.uploadPreview.innerHTML = '';
        
        this.selectedFiles.forEach((file, index) => {
            const preview = document.createElement('div');
            preview.className = 'upload-preview-item';
            
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                preview.appendChild(img);
            } else {
                const icon = document.createElement('i');
                icon.className = this.getFileIcon(file.type);
                preview.appendChild(icon);
            }

            const info = document.createElement('div');
            info.className = 'upload-preview-info';
            info.innerHTML = `
                <span class="filename">${file.name}</span>
                <span class="filesize">${this.formatFileSize(file.size)}</span>
            `;
            preview.appendChild(info);

            const removeButton = document.createElement('button');
            removeButton.className = 'remove-file';
            removeButton.innerHTML = '<i class="fas fa-times"></i>';
            removeButton.onclick = () => this.removeFile(index);
            preview.appendChild(removeButton);

            this.uploadPreview.appendChild(preview);
        });

        this.uploadPreview.style.display = this.selectedFiles.length > 0 ? 'block' : 'none';
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateUploadPreview();
    }

    clearUploadPreview() {
        this.selectedFiles = [];
        this.uploadPreview.innerHTML = '';
        this.uploadPreview.style.display = 'none';
    }

    createAttachmentElement(attachment) {
        const element = document.createElement('div');
        element.className = 'message-attachment';

        if (attachment.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = attachment.url;
            img.alt = attachment.name;
            element.appendChild(img);
        } else {
            const link = document.createElement('a');
            link.href = attachment.url;
            link.target = '_blank';
            link.innerHTML = `
                <i class="${this.getFileIcon(attachment.type)}"></i>
                <span>${attachment.name}</span>
            `;
            element.appendChild(link);
        }

        return element;
    }

    getFileIcon(fileType) {
        if (fileType.startsWith('image/')) return 'fas fa-image';
        if (fileType.startsWith('video/')) return 'fas fa-video';
        if (fileType.startsWith('audio/')) return 'fas fa-music';
        if (fileType.includes('pdf')) return 'fas fa-file-pdf';
        if (fileType.includes('word') || fileType.includes('document')) return 'fas fa-file-word';
        return 'fas fa-file';
    }

    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    showTypingIndicator(user) {
        // TODO: Implement typing indicator
    }

    hideTypingIndicator(user) {
        // TODO: Implement typing indicator removal
    }

    showError(message) {
        // TODO: Implement error display
    }
}

// Initialize the ChatManager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatManager = new ChatManager();
});
