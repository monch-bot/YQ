// 私密留言板主要功能
class LoveMessageBoard {
    constructor() {
        this.messages = [];
        this.currentUser = 'me';
        this.password = localStorage.getItem('loveBoardPassword');
        
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
        this.clearBtn = document.getElementById('clearBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        
        // 确认对话框
        this.confirmModal = document.getElementById('confirmModal');
        this.confirmIcon = document.getElementById('confirmIcon');
        this.confirmTitle = document.getElementById('confirmTitle');
        this.confirmMessage = document.getElementById('confirmMessage');
        this.confirmCancel = document.getElementById('confirmCancel');
        this.confirmOk = document.getElementById('confirmOk');
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
        this.clearBtn.addEventListener('click', () => this.showClearConfirm());
        this.logoutBtn.addEventListener('click', () => this.logout());

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

    saveMessages() {
        localStorage.setItem('loveBoardMessages', JSON.stringify(this.messages));
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

    clearAllMessages() {
        this.messages = [];
        this.saveMessages();
        this.renderMessages();
        this.showNotification('留言板已清空 🌸', 'success');
    }

    logout() {
        this.showConfirmModal(
            '🔒',
            '确认退出',
            '确定要离开我们的私密空间吗？下次需要重新输入密码。',
            () => {
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
    loveBoard = new LoveMessageBoard();
});

// 防止意外关闭
window.addEventListener('beforeunload', function(e) {
    if (loveBoard && loveBoard.messages.length > 0) {
        e.preventDefault();
        e.returnValue = '确定要离开我们的私密空间吗？';
    }
});