class WebRTCHandler {
    constructor(socket) {
        this.socket = socket;
        this.localStream = null;
        this.peerConnections = {};
        this.mediaConstraints = {
            audio: true,
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        this.initializeSocketListeners();
    }
    
    initializeSocketListeners() {
        this.socket.on('call_user', async (data) => {
            const { from, offer } = data;
            await this.handleIncomingCall(from, offer);
        });
        
        this.socket.on('call_accepted', async (data) => {
            const { answer, from } = data;
            const pc = this.peerConnections[from];
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });
        
        this.socket.on('ice_candidate', async (data) => {
            const { candidate, from } = data;
            const pc = this.peerConnections[from];
            if (pc) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });
        
        this.socket.on('call_ended', (data) => {
            const { from } = data;
            this.handleCallEnded(from);
        });
    }
    
    async startLocalStream(audioOnly = false) {
        try {
            const constraints = audioOnly ? 
                { audio: true, video: false } : 
                this.mediaConstraints;
            
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            return this.localStream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            throw error;
        }
    }
    
    async callUser(userId, audioOnly = false) {
        try {
            if (!this.localStream) {
                await this.startLocalStream(audioOnly);
            }
            
            const pc = new RTCPeerConnection(this.configuration);
            this.peerConnections[userId] = pc;
            
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
            
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    this.socket.emit('ice_candidate', {
                        candidate: event.candidate,
                        to: userId
                    });
                }
            };
            
            pc.ontrack = (event) => {
                this.handleRemoteStream(event.streams[0], userId);
            };
            
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            this.socket.emit('call_user', {
                offer: offer,
                to: userId
            });
        } catch (error) {
            console.error('Error calling user:', error);
            throw error;
        }
    }
    
    async handleIncomingCall(from, offer) {
        try {
            if (!this.localStream) {
                await this.startLocalStream();
            }
            
            const pc = new RTCPeerConnection(this.configuration);
            this.peerConnections[from] = pc;
            
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
            
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    this.socket.emit('ice_candidate', {
                        candidate: event.candidate,
                        to: from
                    });
                }
            };
            
            pc.ontrack = (event) => {
                this.handleRemoteStream(event.streams[0], from);
            };
            
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            this.socket.emit('call_accepted', {
                answer: answer,
                to: from
            });
        } catch (error) {
            console.error('Error handling incoming call:', error);
            throw error;
        }
    }
    
    handleRemoteStream(stream, userId) {
        const event = new CustomEvent('remote_stream', {
            detail: { stream, userId }
        });
        window.dispatchEvent(event);
    }
    
    handleCallEnded(userId) {
        if (this.peerConnections[userId]) {
            this.peerConnections[userId].close();
            delete this.peerConnections[userId];
        }
        
        const event = new CustomEvent('call_ended', {
            detail: { userId }
        });
        window.dispatchEvent(event);
    }
    
    endCall(userId) {
        if (this.peerConnections[userId]) {
            this.peerConnections[userId].close();
            delete this.peerConnections[userId];
            
            this.socket.emit('end_call', {
                to: userId
            });
        }
    }
    
    endAllCalls() {
        Object.keys(this.peerConnections).forEach(userId => {
            this.endCall(userId);
        });
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
    }
}
