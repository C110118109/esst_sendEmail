// script.js

// API 基礎設定
const API_BASE_URL = 'http://localhost:8080/authority/v1.0';

// 工具函數
const utils = {
    showLoading: () => {
        const modal = document.getElementById('loadingModal');
        if (modal) modal.style.display = 'block';
    },

    hideLoading: () => {
        const modal = document.getElementById('loadingModal');
        if (modal) modal.style.display = 'none';
    },

    showSuccess: (message) => {
        alert(`✅ ${message}`);
    },

    showError: (message) => {
        alert(`❌ ${message}`);
    },

    formatDate: (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-TW');
    },

    formatDateTime: (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('zh-TW');
    },

    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// API 請求函數
const api = {
    request: async (endpoint, options = {}) => {
        try {
            const url = `${API_BASE_URL}${endpoint}`;
            console.log('📤 API Request:', url, options);
            
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            console.log('📥 Response status:', response.status);
            
            // 嘗試解析 JSON
            let data;
            try {
                data = await response.json();
                console.log('📥 Response data:', data);
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
        const requestBody = {};
        
        // 只包含有值的欄位
        if (data.projectName) requestBody.p_name = data.projectName;
        if (data.contactPerson) requestBody.contact_name = data.contactPerson;
        if (data.contactPhone) requestBody.contact_phone = data.contactPhone;
        if (data.contactEmail) requestBody.contact_email = data.contactEmail;
        if (data.esstPerson) requestBody.owner = data.esstPerson;
        if (data.remarks) requestBody.remark = data.remarks;
        
        // 第二階段欄位
        if (data.expectedDeliveryPeriod) requestBody.expected_delivery_period = data.expectedDeliveryPeriod;
        if (data.expectedDeliveryDate) requestBody.expected_delivery_date = data.expectedDeliveryDate;
        if (data.expectedContractPeriod) requestBody.expected_contract_period = data.expectedContractPeriod;
        if (data.contractStartDate) requestBody.contract_start_date = data.contractStartDate;
        if (data.contractEndDate) requestBody.contract_end_date = data.contractEndDate;
        if (data.deliveryAddress) requestBody.delivery_address = data.deliveryAddress;
        if (data.specialRequirements) requestBody.special_requirements = data.specialRequirements;
        
        console.log('📤 Update request body:', requestBody);
        
        return await api.request(`/projects/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(requestBody)
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
            
            // 步驟 2: 建立設備(如果有設備)
            if (equipments.length > 0) {
                console.log('⏳ 正在建立設備清單...');
                try {
                    const equipmentResult = await api.createEquipmentBatch(projectId, equipments);
                    console.log('✅ 設備建立成功:', equipmentResult);
                } catch (equipError) {
                    console.warn('⚠️ 設備建立失敗，但專案已建立:', equipError);
                    // 專案已建立成功，設備失敗只顯示警告
                    utils.hideLoading();
                    utils.showSuccess(`專案建立成功！\n專案 ID: ${projectId}\n\n注意：設備清單建立失敗，請稍後手動新增。`);
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                    return;
                }
            }
            
            utils.hideLoading();
            utils.showSuccess(`第一階段報備成功！\n專案 ID: ${projectId}\n\n得標後請記得填寫第二階段資訊。`);
            
            // 跳轉回首頁
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        } catch (error) {
            utils.hideLoading();
            console.error('❌ 提交失敗:', error);
            utils.showError('提交失敗: ' + error.message);
        }
    },

    collectEquipments: (formData) => {
        const equipments = [];
        const partNumbers = formData.getAll('partNumber[]');
        const quantities = formData.getAll('quantity[]');
        const descriptions = formData.getAll('description[]');
        
        for (let i = 0; i < partNumbers.length; i++) {
            if (partNumbers[i] && quantities[i]) {
                equipments.push({
                    partNumber: partNumbers[i],
                    quantity: quantities[i],
                    description: descriptions[i] || ''
                });
            }
        }
        
        return equipments;
    },

    addEquipment: () => {
        const list = document.getElementById('equipmentList');
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
                    <input type="number" name="quantity[]" required min="1" placeholder="請輸入數量">
                </div>
                <div class="form-group">
                    <label>設備說明</label>
                    <input type="text" name="description[]" placeholder="請輸入設備說明">
                </div>
                <button type="button" class="btn btn-danger remove-equipment">移除</button>
            </div>
        `;
        
        list.appendChild(newItem);
        
        newItem.querySelector('.remove-equipment').addEventListener('click', function() {
            newItem.remove();
            projectStep1Handler.updateRemoveButtons();
        });
        
        projectStep1Handler.updateRemoveButtons();
    },

    updateRemoveButtons: () => {
        const items = document.querySelectorAll('.equipment-item');
        items.forEach((item, index) => {
            const removeBtn = item.querySelector('.remove-equipment');
            if (removeBtn) {
                removeBtn.style.display = items.length > 1 ? 'block' : 'none';
            }
        });
    }
};

// 專案第二階段表單處理
const projectStep2Handler = {
    init: () => {
        const form = document.getElementById('projectStep2Form');
        
        if (form) {
            form.addEventListener('submit', projectStep2Handler.handleSubmit);
        }

        // 從 URL 取得專案 ID
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('id');
        
        if (projectId) {
            projectStep2Handler.loadProjectInfo(projectId);
        } else {
            utils.showError('未提供專案 ID，請從正確的連結進入');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    },

    loadProjectInfo: async (projectId) => {
        try {
            utils.showLoading();
            
            console.log('⏳ 正在載入專案資訊，專案 ID:', projectId);
            const result = await api.getProject(projectId);
            console.log('✅ 專案資訊載入成功:', result);
            
            if (result.code === 200 && result.body) {
                const project = result.body;
                
                // 顯示專案基本資訊
                const displayProjectName = document.getElementById('displayProjectName');
                const displayContactPerson = document.getElementById('displayContactPerson');
                const projectIdInput = document.getElementById('projectId');
                
                if (displayProjectName) {
                    displayProjectName.textContent = project.p_name || '-';
                }
                if (displayContactPerson) {
                    displayContactPerson.textContent = project.contact_name || '-';
                }
                if (projectIdInput) {
                    projectIdInput.value = projectId;
                }
                
                // 如果已有第二階段資料，填入表單
                if (project.expected_delivery_period) {
                    document.getElementById('expectedDeliveryPeriod').value = project.expected_delivery_period;
                }
                if (project.expected_delivery_date) {
                    // 將 ISO 日期轉換為 input[type="date"] 格式 (YYYY-MM-DD)
                    const date = new Date(project.expected_delivery_date);
                    document.getElementById('expectedDeliveryDate').value = date.toISOString().split('T')[0];
                }
                if (project.expected_contract_period) {
                    document.getElementById('expectedContractPeriod').value = project.expected_contract_period;
                }
                if (project.contract_start_date) {
                    const date = new Date(project.contract_start_date);
                    document.getElementById('contractStartDate').value = date.toISOString().split('T')[0];
                }
                if (project.contract_end_date) {
                    const date = new Date(project.contract_end_date);
                    document.getElementById('contractEndDate').value = date.toISOString().split('T')[0];
                }
                if (project.delivery_address) {
                    document.getElementById('deliveryAddress').value = project.delivery_address;
                }
                if (project.special_requirements) {
                    document.getElementById('specialRequirements').value = project.special_requirements;
                }
                
            } else {
                throw new Error('無法取得專案資訊');
            }
            
            utils.hideLoading();
            
        } catch (error) {
            utils.hideLoading();
            console.error('❌ 載入專案資訊失敗:', error);
            utils.showError('載入專案資訊失敗: ' + error.message);
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    },

    handleSubmit: async (e) => {
        e.preventDefault();
        utils.showLoading();

        try {
            const formData = new FormData(e.target);
            const projectId = formData.get('projectId');
            
            if (!projectId) {
                throw new Error('專案 ID 不存在');
            }
            
            // 收集第二階段資料
            const updateData = {
                expectedDeliveryPeriod: formData.get('expectedDeliveryPeriod'),
                expectedDeliveryDate: formData.get('expectedDeliveryDate'),
                expectedContractPeriod: formData.get('expectedContractPeriod'),
                contractStartDate: formData.get('contractStartDate'),
                contractEndDate: formData.get('contractEndDate'),
                deliveryAddress: formData.get('deliveryAddress'),
                specialRequirements: formData.get('specialRequirements')
            };
            
            console.log('📋 提交第二階段資料:', updateData);
            
            // 更新專案
            const result = await api.updateProject(projectId, updateData);
            console.log('✅ 更新成功:', result);
            
            utils.hideLoading();
            utils.showSuccess('第二階段報備完成！');
            
            // 跳轉回首頁
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
        } catch (error) {
            utils.hideLoading();
            console.error('❌ 提交失敗:', error);
            utils.showError('提交失敗: ' + error.message);
        }
    }
};

// Dashboard 處理
const dashboardHandler = {
    data: {
        projects: [],
        stocks: []
    },

    init: async () => {
        await dashboardHandler.loadData();
        dashboardHandler.updateStats();
        dashboardHandler.updateTables();
        dashboardHandler.initModal();
        
        // 綁定重新整理按鈕
        const refreshBtn = document.getElementById('refreshData');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await dashboardHandler.loadData();
                dashboardHandler.updateStats();
                dashboardHandler.updateTables();
            });
        }
        
        const typeFilter = document.getElementById('typeFilter');
        const statusFilter = document.getElementById('statusFilter');
        
        if (typeFilter) {
            typeFilter.addEventListener('change', dashboardHandler.filterData);
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', dashboardHandler.filterData);
        }
    },

    loadData: async () => {
        try {
            utils.showLoading();
            
            const projectsResult = await api.getProjects(1, 100);
            console.log('📥 Projects loaded:', projectsResult);
            
            if (projectsResult.code === 200 && projectsResult.body) {
                // 載入專案基本資料
                const projectsData = projectsResult.body.projects.map(p => ({
                    id: p.p_id,
                    projectName: p.p_name,
                    contactPerson: p.contact_name,
                    contactEmail: p.contact_email,
                    contactPhone: p.contact_phone,
                    owner: p.owner,
                    remark: p.remark,
                    status: dashboardHandler.determineStatus(p),
                    createdTime: p.created_time,
                    updatedTime: p.updated_time,
                    expectedDeliveryDate: p.expected_delivery_date,
                    expectedDeliveryPeriod: p.expected_delivery_period,
                    expectedContractPeriod: p.expected_contract_period,
                    contractStartDate: p.contract_start_date,
                    contractEndDate: p.contract_end_date,
                    deliveryAddress: p.delivery_address,
                    specialRequirements: p.special_requirements,
                    equipmentCount: 0 // 初始為 0
                }));

                // 批次載入每個專案的設備數量
                const equipmentPromises = projectsData.map(async (project) => {
                    try {
                        const equipmentResult = await api.getEquipmentsByProject(project.id);
                        if (equipmentResult.code === 200 && equipmentResult.body) {
                            project.equipmentCount = equipmentResult.body.length || 0;
                        }
                    } catch (error) {
                        console.warn(`載入專案 ${project.id} 的設備失敗:`, error);
                        project.equipmentCount = 0;
                    }
                });

                // 等待所有設備資料載入完成
                await Promise.all(equipmentPromises);
                
                dashboardHandler.data.projects = projectsData;
            }
            
            utils.hideLoading();
        } catch (error) {
            utils.hideLoading();
            console.error('❌ Load data failed:', error);
            utils.showError('載入資料失敗: ' + error.message);
        }
    },

    determineStatus: (project) => {
        // 判斷專案狀態
        // 如果有預計交貨日期，表示已填寫第二階段
        if (project.expected_delivery_date && project.expected_delivery_period) {
            return 'completed';
        }
        // 如果有部分第二階段資料，表示正在填寫第二階段
        if (project.expected_delivery_period || project.expected_delivery_date) {
            return 'step2';
        }
        // 否則是第一階段
        return 'step1';
    },

    updateStats: () => {
        const totalProjectsEl = document.getElementById('totalProjects');
        const totalStockEl = document.getElementById('totalStock');
        const pendingStep2El = document.getElementById('pendingStep2');
        const completedTodayEl = document.getElementById('completedToday');
        
        const { projects, stocks } = dashboardHandler.data;
        
        // 專案總數
        if (totalProjectsEl) {
            totalProjectsEl.textContent = projects.length;
        }
        
        // 現貨總數 (目前系統沒有現貨功能,顯示 0)
        if (totalStockEl) {
            totalStockEl.textContent = stocks.length;
        }
        
        // 待填第二階段 (狀態為 step1 的專案數)
        const pendingStep2Count = projects.filter(p => p.status === 'step1').length;
        if (pendingStep2El) {
            pendingStep2El.textContent = pendingStep2Count;
        }
        
        // 今日完成 (今天建立或更新的專案數)
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // 格式: YYYY-MM-DD
        
        const completedToday = projects.filter(p => {
            if (!p.createdTime) return false;
            
            // 取得建立日期的 YYYY-MM-DD 部分
            const createdDate = new Date(p.createdTime);
            const createdDateStr = createdDate.toISOString().split('T')[0];
            
            // 也檢查更新時間
            let updatedDateStr = null;
            if (p.updatedTime) {
                const updatedDate = new Date(p.updatedTime);
                updatedDateStr = updatedDate.toISOString().split('T')[0];
            }
            
            return createdDateStr === todayStr || updatedDateStr === todayStr;
        }).length;
        
        if (completedTodayEl) {
            completedTodayEl.textContent = completedToday;
        }
        
        console.log('📊 統計數據已更新:', {
            今天日期: todayStr,
            總專案數: projects.length,
            現貨總數: stocks.length,
            待填第二階段: pendingStep2Count,
            今日完成: completedToday,
            專案資料: projects.map(p => ({
                名稱: p.projectName,
                建立日期: p.createdTime ? new Date(p.createdTime).toISOString().split('T')[0] : null,
                更新日期: p.updatedTime ? new Date(p.updatedTime).toISOString().split('T')[0] : null
            }))
        });
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
            tbody.innerHTML = '<tr class="no-data"><td colspan="7">暫無專案資料</td></tr>';
            return;
        }
        
        // 按建立日期降序排序(最新的在最上面)
        const sortedProjects = [...projects].sort((a, b) => {
            const dateA = new Date(a.createdTime);
            const dateB = new Date(b.createdTime);
            return dateB - dateA; // 降序排列
        });
        
        tbody.innerHTML = sortedProjects.map(project => `
            <tr>
                <td>${project.projectName}</td>
                <td>${project.contactPerson}</td>
                <td>${project.equipmentCount || 0}</td>
                <td><span class="status-badge status-${project.status || 'step1'}">${dashboardHandler.getStatusText(project.status)}</span></td>
                <td>${utils.formatDateTime(project.createdTime)}</td>
                <td>${project.updatedTime ? utils.formatDateTime(project.updatedTime) : '-'}</td>
                <td>
                    <button class="btn btn-secondary" onclick="dashboardHandler.showDetail('project', '${project.id}')">查看</button>
                    ${project.status === 'step1' ? `<button class="btn btn-primary" onclick="location.href='project-step2.html?id=${project.id}'">填寫第二階段</button>` : ''}
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
            
            const projectResult = await api.getProject(id);
            const project = projectResult.body;
            
            const equipmentResult = await api.getEquipmentsByProject(id);
            const equipments = equipmentResult.body || [];
            
            const item = {
                projectName: project.p_name,
                contactPerson: project.contact_name,
                contactEmail: project.contact_email,
                contactPhone: project.contact_phone,
                owner: project.owner,
                remark: project.remark,
                status: dashboardHandler.determineStatus(project),
                createdTime: project.created_time,
                updatedTime: project.updated_time,
                // 第二階段欄位
                expectedDeliveryPeriod: project.expected_delivery_period,
                expectedDeliveryDate: project.expected_delivery_date,
                expectedContractPeriod: project.expected_contract_period,
                contractStartDate: project.contract_start_date,
                contractEndDate: project.contract_end_date,
                deliveryAddress: project.delivery_address,
                specialRequirements: project.special_requirements,
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
                <div class="info-item"><strong>專案名稱：</strong>${item.projectName}</div>
                <div class="info-item"><strong>聯絡人：</strong>${item.contactPerson}</div>
                <div class="info-item"><strong>聯絡信箱：</strong>${item.contactEmail || '-'}</div>
                <div class="info-item"><strong>聯絡電話：</strong>${item.contactPhone || '-'}</div>
                <div class="info-item"><strong>負責人：</strong>${item.owner || '-'}</div>
                <div class="info-item"><strong>狀態：</strong><span class="status-badge status-${item.status}">${dashboardHandler.getStatusText(item.status)}</span></div>
                <div class="info-item"><strong>建立時間：</strong>${utils.formatDateTime(item.createdTime)}</div>
                ${item.updatedTime ? `<div class="info-item"><strong>更新時間：</strong>${utils.formatDateTime(item.updatedTime)}</div>` : ''}
            </div>
        `;
        
        // 第二階段資訊
        if (item.status !== 'step1') {
            html += `
                <br>
                <h4>交貨資訊</h4>
                <br>
                <div class="info-grid">
                    <div class="info-item"><strong>預計交貨期：</strong>${item.expectedDeliveryPeriod || '-'}</div>
                    <div class="info-item"><strong>預計交貨日：</strong>${item.expectedDeliveryDate ? utils.formatDate(item.expectedDeliveryDate) : '-'}</div>
                    <div class="info-item"><strong>預計履約期：</strong>${item.expectedContractPeriod || '-'}</div>
                    <div class="info-item"><strong>履約開始日：</strong>${item.contractStartDate ? utils.formatDate(item.contractStartDate) : '-'}</div>
                    <div class="info-item"><strong>履約結束日：</strong>${item.contractEndDate ? utils.formatDate(item.contractEndDate) : '-'}</div>
                    <div class="info-item"><strong>交貨地址：</strong>${item.deliveryAddress || '-'}</div>
                    ${item.specialRequirements ? `<div class="info-item" style="grid-column: 1 / -1;"><strong>特殊需求：</strong>${item.specialRequirements}</div>` : ''}
                </div>
            `;
        }
        
        if (item.equipments && item.equipments.length > 0) {
            html += `
                <br>
                <h4>設備清單</h4>
                <br>
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
        case 'project-step2.html':
            projectStep2Handler.init();
            break;
        case 'dashboard.html':
            dashboardHandler.init();
            break;
        default:
            console.log('📄 Page loaded:', currentPage);
    }
});

// 全局錯誤處理
window.addEventListener('error', (e) => {
    console.error('💥 Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('💥 Unhandled promise rejection:', e.reason);
});

// 匯出供其他腳本使用
window.ProjectReportSystem = {
    utils,
    api,
    projectStep1Handler,
    projectStep2Handler,
    dashboardHandler
};