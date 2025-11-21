// user-management.js - 帳號管理功能(含 admin 帳號保護)

const userManagement = {
    data: {
        users: [],
        editingUserId: null
    },

    // 初始化
    init: async () => {
        await userManagement.loadUsers();
        userManagement.updateStats();
        userManagement.updateTable();
        userManagement.initEventListeners();
    },

    // 初始化事件監聽器
    initEventListeners: () => {
        // 新增使用者按鈕
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', userManagement.showAddModal);
        }

        // 重新整理按鈕
        const refreshBtn = document.getElementById('refreshData');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await userManagement.loadUsers();
                userManagement.updateStats();
                userManagement.updateTable();
            });
        }

        // 儲存按鈕
        const saveBtn = document.getElementById('saveUserBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', userManagement.handleSave);
        }

        // 確認刪除按鈕
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', userManagement.handleDelete);
        }

        // Modal 關閉按鈕
        const closeButtons = document.querySelectorAll('.modal-close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('userModal').style.display = 'none';
                document.getElementById('confirmModal').style.display = 'none';
            });
        });

        // 點擊 Modal 外部關閉
        window.addEventListener('click', (e) => {
            const userModal = document.getElementById('userModal');
            const confirmModal = document.getElementById('confirmModal');
            if (e.target === userModal) {
                userModal.style.display = 'none';
            }
            if (e.target === confirmModal) {
                confirmModal.style.display = 'none';
            }
        });
    },

    // 載入使用者資料
    loadUsers: async () => {
        try {
            const response = await fetch('http://localhost:8080/authority/v1.0/users?page=1&limit=100', {
                method: 'GET',
                headers: auth.getAuthHeaders()
            });

            if (response.status === 401) {
                auth.logout();
                return;
            }

            const data = await response.json();
            console.log('📥 Users loaded:', data);

            if (data.code === 200 && data.body) {
                userManagement.data.users = data.body.users || [];
            } else {
                throw new Error(data.message || '載入失敗');
            }
        } catch (error) {
            console.error('❌ Load users failed:', error);
            alert('載入使用者資料失敗: ' + error.message);
        }
    },

    // 更新統計資料
    updateStats: () => {
        const { users } = userManagement.data;
        
        const totalUsersEl = document.getElementById('totalUsers');
        const adminCountEl = document.getElementById('adminCount');
        const userCountEl = document.getElementById('userCount');

        if (totalUsersEl) {
            totalUsersEl.textContent = users.length;
        }

        const adminCount = users.filter(u => u.role === 'admin').length;
        if (adminCountEl) {
            adminCountEl.textContent = adminCount;
        }

        const userCount = users.filter(u => u.role === 'user').length;
        if (userCountEl) {
            userCountEl.textContent = userCount;
        }
    },

    // 更新表格
    updateTable: () => {
        const tbody = document.querySelector('#userTable tbody');
        if (!tbody) return;

        const { users } = userManagement.data;

        if (users.length === 0) {
            tbody.innerHTML = '<tr class="no-data"><td colspan="6">暫無使用者資料</td></tr>';
            return;
        }

        // 按建立時間排序(新到舊)
        const sortedUsers = [...users].sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return dateB - dateA;
        });

        tbody.innerHTML = sortedUsers.map(user => {
            // 檢查是否為預設 admin 帳號(不可刪除)
            const isDefaultAdmin = user.username === 'admin';
            const deleteButton = isDefaultAdmin 
                ? `<button class="btn btn-danger" disabled title="預設管理員帳號無法刪除" style="opacity: 0.5; cursor: not-allowed;">刪除</button>`
                : `<button class="btn btn-danger" onclick="userManagement.showDeleteConfirm('${user.id}', '${user.username}')">刪除</button>`;
            
            return `
                <tr ${isDefaultAdmin ? 'style="background-color: rgba(52, 152, 219, 0.05);"' : ''}>
                    <td>
                        ${user.username}
                        ${isDefaultAdmin ? '<span class="status-badge status-completed" style="margin-left: 8px; font-size: 0.75em;">系統帳號</span>' : ''}
                    </td>
                    <td>${user.email || '-'}</td>
                    <td>
                        <span class="status-badge ${user.role === 'admin' ? 'status-completed' : 'status-step1'}">
                            ${user.role === 'admin' ? '管理員' : '一般使用者'}
                        </span>
                    </td>
                    <td>${userManagement.formatDateTime(user.created_at)}</td>
                    <td>${user.updated_at ? userManagement.formatDateTime(user.updated_at) : '-'}</td>
                    <td>
                        <button class="btn btn-secondary" onclick="userManagement.showEditModal('${user.id}')">編輯</button>
                        ${deleteButton}
                    </td>
                </tr>
            `;
        }).join('');
    },

    // 顯示新增 Modal
    showAddModal: () => {
        userManagement.data.editingUserId = null;
        document.getElementById('modalTitle').textContent = '新增使用者';
        document.getElementById('userForm').reset();
        document.getElementById('userId').value = '';
        document.getElementById('password').required = true;
        document.getElementById('passwordRequired').textContent = '*';
        document.getElementById('username').disabled = false;
        document.getElementById('userModal').style.display = 'block';
    },

    // 顯示編輯 Modal
    showEditModal: (userId) => {
        const user = userManagement.data.users.find(u => u.id === userId);
        if (!user) {
            alert('找不到該使用者');
            return;
        }

        userManagement.data.editingUserId = userId;
        document.getElementById('modalTitle').textContent = '編輯使用者';
        document.getElementById('userId').value = userId;
        document.getElementById('username').value = user.username;
        document.getElementById('email').value = user.email || '';
        document.getElementById('password').value = '';
        document.getElementById('password').required = false;
        document.getElementById('passwordRequired').textContent = '';
        document.getElementById('role').value = user.role;
        document.getElementById('username').disabled = true; // 編輯時不允許修改帳號
        document.getElementById('userModal').style.display = 'block';
    },

    // 處理儲存
    handleSave: async () => {
        const form = document.getElementById('userForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const userId = document.getElementById('userId').value;
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        // 驗證密碼長度(如果有輸入密碼)
        if (password && password.length < 6) {
            alert('密碼至少需要6個字元');
            return;
        }

        try {
            let response;
            
            if (userId) {
                // 編輯使用者
                const updateData = {
                    username: username,
                    email: email,
                    role: role
                };
                
                if (password) {
                    updateData.password = password;
                }

                response = await fetch(`http://localhost:8080/authority/v1.0/users/${userId}`, {
                    method: 'PATCH',
                    headers: auth.getAuthHeaders(),
                    body: JSON.stringify(updateData)
                });
            } else {
                // 新增使用者
                if (!password) {
                    alert('新增使用者時密碼為必填');
                    return;
                }

                response = await fetch('http://localhost:8080/authority/v1.0/users', {
                    method: 'POST',
                    headers: auth.getAuthHeaders(),
                    body: JSON.stringify({
                        username: username,
                        email: email,
                        password: password,
                        role: role
                    })
                });
            }

            if (response.status === 401) {
                auth.logout();
                return;
            }

            const data = await response.json();
            console.log('📥 Save response:', data);

            if (data.code === 200) {
                alert(userId ? '✅ 更新成功!' : '✅ 新增成功!');
                document.getElementById('userModal').style.display = 'none';
                
                // 重新載入資料
                await userManagement.loadUsers();
                userManagement.updateStats();
                userManagement.updateTable();
            } else {
                throw new Error(data.message || '操作失敗');
            }
        } catch (error) {
            console.error('❌ Save failed:', error);
            alert('操作失敗: ' + error.message);
        }
    },

    // 顯示刪除確認
    showDeleteConfirm: (userId, username) => {
        // 🔴 前端保護:禁止刪除 admin 帳號
        if (username === 'admin') {
            alert('⚠️ 無法刪除預設管理員帳號!');
            return;
        }

        userManagement.data.deletingUserId = userId;
        document.getElementById('confirmMessage').textContent = 
            `確定要刪除使用者「${username}」嗎?此操作無法復原。`;
        document.getElementById('confirmModal').style.display = 'block';
    },

    // 處理刪除
    handleDelete: async () => {
        const userId = userManagement.data.deletingUserId;
        if (!userId) return;

        // 🔴 再次檢查:禁止刪除 admin 帳號
        const user = userManagement.data.users.find(u => u.id === userId);
        if (user && user.username === 'admin') {
            alert('⚠️ 無法刪除預設管理員帳號!');
            document.getElementById('confirmModal').style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`http://localhost:8080/authority/v1.0/users/${userId}`, {
                method: 'DELETE',
                headers: auth.getAuthHeaders()
            });

            if (response.status === 401) {
                auth.logout();
                return;
            }

            const data = await response.json();
            console.log('📥 Delete response:', data);

            if (data.code === 200) {
                alert('✅ 刪除成功!');
                document.getElementById('confirmModal').style.display = 'none';
                
                // 重新載入資料
                await userManagement.loadUsers();
                userManagement.updateStats();
                userManagement.updateTable();
            } else {
                throw new Error(data.message || '刪除失敗');
            }
        } catch (error) {
            console.error('❌ Delete failed:', error);
            alert('刪除失敗: ' + error.message);
        }
    },

    // 格式化時間
    formatDateTime: (dateString) => {
        if (!dateString) return '-';
        const cleanDateString = dateString.replace('Z', '').replace(/\+\d{2}:\d{2}$/, '');
        const date = new Date(cleanDateString);
        return date.toLocaleString('zh-TW');
    }
};

// 匯出供其他模組使用
window.userManagement = userManagement;