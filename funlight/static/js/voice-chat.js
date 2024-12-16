class VoiceChat {
    constructor(webrtc) {
        this.webrtc = webrtc;
        this.currentRoom = null;
        this.isConnected = false;
        this.audioElements = new Map();
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        window.addEventListener('remote_stream', (event) => {
            const { stream, userId } = event.detail;
            this.addAudioStream(userId, stream);
        });
        
        window.addEventListener('call_ended', (event) => {
            const { userId } = event.detail;
            this.removeAudioStream(userId);
        });
    }
    
    async joinVoiceChannel(channelId) {
        if (this.currentRoom === channelId) return;
        
        if (this.currentRoom) {
            await this.leaveVoiceChannel();
        }
        
        try {
            await this.webrtc.startLocalStream(true);
            this.currentRoom = channelId;
            this.isConnected = true;
            
            // Notify server about joining voice channel
            this.webrtc.socket.emit('join_voice', {
                channelId: channelId
            });
            
            this.updateVoiceStatus();
        } catch (error) {
            console.error('Error joining voice channel:', error);
            throw error;
        }
    }
    
    async leaveVoiceChannel() {
        if (!this.currentRoom) return;
        
        this.webrtc.endAllCalls();
        this.currentRoom = null;
        this.isConnected = false;
        
        // Notify server about leaving voice channel
        this.webrtc.socket.emit('leave_voice', {
            channelId: this.currentRoom
        });
        
        this.clearAudioStreams();
        this.updateVoiceStatus();
    }
    
    addAudioStream(userId, stream) {
        if (this.audioElements.has(userId)) {
            this.removeAudioStream(userId);
        }
        
        const audioElement = new Audio();
        audioElement.srcObject = stream;
        audioElement.autoplay = true;
        
        this.audioElements.set(userId, audioElement);
        this.updateVoiceStatus();
    }
    
    removeAudioStream(userId) {
        const audioElement = this.audioElements.get(userId);
        if (audioElement) {
            audioElement.srcObject = null;
            this.audioElements.delete(userId);
        }
        this.updateVoiceStatus();
    }
    
    clearAudioStreams() {
        this.audioElements.forEach((audio, userId) => {
            this.removeAudioStream(userId);
        });
    }
    
    updateVoiceStatus() {
        const voiceStatus = {
            connected: this.isConnected,
            channelId: this.currentRoom,
            participants: Array.from(this.audioElements.keys())
        };
        
        const event = new CustomEvent('voice_status_changed', {
            detail: voiceStatus
        });
        window.dispatchEvent(event);
    }
    
    toggleMute() {
        if (this.webrtc.localStream) {
            const audioTrack = this.webrtc.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                return audioTrack.enabled;
            }
        }
        return false;
    }
    
    setVolume(userId, volume) {
        const audioElement = this.audioElements.get(userId);
        if (audioElement) {
            audioElement.volume = Math.max(0, Math.min(1, volume));
        }
    }
}
