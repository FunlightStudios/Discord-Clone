class ServerManager {
    constructor() {
        // Initialize single socket connection
        this.socket = null;
        this.initializeSocket();
        this.currentServerId = this.getCurrentServerId();
        
        // Initialize server creation functionality on all pages
        this.initializeServerCreation();
        
        // Initialize the appropriate functionality based on the current page
        if (window.location.pathname.startsWith('/server/')) {
            this.initializeServerPage();
        }
    }

    initializeSocket() {
        if (!this.socket) {
            this.socket = io({
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5
            });

            this.socket.on('connect', () => {
                console.log('Connected to server');
                this.initializeSocketEvents();
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from server');
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
            });
        }
        return this.socket;
    }

    initializeSocketEvents() {
        if (!this.socket) return;

        this.socket.on('user_status_changed', (data) => {
            const userEl = document.querySelector(`[data-user-id="${data.user_id}"]`);
            if (userEl) {
                const statusIndicator = userEl.querySelector('.status-indicator');
                if (statusIndicator) {
                    statusIndicator.className = `status-indicator ${data.status}`;
                }
            }
        });

        this.socket.on('message', (data) => {
            if (data.channel_id === this.getCurrentChannelId()) {
                this.appendMessage(data);
            }
        });

        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.showNotification('Verbindungsfehler zum Server', 'error');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        this.socket.on('server_created', (data) => {
            this.addServerToList(data);
            const modal = document.getElementById('create-server-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        });

        this.socket.on('channel_created', (data) => {
            this.addChannelToList(data);
            const modal = document.getElementById('create-channel-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showNotification('Serverfehler: ' + error, 'error');
        });
    }

    getCurrentServerId() {
        const path = window.location.pathname;
        if (path.startsWith('/server/')) {
            return path.split('/')[2];
        }
        return null;
    }

    initializeServerCreation() {
        const addServerButton = document.querySelector('.server-icon.add-server');
        if (addServerButton) {
            // Remove any existing click event listeners
            addServerButton.replaceWith(addServerButton.cloneNode(true));
            const newAddServerButton = document.querySelector('.server-icon.add-server');
            
            newAddServerButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const modal = new bootstrap.Modal(document.getElementById('createServerModal'));
                modal.show();
            });
        }

        const createServerForm = document.getElementById('createServerForm');
        if (createServerForm) {
            createServerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(createServerForm);
                try {
                    const response = await fetch('/api/servers', {
                        method: 'POST',
                        body: formData
                    });
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Server creation failed');
                    }
                    const server = await response.json();
                    window.location.href = `/server/${server.id}`;
                } catch (error) {
                    console.error('Server creation failed:', error.message);
                }
            });
        }
    }

    initializeServerPage() {
        // Initialize server icons for navigation
        document.querySelectorAll('.server-icon:not(.add-server)').forEach(icon => {
            if (!icon.classList.contains('home')) {
                icon.addEventListener('click', (e) => {
                    e.preventDefault();
                    const serverId = icon.getAttribute('data-server-id');
                    if (serverId && serverId !== 'home') {
                        window.location.href = `/server/${serverId}`;
                    } else if (serverId === 'home') {
                        window.location.href = '/dashboard';
                    }
                });
            }
        });

        // Initialize other server page functionality
        this.initializeChannels();
        this.initializeChat();
        this.initializeMembers();
    }

    initializeChannels() {
        // Server Settings Modal Functionality
        const serverSettingsModal = document.getElementById('serverSettingsModal');
        const deleteServerConfirmModal = document.getElementById('deleteServerConfirmModal');
        const createChannelModal = document.getElementById('createChannelModal');
        const serverSettingsBtn = document.querySelector('[data-bs-target="#serverSettingsModal"]');
        const createChannelBtn = document.querySelector('[data-bs-target="#createChannelModal"]');
        const deleteServerBtn = document.getElementById('deleteServerBtn');
        const confirmDeleteServerBtn = document.getElementById('confirmDeleteServerBtn');
        const closeButtons = document.querySelectorAll('[data-bs-dismiss="modal"]');

        // Initially hide all modals
        if (serverSettingsModal) {
            serverSettingsModal.style.display = 'none';
        }
        if (deleteServerConfirmModal) {
            deleteServerConfirmModal.style.display = 'none';
        }
        if (createChannelModal) {
            createChannelModal.style.display = 'none';
        }

        // Server Settings Button
        if (serverSettingsBtn) {
            serverSettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (serverSettingsModal) {
                    serverSettingsModal.style.display = 'block';
                    serverSettingsModal.classList.add('show');
                }
            });
        }

        // Create Channel Button
        if (createChannelBtn) {
            createChannelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (createChannelModal) {
                    createChannelModal.style.display = 'block';
                    createChannelModal.classList.add('show');
                }
            });
        }

        // Delete Server Button
        if (deleteServerBtn) {
            deleteServerBtn.addEventListener('click', () => {
                if (serverSettingsModal) {
                    serverSettingsModal.style.display = 'none';
                    serverSettingsModal.classList.remove('show');
                }
                if (deleteServerConfirmModal) {
                    deleteServerConfirmModal.style.display = 'block';
                    deleteServerConfirmModal.classList.add('show');
                }
            });
        }

        // Close buttons
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                    modal.classList.remove('show');
                }
            });
        });

        // Click outside to close
        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
                event.target.classList.remove('show');
            }
        });

        // Create Channel Form Submit
        const createChannelForm = document.getElementById('createChannelForm');
        if (createChannelForm) {
            createChannelForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(createChannelForm);
                
                try {
                    const response = await fetch(`/api/servers/${this.currentServerId}/channels`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(Object.fromEntries(formData))
                    });

                    if (response.ok) {
                        window.location.reload();
                    } else {
                        const error = await response.json();
                        console.error('Channel creation failed:', error);
                        alert('Fehler beim Erstellen des Kanals: ' + error.message);
                    }
                } catch (error) {
                    console.error('Error creating channel:', error);
                    alert('Fehler beim Erstellen des Kanals');
                }
            });
        }

        // Confirm Delete Button
        if (confirmDeleteServerBtn) {
            confirmDeleteServerBtn.addEventListener('click', async () => {
                try {
                    const response = await fetch(`/api/servers/${this.currentServerId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        window.location.href = '/dashboard';
                    } else {
                        const error = await response.json();
                        console.error('Server deletion failed:', error);
                        alert('Fehler beim Löschen des Servers: ' + error.message);
                    }
                } catch (error) {
                    console.error('Error deleting server:', error);
                    alert('Fehler beim Löschen des Servers');
                }
            });
        }

        // Save Server Settings
        const saveServerSettingsBtn = document.getElementById('saveServerSettingsBtn');
        if (saveServerSettingsBtn) {
            saveServerSettingsBtn.addEventListener('click', async () => {
                const form = document.getElementById('serverSettingsForm');
                const formData = new FormData(form);
                
                try {
                    const response = await fetch(`/api/servers/${this.currentServerId}`, {
                        method: 'PUT',
                        body: formData
                    });

                    if (response.ok) {
                        window.location.reload();
                    } else {
                        const error = await response.json();
                        console.error('Server settings update failed:', error);
                        alert('Fehler beim Aktualisieren der Servereinstellungen: ' + error.message);
                    }
                } catch (error) {
                    console.error('Error updating server settings:', error);
                    alert('Fehler beim Aktualisieren der Servereinstellungen');
                }
            });
        }

        // Server Icon Preview
        const serverIconInput = document.getElementById('serverIcon');
        if (serverIconInput) {
            serverIconInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const preview = document.querySelector('.server-icon-preview');
                        if (preview) {
                            preview.src = e.target.result;
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Initialize server icons
        document.querySelectorAll('.server-icon').forEach(icon => {
            if (!icon.classList.contains('add-server') && !icon.classList.contains('home')) {
                icon.addEventListener('click', (e) => {
                    e.preventDefault();
                    const serverId = icon.getAttribute('data-server-id');
                    if (serverId && serverId !== 'home') {
                        window.location.href = `/server/${serverId}`;
                    } else if (serverId === 'home') {
                        window.location.href = '/dashboard';
                    }
                });
            }
        });

        // Initialize add server button
        const addServerButton = document.querySelector('.add-server');
        if (addServerButton) {
            addServerButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const modal = new bootstrap.Modal(document.getElementById('createServerModal'));
                modal.show();
            });
        }
    }

    initializeChat() {
        // Create Channel Form Submit
        const createChannelForm = document.getElementById('createChannelForm');
        if (createChannelForm) {
            createChannelForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(createChannelForm);
                
                try {
                    const response = await fetch(`/api/servers/${this.currentServerId}/channels`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(Object.fromEntries(formData))
                    });

                    if (response.ok) {
                        window.location.reload();
                    } else {
                        const error = await response.json();
                        console.error('Channel creation failed:', error);
                        alert('Fehler beim Erstellen des Kanals: ' + error.message);
                    }
                } catch (error) {
                    console.error('Error creating channel:', error);
                    alert('Fehler beim Erstellen des Kanals');
                }
            });
        }

        // Confirm Delete Button
        const confirmDeleteServerBtn = document.getElementById('confirmDeleteServerBtn');
        if (confirmDeleteServerBtn) {
            confirmDeleteServerBtn.addEventListener('click', async () => {
                try {
                    const response = await fetch(`/api/servers/${this.currentServerId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        window.location.href = '/dashboard';
                    } else {
                        const error = await response.json();
                        console.error('Server deletion failed:', error);
                        alert('Fehler beim Löschen des Servers: ' + error.message);
                    }
                } catch (error) {
                    console.error('Error deleting server:', error);
                    alert('Fehler beim Löschen des Servers');
                }
            });
        }

        // Save Server Settings
        const saveServerSettingsBtn = document.getElementById('saveServerSettingsBtn');
        if (saveServerSettingsBtn) {
            saveServerSettingsBtn.addEventListener('click', async () => {
                const form = document.getElementById('serverSettingsForm');
                const formData = new FormData(form);
                
                try {
                    const response = await fetch(`/api/servers/${this.currentServerId}`, {
                        method: 'PUT',
                        body: formData
                    });

                    if (response.ok) {
                        window.location.reload();
                    } else {
                        const error = await response.json();
                        console.error('Server settings update failed:', error);
                        alert('Fehler beim Aktualisieren der Servereinstellungen: ' + error.message);
                    }
                } catch (error) {
                    console.error('Error updating server settings:', error);
                    alert('Fehler beim Aktualisieren der Servereinstellungen');
                }
            });
        }

        // Server Icon Preview
        const serverIconInput = document.getElementById('serverIcon');
        if (serverIconInput) {
            serverIconInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const preview = document.querySelector('.server-icon-preview');
                        if (preview) {
                            preview.src = e.target.result;
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Initialize server icons
        document.querySelectorAll('.server-icon').forEach(icon => {
            if (!icon.classList.contains('add-server') && !icon.classList.contains('home')) {
                icon.addEventListener('click', (e) => {
                    e.preventDefault();
                    const serverId = icon.getAttribute('data-server-id');
                    if (serverId && serverId !== 'home') {
                        window.location.href = `/server/${serverId}`;
                    } else if (serverId === 'home') {
                        window.location.href = '/dashboard';
                    }
                });
            }
        });

        // Initialize add server button
        const addServerButton = document.querySelector('.add-server');
        if (addServerButton) {
            addServerButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const modal = new bootstrap.Modal(document.getElementById('createServerModal'));
                modal.show();
            });
        }
    }

    initializeMembers() {
        // Create Channel Form Submit
        const createChannelForm = document.getElementById('createChannelForm');
        if (createChannelForm) {
            createChannelForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(createChannelForm);
                
                try {
                    const response = await fetch(`/api/servers/${this.currentServerId}/channels`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(Object.fromEntries(formData))
                    });

                    if (response.ok) {
                        window.location.reload();
                    } else {
                        const error = await response.json();
                        console.error('Channel creation failed:', error);
                        alert('Fehler beim Erstellen des Kanals: ' + error.message);
                    }
                } catch (error) {
                    console.error('Error creating channel:', error);
                    alert('Fehler beim Erstellen des Kanals');
                }
            });
        }

        // Confirm Delete Button
        const confirmDeleteServerBtn = document.getElementById('confirmDeleteServerBtn');
        if (confirmDeleteServerBtn) {
            confirmDeleteServerBtn.addEventListener('click', async () => {
                try {
                    const response = await fetch(`/api/servers/${this.currentServerId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        window.location.href = '/dashboard';
                    } else {
                        const error = await response.json();
                        console.error('Server deletion failed:', error);
                        alert('Fehler beim Löschen des Servers: ' + error.message);
                    }
                } catch (error) {
                    console.error('Error deleting server:', error);
                    alert('Fehler beim Löschen des Servers');
                }
            });
        }

        // Save Server Settings
        const saveServerSettingsBtn = document.getElementById('saveServerSettingsBtn');
        if (saveServerSettingsBtn) {
            saveServerSettingsBtn.addEventListener('click', async () => {
                const form = document.getElementById('serverSettingsForm');
                const formData = new FormData(form);
                
                try {
                    const response = await fetch(`/api/servers/${this.currentServerId}`, {
                        method: 'PUT',
                        body: formData
                    });

                    if (response.ok) {
                        window.location.reload();
                    } else {
                        const error = await response.json();
                        console.error('Server settings update failed:', error);
                        alert('Fehler beim Aktualisieren der Servereinstellungen: ' + error.message);
                    }
                } catch (error) {
                    console.error('Error updating server settings:', error);
                    alert('Fehler beim Aktualisieren der Servereinstellungen');
                }
            });
        }

        // Server Icon Preview
        const serverIconInput = document.getElementById('serverIcon');
        if (serverIconInput) {
            serverIconInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const preview = document.querySelector('.server-icon-preview');
                        if (preview) {
                            preview.src = e.target.result;
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Initialize server icons
        document.querySelectorAll('.server-icon').forEach(icon => {
            if (!icon.classList.contains('add-server') && !icon.classList.contains('home')) {
                icon.addEventListener('click', (e) => {
                    e.preventDefault();
                    const serverId = icon.getAttribute('data-server-id');
                    if (serverId && serverId !== 'home') {
                        window.location.href = `/server/${serverId}`;
                    } else if (serverId === 'home') {
                        window.location.href = '/dashboard';
                    }
                });
            }
        });

        // Initialize add server button
        const addServerButton = document.querySelector('.add-server');
        if (addServerButton) {
            addServerButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const modal = new bootstrap.Modal(document.getElementById('createServerModal'));
                modal.show();
            });
        }
    }

    initializeEventListeners() {
        // Add server button
        const addServerBtn = document.querySelector('.add-server');
        if (addServerBtn) {
            addServerBtn.addEventListener('click', () => {
                const modal = document.getElementById('create-server-modal');
                if (modal) {
                    modal.classList.remove('hidden');
                }
            });
        }

        // Create server form
        const createServerForm = document.getElementById('create-server-form');
        if (createServerForm) {
            createServerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createServer();
            });
        }

        // Close modal buttons
        document.querySelectorAll('[data-close-modal]').forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal');
                if (modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        // Server selection
        document.querySelectorAll('.server-icon').forEach(server => {
            if (!server.classList.contains('add-server') && !server.classList.contains('settings')) {
                server.addEventListener('click', () => {
                    const serverId = server.dataset.serverId;
                    if (serverId) {
                        this.selectServer(serverId);
                    }
                });
            }
        });

        // Add channel buttons
        document.querySelectorAll('.add-channel').forEach(button => {
            button.addEventListener('click', () => {
                if (this.currentServerId) {
                    const modal = document.getElementById('create-channel-modal');
                    if (modal) {
                        document.getElementById('channel-type').value = button.dataset.type;
                        modal.classList.remove('hidden');
                    }
                } else {
                    this.showNotification('Bitte wähle zuerst einen Server aus', 'error');
                }
            });
        });

        // Create channel form
        const createChannelForm = document.getElementById('create-channel-form');
        if (createChannelForm) {
            createChannelForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createChannel();
            });
        }

        // Server icon preview
        const serverIconInput = document.getElementById('server-icon');
        if (serverIconInput) {
            serverIconInput.addEventListener('change', (e) => this.handleServerIconPreview(e));
        }

        // Server Settings Modal Functionality
        const serverSettingsModal = document.getElementById('serverSettingsModal');
        const deleteServerConfirmModal = document.getElementById('deleteServerConfirmModal');
        const saveServerSettingsBtn = document.getElementById('saveServerSettingsBtn');
        const deleteServerBtn = document.getElementById('deleteServerBtn');
        const confirmDeleteServerBtn = document.getElementById('confirmDeleteServerBtn');

        if (serverSettingsModal) {
            // Save server settings
            if (saveServerSettingsBtn) {
                saveServerSettingsBtn.addEventListener('click', async () => {
                    const form = document.getElementById('serverSettingsForm');
                    const formData = new FormData(form);
                    
                    try {
                        const response = await fetch(`/api/servers/${this.currentServerId}`, {
                            method: 'PUT',
                            body: formData
                        });

                        if (response.ok) {
                            window.location.reload();
                        } else {
                            const error = await response.json();
                            console.error('Server settings update failed:', error);
                            alert('Fehler beim Aktualisieren der Servereinstellungen: ' + error.message);
                        }
                    } catch (error) {
                        console.error('Error updating server settings:', error);
                        alert('Fehler beim Aktualisieren der Servereinstellungen');
                    }
                });
            }

            // Delete server
            if (deleteServerBtn) {
                deleteServerBtn.addEventListener('click', () => {
                    serverSettingsModal.style.display = 'none';
                    setTimeout(() => {
                        deleteServerConfirmModal.style.display = 'block';
                        deleteServerConfirmModal.classList.add('show');
                    }, 500);
                });
            }

            // Close modals when clicking outside
            window.addEventListener('click', (event) => {
                if (event.target === serverSettingsModal) {
                    serverSettingsModal.style.display = 'none';
                }
                if (event.target === deleteServerConfirmModal) {
                    deleteServerConfirmModal.style.display = 'none';
                }
            });

            // Close buttons in modals
            document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(button => {
                button.addEventListener('click', () => {
                    const modal = button.closest('.modal');
                    if (modal) {
                        modal.style.display = 'none';
                    }
                });
            });

            // Confirm server deletion
            if (confirmDeleteServerBtn) {
                confirmDeleteServerBtn.addEventListener('click', async () => {
                    try {
                        const response = await fetch(`/api/servers/${this.currentServerId}`, {
                            method: 'DELETE'
                        });

                        if (response.ok) {
                            window.location.href = '/dashboard';
                        } else {
                            const error = await response.json();
                            console.error('Server deletion failed:', error);
                            alert('Fehler beim Löschen des Servers: ' + error.message);
                        }
                    } catch (error) {
                        console.error('Error deleting server:', error);
                        alert('Fehler beim Löschen des Servers');
                    }
                });
            }

            // Handle server icon preview
            const serverIconInput = document.getElementById('serverIcon');
            if (serverIconInput) {
                serverIconInput.addEventListener('change', (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            const preview = document.querySelector('.server-icon-preview');
                            if (preview) {
                                preview.src = e.target.result;
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }
        }
    }

    showServerDetailsForm(type) {
        // Create the server details form HTML
        const formHTML = `
            <div class="modal-header">
                <h2>${type === 'custom' ? 'Deinen Server erstellen' : 'Server aus Vorlage erstellen'}</h2>
                <button class="back-button">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <button class="close-modal">&times;</button>
            </div>
            <form id="server-details-form">
                <div class="form-group">
                    <label for="server-name">SERVER NAME</label>
                    <input type="text" id="server-name" 
                           value="${this.getDefaultServerName(type)}" required>
                </div>
                
                <div class="server-guidelines">
                    <p>Indem du einen Server erstellst, stimmst du den Community-Richtlinien zu.</p>
                </div>

                <div class="form-actions">
                    <button type="button" class="back-btn">Zurück</button>
                    <button type="submit" class="create-btn">Erstellen</button>
                </div>
            </form>
        `;

        // Update modal content
        const modalContent = document.querySelector('#create-server-modal .modal-content');
        modalContent.innerHTML = formHTML;

        // Add event listeners
        modalContent.querySelector('.back-button').addEventListener('click', () => {
            this.resetServerCreationModal();
        });

        modalContent.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('create-server-modal').classList.add('hidden');
        });

        modalContent.querySelector('#server-details-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createServer(type);
        });
    }

    getDefaultServerName(type) {
        const username = document.querySelector('.user-name').textContent;
        switch (type) {
            case 'gaming':
                return `${username}'s Gaming Server`;
            case 'school':
                return `${username}'s Schulklub`;
            case 'study':
                return `${username}'s Lerngruppe`;
            default:
                return `${username}'s Server`;
        }
    }

    resetServerCreationModal() {
        const modal = document.getElementById('create-server-modal');
        location.reload(); // Temporary solution to reset the modal content
    }

    async createServer(type) {
        const serverName = document.getElementById('server-name').value;
        
        try {
            const response = await fetch('/api/servers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: serverName,
                    type: type
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Add the new server to the list
                this.addServerToList(data);
                // Close the modal
                document.getElementById('create-server-modal').classList.add('hidden');
                // Select the new server
                this.selectServer(data.id);
            } else {
                const error = await response.json();
                this.showNotification(error.message || 'Failed to create server', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Error creating server', 'error');
        }
    }

    async createServer() {
        const nameInput = document.getElementById('server-name');
        const descInput = document.getElementById('server-description');
        const iconInput = document.getElementById('server-icon');

        if (!nameInput || !nameInput.value.trim()) {
            this.showNotification('Bitte gib einen Servernamen ein', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('name', nameInput.value.trim());
        if (descInput && descInput.value.trim()) {
            formData.append('description', descInput.value.trim());
        }
        if (iconInput && iconInput.files[0]) {
            formData.append('icon', iconInput.files[0]);
        }

        try {
            const response = await fetch('/api/servers', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (response.ok) {
                this.showNotification('Server wurde erfolgreich erstellt', 'success');
                this.addServerToList(data);
                
                // Reset form
                const form = document.getElementById('create-server-form');
                if (form) {
                    form.reset();
                }
                
                // Clear icon preview
                const preview = document.getElementById('server-icon-preview');
                if (preview) {
                    preview.innerHTML = '';
                }
                
                // Close modal
                const modal = document.getElementById('create-server-modal');
                if (modal) {
                    modal.classList.add('hidden');
                }
                
                // Select the newly created server
                if (data.id) {
                    this.selectServer(data.id);
                }
            } else {
                this.showNotification(data.error || 'Fehler beim Erstellen des Servers', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Fehler beim Erstellen des Servers', 'error');
        }
    }

    async selectServer(serverId) {
        // Only proceed if we're on the dashboard page
        if (!window.location.pathname.startsWith('/server/')) {
            const serverElements = document.querySelectorAll('.server-item');
            serverElements.forEach(element => {
                element.classList.remove('selected');
                if (element.dataset.serverId === serverId) {
                    element.classList.add('selected');
                }
            });

            const serverContentElement = document.getElementById('server-content');
            if (serverContentElement) {
                this.showHomeView(serverId);
            }
        }
    }

    showHomeView(serverId) {
        // Only proceed if we're on the dashboard page
        if (!window.location.pathname.startsWith('/server/')) {
            const serverContentElement = document.getElementById('server-content');
            if (serverContentElement) {
                serverContentElement.style.display = 'block';
                
                // Update content based on selected server
                const selectedServer = this.servers.find(s => s.id === serverId);
                if (selectedServer) {
                    const serverNameElement = document.getElementById('selected-server-name');
                    const serverDescriptionElement = document.getElementById('selected-server-description');
                    
                    if (serverNameElement) {
                        serverNameElement.textContent = selectedServer.name;
                    }
                    if (serverDescriptionElement) {
                        serverDescriptionElement.textContent = selectedServer.description || 'Keine Beschreibung verfügbar';
                    }
                }
            }
        }
    }

    addServerToList(server) {
        const serverList = document.querySelector('.server-list');
        const addServerBtn = document.querySelector('.add-server');
        
        if (!serverList || !addServerBtn) return;
        
        const serverIcon = document.createElement('div');
        serverIcon.className = 'server-icon';
        serverIcon.dataset.serverId = server.id;
        serverIcon.title = server.name;
        
        if (server.icon) {
            const img = document.createElement('img');
            img.src = `/static/uploads/${server.icon}`;
            img.alt = server.name;
            serverIcon.appendChild(img);
        } else {
            const text = document.createElement('div');
            text.className = 'server-icon-text';
            text.textContent = server.name.slice(0, 2).toUpperCase();
            serverIcon.appendChild(text);
        }
        
        // Add click event listener
        serverIcon.addEventListener('click', () => {
            this.selectServer(server.id);
        });
        
        // Insert before the add server button
        serverList.insertBefore(serverIcon, addServerBtn);
    }

    addChannelToList(channel) {
        if (!channel || !channel.id) return;

        const container = document.getElementById(
            channel.type === 'text' ? 'text-channels' : 'voice-channels'
        );
        if (!container) return;

        // Check if channel already exists
        const existingChannel = container.querySelector(`[data-channel-id="${channel.id}"]`);
        if (existingChannel) return;

        const channelElement = document.createElement('div');
        channelElement.className = 'channel-item';
        channelElement.dataset.channelId = channel.id;

        const icon = document.createElement('i');
        icon.className = channel.type === 'text' ? 'fas fa-hashtag' : 'fas fa-volume-up';
        channelElement.appendChild(icon);

        const name = document.createElement('span');
        name.textContent = channel.name;
        channelElement.appendChild(name);

        if (channel.type === 'voice') {
            const voiceUsers = document.createElement('div');
            voiceUsers.className = 'voice-users';
            channelElement.appendChild(voiceUsers);
        }

        channelElement.addEventListener('click', () => this.selectChannel(channel.id));
        container.appendChild(channelElement);
    }

    async createChannel() {
        if (!this.currentServerId) {
            this.showNotification('Bitte wähle zuerst einen Server aus', 'error');
            return;
        }

        const nameInput = document.getElementById('channel-name');
        const typeInput = document.getElementById('channel-type');

        if (!nameInput || !nameInput.value.trim()) {
            this.showNotification('Bitte gib einen Channelnamen ein', 'error');
            return;
        }

        const data = {
            name: nameInput.value.trim(),
            type: typeInput ? typeInput.value : 'text',
            server_id: this.currentServerId
        };

        try {
            const response = await fetch('/api/channels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const responseData = await response.json();
            if (response.ok) {
                this.addChannelToList(responseData);
                
                // Reset form and close modal silently
                const form = document.getElementById('create-channel-form');
                if (form) {
                    form.reset();
                }
                
                const modal = document.getElementById('create-channel-modal');
                if (modal) {
                    modal.classList.add('hidden');
                }
            } else {
                this.showNotification(responseData.error || 'Fehler beim Erstellen des Channels', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Fehler beim Erstellen des Channels', 'error');
        }
    }

    handleServerIconPreview(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('server-icon-preview');
        if (!preview) return;

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.style.backgroundImage = `url(${e.target.result})`;
                preview.classList.add('has-image');
            };
            reader.readAsDataURL(file);
        } else {
            preview.style.backgroundImage = '';
            preview.classList.remove('has-image');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    updateFriendsList(view = 'online') {
        fetch('/api/friends')
        .then(response => response.json())
        .then(data => {
            const friendsList = document.querySelector('.friends-list');
            const onlineCount = document.querySelector('.online-count');
            if (!friendsList || !onlineCount) return;

            let filteredFriends = data.friends;
            let countLabel = '';

            // Filter friends based on view
            switch(view) {
                case 'online':
                    filteredFriends = data.friends.filter(friend => friend.is_online);
                    countLabel = `ONLINE — ${filteredFriends.length}`;
                    break;
                case 'all':
                    countLabel = `ALLE FREUNDE — ${filteredFriends.length}`;
                    break;
                case 'pending':
                    filteredFriends = data.pending || [];
                    countLabel = `AUSSTEHEND — ${filteredFriends.length}`;
                    break;
                case 'blocked':
                    filteredFriends = data.blocked || [];
                    countLabel = `BLOCKIERT — ${filteredFriends.length}`;
                    break;
            }
            
            onlineCount.textContent = countLabel;

            friendsList.innerHTML = '';
            if (filteredFriends.length === 0) {
                friendsList.style.display = 'none';
                document.querySelector('.empty-state').style.display = 'flex';
                return;
            }

            friendsList.style.display = 'block';
            document.querySelector('.empty-state').style.display = 'none';
            filteredFriends.forEach(friend => {
                const friendElement = document.createElement('div');
                friendElement.className = 'friend-item';
                friendElement.innerHTML = `
                    <img src="${friend.avatar}" alt="${friend.username}" class="friend-avatar">
                    <div class="friend-info">
                        <span class="friend-name">${friend.username}</span>
                        <span class="friend-status">${friend.is_online ? 'Online' : ''}</span>
                    </div>
                    <div class="friend-actions">
                        <button class="message-btn" title="Nachricht">
                            <i class="fas fa-comment"></i>
                        </button>
                        <button class="more-btn" title="Mehr">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                `;
                friendsList.appendChild(friendElement);
            });
        })
        .catch(error => {
            console.error('Error fetching friends:', error);
        });
    }

    initializeFriendsView() {
        // Navigation tabs
        const navItems = document.querySelectorAll('.header-nav .nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                // Update active state
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Update friends list based on selected view
                const view = item.getAttribute('data-view');
                this.updateFriendsList(view);
            });
        });

        // Add friend button
        const addFriendBtn = document.querySelector('.add-friend-btn');
        if (addFriendBtn) {
            addFriendBtn.addEventListener('click', () => {
                // Show add friend modal
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-header">
                        <h3>Freund hinzufügen</h3>
                        <button class="close-btn"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <p>Du kannst Freunde hinzufügen, indem du ihren Discord-Tag eingibst.</p>
                        <form class="add-friend-form">
                            <input type="text" placeholder="Gib einen Benutzernamen ein" required>
                            <button type="submit" class="submit-btn">Freundschaftsanfrage senden</button>
                        </form>
                    </div>
                `;
                document.body.appendChild(modal);

                // Close button functionality
                const closeBtn = modal.querySelector('.close-btn');
                closeBtn.addEventListener('click', () => {
                    modal.remove();
                });

                // Form submission
                const form = modal.querySelector('form');
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const username = form.querySelector('input').value;
                    
                    fetch('/api/friends/add', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ username })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            this.showNotification('Freundschaftsanfrage gesendet!', 'success');
                            this.updateFriendsList('pending');
                            modal.remove();
                        } else {
                            this.showNotification(data.error || 'Fehler beim Senden der Anfrage', 'error');
                        }
                    })
                    .catch(error => {
                        this.showNotification('Fehler beim Senden der Anfrage', 'error');
                    });
                });
            });
        }
    }

    sendMessage() {
        const messageInput = document.querySelector('.message-input');
        const currentChannelId = this.getCurrentChannelId();
        
        if (!messageInput || !currentChannelId) return;
        
        const content = messageInput.value.trim();
        if (!content) return;
        
        this.socket.emit('message', {
            channel_id: currentChannelId,
            content: content
        });
        
        messageInput.value = '';
    }

    getCurrentChannelId() {
        const activeChannel = document.querySelector('.channel-item.active');
        return activeChannel ? activeChannel.dataset.channelId : null;
    }
}

// Server View Functionality
function initializeServerView() {
    const serverIcons = document.querySelectorAll('.server-icon');
    const serverView = document.getElementById('server-view');
    const homeView = document.getElementById('home-view');
    const friendsView = document.getElementById('friends-view');

    // Handle server icon clicks
    serverIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            // Update active states
            document.querySelector('.server-icon.active')?.classList.remove('active');
            icon.classList.add('active');

            // Show server view and hide others
            serverView.classList.add('active');
            homeView.classList.remove('active');
            friendsView.style.display = 'none';

            // Load server channels (you can implement this based on your backend)
            // loadServerChannels(icon.dataset.serverId);
        });
    });

    // Category collapse/expand
    const categories = document.querySelectorAll('.category-header');
    if (categories) {
        categories.forEach(category => {
            category.addEventListener('click', function(e) {
                const categoryEl = this.closest('.category');
                if (categoryEl) {
                    categoryEl.classList.toggle('collapsed');
                    const icon = this.querySelector('.category-arrow');
                    if (icon) {
                        icon.classList.toggle('fa-chevron-down');
                        icon.classList.toggle('fa-chevron-right');
                    }
                }
            });
        });
    }

    // Handle channel clicks
    const channels = document.querySelectorAll('.channel-item');
    if (channels) {
        channels.forEach(channel => {
            channel.addEventListener('click', (e) => {
                // Don't trigger if clicking on controls or badge
                if (e.target.closest('.channel-controls') || e.target.closest('.channel-badge')) {
                    return;
                }
                
                // Remove active class from all channels
                document.querySelectorAll('.channel-item').forEach(ch => ch.classList.remove('active'));
                
                // Add active class to clicked channel
                channel.classList.add('active');
                
                // Get channel ID from data attribute
                const channelId = channel.dataset.channelId;
                if (channelId) {
                    loadChannelContent(channelId);
                }
            });
        });
    }

    // Handle voice channel time updates
    function updateVoiceTime() {
        const voiceChannels = document.querySelectorAll('.voice-channel');
        voiceChannels.forEach(channel => {
            const timeSpan = channel.querySelector('.voice-time');
            if (timeSpan) {
                // Here you would typically get the actual time from your backend
                // For now, we'll just increment the minutes
                const [mins, secs] = timeSpan.textContent.split(':').map(Number);
                let newMins = mins;
                let newSecs = secs + 1;
                if (newSecs >= 60) {
                    newSecs = 0;
                    newMins++;
                }
                timeSpan.textContent = `${String(newMins).padStart(2, '0')}:${String(newSecs).padStart(2, '0')}`;
            }
        });
    }

    // Update voice channel times every second
    setInterval(updateVoiceTime, 1000);
}

// User Controls Functionality
function initializeUserControls() {
    const micButton = document.querySelector('.action-button[title="Mikrofon"]');
    const headphoneButton = document.querySelector('.action-button[title="Kopfhörer"]');
    const settingsButton = document.querySelector('.action-button[title="Einstellungen"]');

    // Handle microphone toggle
    micButton?.addEventListener('click', () => {
        micButton.classList.toggle('muted');
        const icon = micButton.querySelector('i');
        if (micButton.classList.contains('muted')) {
            icon.classList.remove('fa-microphone');
            icon.classList.add('fa-microphone-slash');
        } else {
            icon.classList.remove('fa-microphone-slash');
            icon.classList.add('fa-microphone');
        }
    });

    // Handle headphone toggle
    headphoneButton?.addEventListener('click', () => {
        headphoneButton.classList.toggle('muted');
        const icon = headphoneButton.querySelector('i');
        if (headphoneButton.classList.contains('muted')) {
            icon.classList.remove('fa-headphones');
            icon.classList.add('fa-headphones-slash');
        } else {
            icon.classList.remove('fa-headphones-slash');
            icon.classList.add('fa-headphones');
        }
    });

    // Handle settings click
    settingsButton?.addEventListener('click', () => {
        // Implement settings modal
        console.log('Settings clicked');
    });

    // Handle user info click
    const userInfo = document.querySelector('.user-info');
    userInfo?.addEventListener('click', () => {
        // Implement user profile modal
        console.log('User info clicked');
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const serverManager = new ServerManager();
    
    // Initialize home server click handler
    const homeServer = document.querySelector('[data-server-id="home"]');
    if (homeServer) {
        homeServer.addEventListener('click', () => serverManager.selectServer('home'));
        
        // Show home view by default if no server is selected
        const urlParams = new URLSearchParams(window.location.search);
        const serverId = urlParams.get('server');
        if (!serverId) {
            serverManager.selectServer('home');
        }
    }
    
    // Initialize friends view
    serverManager.initializeFriendsView();
    
    // Update friends list periodically
    serverManager.updateFriendsList('online');
    setInterval(() => serverManager.updateFriendsList('online'), 30000); // Update every 30 seconds
    
    // Initialize server view
    initializeServerView();
    
    // Initialize user controls
    initializeUserControls();
});

// Server creation modal functionality
document.addEventListener('DOMContentLoaded', function() {
    const createServerModal = document.getElementById('createServerModal');
    const serverTemplateButtons = document.querySelectorAll('[data-server-template]');
    const createServerButton = document.querySelector('.add-server');  
    const closeModalButton = document.querySelector('.close-modal-btn');
    let currentTemplate = 'custom';

    // Open modal
    createServerButton?.addEventListener('click', () => {
        createServerModal.classList.remove('hidden');
    });

    // Close modal
    closeModalButton?.addEventListener('click', () => {
        createServerModal.classList.add('hidden');
        // Reset modal content when closing
        const modalContent = document.querySelector('.modal-content');
        const initialContent = document.getElementById('initialModalContent');
        if (initialContent) {
            modalContent.innerHTML = initialContent.innerHTML;
            // Reattach event listeners
            attachTemplateListeners();
        }
    });

    // Function to attach template listeners
    function attachTemplateListeners() {
        const buttons = document.querySelectorAll('[data-server-template]');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                currentTemplate = button.dataset.serverTemplate;
                showServerNameInput(currentTemplate);
            });
        });
    }

    // Initial attachment of listeners
    attachTemplateListeners();

    // Show server name input based on template
    function showServerNameInput(template) {
        const modalContent = document.querySelector('.modal-content');
        let suggestion = '';
        
        switch(template) {
            case 'gaming':
                suggestion = 'Gaming Squad';
                break;
            case 'school':
                suggestion = 'Schulklasse 10A';
                break;
            case 'study':
                suggestion = 'Studiengruppe';
                break;
            default:
                suggestion = 'Mein Server';
        }

        modalContent.innerHTML = `
            <div class="modal-header">
                <h2>Server erstellen</h2>
                <button class="close-modal-btn">&times;</button>
            </div>
            <div class="server-name-input">
                <p>Gib deinem Server einen Namen und ein Icon</p>
                <input type="text" id="serverName" placeholder="${suggestion}" value="${suggestion}">
                <div class="button-group">
                    <button class="back-btn">Zurück</button>
                    <button class="create-btn">Server erstellen</button>
                </div>
            </div>
        `;

        // Add event listeners for the new buttons
        const createBtn = modalContent.querySelector('.create-btn');
        const backBtn = modalContent.querySelector('.back-btn');
        const serverNameInput = modalContent.querySelector('#serverName');
        const newCloseBtn = modalContent.querySelector('.close-modal-btn');

        createBtn.addEventListener('click', () => {
            const serverName = serverNameInput.value.trim();
            if (serverName) {
                createServer(serverName, template);
            }
        });

        backBtn.addEventListener('click', () => {
            modalContent.innerHTML = document.getElementById('initialModalContent').innerHTML;
            attachTemplateListeners();
        });

        newCloseBtn.addEventListener('click', () => {
            createServerModal.classList.add('hidden');
            setTimeout(() => {
                modalContent.innerHTML = document.getElementById('initialModalContent').innerHTML;
                attachTemplateListeners();
            }, 300);
        });
    }

    // Create server function
    async function createServer(name, type) {
        try {
            const response = await fetch('/api/servers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    type: type
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create server');
            }

            const server = await response.json();
            
            // Close the modal
            createServerModal.classList.add('hidden');
            
            // Refresh the page to show the new server
            window.location.reload();
        } catch (error) {
            console.error('Error creating server:', error);
            alert('Failed to create server. Please try again.');
        }
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Socket connection
    const socket = io();
    
    // Server navigation
    const serverIcons = document.querySelectorAll('.server-icon');
    serverIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const serverId = this.dataset.serverId;
            if (serverId === 'home') {
                window.location.href = '/dashboard';
            } else {
                window.location.href = `/server/${serverId}`;
            }
        });
    });

    // Channel navigation
    const channels = document.querySelectorAll('.channel');
    channels.forEach(channel => {
        channel.addEventListener('click', function() {
            const channelId = this.dataset.channelId;
            // Remove active class from all channels
            channels.forEach(ch => ch.classList.remove('active'));
            // Add active class to clicked channel
            this.classList.add('active');
            // Update URL without page reload
            history.pushState({}, '', `?channel=${channelId}`);
            loadChannelContent(channelId);
        });
    });

    // Category collapse/expand
    const categories = document.querySelectorAll('.category-header');
    if (categories) {
        categories.forEach(category => {
            category.addEventListener('click', function(e) {
                const categoryEl = this.closest('.category');
                if (categoryEl) {
                    categoryEl.classList.toggle('collapsed');
                    const icon = this.querySelector('.category-arrow');
                    if (icon) {
                        icon.classList.toggle('fa-chevron-down');
                        icon.classList.toggle('fa-chevron-right');
                    }
                }
            });
        });
    }

    // Server settings
    const settingsBtn = document.querySelector('.server-settings');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            const modal = document.getElementById('serverSettingsModal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.style.display = 'block';
            }
        });
    }

    // Channel creation
    const addChannelBtns = document.querySelectorAll('.add-channel');
    addChannelBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const channelType = this.dataset.type;
            // Show channel creation modal
            const modal = document.getElementById('createChannelModal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.querySelector('#channelType').value = channelType;
            }
        });
    });

    // Message handling
    const messageInput = document.querySelector('.message-input');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const message = this.textContent.trim();
                if (message) {
                    const channelId = getCurrentChannelId();
                    socket.emit('message', {
                        channel_id: channelId,
                        content: message
                    });
                    this.textContent = '';
                }
            }
        });
    }

    // Socket events
    socket.on('message', function(data) {
        appendMessage(data);
    });

    socket.on('user_joined', function(data) {
        // Handle user joining channel
    });

    socket.on('user_left', function(data) {
        // Handle user leaving channel
    });

    // Helper functions
    function getCurrentChannelId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('channel');
    }

    function loadChannelContent(channelId) {
        // Load channel messages and update UI
        fetch(`/api/channels/${channelId}/messages`)
            .then(response => response.json())
            .then(data => {
                const messagesContainer = document.getElementById('messages');
                messagesContainer.innerHTML = '';
                data.messages.forEach(message => appendMessage(message));
            });
    }

    function appendMessage(message) {
        const messagesContainer = document.getElementById('messages');
        const messageEl = document.createElement('div');
        messageEl.className = 'message';
        messageEl.innerHTML = `
            <img src="${message.author.avatar}" alt="${message.author.username}" class="message-avatar">
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${message.author.username}</span>
                    <span class="message-timestamp">${new Date(message.timestamp).toLocaleString()}</span>
                </div>
                <div class="message-text">${marked.parse(message.content)}</div>
            </div>
        `;
        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Initialize
    const currentChannelId = getCurrentChannelId();
    if (currentChannelId) {
        loadChannelContent(currentChannelId);
        const currentChannel = document.querySelector(`[data-channel-id="${currentChannelId}"]`);
        if (currentChannel) currentChannel.classList.add('active');
    }
});
