class VideoChat {
    constructor(webrtc) {
        this.webrtc = webrtc;
        this.currentRoom = null;
        this.isConnected = false;
        this.videoElements = new Map();
        this.localVideoElement = null;
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        window.addEventListener('remote_stream', (event) => {
            const { stream, userId } = event.detail;
            this.addVideoStream(userId, stream);
        });
        
        window.addEventListener('call_ended', (event) => {
            const { userId } = event.detail;
            this.removeVideoStream(userId);
        });
    }
    
    async startVideo(containerId) {
        try {
            const stream = await this.webrtc.startLocalStream(false);
            this.showLocalVideo(stream, containerId);
            return true;
        } catch (error) {
            console.error('Error starting video:', error);
            return false;
        }
    }
    
    showLocalVideo(stream, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (this.localVideoElement) {
            this.localVideoElement.srcObject = null;
            this.localVideoElement.remove();
        }
        
        const videoElement = document.createElement('video');
        videoElement.srcObject = stream;
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.classList.add('local-video');
        
        container.appendChild(videoElement);
        this.localVideoElement = videoElement;
    }
    
    addVideoStream(userId, stream) {
        const container = document.getElementById('remote-videos');
        if (!container) return;
        
        if (this.videoElements.has(userId)) {
            this.removeVideoStream(userId);
        }
        
        const videoWrapper = document.createElement('div');
        videoWrapper.classList.add('video-wrapper');
        
        const videoElement = document.createElement('video');
        videoElement.srcObject = stream;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        
        const userLabel = document.createElement('div');
        userLabel.classList.add('user-label');
        userLabel.textContent = `User ${userId}`;
        
        videoWrapper.appendChild(videoElement);
        videoWrapper.appendChild(userLabel);
        container.appendChild(videoWrapper);
        
        this.videoElements.set(userId, videoWrapper);
        this.updateVideoLayout();
    }
    
    removeVideoStream(userId) {
        const videoWrapper = this.videoElements.get(userId);
        if (videoWrapper) {
            const videoElement = videoWrapper.querySelector('video');
            if (videoElement) {
                videoElement.srcObject = null;
            }
            videoWrapper.remove();
            this.videoElements.delete(userId);
            this.updateVideoLayout();
        }
    }
    
    updateVideoLayout() {
        const container = document.getElementById('remote-videos');
        if (!container) return;
        
        const count = this.videoElements.size;
        const columns = Math.ceil(Math.sqrt(count));
        const width = `${100 / columns}%`;
        
        this.videoElements.forEach((wrapper) => {
            wrapper.style.width = width;
        });
    }
    
    async joinVideoRoom(roomId) {
        if (this.currentRoom === roomId) return;
        
        if (this.currentRoom) {
            await this.leaveVideoRoom();
        }
        
        try {
            await this.startVideo('local-video-container');
            this.currentRoom = roomId;
            this.isConnected = true;
            
            this.webrtc.socket.emit('join_video', {
                roomId: roomId
            });
        } catch (error) {
            console.error('Error joining video room:', error);
            throw error;
        }
    }
    
    async leaveVideoRoom() {
        if (!this.currentRoom) return;
        
        this.webrtc.endAllCalls();
        this.currentRoom = null;
        this.isConnected = false;
        
        this.webrtc.socket.emit('leave_video', {
            roomId: this.currentRoom
        });
        
        this.clearVideoStreams();
        
        if (this.localVideoElement) {
            this.localVideoElement.srcObject = null;
            this.localVideoElement.remove();
            this.localVideoElement = null;
        }
    }
    
    clearVideoStreams() {
        this.videoElements.forEach((wrapper, userId) => {
            this.removeVideoStream(userId);
        });
    }
    
    toggleVideo() {
        if (this.webrtc.localStream) {
            const videoTrack = this.webrtc.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                return videoTrack.enabled;
            }
        }
        return false;
    }
    
    toggleAudio() {
        if (this.webrtc.localStream) {
            const audioTrack = this.webrtc.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                return audioTrack.enabled;
            }
        }
        return false;
    }
}
