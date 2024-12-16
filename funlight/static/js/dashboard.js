document.addEventListener('DOMContentLoaded', function() {
    // Socket connection
    const socket = io();
    
    // Server navigation
    const serverIcons = document.querySelectorAll('.server-icon:not(.add-server)');
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

    // Add server button
    const addServerBtn = document.querySelector('.server-icon.add-server');
    if (addServerBtn) {
        addServerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = document.getElementById('createServerModal');
            if (modal) {
                modal.classList.remove('hidden');
                // Reset form visibility
                const templateList = modal.querySelector('.template-list');
                const createServerForm = modal.querySelector('#createServerForm');
                if (templateList && createServerForm) {
                    templateList.classList.remove('hidden');
                    createServerForm.classList.add('hidden');
                }
            }
        });
    }

    // Template selection
    const templateItems = document.querySelectorAll('.template-item');
    templateItems.forEach(item => {
        item.addEventListener('click', function() {
            const template = this.dataset.template;
            const modal = this.closest('.modal');
            const templateList = modal.querySelector('.template-list');
            const createServerForm = modal.querySelector('#createServerForm');
            const joinServerSection = modal.querySelector('.join-server-section');
            
            // Hide template list and join server section
            templateList.classList.add('hidden');
            joinServerSection.classList.add('hidden');
            
            // Show create server form
            createServerForm.classList.remove('hidden');
            
            // Set template as hidden input
            let templateInput = createServerForm.querySelector('input[name="template"]');
            if (!templateInput) {
                templateInput = document.createElement('input');
                templateInput.type = 'hidden';
                templateInput.name = 'template';
                createServerForm.appendChild(templateInput);
            }
            templateInput.value = template;
        });
    });

    // Back button in create server form
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            const templateList = modal.querySelector('.template-list');
            const createServerForm = modal.querySelector('#createServerForm');
            const joinServerSection = modal.querySelector('.join-server-section');
            
            // Show template list and join server section
            templateList.classList.remove('hidden');
            joinServerSection.classList.remove('hidden');
            
            // Hide create server form
            createServerForm.classList.add('hidden');
        });
    }

    // Close modals when clicking the close button or outside the modal
    document.querySelectorAll('.modal .close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.add('hidden');
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
            }
        });
    });

    // Handle server creation form
    const createServerForm = document.getElementById('createServerForm');
    if (createServerForm) {
        createServerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            
            // Add template if not already in form
            if (!formData.has('template')) {
                const templateInput = document.querySelector('input[name="template"]');
                if (templateInput) {
                    formData.append('template', templateInput.value);
                }
            }

            fetch('/api/servers', {
                method: 'POST',
                body: formData  // FormData will automatically set the correct Content-Type
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = `/server/${data.server_id}`;
                } else {
                    console.error('Server creation failed:', data.error);
                    alert('Fehler beim Erstellen des Servers: ' + (data.error || 'Unbekannter Fehler'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Fehler beim Erstellen des Servers');
            });
        });
    }

    // Friends navigation
    const friendsNavItems = document.querySelectorAll('.friends-nav .nav-item');
    friendsNavItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all nav items
            friendsNavItems.forEach(navItem => navItem.classList.remove('active'));
            // Add active class to clicked item
            this.classList.add('active');
        });
    });

    // Add friend button
    const addFriendBtn = document.querySelector('.add-friend-btn');
    if (addFriendBtn) {
        addFriendBtn.addEventListener('click', function() {
            const modal = document.getElementById('addFriendModal');
            if (modal) modal.classList.remove('hidden');
        });
    }

    // Friend search
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const friendItems = document.querySelectorAll('.friend-item');
            friendItems.forEach(item => {
                const friendName = item.querySelector('.friend-name').textContent.toLowerCase();
                if (friendName.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

    // Friend actions
    const messageButtons = document.querySelectorAll('.friend-actions .message');
    messageButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const friendItem = this.closest('.friend-item');
            const friendId = friendItem.dataset.friendId;
            // Start DM with friend
            startDirectMessage(friendId);
        });
    });

    const moreButtons = document.querySelectorAll('.friend-actions .more');
    moreButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            // Show friend options menu
            const menu = this.querySelector('.friend-options-menu');
            if (menu) menu.classList.toggle('hidden');
        });
    });

    // Direct Messages
    function startDirectMessage(friendId) {
        // Create or open DM channel
        fetch(`/api/dm/${friendId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.channel_id) {
                // Add DM to list if not exists
                addDmToList(data);
                // Open DM chat
                openDirectMessage(data.channel_id);
            }
        });
    }

    function addDmToList(dmData) {
        const dmList = document.getElementById('dm-list');
        if (!document.querySelector(`[data-dm-id="${dmData.channel_id}"]`)) {
            const dmItem = document.createElement('div');
            dmItem.className = 'dm-item';
            dmItem.dataset.dmId = dmData.channel_id;
            dmItem.innerHTML = `
                <img src="${dmData.friend.avatar}" alt="${dmData.friend.username}" class="dm-avatar">
                <div class="dm-info">
                    <div class="dm-name">${dmData.friend.username}</div>
                    <div class="dm-status">${dmData.friend.status}</div>
                </div>
            `;
            dmList.appendChild(dmItem);
            
            // Add click event
            dmItem.addEventListener('click', function() {
                openDirectMessage(dmData.channel_id);
            });
        }
    }

    function openDirectMessage(channelId) {
        // Update UI to show DM chat
        // This will be implemented when we add DM functionality
    }

    // Server Settings Modal Functionality
    const serverSettingsModal = document.getElementById('serverSettingsModal');
    const deleteServerConfirmModal = document.getElementById('deleteServerConfirmModal');
    const saveServerSettingsBtn = document.getElementById('saveServerSettingsBtn');
    const deleteServerBtn = document.getElementById('deleteServerBtn');
    const confirmDeleteServerBtn = document.getElementById('confirmDeleteServerBtn');

    if (serverSettingsModal) {
        // Save server settings
        saveServerSettingsBtn.addEventListener('click', async function() {
            const form = document.getElementById('serverSettingsForm');
            const formData = new FormData(form);
            
            try {
                const response = await fetch(`/api/servers/${currentServerId}`, {
                    method: 'PUT',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    // Refresh the page to show updated settings
                    window.location.reload();
                } else {
                    const error = await response.json();
                    alert('Failed to update server settings: ' + error.message);
                }
            } catch (error) {
                console.error('Error updating server settings:', error);
                alert('Failed to update server settings');
            }
        });

        // Delete server
        if (deleteServerBtn) {
            deleteServerBtn.addEventListener('click', function() {
                const bsServerSettings = bootstrap.Modal.getInstance(serverSettingsModal);
                bsServerSettings.hide();
                const bsDeleteConfirm = new bootstrap.Modal(deleteServerConfirmModal);
                bsDeleteConfirm.show();
            });
        }

        // Confirm server deletion
        if (confirmDeleteServerBtn) {
            confirmDeleteServerBtn.addEventListener('click', async function() {
                try {
                    const response = await fetch(`/api/servers/${currentServerId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        window.location.href = '/dashboard';
                    } else {
                        const error = await response.json();
                        alert('Failed to delete server: ' + error.message);
                    }
                } catch (error) {
                    console.error('Error deleting server:', error);
                    alert('Failed to delete server');
                }
            });
        }
    }

    // Initialize
    // Add any initialization code here
});
