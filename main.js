// 私密留言板主要功能
class LoveMessageBoard {
    constructor() {
        this.messages = [];
        this.currentUser = 'me';
        this.password = '0412'; // 固定密码
        this.isCloudEnabled = false; // 云存储功能状态
        this.isCloudSynced = false; // 云同步状态
        this.syncing = false; // 正在同步中
        
        this.init();
    }

    init() {
        // 检查认证状态
        this.checkAuthentication();
        
        // 初始化DOM元素
        this.initElements();
        
        // 加载消息数据
        this.loadMessages();
        
        // 绑定事件
        this.bindEvents();
        
        // 初始化界面
        this.updateUI();
        
        // 页面加载动画
        this.initAnimations();
        
        // 初始化云存储
        this.initCloudStorage();
        
        // 确保验证状态正确设置
        localStorage.setItem('loveBoardAuthenticated', 'true');
    }

    checkAuthentication() {
        const isAuthenticated = localStorage.getItem('loveBoardAuthenticated');
        if (isAuthenticated !== 'true') {
            window.location.href = 'index.html';
        }
    }

    initElements() {
        // 消息相关
        this.messageContainer = document.getElementById('messageContainer');
        this.messagesList = document.getElementById('messagesList');
        this.emptyState = document.getElementById('emptyState');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.charCount = document.getElementById('charCount');
        
        // 按钮
        this.exportBtn = document.getElementById('exportBtn');
        this.importBtn = document.getElementById('importBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        
        // 导入文件输入
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.json';
        this.fileInput.style.display = 'none';
        document.body.appendChild(this.fileInput);
        
        // 确认对话框
        this.confirmModal = document.getElementById('confirmModal');
        this.confirmIcon = document.getElementById('confirmIcon');
        this.confirmTitle = document.getElementById('confirmTitle');
        this.confirmMessage = document.getElementById('confirmMessage');
        this.confirmCancel = document.getElementById('confirmCancel');
        this.confirmOk = document.getElementById('confirmOk');
        
        // 同步状态指示器
        this.syncStatus = document.createElement('div');
        this.syncStatus.className = 'fixed bottom-4 right-4 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800 text-white/90 z-50';
        this.syncStatus.textContent = '💾 本地模式';
        document.body.appendChild(this.syncStatus);
    }

    bindEvents() {
        // 发送消息
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('input', () => this.updateCharCount());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // 发送者选择
        document.querySelectorAll('input[name="sender"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentUser = e.target.value;
            });
        });

        // 功能按钮
        this.exportBtn.addEventListener('click', () => this.exportMessages());
        this.importBtn.addEventListener('click', () => this.importMessages());
        this.fileInput.addEventListener('change', (e) => this.handleFileImport(e));
        this.clearBtn.addEventListener('click', () => this.showClearConfirm());
        this.logoutBtn.addEventListener('click', () => this.logout());
        
        // 同步按钮（如果存在）
        if (document.getElementById('syncBtn')) {
            document.getElementById('syncBtn').addEventListener('click', () => this.triggerSync());
        }

        // 确认对话框
        this.confirmCancel.addEventListener('click', () => this.hideConfirmModal());
        this.confirmOk.addEventListener('click', () => this.executeConfirmAction());

        // 点击空白处关闭对话框
        this.confirmModal.addEventListener('click', (e) => {
            if (e.target === this.confirmModal) {
                this.hideConfirmModal();
            }
        });

        // 自动滚动到底部
        this.messageContainer.addEventListener('DOMNodeInserted', () => {
            this.scrollToBottom();
        });
    }

    // 初始化云存储
    async initCloudStorage() {
        try {
            if (window.cloudStorage && this.password) {
                // 使用默认配置初始化Firebase
                const config = {
                    // 用户提供的Firebase配置
                    apiKey: "AIzaSyBlPW6eRI2jPyyfZSI8oqMzAR4tlp2G3Ls",
                    authDomain: "test-0412yu.firebaseapp.com",
                    projectId: "test-0412yu",
                    storageBucket: "test-0412yu.firebasestorage.app",
                    messagingSenderId: "729918223391",
                    appId: "1:729918223391:web:7756279ff8b7dab739112a",
                    measurementId: "G-BXHES5D57D"
                };
                
                // 初始化云存储
                const initialized = await window.cloudStorage.initialize(config);
                if (initialized) {
                    // 使用固定密码0412登录云存储
                    const loggedIn = await window.cloudStorage.login('0412');
                    if (loggedIn) {
                        this.isCloudEnabled = true;
                        this.updateSyncStatus();
                        
                        // 尝试从云端加载消息
                        await this.loadCloudMessages();
                        
                        // 开始自动同步
                        this.startCloudSync();
                    }
                }
            }
        } catch (error) {
            console.error('云存储初始化失败:', error);
            this.isCloudEnabled = false;
            this.updateSyncStatus();
        }
    }

    // 从云端加载消息
    async loadCloudMessages() {
        if (!this.isCloudEnabled || !window.cloudStorage.isAuthenticated()) {
            return;
        }

        try {
            const cloudMessages = await window.cloudStorage.getMessages();
            if (cloudMessages.length > 0) {
                // 合并本地和云端消息
                this.messages = [...this.messages, ...cloudMessages];
                // 去重并按时间排序
                this.messages = [...new Map(this.messages.map(m => [m.id, m])).values()]
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                
                // 保存到本地并更新UI
                this.saveToLocalStorage();
                this.renderMessages();
                
                this.isCloudSynced = true;
                this.updateSyncStatus();
            }
        } catch (error) {
            console.error('加载云端消息失败:', error);
        }
    }

    // 保存消息到云端
    async saveToCloud() {
        if (!this.isCloudEnabled || !window.cloudStorage.isAuthenticated() || this.syncing) {
            return false;
        }

        try {
            this.syncing = true;
            this.updateSyncStatus();
            
            // 保存所有消息到云端
            for (const message of this.messages) {
                await window.cloudStorage.saveMessage(message);
            }
            
            this.isCloudSynced = true;
            this.updateSyncStatus();
            return true;
        } catch (error) {
            console.error('保存到云端失败:', error);
            this.isCloudSynced = false;
            this.updateSyncStatus();
            return false;
        } finally {
            this.syncing = false;
            this.updateSyncStatus();
        }
    }

    // 从本地存储加载消息
    loadMessages() {
        const savedMessages = localStorage.getItem('loveBoardMessages');
        if (savedMessages) {
            try {
                this.messages = JSON.parse(savedMessages);
            } catch (e) {
                console.error('Failed to load messages:', e);
                this.messages = [];
            }
        }
    }

    // 保存消息到本地存储
    saveToLocalStorage() {
        localStorage.setItem('loveBoardMessages', JSON.stringify(this.messages));
    }

    // 主保存方法（同时保存到本地和云端）
    async saveMessages() {
        // 先保存到本地
        this.saveToLocalStorage();
        
        // 然后尝试保存到云端
        if (this.isCloudEnabled) {
            await this.saveToCloud();
        }
    }

    // 更新同步状态显示
    updateSyncStatus() {
        if (!this.isCloudEnabled) {
            this.syncStatus.textContent = '💾 本地模式';
            this.syncStatus.className = 'fixed bottom-4 right-4 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800 text-white/90 z-50';
        } else if (this.syncing) {
            this.syncStatus.textContent = '🔄 正在同步...';
            this.syncStatus.className = 'fixed bottom-4 right-4 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-600 text-white z-50';
        } else if (this.isCloudSynced) {
            this.syncStatus.textContent = '☁️ 云端同步成功';
            this.syncStatus.className = 'fixed bottom-4 right-4 px-3 py-1.5 rounded-full text-xs font-medium bg-green-600 text-white z-50';
        } else {
            this.syncStatus.textContent = '⚠️ 未同步到云端';
            this.syncStatus.className = 'fixed bottom-4 right-4 px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-600 text-white z-50';
        }
    }

    // 开始云同步
    startCloudSync() {
        if (this.isCloudEnabled && window.cloudStorage) {
            window.cloudStorage.startSync(this.messages, (cloudMessages) => {
                // 当有新的云端消息时
                if (cloudMessages.length > 0) {
                    // 合并新消息
                    this.messages = [...this.messages, ...cloudMessages];
                    // 去重并排序
                    this.messages = [...new Map(this.messages.map(m => [m.id, m])).values()]
                        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    
                    // 保存并更新UI
                    this.saveToLocalStorage();
                    this.renderMessages();
                    
                    this.isCloudSynced = true;
                    this.updateSyncStatus();
                    
                    // 显示新消息通知
                    this.showNotification('收到新的云端消息！✨', 'success');
                }
            });
        }
    }

    // 手动触发同步
    async triggerSync() {
        if (!this.isCloudEnabled) {
            this.showNotification('云存储未启用 🌤️', 'info');
            return;
        }
        
        this.syncing = true;
        this.updateSyncStatus();
        
        // 双向同步：先从云端拉取，再推送到云端
        await this.loadCloudMessages();
        await this.saveToCloud();
        
        this.syncing = false;
        this.updateSyncStatus();
        
        this.showNotification('手动同步完成！🔄', 'success');
    }

    updateUI() {
        this.renderMessages();
        this.updateCharCount();
        this.toggleSendButton();
    }

    renderMessages() {
        if (this.messages.length === 0) {
            this.emptyState.classList.remove('hidden');
            this.messagesList.innerHTML = '';
            return;
        }

        this.emptyState.classList.add('hidden');
        
        const messagesHTML = this.messages.map((message, index) => {
            const isMyMessage = message.sender === 'me';
            const messageClass = isMyMessage ? 'my-message' : 'her-message';
            const senderName = isMyMessage ? '我' : '她';
            const senderEmoji = isMyMessage ? '💙' : '💜';
            
            return `
                <div class="message-bubble ${messageClass} p-4 mb-4 shadow-lg" data-index="${index}">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-2">
                            <span class="text-sm font-medium">${senderName} ${senderEmoji}</span>
                            <span class="text-xs opacity-75">${this.formatTime(message.timestamp)}</span>
                        </div>
                        <button class="delete-btn text-white/70 hover:text-white transition-colors" onclick="loveBoard.deleteMessage(${index})">
                            🗑️
                        </button>
                    </div>
                    <div class="text-sm leading-relaxed whitespace-pre-wrap">${this.escapeHtml(message.content)}</div>
                </div>
            `;
        }).join('');

        this.messagesList.innerHTML = messagesHTML;
        this.scrollToBottom();
    }

    sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content) return;

        const message = {
            id: Date.now(),
            sender: this.currentUser,
            content: content,
            timestamp: new Date().toISOString()
        };

        this.messages.push(message);
        this.saveMessages();
        this.renderMessages();
        
        // 清空输入框
        this.messageInput.value = '';
        this.updateCharCount();
        this.toggleSendButton();

        // 发送动画
        this.animateNewMessage();
    }

    deleteMessage(index) {
        if (index >= 0 && index < this.messages.length) {
            this.messages.splice(index, 1);
            this.saveMessages();
            this.renderMessages();
            
            // 删除动画
            anime({
                targets: '.message-bubble',
                scale: [1, 0.8],
                opacity: [1, 0],
                duration: 300,
                easing: 'easeInQuart',
                delay: anime.stagger(50)
            });
        }
    }

    updateCharCount() {
        const count = this.messageInput.value.length;
        this.charCount.textContent = count;
        
        if (count > 450) {
            this.charCount.style.color = '#EF4444';
        } else if (count > 400) {
            this.charCount.style.color = '#F59E0B';
        } else {
            this.charCount.style.color = '#9CA3AF';
        }
        
        this.toggleSendButton();
    }

    toggleSendButton() {
        const hasContent = this.messageInput.value.trim().length > 0;
        const isValidLength = this.messageInput.value.length <= 500;
        this.sendBtn.disabled = !(hasContent && isValidLength);
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // 1分钟内
            return '刚刚';
        } else if (diff < 3600000) { // 1小时内
            return `${Math.floor(diff / 60000)}分钟前`;
        } else if (diff < 86400000) { // 1天内
            return `${Math.floor(diff / 3600000)}小时前`;
        } else if (diff < 2592000000) { // 30天内
            return `${Math.floor(diff / 86400000)}天前`;
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    scrollToBottom() {
        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
    }

    animateNewMessage() {
        const messages = document.querySelectorAll('.message-bubble');
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage) {
            anime({
                targets: lastMessage,
                scale: [0.8, 1],
                opacity: [0, 1],
                translateY: [20, 0],
                duration: 500,
                easing: 'easeOutQuart'
            });
        }
    }

    exportMessages() {
        if (this.messages.length === 0) {
            this.showNotification('还没有留言可以导出哦 💭', 'info');
            return;
        }

        const exportData = {
            exportDate: new Date().toISOString(),
            messageCount: this.messages.length,
            messages: this.messages
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `我们的留言_${new Date().toLocaleDateString('zh-CN')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('留言导出成功！📥', 'success');
    }
    
    importMessages() {
        this.fileInput.click();
    }
    
    handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.json')) {
            this.showNotification('请选择有效的JSON文件 😊', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                // 验证文件格式
                if (!data.messages || !Array.isArray(data.messages)) {
                    throw new Error('文件格式不正确');
                }
                
                // 显示确认对话框
                this.showConfirmModal(
                    '📤',
                    '导入留言',
                    `确定要导入 ${data.messages.length} 条留言吗？导入后会将新留言添加到现有留言中。`,
                    () => {
                        this.messages = [...this.messages, ...data.messages];
                        // 去重并按时间排序
                        this.messages = [...new Map(this.messages.map(m => [m.id, m])).values()]
                            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                        
                        this.saveMessages();
                        this.renderMessages();
                        this.showNotification(`成功导入 ${data.messages.length} 条留言！🎉`, 'success');
                    }
                );
            } catch (error) {
                console.error('导入失败:', error);
                this.showNotification('文件格式不正确，请检查文件内容 🥺', 'error');
            }
        };
        reader.onerror = () => {
            this.showNotification('文件读取失败 🥺', 'error');
        };
        reader.readAsText(file);
        
        // 重置文件输入，以便可以再次选择同一文件
        this.fileInput.value = '';
    }

    showClearConfirm() {
        if (this.messages.length === 0) {
            this.showNotification('留言板已经是空的了 🌸', 'info');
            return;
        }

        this.showConfirmModal(
            '🗑️',
            '清空留言板',
            `确定要删除所有 ${this.messages.length} 条留言吗？这个操作无法撤销。`,
            () => this.clearAllMessages()
        );
    }

    async clearAllMessages() {
        this.messages = [];
        
        // 保存到本地
        this.saveToLocalStorage();
        
        // 清空云端
        if (this.isCloudEnabled && window.cloudStorage.isAuthenticated()) {
            await window.cloudStorage.clearAllMessages();
        }
        
        this.renderMessages();
        this.isCloudSynced = this.isCloudEnabled;
        this.updateSyncStatus();
        this.showNotification('留言板已清空 🌸', 'success');
    }

    logout() {
        this.showConfirmModal(
            '🔒',
            '确认退出',
            '确定要离开我们的私密空间吗？下次需要重新输入密码。',
            async () => {
                // 停止云同步
                if (this.isCloudEnabled && window.cloudStorage) {
                    window.cloudStorage.stopSync();
                    window.cloudStorage.logout();
                }
                
                localStorage.removeItem('loveBoardAuthenticated');
                window.location.href = 'index.html';
            }
        );
    }

    showConfirmModal(icon, title, message, action) {
        this.confirmIcon.textContent = icon;
        this.confirmTitle.textContent = title;
        this.confirmMessage.textContent = message;
        this.confirmAction = action;
        
        this.confirmModal.classList.remove('hidden');
        
        // 显示动画
        anime({
            targets: this.confirmModal.querySelector('.bg-white'),
            scale: [0.8, 1],
            opacity: [0, 1],
            duration: 300,
            easing: 'easeOutQuart'
        });
    }

    hideConfirmModal() {
        anime({
            targets: this.confirmModal.querySelector('.bg-white'),
            scale: [1, 0.8],
            opacity: [1, 0],
            duration: 200,
            easing: 'easeInQuart',
            complete: () => {
                this.confirmModal.classList.add('hidden');
                this.confirmAction = null;
            }
        });
    }

    executeConfirmAction() {
        if (this.confirmAction) {
            this.confirmAction();
        }
        this.hideConfirmModal();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-6 py-3 rounded-2xl shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 显示动画
        anime({
            targets: notification,
            translateX: [300, 0],
            opacity: [0, 1],
            duration: 300,
            easing: 'easeOutQuart'
        });
        
        // 自动消失
        setTimeout(() => {
            anime({
                targets: notification,
                translateX: [0, 300],
                opacity: [1, 0],
                duration: 300,
                easing: 'easeInQuart',
                complete: () => {
                    document.body.removeChild(notification);
                }
            });
        }, 3000);
    }

    initAnimations() {
        // 页面加载动画
        anime({
            targets: 'header',
            translateY: [-50, 0],
            opacity: [0, 1],
            duration: 600,
            easing: 'easeOutQuart'
        });

        anime({
            targets: '.input-area',
            translateY: [50, 0],
            opacity: [0, 1],
            duration: 600,
            easing: 'easeOutQuart',
            delay: 200
        });

        // 消息动画
        const messages = document.querySelectorAll('.message-bubble');
        if (messages.length > 0) {
            anime({
                targets: messages,
                translateY: [30, 0],
                opacity: [0, 1],
                duration: 500,
                easing: 'easeOutQuart',
                delay: anime.stagger(100, {start: 400})
            });
        }
    }
}

// 初始化应用
let loveBoard;
document.addEventListener('DOMContentLoaded', function() {
    // 先加载Firebase SDK
    const loadFirebase = () => {
        return new Promise((resolve, reject) => {
            // 检查Firebase是否已加载
            if (window.firebase) {
                resolve();
                return;
            }
            
            // 加载Firebase核心库
            const firebaseScript = document.createElement('script');
            firebaseScript.src = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
            firebaseScript.onload = () => {
                // 加载Firestore和Auth库
                const firestoreScript = document.createElement('script');
                firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
                firestoreScript.onload = () => {
                    const authScript = document.createElement('script');
                    authScript.src = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
                    authScript.onload = resolve;
                    authScript.onerror = reject;
                    document.head.appendChild(authScript);
                };
                firestoreScript.onerror = reject;
                document.head.appendChild(firestoreScript);
            };
            firebaseScript.onerror = () => {
                console.log('Firebase加载失败，将使用本地存储模式');
                resolve(); // 继续初始化，即使Firebase加载失败
            };
            document.head.appendChild(firebaseScript);
        });
    };
    
    // 加载云存储服务
    const loadCloudStorage = () => {
        return new Promise((resolve) => {
            if (window.cloudStorage) {
                resolve();
                return;
            }
            
            const cloudStorageScript = document.createElement('script');
            cloudStorageScript.src = 'cloud-storage.js';
            cloudStorageScript.onload = resolve;
            cloudStorageScript.onerror = () => {
                console.log('云存储服务加载失败');
                resolve(); // 继续初始化
            };
            document.head.appendChild(cloudStorageScript);
        });
    };
    
    // 按顺序加载所需资源
    Promise.all([loadFirebase(), loadCloudStorage()]).then(() => {
        // 初始化应用
        loveBoard = new LoveMessageBoard();
    });
});

// 防止意外关闭
window.addEventListener('beforeunload', function(e) {
    if (loveBoard && loveBoard.messages.length > 0) {
        e.preventDefault();
        e.returnValue = '确定要离开我们的私密空间吗？';
    }
});