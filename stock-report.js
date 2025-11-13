// stock-report.js - 現貨報備相關功能

// 現貨報備表單處理
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
            
            // 收集現貨基本資料
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
            
            // 收集設備資料
            const equipments = stockReportHandler.collectEquipments(formData);
            
            console.log('📋 提交現貨報備資料:', { stockData, equipments });
            
            // 步驟 1: 建立現貨報備
            console.log('⏳ 正在建立現貨報備...');
            const stockResult = await api.createStock(stockData);
            console.log('✅ 現貨報備建立成功:', stockResult);
            
            // 從回應中取得現貨 ID
            const stockID = stockResult.body;
            
            if (!stockID) {
                throw new Error('無法取得現貨報備 ID');
            }
            
            // 步驟 2: 建立設備(如果有設備)
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

// 將現貨報備處理器加入全域
window.ProjectReportSystem = window.ProjectReportSystem || {};
window.ProjectReportSystem.stockReportHandler = stockReportHandler;