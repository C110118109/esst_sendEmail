// script.js - 完整整合版本(包含專案報備和現貨報備)

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
        // 移除時區標記，直接當作本地時間處理
        const cleanDateString = dateString.replace('Z', '').replace(/\+\d{2}:\d{2}$/, '');
        const date = new Date(cleanDateString);
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
            
            let data;
            try {
                data = await response.json();
                console.log('📥 Response data:', data);
            } catch (e) {
                console.error('❌ Failed to parse JSON:', e);
                throw new Error('伺服器回應格式錯誤');
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (data.code && data.code >= 400) {
                throw new Error(data.message || '請求失敗');
            }

            return data;
        } catch (error) {
            console.error('❌ API request failed:', error);
            
            if (error.message === 'Failed to fetch') {
                throw new Error('無法連接到伺服器,請確認後端服務是否運行在 http://localhost:8080');
            }
            
            throw error;
        }
    },

    // ========== 專案報備 API ==========
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
        
        if (data.projectName) requestBody.p_name = data.projectName;
        if (data.contactPerson) requestBody.contact_name = data.contactPerson;
        if (data.contactPhone) requestBody.contact_phone = data.contactPhone;
        if (data.contactEmail) requestBody.contact_email = data.contactEmail;
        if (data.esstPerson) requestBody.owner = data.esstPerson;
        if (data.remarks) requestBody.remark = data.remarks;
        
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
    },

    // ========== 現貨報備 API ==========
    createStock: async (data) => {
        return await api.request('/stocks', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    createStockEquipmentBatch: async (stockID, equipments) => {
        console.log('📤 Creating stock equipment batch for stock:', stockID);
        console.log('📤 Equipment data:', JSON.stringify(equipments, null, 2));
        
        const requestBody = {
            stock_id: stockID,
            equipments: equipments
        };
        
        console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
        
        return await api.request('/stock-equipments/batch', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });
    },

    getStocks: async (page = 1, limit = 20) => {
        const params = new URLSearchParams({ page, limit });
        return await api.request(`/stocks?${params}`, {
            method: 'GET'
        });
    },

    getStock: async (id) => {
        return await api.request(`/stocks/${id}`, {
            method: 'GET'
        });
    },

    getStockEquipmentsByStock: async (stockID) => {
        return await api.request(`/stock-equipments/stock/${stockID}`, {
            method: 'GET'
        });
    },

    updateStock: async (id, data) => {
        const requestBody = {};
        
        if (data.stockName) requestBody.stock_name = data.stockName;
        if (data.contactPerson) requestBody.contact_name = data.contactPerson;
        if (data.contactPhone) requestBody.contact_phone = data.contactPhone;
        if (data.contactEmail) requestBody.contact_email = data.contactEmail;
        if (data.esstPerson) requestBody.owner = data.esstPerson;
        if (data.remarks) requestBody.remark = data.remarks;
        
        if (data.expectedDeliveryPeriod) requestBody.expected_delivery_period = data.expectedDeliveryPeriod;
        if (data.expectedDeliveryDate) requestBody.expected_delivery_date = data.expectedDeliveryDate;
        if (data.expectedContractPeriod) requestBody.expected_contract_period = data.expectedContractPeriod;
        if (data.contractStartDate) requestBody.contract_start_date = data.contractStartDate;
        if (data.contractEndDate) requestBody.contract_end_date = data.contractEndDate;
        if (data.deliveryAddress) requestBody.delivery_address = data.deliveryAddress;
        if (data.specialRequirements) requestBody.special_requirements = data.specialRequirements;
        
        console.log('📤 Update stock request body:', requestBody);
        
        return await api.request(`/stocks/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(requestBody)
        });
    },

    deleteStock: async (id) => {
        return await api.request(`/stocks/${id}`, {
            method: 'DELETE'
        });
    }
};

// ========== 專案第一階段表單處理 ==========
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
            
            const projectData = {
                projectName: formData.get('projectName'),
                contactPerson: formData.get('contactPerson'),
                contactEmail: formData.get('contactEmail'),
                contactPhone: formData.get('contactPhone'),
                esstPerson: formData.get('esstPerson'),
                remarks: formData.get('remarks')
            };
            
            const equipments = projectStep1Handler.collectEquipments(formData);
            
            console.log('📋 提交資料:', { projectData, equipments });
            
            console.log('⏳ 正在建立專案...');
            const projectResult = await api.createProject(projectData);
            console.log('✅ 專案建立成功:', projectResult);
            
            const projectId = projectResult.body;
            
            if (!projectId) {
                throw new Error('無法取得專案 ID');
            }
            
            if (equipments.length > 0) {
                console.log('⏳ 正在建立設備清單...');
                try {
                    const equipmentResult = await api.createEquipmentBatch(projectId, equipments);
                    console.log('✅ 設備建立成功:', equipmentResult);
                } catch (equipError) {
                    console.warn('⚠️ 設備建立失敗，但專案已建立:', equipError);
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

// ========== 專案第二階段表單處理 ==========
const projectStep2Handler = {
    init: () => {
        const form = document.getElementById('projectStep2Form');
        
        if (form) {
            form.addEventListener('submit', projectStep2Handler.handleSubmit);
        }

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
                
                if (project.expected_delivery_period) {
                    document.getElementById('expectedDeliveryPeriod').value = project.expected_delivery_period;
                }
                if (project.expected_delivery_date) {
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
            
            const result = await api.updateProject(projectId, updateData);
            console.log('✅ 更新成功:', result);
            
            utils.hideLoading();
            utils.showSuccess('第二階段報備完成！');
            
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

// ========== 現貨報備表單處理 ==========
const stockReportHandler = {
    init: () => {
        const form = document.getElementById('stockReportForm');
        const addBtn = document.getElementById('addStockEquipment');
        
        if (form) {
            form.addEventListener('submit', stockReportHandler.handleSubmit);
        }
        
        if (addBtn) {
            addBtn.addEventListener('click', stockReportHandler.addEquipment);
        }

        stockReportHandler.updateRemoveButtons();
    },

    handleSubmit: async (e) => {
        e.preventDefault();
        utils.showLoading();

        try {
            const formData = new FormData(e.target);
            
            const stockData = {
                stock_name: formData.get('stockName'),
                contact_name: formData.get('contactName'),
                contact_email: formData.get('contactEmail') || '',
                contact_phone: formData.get('contactPhone') || '',
                owner: formData.get('esstPerson') || '',
                expected_delivery_period: formData.get('expectedDeliveryPeriod'),
                expected_delivery_date: formData.get('expectedDeliveryDate'),
                expected_contract_period: formData.get('expectedContractPeriod'),
                contract_start_date: formData.get('contractStartDate') || '',
                contract_end_date: formData.get('contractEndDate') || '',
                delivery_address: formData.get('deliveryAddress') || '',
                special_requirements: formData.get('specialRequirements') || '',
                remark: formData.get('remarks') || ''
            };
            
            const equipments = stockReportHandler.collectEquipments(formData);
            
            console.log('📋 提交現貨報備資料:', { stockData, equipments });
            
            console.log('⏳ 正在建立現貨報備...');
            const stockResult = await api.createStock(stockData);
            console.log('✅ 現貨報備建立成功:', stockResult);
            
            const stockID = stockResult.body;
            
            if (!stockID) {
                throw new Error('無法取得現貨報備 ID');
            }
            
            if (equipments.length > 0) {
                console.log('⏳ 正在建立設備清單...');
                try {
                    const equipmentResult = await api.createStockEquipmentBatch(stockID, equipments);
                    console.log('✅ 設備建立成功:', equipmentResult);
                } catch (equipError) {
                    console.warn('⚠️ 設備建立失敗，但現貨報備已建立:', equipError);
                    utils.hideLoading();
                    utils.showSuccess(`現貨報備建立成功！\n現貨編號: ${stockID}\n\n注意：設備清單建立失敗，請稍後手動新增。`);
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                    return;
                }
            }
            
            utils.hideLoading();
            utils.showSuccess(`現貨報備成功！\n現貨編號: ${stockID}\n\n報備資訊已完成，請盡快安排出貨。`);
            
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
                    part_number: partNumbers[i],
                    quantity: parseInt(quantities[i]),
                    description: descriptions[i] || ''
                });
            }
        }
        
        return equipments;
    },

    addEquipment: () => {
        const list = document.getElementById('stockEquipmentList');
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
            stockReportHandler.updateRemoveButtons();
        });
        
        stockReportHandler.updateRemoveButtons();
    },

    updateRemoveButtons: () => {
        const items = document.querySelectorAll('#stockEquipmentList .equipment-item');
        items.forEach((item, index) => {
            const removeBtn = item.querySelector('.remove-equipment');
            if (removeBtn) {
                removeBtn.style.display = items.length > 1 ? 'block' : 'none';
            }
        });
    }
};

// ========== Dashboard 處理 ==========
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
            
            // 載入專案資料
            const projectsResult = await api.getProjects(1, 100);
            console.log('📥 Projects loaded:', projectsResult);
            
            if (projectsResult.code === 200 && projectsResult.body) {
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
                    equipmentCount: 0
                }));

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

                await Promise.all(equipmentPromises);
                dashboardHandler.data.projects = projectsData;
            }
            
            // 載入現貨資料
            const stocksResult = await api.getStocks(1, 100);
            console.log('📥 Stocks loaded:', stocksResult);
            
            if (stocksResult.code === 200 && stocksResult.body) {
                const stocksData = stocksResult.body.stocks.map(s => ({
                    id: s.stock_id,
                    stockName: s.stock_name,
                    contactPerson: s.contact_name,
                    contactEmail: s.contact_email,
                    contactPhone: s.contact_phone,
                    owner: s.owner,
                    remark: s.remark,
                    expectedDeliveryDate: s.expected_delivery_date,
                    expectedDeliveryPeriod: s.expected_delivery_period,
                    expectedContractPeriod: s.expected_contract_period,
                    contractStartDate: s.contract_start_date,
                    contractEndDate: s.contract_end_date,
                    deliveryAddress: s.delivery_address,
                    specialRequirements: s.special_requirements,
                    createdTime: s.created_time,
                    updatedTime: s.updated_time,
                    equipmentCount: 0
                }));

                const stockEquipmentPromises = stocksData.map(async (stock) => {
                    try {
                        const equipmentResult = await api.getStockEquipmentsByStock(stock.id);
                        if (equipmentResult.code === 200 && equipmentResult.body) {
                            stock.equipmentCount = equipmentResult.body.length || 0;
                        }
                    } catch (error) {
                        console.warn(`載入現貨 ${stock.id} 的設備失敗:`, error);
                        stock.equipmentCount = 0;
                    }
                });

                await Promise.all(stockEquipmentPromises);
                dashboardHandler.data.stocks = stocksData;
            }
            
            utils.hideLoading();
        } catch (error) {
            utils.hideLoading();
            console.error('❌ Load data failed:', error);
            utils.showError('載入資料失敗: ' + error.message);
        }
    },

    determineStatus: (project) => {
        if (project.expected_delivery_date && project.expected_delivery_period) {
            return 'completed';
        }
        if (project.expected_delivery_period || project.expected_delivery_date) {
            return 'step2';
        }
        return 'step1';
    },

    updateStats: () => {
        const totalProjectsEl = document.getElementById('totalProjects');
        const totalStockEl = document.getElementById('totalStock');
        const pendingStep2El = document.getElementById('pendingStep2');
        const completedTodayEl = document.getElementById('completedToday');
        
        const { projects, stocks } = dashboardHandler.data;
        
        if (totalProjectsEl) {
            totalProjectsEl.textContent = projects.length;
        }
        
        if (totalStockEl) {
            totalStockEl.textContent = stocks.length;
        }
        
        const pendingStep2Count = projects.filter(p => p.status === 'step1').length;
        if (pendingStep2El) {
            pendingStep2El.textContent = pendingStep2Count;
        }
        
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const completedToday = projects.filter(p => {
            if (!p.createdTime) return false;
            const createdDate = new Date(p.createdTime);
            const createdDateStr = createdDate.toISOString().split('T')[0];
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
        
        const sortedProjects = [...projects].sort((a, b) => {
            const dateA = new Date(a.createdTime);
            const dateB = new Date(b.createdTime);
            return dateB - dateA;
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
        
        const sortedStocks = [...stocks].sort((a, b) => {
            const dateA = new Date(a.createdTime);
            const dateB = new Date(b.createdTime);
            return dateB - dateA;
        });
        
        tbody.innerHTML = sortedStocks.map(stock => `
            <tr>
                <td>${stock.stockName}</td>
                <td>${stock.contactPerson}</td>
                <td>${stock.equipmentCount || 0}</td>
                <td>${stock.expectedDeliveryDate ? utils.formatDate(stock.expectedDeliveryDate) : '-'}</td>
                <td>${utils.formatDateTime(stock.createdTime)}</td>
                <td>
                    <button class="btn btn-secondary" onclick="dashboardHandler.showStockDetail('${stock.id}')">查看</button>
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

    showStockDetail: async (stockId) => {
        try {
            utils.showLoading();
            
            const stockResult = await api.getStock(stockId);
            const stock = stockResult.body;
            
            const equipmentResult = await api.getStockEquipmentsByStock(stockId);
            const equipments = equipmentResult.body || [];
            
            const item = {
                stockName: stock.stock_name,
                contactPerson: stock.contact_name,
                contactEmail: stock.contact_email,
                contactPhone: stock.contact_phone,
                owner: stock.owner,
                remark: stock.remark,
                createdTime: stock.created_time,
                updatedTime: stock.updated_time,
                expectedDeliveryPeriod: stock.expected_delivery_period,
                expectedDeliveryDate: stock.expected_delivery_date,
                expectedContractPeriod: stock.expected_contract_period,
                contractStartDate: stock.contract_start_date,
                contractEndDate: stock.contract_end_date,
                deliveryAddress: stock.delivery_address,
                specialRequirements: stock.special_requirements,
                equipments: equipments
            };
            
            const modal = document.getElementById('detailModal');
            const title = document.getElementById('modalTitle');
            const content = document.getElementById('modalContent');
            
            if (modal && title && content) {
                title.textContent = `現貨 - ${item.stockName}`;
                content.innerHTML = dashboardHandler.generateStockDetailHTML(item);
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
            html += `
                <br>
                <h4>備註</h4>
                <br>
                <p>${item.remark}</p>
            `;
        }
        
        return html;
    },

    generateStockDetailHTML: (item) => {
        let html = `
            <div class="info-grid">
                <div class="info-item"><strong>項目名稱：</strong>${item.stockName}</div>
                <div class="info-item"><strong>聯絡人：</strong>${item.contactPerson}</div>
                <div class="info-item"><strong>聯絡信箱：</strong>${item.contactEmail || '-'}</div>
                <div class="info-item"><strong>聯絡電話：</strong>${item.contactPhone || '-'}</div>
                <div class="info-item"><strong>負責人：</strong>${item.owner || '-'}</div>
                <div class="info-item"><strong>建立時間：</strong>${utils.formatDateTime(item.createdTime)}</div>
                ${item.updatedTime ? `<div class="info-item"><strong>更新時間：</strong>${utils.formatDateTime(item.updatedTime)}</div>` : ''}
            </div>
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
            html += `
                <br>
                <h4>備註</h4>
                <br>
                <p>${item.remark}</p>
            `;
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

// ========== 頁面初始化 ==========
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
        case 'stock-report.html':
            stockReportHandler.init();
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
    stockReportHandler,
    dashboardHandler
};