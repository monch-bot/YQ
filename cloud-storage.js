// 云存储服务 - 使用Firebase实现云端数据同步
class CloudStorageService {
    constructor() {
        this.isInitialized = false;
        this.firebaseConfig = {
            // Firebase配置将在初始化时设置
            apiKey: '',
            authDomain: '',
            projectId: '',
            storageBucket: '',
            messagingSenderId: '',
            appId: ''
        };
        this.db = null;
        this.currentUser = null;
        this.messagesCollection = null;
        this.syncInterval = null;
    }

    // 初始化Firebase
    async initialize(config) {
        try {
            // 检查Firebase是否已加载
            if (!window.firebase) {
                console.warn('Firebase未加载，请先引入Firebase SDK');
                return false;
            }

            // 使用提供的配置
            this.firebaseConfig = { ...this.firebaseConfig, ...config };
            
            // 初始化Firebase应用
            firebase.initializeApp(this.firebaseConfig);
            
            // 获取数据库引用
            this.db = firebase.firestore();
            
            // 设置身份验证状态监听
            firebase.auth().onAuthStateChanged(user => {
                this.currentUser = user;
                if (user) {
                    this.messagesCollection = this.db.collection('boards').doc(user.uid).collection('messages');
                    console.log('云存储已连接');
                }
            });
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('初始化云存储失败:', error);
            return false;
        }
    }

    // 用户登录（使用密码作为标识）
    async login(password) {
        if (!this.isInitialized) {
            console.error('云存储未初始化');
            return false;
        }

        try {
            // 为了简单起见，我们使用密码作为用户ID的哈希值
            // 在实际应用中，应该使用更安全的认证方式
            const userId = this.hashPassword(password);
            
            // 这里简化处理，实际上应该使用Firebase认证或自定义认证
            // 由于是演示，我们直接使用密码哈希作为用户标识
            this.currentUser = { uid: userId };
            this.messagesCollection = this.db.collection('boards').doc(userId).collection('messages');
            
            return true;
        } catch (error) {
            console.error('登录失败:', error);
            return false;
        }
    }

    // 获取所有消息
    async getMessages() {
        if (!this.isAuthenticated() || !this.messagesCollection) {
            return [];
        }

        try {
            const snapshot = await this.messagesCollection.orderBy('timestamp').get();
            const messages = [];
            
            snapshot.forEach(doc => {
                messages.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return messages;
        } catch (error) {
            console.error('获取消息失败:', error);
            return [];
        }
    }

    // 保存消息
    async saveMessage(message) {
        if (!this.isAuthenticated() || !this.messagesCollection) {
            return false;
        }

        try {
            // 如果消息已有ID，更新现有消息
            if (message.id) {
                await this.messagesCollection.doc(message.id).set(message);
            } else {
                // 否则创建新消息
                const docRef = await this.messagesCollection.add(message);
                message.id = docRef.id;
            }
            
            return true;
        } catch (error) {
            console.error('保存消息失败:', error);
            return false;
        }
    }

    // 删除消息
    async deleteMessage(messageId) {
        if (!this.isAuthenticated() || !this.messagesCollection) {
            return false;
        }

        try {
            await this.messagesCollection.doc(messageId).delete();
            return true;
        } catch (error) {
            console.error('删除消息失败:', error);
            return false;
        }
    }

    // 清空所有消息
    async clearAllMessages() {
        if (!this.isAuthenticated() || !this.messagesCollection) {
            return false;
        }

        try {
            const snapshot = await this.messagesCollection.get();
            const batch = this.db.batch();
            
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            return true;
        } catch (error) {
            console.error('清空消息失败:', error);
            return false;
        }
    }

    // 开始自动同步
    startSync(localMessages, onSyncComplete) {
        // 清除现有同步
        this.stopSync();
        
        // 每30秒同步一次
        this.syncInterval = setInterval(async () => {
            const cloudMessages = await this.getMessages();
            if (cloudMessages.length > 0) {
                onSyncComplete(cloudMessages);
            }
        }, 30000);
    }

    // 停止自动同步
    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // 检查是否已认证
    isAuthenticated() {
        return !!this.currentUser;
    }

    // 注销
    logout() {
        this.stopSync();
        this.currentUser = null;
        this.messagesCollection = null;
    }

    // 简单的密码哈希函数（实际应用中应使用更安全的方法）
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString();
    }
}

// 创建单例实例
const cloudStorage = new CloudStorageService();

// 导出服务
window.cloudStorage = cloudStorage;