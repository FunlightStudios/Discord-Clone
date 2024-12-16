class EmojiPicker {
    constructor(triggerElement, targetElement) {
        this.trigger = triggerElement;
        this.target = targetElement;
        this.pickerVisible = false;
        this.categories = {
            'smileys': '😀 😃 😄 😁 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜',
            'gestures': '👋 🤚 🖐 ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊',
            'people': '👶 👧 🧒 👦 👩 🧑 👨 👩‍🦱 🧑‍🦱 👨‍🦱 👩‍🦰 🧑‍🦰 👨‍🦰 👱‍♀️ 👱 👱‍♂️ 👩‍🦳',
            'nature': '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦',
            'food': '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒',
            'activities': '⚽️ 🏀 🏈 ⚾️ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳️ 🪁 🏹',
            'travel': '🚗 🚕 🚙 🚌 🚎 🏎 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🦯 🦽 🦼 🛴 🚲 🛵 🏍 🛺 🚨',
            'objects': '⌚️ 📱 📲 💻 ⌨️ 🖥 🖨 🖱 🖲 🕹 🗜 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽 🎞 📞',
            'symbols': '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉',
            'flags': '🏳️ 🏴 🏴‍☠️ 🏁 🚩 🏳️‍🌈 🏳️‍⚧️ 🇺🇳 🇦🇫 🇦🇽 🇦🇱 🇩🇿 🇦🇸 🇦🇩 🇦🇴 🇦🇮 🇦🇶'
        };
        
        this.init();
    }
    
    init() {
        this.createPicker();
        this.addEventListeners();
    }
    
    createPicker() {
        this.picker = document.createElement('div');
        this.picker.className = 'emoji-picker';
        this.picker.style.display = 'none';
        
        // Erstelle Kategorie-Tabs
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'emoji-tabs';
        
        Object.keys(this.categories).forEach(category => {
            const tab = document.createElement('div');
            tab.className = 'emoji-tab';
            tab.dataset.category = category;
            tab.textContent = this.getCategoryIcon(category);
            tab.title = category.charAt(0).toUpperCase() + category.slice(1);
            tabsContainer.appendChild(tab);
        });
        
        // Erstelle Emoji-Container
        const emojiContainer = document.createElement('div');
        emojiContainer.className = 'emoji-container';
        
        Object.entries(this.categories).forEach(([category, emojis]) => {
            const section = document.createElement('div');
            section.className = 'emoji-section';
            section.dataset.category = category;
            
            const title = document.createElement('div');
            title.className = 'emoji-section-title';
            title.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            section.appendChild(title);
            
            const grid = document.createElement('div');
            grid.className = 'emoji-grid';
            
            emojis.split(' ').forEach(emoji => {
                const span = document.createElement('span');
                span.className = 'emoji';
                span.textContent = emoji;
                grid.appendChild(span);
            });
            
            section.appendChild(grid);
            emojiContainer.appendChild(section);
        });
        
        this.picker.appendChild(tabsContainer);
        this.picker.appendChild(emojiContainer);
        document.body.appendChild(this.picker);
    }
    
    getCategoryIcon(category) {
        const icons = {
            'smileys': '😀',
            'gestures': '👋',
            'people': '👤',
            'nature': '🌿',
            'food': '🍔',
            'activities': '⚽️',
            'travel': '✈️',
            'objects': '💡',
            'symbols': '❤️',
            'flags': '🏁'
        };
        return icons[category] || '😀';
    }
    
    addEventListeners() {
        // Toggle Picker
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePicker();
        });
        
        // Emoji Selection
        this.picker.addEventListener('click', (e) => {
            if (e.target.classList.contains('emoji')) {
                this.insertEmoji(e.target.textContent);
            }
        });
        
        // Tab Navigation
        this.picker.querySelector('.emoji-tabs').addEventListener('click', (e) => {
            if (e.target.classList.contains('emoji-tab')) {
                this.switchCategory(e.target.dataset.category);
            }
        });
        
        // Close picker when clicking outside
        document.addEventListener('click', (e) => {
            if (this.pickerVisible && !this.picker.contains(e.target) && e.target !== this.trigger) {
                this.hidePicker();
            }
        });
    }
    
    togglePicker() {
        if (this.pickerVisible) {
            this.hidePicker();
        } else {
            this.showPicker();
        }
    }
    
    showPicker() {
        const rect = this.trigger.getBoundingClientRect();
        this.picker.style.position = 'absolute';
        this.picker.style.bottom = `${window.innerHeight - rect.top + 10}px`;
        this.picker.style.left = `${rect.left}px`;
        this.picker.style.display = 'block';
        this.pickerVisible = true;
    }
    
    hidePicker() {
        this.picker.style.display = 'none';
        this.pickerVisible = false;
    }
    
    switchCategory(category) {
        const tabs = this.picker.querySelectorAll('.emoji-tab');
        const sections = this.picker.querySelectorAll('.emoji-section');
        
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        
        sections.forEach(section => {
            section.style.display = section.dataset.category === category ? 'block' : 'none';
        });
    }
    
    insertEmoji(emoji) {
        const start = this.target.selectionStart;
        const end = this.target.selectionEnd;
        const text = this.target.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);
        
        this.target.value = before + emoji + after;
        this.target.selectionStart = this.target.selectionEnd = start + emoji.length;
        this.target.focus();
    }
}
