document.addEventListener('DOMContentLoaded', function() {
    const createChannelForm = document.getElementById('createChannelForm');
    const createChannelButton = document.getElementById('createChannelButton');

    if (createChannelButton) {
        createChannelButton.addEventListener('click', function() {
            const formData = new FormData(createChannelForm);
            const serverId = window.location.pathname.split('/')[2]; // Get server ID from URL
            
            fetch(`/api/servers/${serverId}/channels`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(Object.fromEntries(formData))
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Close modal and refresh page silently
                const modal = bootstrap.Modal.getInstance(document.getElementById('createChannelModal'));
                modal.hide();
                window.location.reload();
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Failed to create channel. Please try again.');
            });
        });
    }

    // Channel name validation
    const channelNameInput = document.getElementById('channelName');
    if (channelNameInput) {
        channelNameInput.addEventListener('input', function(e) {
            // Convert to lowercase and replace spaces with hyphens
            let value = e.target.value.toLowerCase().replace(/\s+/g, '-');
            // Remove any characters that aren't lowercase letters, numbers, or hyphens
            value = value.replace(/[^a-z0-9-]/g, '');
            e.target.value = value;
        });
    }
});
