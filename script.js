// script.js

// API 基礎設定
const API_BASE_URL = 'http://localhost:8080/authority/v1.0';

// 工具函數
const utils = {
    // 顯示載入動畫
    showLoading: () => {
        const modal = document.getElementById('loadingModal');
        if (modal) modal.style.display = 'block';
    },

    // 隱藏載入動畫
    hideLoading: () => {
        const modal = document.getElementById('loadingModal');
        if (modal) modal.style.display = 'none';
    },

    // 顯示成功訊息
    showSuccess: (message) => {
        alert(`✅ ${message}`);
    },

    // 顯示錯誤訊息
    showError: (message) => {
        alert(`❌ ${message}`);
    },

    // 格式化日期
    formatDate: (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-TW');
    },

    // 格式化日期時間
    formatDateTime: (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('zh-TW');
    },

    // 生成唯一ID
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// API 請求函數
const api = {
    // 發送請求
    request: async (endpoint, options = {}) => {
        try {
            const url = `${API_BASE_URL}${endpoint}`;
            console.log('API Request:', url, options);
            
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            console.log('Response status:', response.status);
            
            // 嘗試解析 JSON
            let data;
            try {
                data = await response.json();
                console.log('Response data:', data);
            } catch (e) {
                console.error('❌ Failed to parse JSON:', e);
                throw new Error('伺服器回應格式錯誤');
            }

            // 檢查 HTTP 狀態碼
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 檢查後端返回的狀態碼
            // 後端成功時回傳 code: 200,失敗時回傳其他 code
            if (data.code && data.code >= 400) {
                throw new Error(data.message || '請求失敗');
            }

            return data;
        } catch (error) {
            console.error('❌ API request failed:', error);
            
            // 提供更友善的錯誤訊息
            if (error.message === 'Failed to fetch') {
                throw new Error('無法連接到伺服器,請確認後端服務是否運行在 http://localhost:8080');
            }
            
            throw error;
        }
    },

    // 建立專案
    createProject: async (data) => {
        return await api.request('/projects', {
            method: 'POST',
            body: JSON.stringify({
                p_name: data.projectName,
                contact_name: data.contactPerson,
                contact_phone: data.contactPhone || '',
                contact_email: data.contactEmail || '',
                owner: data.esstPerson || '',
                remark: data.remarks || ''
            })
        });
    },

    createEquipmentBatch: async (projectId, equipments) => {
        console.log('📤 Creating equipment batch for project:', projectId);
        console.log('📤 Equipment data:', JSON.stringify(equipments, null, 2));
        
        const requestBody = {
            p_id: projectId,
            equipments: equipments.map(eq => ({
                part_number: eq.partNumber,
                quantity: parseInt(eq.quantity),
                description: eq.description || ''
            }))
        };
        
        console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
        
        return await api.request('/equipments/batch', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });
    },

    getProjects: async (page = 1, limit = 20) => {
        const params = new URLSearchParams({ page, limit });
        return await api.request(`/projects?${params}`, {
            method: 'GET'
        });
    },

    getProject: async (id) => {
        return await api.request(`/projects/${id}`, {
            method: 'GET'
        });
    },

    getEquipmentsByProject: async (projectId) => {
        return await api.request(`/equipments/project/${projectId}`, {
            method: 'GET'
        });
    },

    updateProject: async (id, data) => {
        return await api.request(`/projects/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                p_name: data.projectName,
                contact_name: data.contactPerson,
                contact_phone: data.contactPhone,
                contact_email: data.contactEmail,
                owner: data.esstPerson,
                remark: data.remarks
            })
        });
    },

    deleteProject: async (id) => {
        return await api.request(`/projects/${id}`, {
            method: 'DELETE'
        });
    }
};

// 專案第一階段表單處理
const projectStep1Handler = {
    init: () => {
        const form = document.getElementById('projectStep1Form');
        const addBtn = document.getElementById('addEquipment');
        
        if (form) {
            form.addEventListener('submit', projectStep1Handler.handleSubmit);
        }
        
        if (addBtn) {
            addBtn.addEventListener('click', projectStep1Handler.addEquipment);
        }

        projectStep1Handler.updateRemoveButtons();
    },

    handleSubmit: async (e) => {
        e.preventDefault();
        utils.showLoading();

        try {
            const formData = new FormData(e.target);
            
            // 收集專案基本資料
            const projectData = {
                projectName: formData.get('projectName'),
                contactPerson: formData.get('contactPerson'),
                contactEmail: formData.get('contactEmail'),
                contactPhone: formData.get('contactPhone'),
                esstPerson: formData.get('esstPerson'),
                remarks: formData.get('remarks')
            };
            
            // 收集設備資料
            const equipments = projectStep1Handler.collectEquipments(formData);
            
            console.log('📋 提交資料:', { projectData, equipments });
            
            // 步驟 1: 建立專案
            console.log('⏳ 正在建立專案...');
            const projectResult = await api.createProject(projectData);
            console.log('✅ 專案建立成功:', projectResult);
            
            // 從回應中取得專案 ID
            const projectId = projectResult.body;
            
            if (!projectId) {
                throw new Error('無法取得專案 ID');
            }
            
            console.log('📝 專案 ID:', projectId);
            
            // 步驟 2: 如果有設備,批次建立設備
            if (equipments.length > 0) {
                console.log('⏳ 正在建立設備...');
                const equipmentResult = await api.createEquipmentBatch(projectId, equipments);
                console.log('✅ 設備建立成功:', equipmentResult);
            } else {
                console.log('ℹ️ 沒有設備需要建立');
            }
            
            utils.hideLoading();
            utils.showSuccess('專案與設備已成功建立!');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        } catch (error) {
            utils.hideLoading();
            console.error('❌ 提交錯誤:', error);
            utils.showError('提交失敗: ' + error.message);
        }
    },

    collectEquipments: (formData) => {
        const equipments = [];
        const partNumbers = formData.getAll('partNumber[]');
        const quantities = formData.getAll('quantity[]');
        const descriptions = formData.getAll('description[]');

        console.log('📦 收集設備資料:', { partNumbers, quantities, descriptions });

        for (let i = 0; i < partNumbers.length; i++) {
            if (partNumbers[i] && quantities[i]) {
                equipments.push({
                    partNumber: partNumbers[i],
                    quantity: parseInt(quantities[i]),
                    description: descriptions[i] || ''
                });
            }
        }

        console.log('📦 收集到的設備:', equipments);
        return equipments;
    },

    addEquipment: () => {
        const container = document.getElementById('equipmentList');
        const newItem = document.createElement('div');
        newItem.className = 'equipment-item';
        
        newItem.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>料號 *</label>
                    <input type="text" name="partNumber[]" required placeholder="請輸入料號">
                </div>
                <div class="form-group">
                    <label>數量 *</label>
                    <input type="number" name="quantity[]" required min="1" step="1" placeholder="請輸入數量">
                </div>
                <div class="form-group">
                    <label>設備說明</label>
                    <input type="text" name="description[]" placeholder="請輸入設備說明">
                </div>
                <button type="button" class="btn btn-danger remove-equipment">移除</button>
            </div>
        `;
        
        container.appendChild(newItem);
        projectStep1Handler.updateRemoveButtons();
    },

    updateRemoveButtons: () => {
        const items = document.querySelectorAll('.equipment-item');
        const removeButtons = document.querySelectorAll('.remove-equipment');
        
        // 顯示/隱藏移除按鈕
        removeButtons.forEach((btn, index) => {
            if (items.length > 1) {
                btn.style.display = 'block';
            } else {
                btn.style.display = 'none';
            }
            
            // 重新綁定事件
            btn.onclick = () => {
                if (items.length > 1) {
                    btn.closest('.equipment-item').remove();
                    projectStep1Handler.updateRemoveButtons();
                }
            };
        });
    }
};

// Dashboard 處理
const dashboardHandler = {
    data: {
        projects: [],
        stocks: []
    },

    init: () => {
        const refreshBtn = document.getElementById('refreshData');
        const typeFilter = document.getElementById('typeFilter');
        const statusFilter = document.getElementById('statusFilter');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', dashboardHandler.loadData);
        }
        
        if (typeFilter) {
            typeFilter.addEventListener('change', dashboardHandler.filterData);
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', dashboardHandler.filterData);
        }

        // 初始載入資料
        dashboardHandler.loadData();
        
        // Modal 事件處理
        dashboardHandler.initModal();
    },

    loadData: async () => {
        try {
            utils.showLoading();
            const result = await api.getProjects(1, 20);
            
            console.log('載入專案列表:', result);
            
            // 根據後端回傳的資料結構進行轉換
            if (result.body && result.body.projects) {
                dashboardHandler.data.projects = result.body.projects.map(p => ({
                    id: p.p_id,
                    projectName: p.p_name,
                    contactPerson: p.contact_name,
                    contactEmail: p.contact_email || '-',
                    contactPhone: p.contact_phone || '-',
                    owner: p.owner || '-',
                    remark: p.remark || '-',
                    createdTime: p.created_time
                }));
            } else {
                dashboardHandler.data.projects = [];
            }

            dashboardHandler.updateStats();
            dashboardHandler.updateTables();
            utils.hideLoading();
        } catch (error) {
            utils.hideLoading();
            console.error('載入資料錯誤:', error);
            utils.showError('載入資料失敗: ' + error.message);
        }
    },

    updateStats: () => {
        const { projects, stocks } = dashboardHandler.data;
        
        const totalProjectsEl = document.getElementById('totalProjects');
        const totalStockEl = document.getElementById('totalStock');
        const pendingStep2El = document.getElementById('pendingStep2');
        const completedTodayEl = document.getElementById('completedToday');
        
        if (totalProjectsEl) totalProjectsEl.textContent = projects.length;
        if (totalStockEl) totalStockEl.textContent = stocks.length;
        
        const pendingStep2 = projects.filter(p => p.status === 'step1').length;
        if (pendingStep2El) pendingStep2El.textContent = pendingStep2;
        
        const today = new Date().toDateString();
        const completedToday = [...projects, ...stocks].filter(item => {
            return new Date(item.createdTime).toDateString() === today;
        }).length;
        if (completedTodayEl) completedTodayEl.textContent = completedToday;
    },

    updateTables: () => {
        dashboardHandler.updateProjectTable();
        dashboardHandler.updateStockTable();
    },

    updateProjectTable: () => {
        const tbody = document.querySelector('#projectTable tbody');
        if (!tbody) return;
        
        const { projects } = dashboardHandler.data;
        
        if (projects.length === 0) {
            tbody.innerHTML = '<tr class="no-data"><td colspan="6">暫無專案資料</td></tr>';
            return;
        }
        
        tbody.innerHTML = projects.map(project => `
            <tr>
                <td>${project.projectName}</td>
                <td>${project.contactPerson}</td>
                <td>-</td>
                <td><span class="status-badge status-${project.status || 'step1'}">${dashboardHandler.getStatusText(project.status)}</span></td>
                <td>${utils.formatDateTime(project.createdTime)}</td>
                <td>
                    <button class="btn btn-secondary" onclick="dashboardHandler.showDetail('project', '${project.id}')">查看</button>
                </td>
            </tr>
        `).join('');
    },

    updateStockTable: () => {
        const tbody = document.querySelector('#stockTable tbody');
        if (!tbody) return;
        
        const { stocks } = dashboardHandler.data;
        
        if (stocks.length === 0) {
            tbody.innerHTML = '<tr class="no-data"><td colspan="7">暫無現貨資料</td></tr>';
            return;
        }
        
        tbody.innerHTML = stocks.map(stock => `
            <tr>
                <td>${stock.projectName}</td>
                <td>${stock.contactPerson}</td>
                <td>${stock.equipment ? stock.equipment.length : 0}</td>
                <td>${utils.formatDate(stock.deliveryDate)}</td>
                <td><span class="urgent-${stock.urgentLevel}">${dashboardHandler.getUrgentText(stock.urgentLevel)}</span></td>
                <td>${utils.formatDateTime(stock.createdTime)}</td>
                <td>
                    <button class="btn btn-secondary" onclick="dashboardHandler.showDetail('stock', '${stock.id}')">查看</button>
                </td>
            </tr>
        `).join('');
    },

    getStatusText: (status) => {
        const statusMap = {
            'step1': '第一階段',
            'step2': '第二階段',
            'completed': '已完成'
        };
        return statusMap[status] || '第一階段';
    },

    getUrgentText: (urgent) => {
        const urgentMap = {
            'normal': '一般',
            'urgent': '急件',
            'very_urgent': '特急件'
        };
        return urgentMap[urgent] || urgent;
    },

    showDetail: async (type, id) => {
        try {
            utils.showLoading();
            
            // 獲取專案資訊
            const projectResult = await api.getProject(id);
            const project = projectResult.body;
            
            // 獲取設備列表
            const equipmentResult = await api.getEquipmentsByProject(id);
            const equipments = equipmentResult.body || [];
            
            const item = {
                projectName: project.p_name,
                contactPerson: project.contact_name,
                contactEmail: project.contact_email,
                contactPhone: project.contact_phone,
                owner: project.owner,
                remark: project.remark,
                createdTime: project.created_time,
                equipments: equipments
            };
            
            const modal = document.getElementById('detailModal');
            const title = document.getElementById('modalTitle');
            const content = document.getElementById('modalContent');
            
            if (modal && title && content) {
                title.textContent = `專案 - ${item.projectName}`;
                content.innerHTML = dashboardHandler.generateDetailHTML(item, type);
                modal.style.display = 'block';
            }
            
            utils.hideLoading();
        } catch (error) {
            utils.hideLoading();
            utils.showError('載入詳情失敗: ' + error.message);
        }
    },

    generateDetailHTML: (item, type) => {
        let html = `
            <div class="info-grid">
                <div class="info-item"><strong>專案名稱:</strong>${item.projectName}</div>
                <div class="info-item"><strong>聯絡人:</strong>${item.contactPerson}</div>
                <div class="info-item"><strong>聯絡信箱:</strong>${item.contactEmail || '-'}</div>
                <div class="info-item"><strong>聯絡電話:</strong>${item.contactPhone || '-'}</div>
                <div class="info-item"><strong>負責人:</strong>${item.owner || '-'}</div>
                <div class="info-item"><strong>建立時間:</strong>${utils.formatDateTime(item.createdTime)}</div>
            </div>
        `;
        
        // 設備清單
        if (item.equipments && item.equipments.length > 0) {
            html += `
                <h4>設備清單</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>料號</th>
                            <th>數量</th>
                            <th>說明</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${item.equipments.map(eq => `
                            <tr>
                                <td>${eq.part_number}</td>
                                <td>${eq.quantity}</td>
                                <td>${eq.description || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            html += '<h4>設備清單</h4><p>暫無設備資料</p>';
        }
        
        // 備註
        if (item.remark) {
            html += `<h4>備註</h4><p>${item.remark}</p>`;
        }
        
        return html;
    },

    filterData: () => {
        const typeFilter = document.getElementById('typeFilter');
        const statusFilter = document.getElementById('statusFilter');
        
        if (typeFilter && statusFilter) {
            console.log('Filter:', typeFilter.value, statusFilter.value);
        }
        
        // 重新渲染表格
        dashboardHandler.updateTables();
    },

    initModal: () => {
        const modal = document.getElementById('detailModal');
        const closeButtons = document.querySelectorAll('.modal-close');
        
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (modal) modal.style.display = 'none';
            });
        });
        
        // 點擊外部關閉
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
};

// 頁面初始化
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();
    
    console.log('🚀 當前頁面:', currentPage);
    
    switch (currentPage) {
        case 'project-step1.html':
            projectStep1Handler.init();
            break;
        case 'dashboard.html':
            dashboardHandler.init();
            break;
        default:
            console.log('Page loaded:', currentPage);
    }
});

// 全局錯誤處理
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});

// 未處理的 Promise 錯誤
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});

// 匯出供其他腳本使用
window.ProjectReportSystem = {
    utils,
    api,
    projectStep1Handler,
    dashboardHandler
};