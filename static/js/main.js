/**
 * SAP Fiori Dashboard - Main JavaScript
 * Gerencia interações, tema e navegação
 */

class FioriDashboard {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.activeTab = null;
        
        this.init();
    }

    /**
     * Inicialização da aplicação
     */
    init() {
        this.setupTheme();
        this.setupEventListeners();
        this.setupTabs();
        this.setupTooltips();
        this.setupAnimations();
        
        console.log('🚀 SAP Fiori Dashboard inicializado');
    }

    /**
     * Configuração do sistema de tema
     */
    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
            this.updateThemeIcon();
        }
    }

    /**
     * Alterna entre tema claro e escuro
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
        this.updateThemeIcon();
        
        // Animação suave de transição
        document.body.style.transition = 'background-color 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);

        // Enviar para API se disponível
        this.sendThemeToAPI();
    }

    /**
     * Atualiza o ícone do botão de tema
     */
    updateThemeIcon() {
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
        }
    }

    /**
     * Envia alteração de tema para API
     */
    async sendThemeToAPI() {
        try {
            await fetch('/api/theme', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ theme: this.currentTheme })
            });
        } catch (error) {
            console.warn('Erro ao salvar tema:', error);
        }
    }

    /**
     * Configuração de event listeners
     */
    setupEventListeners() {
        // Navegação por cards
        document.addEventListener('click', (e) => {
            const tileCard = e.target.closest('.tile-card');
            if (tileCard) {
                const module = tileCard.dataset.module;
                if (module) {
                    this.navigateToModule(module);
                }
            }
        });

        // Filtros da toolbar
        this.setupToolbarFilters();

        // Formulários
        this.setupForms();

        // Responsive navigation
        this.setupResponsiveNavigation();
    }

    /**
     * Navegação para módulos
     */
    navigateToModule(module) {
        const routes = {
            'embalagem': '/embalagem',
            'shelf-life': '/shelf-life',
            'configuracoes': '/configuracoes'
        };

        const url = routes[module];
        if (url) {
            // Animação de carregamento
            this.showLoadingState();
            
            // Pequeno delay para mostrar animação
            setTimeout(() => {
                window.location.href = url;
            }, 150);
        }
    }

    /**
     * Configuração do sistema de abas
     */
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                this.switchTab(targetTab, tabButtons, tabPanels);
            });
        });

        // Ativar primeira aba por padrão
        if (tabButtons.length > 0) {
            const firstTab = tabButtons[0].dataset.tab;
            this.switchTab(firstTab, tabButtons, tabPanels);
        }
    }

    /**
     * Troca de aba ativa
     */
    switchTab(targetTab, tabButtons, tabPanels) {
        // Remover classe ativa de todos os botões e painéis
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanels.forEach(panel => panel.classList.remove('active'));

        // Ativar botão e painel correspondente
        const activeButton = document.querySelector(`[data-tab="${targetTab}"]`);
        const activePanel = document.getElementById(targetTab);

        if (activeButton && activePanel) {
            activeButton.classList.add('active');
            activePanel.classList.add('active');
            this.activeTab = targetTab;

            // Animação de entrada
            activePanel.classList.add('fade-in');
            setTimeout(() => {
                activePanel.classList.remove('fade-in');
            }, 300);
        }
    }

    /**
     * Configuração de filtros da toolbar
     */
    setupToolbarFilters() {
        const filters = document.querySelectorAll('.toolbar-filters select');
        
        filters.forEach(filter => {
            filter.addEventListener('change', (e) => {
                this.applyFilters();
            });
        });
    }

    /**
     * Aplica filtros selecionados
     */
    applyFilters() {
        const statusFilter = document.getElementById('statusFilter');
        const tipoFilter = document.getElementById('tipoFilter');
        const categoriaFilter = document.getElementById('categoria');
        const statusValidadeFilter = document.getElementById('statusValidade');

        // Coletar valores dos filtros
        const filters = {
            status: statusFilter?.value || '',
            tipo: tipoFilter?.value || '',
            categoria: categoriaFilter?.value || '',
            statusValidade: statusValidadeFilter?.value || ''
        };

        // Aplicar filtros aos cards/tabela
        this.filterContent(filters);
    }

    /**
     * Filtra conteúdo baseado nos filtros selecionados
     */
    filterContent(filters) {
        const cards = document.querySelectorAll('.data-card');
        const tableRows = document.querySelectorAll('.data-table tbody tr');

        // Filtrar cards
        cards.forEach(card => {
            let visible = true;
            
            if (filters.status) {
                const statusBadge = card.querySelector('.status-badge');
                if (statusBadge && !statusBadge.classList.contains(filters.status)) {
                    visible = false;
                }
            }

            card.style.display = visible ? 'block' : 'none';
        });

        // Filtrar linhas da tabela
        tableRows.forEach(row => {
            let visible = true;
            
            if (filters.statusValidade) {
                const statusBadge = row.querySelector('.status-badge');
                if (statusBadge && !statusBadge.classList.contains(filters.statusValidade.replace('ok', 'active'))) {
                    visible = false;
                }
            }

            row.style.display = visible ? 'table-row' : 'none';
        });

        this.updateFilterResults();
    }

    /**
     * Atualiza contador de resultados filtrados
     */
    updateFilterResults() {
        const visibleCards = document.querySelectorAll('.data-card:not([style*="display: none"])').length;
        const visibleRows = document.querySelectorAll('.data-table tbody tr:not([style*="display: none"])').length;
        
        console.log(`Filtros aplicados: ${visibleCards} cards, ${visibleRows} linhas visíveis`);
    }

    /**
     * Configuração de formulários
     */
    setupForms() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(form);
            });
        });

        // Toggle switches
        const toggleSwitches = document.querySelectorAll('.toggle-switch input');
        toggleSwitches.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                console.log(`Toggle ${e.target.name}: ${e.target.checked}`);
            });
        });
    }

    /**
     * Manipula envio de formulários
     */
    handleFormSubmit(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        console.log('Dados do formulário:', data);
        
        // Simular envio
        this.showNotification('Configurações salvas com sucesso!', 'success');
    }

    /**
     * Configuração de tooltips
     */
    setupTooltips() {
        const elementsWithTooltip = document.querySelectorAll('[title]');
        
        elementsWithTooltip.forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                this.showTooltip(e.target, e.target.getAttribute('title'));
            });
            
            element.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });
    }

    /**
     * Mostra tooltip
     */
    showTooltip(element, text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: var(--sap-shell-color);
            color: white;
            padding: 0.5rem;
            border-radius: var(--sap-border-radius);
            font-size: 0.8125rem;
            z-index: 1000;
            pointer-events: none;
            box-shadow: var(--sap-shadow);
        `;
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.bottom + 5 + 'px';
        
        this.currentTooltip = tooltip;
    }

    /**
     * Esconde tooltip
     */
    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }

    /**
     * Configuração de animações
     */
    setupAnimations() {
        // Intersection Observer para animações de entrada
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, { threshold: 0.1 });

        // Observar elementos animáveis
        const animatableElements = document.querySelectorAll('.tile-card, .data-card, .stat-card');
        animatableElements.forEach(element => observer.observe(element));
    }

    /**
     * Configuração de navegação responsiva
     */
    setupResponsiveNavigation() {
        // Detectar mudanças de orientação
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleResponsiveLayout();
            }, 100);
        });

        // Detectar redimensionamento
        window.addEventListener('resize', this.debounce(() => {
            this.handleResponsiveLayout();
        }, 250));
    }

    /**
     * Manipula layout responsivo
     */
    handleResponsiveLayout() {
        const isMobile = window.innerWidth < 768;
        
        // Ajustar tabelas em dispositivos móveis
        const tables = document.querySelectorAll('.data-table');
        tables.forEach(table => {
            if (isMobile) {
                table.style.fontSize = '0.8125rem';
            } else {
                table.style.fontSize = '';
            }
        });

        console.log(`Layout responsivo: ${isMobile ? 'Mobile' : 'Desktop'}`);
    }

    /**
     * Mostra estado de carregamento
     */
    showLoadingState() {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Carregando...</p>
            </div>
        `;
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;
        
        document.body.appendChild(loadingOverlay);
        this.currentLoadingOverlay = loadingOverlay;
    }

    /**
     * Esconde estado de carregamento
     */
    hideLoadingState() {
        if (this.currentLoadingOverlay) {
            this.currentLoadingOverlay.remove();
            this.currentLoadingOverlay = null;
        }
    }

    /**
     * Mostra notificação
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            padding: 1rem 1.5rem;
            background: var(--sap-success-color);
            color: white;
            border-radius: var(--sap-border-radius);
            box-shadow: var(--sap-shadow-hover);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        if (type === 'error') {
            notification.style.background = 'var(--sap-error-color)';
        } else if (type === 'warning') {
            notification.style.background = 'var(--sap-warning-color)';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Função debounce para otimizar eventos
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Funções globais para compatibilidade
window.navigateToModule = function(module) {
    if (window.fioriDashboard) {
        window.fioriDashboard.navigateToModule(module);
    }
};

// Inicializar quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.fioriDashboard = new FioriDashboard();
});

// Adicionar estilos CSS dinâmicos para spinner
const spinnerStyles = `
.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--sap-border-color);
    border-top: 4px solid var(--sap-brand-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@keyframes fadeOut {
    from {
        opacity: 1;
        transform: translateX(0);
    }
    to {
        opacity: 0;
        transform: translateX(100%);
    }
}

.loading-spinner {
    text-align: center;
    color: var(--sap-text-color);
}

.notification {
    transform: translateX(100%);
    animation: slideInRight 0.3s ease-out forwards;
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
    }
    to {
        transform: translateX(0);
    }
}
`;

// Adicionar estilos ao documento
const styleSheet = document.createElement('style');
styleSheet.textContent = spinnerStyles;
document.head.appendChild(styleSheet);