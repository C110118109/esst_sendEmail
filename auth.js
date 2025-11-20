// auth.js - 認證管理模組

const auth = {
    // 取得 token
    getToken: () => {
        return localStorage.getItem('auth_token');
    },

    // 取得使用者資訊
    getUserInfo: () => {
        const userInfo = localStorage.getItem('user_info');
        return userInfo ? JSON.parse(userInfo) : null;
    },

    // 檢查是否已登入
    isAuthenticated: () => {
        return !!auth.getToken();
    },

    // 登出
    logout: async () => {
        try {
            const token = auth.getToken();
            if (token) {
                // 呼叫後端登出 API - 🔴 確認這裡是 8080
                await fetch('http://localhost:8080/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // 無論如何都清除本地資料
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_info');
            window.location.href = 'login.html';
        }
    },

    // 檢查認證狀態(頁面載入時)
    checkAuth: async () => {
        // login.html 不需要檢查
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'login.html' || currentPage === '') {
            return true;
        }

        if (!auth.isAuthenticated()) {
            // 未登入,導向登入頁
            console.log('❌ 未登入,導向登入頁');
            window.location.href = 'login.html';
            return false;
        }

        try {
            // 驗證 token 是否有效 - 🔴 確認這裡是 8080
            const response = await fetch('http://localhost:8080/auth/me', {
                headers: {
                    'Authorization': `Bearer ${auth.getToken()}`
                }
            });

            if (!response.ok) {
                // Token 無效
                console.log('❌ Token 無效');
                auth.logout();
                return false;
            }

            console.log('✅ 認證通過');
            return true;
        } catch (error) {
            console.error('❌ 認證檢查失敗:', error);
            auth.logout();
            return false;
        }
    },

    // 在 API 請求中加入 token
    getAuthHeaders: () => {
        const token = auth.getToken();
        if (token) {
            return {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
        }
        return {
            'Content-Type': 'application/json'
        };
    },

    // 顯示使用者資訊
    displayUserInfo: () => {
        const userInfo = auth.getUserInfo();
        if (userInfo) {
            const userInfoElement = document.getElementById('userInfo');
            if (userInfoElement) {
                userInfoElement.innerHTML = `
                    <span>👤 ${userInfo.username}</span>
                    ${userInfo.role === 'admin' ? '<span class="admin-badge">管理員</span>' : ''}
                `;
            }
        }
    }
};

// 頁面載入時檢查認證
document.addEventListener('DOMContentLoaded', () => {
    auth.checkAuth();
});

// 匯出供其他模組使用
window.auth = auth;