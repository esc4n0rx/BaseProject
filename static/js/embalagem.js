/**
 * JavaScript específico do módulo de embalagem
 */

class EmbalagemModule {
    constructor() {
        this.selectedFile = null;
        this.uploadInProgress = false;
        this.currentPage = 1;
        this.totalPages = 1;
        this.perPage = 50;
        this.currentFilters = {};
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadStats();
        
        console.log('🚀 Módulo de Embalagem inicializado');
    }

    setupEventListeners() {
        // Upload de arquivo
        const fileInput = document.getElementById('fileInput');
        const fileUploadArea = document.getElementById('fileUploadArea');
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        // Drag and drop
        if (fileUploadArea) {
            fileUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileUploadArea.classList.add('drag-over');
            });
            
            fileUploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                fileUploadArea.classList.remove('drag-over');
            });
            
            fileUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                fileUploadArea.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileSelect({ target: { files: files } });
                }
            });
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/embalagem/stats');
            const data = await response.json();
            
            if (data.success) {
                this.updateStatsDisplay(data.data);
            } else {
                console.error('Erro ao carregar estatísticas:', data.error);
                this.showNotification('Erro ao carregar estatísticas', 'error');
            }
        } catch (error) {
            console.error('Erro na requisição de estatísticas:', error);
            this.showNotification('Erro de conexão ao carregar estatísticas', 'error');
        }
    }

    updateStatsDisplay(stats) {
        // Atualizar valores no dashboard
        const elements = {
            'totalRemessas': stats.total_remessas,
            'pendentes': stats.pendentes,
            'emSeparacao': stats.em_separacao,
            'finalizados': stats.finalizados,
            'faturados': stats.faturados,
            'percentualCorte': `${stats.percentual_corte}%`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        console.log('Estatísticas atualizadas:', stats);
    }

    // Métodos de upload (mantidos do código anterior)
    handleFileSelect(event) {
        const file = event.target.files[0];
        
        if (!file) {
            this.clearFileSelection();
            return;
        }

        // Validar tipo de arquivo
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        
        if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
            this.showNotification('Formato de arquivo inválido. Use apenas .xlsx ou .xls', 'error');
            this.clearFileSelection();
            return;
        }

        // Validar tamanho (16MB)
        const maxSize = 16 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showNotification('Arquivo muito grande. Máximo 16MB', 'error');
            this.clearFileSelection();
            return;
        }

        this.selectedFile = file;
        this.showFileInfo(file);
        this.enableUploadButton();
    }

    showFileInfo(file) {
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const uploadArea = document.getElementById('fileUploadArea');

        if (fileInfo && fileName && fileSize) {
            fileName.textContent = file.name;
            fileSize.textContent = this.formatFileSize(file.size);
            
            fileInfo.style.display = 'block';
            uploadArea.style.display = 'none';
        }
    }

    clearFileSelection() {
        this.selectedFile = null;
        
        const fileInput = document.getElementById('fileInput');
        const fileInfo = document.getElementById('fileInfo');
        const uploadArea = document.getElementById('fileUploadArea');
        
        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.style.display = 'none';
        if (uploadArea) uploadArea.style.display = 'block';
        
        this.disableUploadButton();
    }

    enableUploadButton() {
        const uploadButton = document.getElementById('uploadButton');
        if (uploadButton) {
            uploadButton.disabled = false;
        }
    }

    disableUploadButton() {
        const uploadButton = document.getElementById('uploadButton');
        if (uploadButton) {
            uploadButton.disabled = true;
        }
    }

    async uploadFile() {
        if (!this.selectedFile || this.uploadInProgress) {
            return;
        }

        this.uploadInProgress = true;
        this.showUploadProgress();

        const formData = new FormData();
        formData.append('file', this.selectedFile);

        try {
            const response = await fetch('/api/embalagem/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            this.hideUploadProgress();
            
            if (data.success) {
                this.showUploadResult(true, data.message, data.data);
                this.loadStats(); // Recarregar estatísticas
            } else {
                this.showUploadResult(false, data.error, data.data);
            }
            
        } catch (error) {
            console.error('Erro no upload:', error);
            this.hideUploadProgress();
            this.showUploadResult(false, 'Erro de conexão durante o upload', null);
        }

        this.uploadInProgress = false;
    }

    // Métodos para visualização de dados
    async loadData(page = 1, filters = {}) {
        this.showTableLoading();
        
        try {
            const params = new URLSearchParams({
                page: page,
                per_page: this.perPage,
                ...filters
            });

            const response = await fetch(`/api/embalagem/data?${params}`);
            const data = await response.json();
            
            this.hideTableLoading();
            
            if (data.success) {
                this.displayTableData(data.data);
                this.updatePaginationInfo(data.pagination);
                this.updateDataSummary(data.pagination);
            } else {
                this.showTableEmpty();
                this.showNotification('Erro ao carregar dados', 'error');
            }
            
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.hideTableLoading();
            this.showTableEmpty();
            this.showNotification('Erro de conexão ao carregar dados', 'error');
        }
    }

    displayTableData(data) {
        const tbody = document.getElementById('embalagemTableBody');
        const tableEmpty = document.getElementById('tableEmpty');
        
        if (!tbody) return;

        if (!data || data.length === 0) {
            this.showTableEmpty();
            return;
        }

        tableEmpty.style.display = 'none';
        
        tbody.innerHTML = data.map(record => `
            <tr>
                <td>${record.id}</td>
                <td>${record.Loja}</td>
                <td>${record.Remessa}</td>
                <td>${record.Codigo}</td>
                <td title="${record.Descricao_Produto}">
                    ${record.Descricao_Produto.length > 30 
                        ? record.Descricao_Produto.substring(0, 30) + '...' 
                        : record.Descricao_Produto}
                </td>
                <td>${record.Qtde_Emb}</td>
                <td><span class="status-badge ${record.Status}">${record.Status}</span></td>
                <td>${record.Data_Registro_Formatted || 'N/A'}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon-small" onclick="viewRecordDetails(${record.id})" title="Ver detalhes">👁️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    showTableLoading() {
        const loading = document.getElementById('tableLoading');
        const table = document.querySelector('.table-container');
        const empty = document.getElementById('tableEmpty');
        
        if (loading) loading.style.display = 'block';
        if (table) table.style.display = 'none';
        if (empty) empty.style.display = 'none';
    }

    hideTableLoading() {
        const loading = document.getElementById('tableLoading');
        const table = document.querySelector('.table-container');
        
        if (loading) loading.style.display = 'none';
        if (table) table.style.display = 'block';
    }

    showTableEmpty() {
        const empty = document.getElementById('tableEmpty');
        const table = document.querySelector('.table-container');
        const loading = document.getElementById('tableLoading');
        
        if (empty) empty.style.display = 'block';
        if (table) table.style.display = 'none';
        if (loading) loading.style.display = 'none';
    }

    updatePaginationInfo(pagination) {
        this.currentPage = pagination.current_page;
        this.totalPages = pagination.total_pages;
        
        // Atualizar botões de navegação
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        
        if (prevBtn) prevBtn.disabled = !pagination.has_prev;
        if (nextBtn) nextBtn.disabled = !pagination.has_next;
        
        // Gerar números das páginas
        this.generatePageNumbers(pagination);
    }

    generatePageNumbers(pagination) {
        const pageNumbers = document.getElementById('pageNumbers');
        if (!pageNumbers) return;

        let html = '';
        const current = pagination.current_page;
        const total = pagination.total_pages;
        
        // Lógica para mostrar números de página
        let start = Math.max(1, current - 2);
        let end = Math.min(total, current + 2);
        
        if (start > 1) {
            html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
            if (start > 2) html += `<span class="page-ellipsis">...</span>`;
        }
        
        for (let i = start; i <= end; i++) {
            html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        }
        
        if (end < total) {
            if (end < total - 1) html += `<span class="page-ellipsis">...</span>`;
            html += `<button class="page-btn" onclick="goToPage(${total})">${total}</button>`;
        }
        
        pageNumbers.innerHTML = html;
    }

    updateDataSummary(pagination) {
        const totalRecords = document.getElementById('totalRecords');
        const displayedRecords = document.getElementById('displayedRecords');
        const currentPage = document.getElementById('currentPage');
        const totalPages = document.getElementById('totalPages');
        
        if (totalRecords) totalRecords.textContent = pagination.total_records;
        if (displayedRecords) {
            const start = (pagination.current_page - 1) * pagination.per_page + 1;
            const end = Math.min(pagination.current_page * pagination.per_page, pagination.total_records);
            displayedRecords.textContent = `${start}-${end}`;
        }
        if (currentPage) currentPage.textContent = pagination.current_page;
        if (totalPages) totalPages.textContent = pagination.total_pages;
    }

    async viewRecordDetails(recordId) {
        try {
            const response = await fetch(`/api/embalagem/record/${recordId}`);
            const data = await response.json();
            
            if (data.success) {
                this.displayRecordDetails(data.data);
            } else {
                this.showNotification('Erro ao carregar detalhes do registro', 'error');
            }
            
        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
            this.showNotification('Erro de conexão', 'error');
        }
    }

    displayRecordDetails(record) {
        const content = document.getElementById('recordDetailsContent');
        if (!content) return;
        
        content.innerHTML = `
            <div class="record-details-grid">
                <div class="detail-section">
                    <h4>Informações Básicas</h4>
                    <div class="detail-item">
                        <span class="detail-label">ID:</span>
                        <span class="detail-value">${record.id}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Loja:</span>
                        <span class="detail-value">${record.Loja}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Remessa:</span>
                        <span class="detail-value">${record.Remessa}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Local:</span>
                        <span class="detail-value">${record.Local}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Ordem:</span>
                        <span class="detail-value">${record.Ordem}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Posição Depósito:</span>
                        <span class="detail-value">${record.Posicao_Deposito}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Produto</h4>
                    <div class="detail-item">
                        <span class="detail-label">Código:</span>
                        <span class="detail-value">${record.Codigo}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Descrição:</span>
                        <span class="detail-value">${record.Descricao_Produto}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">UM:</span>
                        <span class="detail-value">${record.UM}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">EAN:</span>
                        <span class="detail-value">${record.EAN || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Quantidades</h4>
                    <div class="detail-item">
                        <span class="detail-label">Qtde Embalagem:</span>
                        <span class="detail-value">${record.Qtde_Emb}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Qtde Caixa:</span>
                        <span class="detail-value">${record.Qtde_CX}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Qtde UM:</span>
                        <span class="detail-value">${record.Qtde_UM}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Estoque:</span>
                        <span class="detail-value">${record.Estoque}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Status e Controle</h4>
                    <div class="detail-item">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value">
                            <span class="status-badge ${record.Status}">${record.Status}</span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Usuário:</span>
                        <span class="detail-value">${record.Usuario || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Data Registro:</span>
                        <span class="detail-value">${record.Data_Registro_Formatted}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Abrir modal
        const modal = document.getElementById('recordDetailModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    // Métodos de navegação e filtros
    applyFilters() {
        const filters = {
            data_inicio: document.getElementById('filterDataInicio')?.value || '',
            data_fim: document.getElementById('filterDataFim')?.value || '',
            status: document.getElementById('filterStatus')?.value || '',
            remessa: document.getElementById('filterRemessa')?.value || '',
            loja: document.getElementById('filterLoja')?.value || '',
            codigo: document.getElementById('filterCodigo')?.value || ''
        };
        
        // Remover filtros vazios
        this.currentFilters = Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value !== '')
        );
        
        this.currentPage = 1; // Reset para primeira página
        this.loadData(this.currentPage, this.currentFilters);
    }

    clearFilters() {
        // Limpar campos de filtro
        const filterInputs = [
            'filterDataInicio', 'filterDataFim', 'filterStatus',
            'filterRemessa', 'filterLoja', 'filterCodigo'
        ];
        
        filterInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
        
        this.currentFilters = {};
        this.currentPage = 1;
        this.loadData(this.currentPage, this.currentFilters);
    }

    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.loadData(page, this.currentFilters);
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }

    async exportData() {
        try {
            const params = new URLSearchParams({
                format: 'excel',
                ...this.currentFilters
            });

            const response = await fetch(`/api/embalagem/export?${params}`);
            const data = await response.json();
            
            if (data.success) {
                // Criar link temporário para download
                const link = document.createElement('a');
                link.href = data.download_url;
                link.download = data.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showNotification(`Exportação concluída: ${data.total_records} registros`, 'success');
            } else {
                this.showNotification('Erro na exportação', 'error');
            }
            
        } catch (error) {
            console.error('Erro na exportação:', error);
            this.showNotification('Erro de conexão na exportação', 'error');
        }
    }

    // Métodos utilitários (mantidos do código anterior)
    showUploadProgress() {
        const progress = document.getElementById('uploadProgress');
        const modalContent = document.querySelector('.upload-section');
        const modalFooter = document.querySelector('.modal-footer');
        
        if (progress) progress.style.display = 'block';
        if (modalContent) modalContent.style.display = 'none';
        if (modalFooter) modalFooter.style.display = 'none';

        // Simular progresso
        let progressValue = 0;
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        const interval = setInterval(() => {
            progressValue += Math.random() * 15;
            if (progressValue > 90) progressValue = 90;
            
            if (progressFill) progressFill.style.width = `${progressValue}%`;
            if (progressText) progressText.textContent = `Processando arquivo... ${Math.round(progressValue)}%`;
        }, 200);

        this.progressInterval = interval;
    }

    hideUploadProgress() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        
        const progress = document.getElementById('uploadProgress');
        if (progress) progress.style.display = 'none';
    }

    showUploadResult(success, message, data) {
        const result = document.getElementById('uploadResult');
        const resultIcon = document.getElementById('resultIcon');
        const resultTitle = document.getElementById('resultTitle');
        const resultMessage = document.getElementById('resultMessage');
        const resultDetails = document.getElementById('resultDetails');
        
        if (!result) return;

        if (resultIcon && resultTitle) {
            if (success) {
                resultIcon.textContent = '✅';
                resultTitle.textContent = 'Upload Realizado com Sucesso!';
                resultIcon.className = 'result-icon success';
            } else {
                resultIcon.textContent = '❌';
                resultTitle.textContent = 'Erro no Upload';
                resultIcon.className = 'result-icon error';
            }
        }
        if (resultMessage) {
            resultMessage.textContent = message;
        }

        if (resultDetails && data) {
            let detailsHtml = '<div class="upload-summary">';
            
            if (data.total_received !== undefined) {
                detailsHtml += `<div class="summary-item">
                    <span class="summary-label">Total de registros:</span>
                    <span class="summary-value">${data.total_received}</span>
                </div>`;
            }
            
            if (data.valid_records !== undefined) {
                detailsHtml += `<div class="summary-item">
                    <span class="summary-label">Registros válidos:</span>
                    <span class="summary-value">${data.valid_records}</span>
                </div>`;
            }
            
            if (data.duplicates_found !== undefined && data.duplicates_found > 0) {
                detailsHtml += `<div class="summary-item warning">
                    <span class="summary-label">Duplicatas encontradas:</span>
                    <span class="summary-value">${data.duplicates_found}</span>
                </div>`;
            }
            
            detailsHtml += '</div>';
            resultDetails.innerHTML = detailsHtml;
        }

        result.style.display = 'block';
        
        const modalFooter = document.querySelector('.modal-footer');
        if (modalFooter) {
            modalFooter.style.display = 'flex';
            modalFooter.innerHTML = `
                <button class="btn btn-primary" onclick="closeUploadModal()">Fechar</button>
            `;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showNotification(message, type = 'info') {
        if (window.fioriDashboard) {
            window.fioriDashboard.showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Funções globais para os botões
function openUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        
        if (window.embalagemModule) {
            window.embalagemModule.clearFileSelection();
        }
        
        const sections = ['uploadProgress', 'uploadResult'];
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });
        
        const uploadSection = document.querySelector('.upload-section');
        const modalFooter = document.querySelector('.modal-footer');
        
        if (uploadSection) uploadSection.style.display = 'block';
        if (modalFooter) {
            modalFooter.style.display = 'flex';
            modalFooter.innerHTML = `
                <button class="btn btn-secondary" onclick="closeUploadModal()">Cancelar</button>
                <button class="btn btn-primary" id="uploadButton" onclick="uploadFile()" disabled>
                    <span class="btn-icon">📤</span>
                    Fazer Upload
                </button>
            `;
        }
    }
}

function openDataModal() {
    const modal = document.getElementById('dataModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Carregar dados na primeira abertura
        if (window.embalagemModule) {
            window.embalagemModule.loadData();
        }
    }
}

function closeDataModal() {
    const modal = document.getElementById('dataModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function closeRecordDetailModal() {
    const modal = document.getElementById('recordDetailModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function removeFile() {
    if (window.embalagemModule) {
        window.embalagemModule.clearFileSelection();
    }
}

function uploadFile() {
    if (window.embalagemModule) {
        window.embalagemModule.uploadFile();
    }
}

function refreshStats() {
    if (window.embalagemModule) {
        window.embalagemModule.loadStats();
        window.embalagemModule.showNotification('Estatísticas atualizadas', 'success');
    }
}

function applyDataFilters() {
    if (window.embalagemModule) {
        window.embalagemModule.applyFilters();
    }
}

function clearDataFilters() {
    if (window.embalagemModule) {
        window.embalagemModule.clearFilters();
    }
}

function exportData() {
    if (window.embalagemModule) {
        window.embalagemModule.exportData();
    }
}

function viewRecordDetails(recordId) {
    if (window.embalagemModule) {
        window.embalagemModule.viewRecordDetails(recordId);
    }
}

function goToPage(page) {
    if (window.embalagemModule) {
        window.embalagemModule.goToPage(page);
    }
}

function nextPage() {
    if (window.embalagemModule) {
        window.embalagemModule.nextPage();
    }
}

function previousPage() {
    if (window.embalagemModule) {
        window.embalagemModule.previousPage();
    }
}

// Inicializar quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.embalagemModule = new EmbalagemModule();
});