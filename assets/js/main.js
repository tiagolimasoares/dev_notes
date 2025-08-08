/**
 * Portal de Notas HTML - Script Principal
 * 
 * Sistema de Gerenciamento de Notas HTML
 * Implementa auto-descoberta e listagem dinâmica de arquivos HTML
 * 
 * Funcionalidades principais:
 * - Auto-descoberta de arquivos HTML na pasta notes
 * - Sistema de busca em tempo real
 * - Interface responsiva e moderna
 * - Atualização automática da lista
 * - Integração com GitHub API
 * - Modo desenvolvimento local
 * 
 * Arquitetura:
 * - Classe principal: NotesPortal
 * - Padrão Module/Class
 * - Event-driven programming
 * - Separation of concerns
 * 
 * @author Portal de Notas HTML
 * @version 1.0.0
 * @requires ES6+
 */

'use strict';

/**
 * Classe principal do Portal de Notas
 * Gerencia toda a funcionalidade do sistema de notas HTML
 */
class NotesPortal {
    /**
     * Construtor da classe NotesPortal
     * Inicializa propriedades e configura o sistema
     */
    constructor() {
        this.files = [];
        this.currentRepo = this.extractRepoInfo();
        this.cacheDuration = 5 * 60 * 1000; // 5 minutos
        this.lastUpdate = null;
        
        // Elementos DOM cache
        this.elements = {
            filesContainer: null,
            searchInput: null,
            refreshBtn: null,
            totalFiles: null,
            lastUpdated: null
        };
        
        this.init();
    }

    /**
     * Inicializa o portal
     * Configura elementos DOM e carrega dados iniciais
     */
    async init() {
        try {
            this.cacheElements();
            this.setupEventListeners();
            await this.loadFiles();
            this.updateStats();
            this.setupAutoUpdate();
            
            console.log('🚀 Portal de Notas inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            this.renderError('Erro na inicialização do sistema');
        }
    }

    /**
     * Cache dos elementos DOM para melhor performance
     */
    cacheElements() {
        this.elements = {
            filesContainer: document.getElementById('files-container'),
            searchInput: document.getElementById('search-input'),
            refreshBtn: document.getElementById('refresh-btn'),
            totalFiles: document.getElementById('total-files'),
            lastUpdated: document.getElementById('last-updated')
        };

        // Validação dos elementos críticos
        if (!this.elements.filesContainer) {
            throw new Error('Elemento files-container não encontrado');
        }
    }

    /**
     * Extrai informações do repositório da URL atual
     * Suporta tanto desenvolvimento local quanto GitHub Pages
     * 
     * @returns {Object} Objeto com informações do repositório
     */
    extractRepoInfo() {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('local')) {
            // Modo desenvolvimento local
            return {
                owner: 'local',
                repo: 'dev_notes',
                branch: 'main',
                isLocal: true
            };
        }
        
        // GitHub Pages: username.github.io/repository
        const pathParts = pathname.split('/').filter(p => p);
        if (hostname.endsWith('.github.io')) {
            const owner = hostname.split('.')[0];
            const repo = pathParts[0] || owner + '.github.io';
            return {
                owner: owner,
                repo: repo,
                branch: 'main',
                isLocal: false
            };
        }
        
        // Fallback para outros casos
        return {
            owner: 'user',
            repo: 'dev_notes', 
            branch: 'main',
            isLocal: false
        };
    }

    /**
     * Configura os listeners de eventos
     * Implementa debounce para otimizar performance
     */
    setupEventListeners() {
        // Event listener para busca com debounce
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', 
                this.debounce((e) => this.filterFiles(e.target.value), 300)
            );
        }

        // Event listener para botão de refresh
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => {
                this.loadFiles(true); // Force refresh
            });
        }

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Listener para visibilidade da página (pause/resume auto-update)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAutoUpdate();
            } else {
                this.resumeAutoUpdate();
            }
        });

        // Listener para mudanças de conexão
        window.addEventListener('online', () => {
            console.log('🌐 Conexão restaurada');
            this.loadFiles(true);
        });

        window.addEventListener('offline', () => {
            console.log('📵 Conexão perdida');
        });
    }

    /**
     * Função utilitária para debounce
     * Otimiza performance em eventos que disparam frequentemente
     * 
     * @param {Function} func Função a ser executada
     * @param {number} wait Tempo de espera em ms
     * @returns {Function} Função com debounce aplicado
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

    /**
     * Gerencia atalhos de teclado
     * 
     * @param {KeyboardEvent} e Evento de teclado
     */
    handleKeyboardShortcuts(e) {
        // Ctrl+R para refresh (override do padrão do navegador)
        if (e.ctrlKey && e.key.toLowerCase() === 'r') {
            e.preventDefault();
            this.loadFiles(true);
        }

        // Ctrl+F para focar na busca
        if (e.ctrlKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            if (this.elements.searchInput) {
                this.elements.searchInput.focus();
            }
        }

        // ESC para limpar busca
        if (e.key === 'Escape') {
            if (this.elements.searchInput) {
                this.elements.searchInput.value = '';
                this.filterFiles('');
            }
        }

        // Home para voltar ao topo
        if (e.key === 'Home' && !e.ctrlKey) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    /**
     * Carrega a lista de arquivos HTML da pasta notes
     * Implementa cache inteligente para otimizar requests
     * 
     * @param {boolean} forceRefresh Força atualização ignorando cache
     */
    async loadFiles(forceRefresh = false) {
        if (!this.elements.filesContainer) return;

        // Verifica cache se não for refresh forçado
        if (!forceRefresh && this.isCacheValid()) {
            console.log('📦 Usando dados do cache');
            this.renderFiles();
            return;
        }

        this.elements.filesContainer.innerHTML = '<div class="loading"><p>🔄 Carregando notas...</p></div>';
        
        // Adiciona classe de loading para feedback visual
        this.elements.filesContainer.classList.add('loading-state');

        try {
            if (this.currentRepo.isLocal) {
                // Em desenvolvimento local, usar lista mock
                await this.loadMockFiles();
            } else {
                // Em produção, usar GitHub API
                await this.loadFromGitHub();
            }
            
            this.lastUpdate = Date.now();
            this.renderFiles();
            this.updateStats();
            
            console.log(`📁 Carregados ${this.files.length} arquivos`);
            
        } catch (error) {
            console.error('❌ Erro ao carregar arquivos:', error);
            this.renderError('Erro ao carregar as notas. Verifique a conexão.');
        } finally {
            this.elements.filesContainer.classList.remove('loading-state');
        }
    }

    /**
     * Verifica se o cache ainda é válido
     * 
     * @returns {boolean} True se o cache é válido
     */
    isCacheValid() {
        return this.lastUpdate && 
               (Date.now() - this.lastUpdate) < this.cacheDuration &&
               this.files.length > 0;
    }

    /**
     * Carrega arquivos mock para desenvolvimento local
     * Simula delay de rede para melhor UX testing
     */
    async loadMockFiles() {
        // Simula delay de rede
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.files = [
            {
                name: 'exemplo-nota-interativa.html',
                path: 'notes/exemplo-nota-interativa.html',
                size: 18750,
                url: './notes/exemplo-nota-interativa.html',
                lastModified: new Date().toISOString()
            },
            {
                name: 'minha-primeira-nota.html', 
                path: 'notes/minha-primeira-nota.html',
                size: 8420,
                url: './notes/minha-primeira-nota.html',
                lastModified: new Date(Date.now() - 86400000).toISOString() // 1 dia atrás
            },
            {
                name: 'anotacoes-reuniao.html',
                path: 'notes/anotacoes-reuniao.html', 
                size: 12340,
                url: './notes/anotacoes-reuniao.html',
                lastModified: new Date(Date.now() - 172800000).toISOString() // 2 dias atrás
            }
        ];
    }

    /**
     * Carrega arquivos do GitHub via API
     * Implementa fallback para diferentes cenários de erro
     */
    async loadFromGitHub() {
        const apiUrl = `https://api.github.com/repos/${this.currentRepo.owner}/${this.currentRepo.repo}/contents/notes`;
        
        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Portal-Notas-HTML'
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('📁 Pasta notes não encontrada no repositório');
                    this.files = [];
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Filtra apenas arquivos HTML e processa dados
            this.files = data
                .filter(file => file.type === 'file' && file.name.endsWith('.html'))
                .map(file => ({
                    name: file.name,
                    path: file.path,
                    size: file.size,
                    url: `https://${this.currentRepo.owner}.github.io/${this.currentRepo.repo}/${file.path}`,
                    download_url: file.download_url,
                    lastModified: new Date().toISOString() // GitHub API não retorna lastModified para contents
                }))
                .sort((a, b) => a.name.localeCompare(b.name)); // Ordena alfabeticamente
                
        } catch (error) {
            // Se falhar, usar lista vazia e log do erro
            this.files = [];
            console.warn('⚠️ GitHub API não disponível:', error.message);
            
            // Se não conseguir carregar do GitHub, tenta usar dados do cache local
            const cachedData = this.getCachedData();
            if (cachedData) {
                this.files = cachedData;
                console.log('📦 Usando dados do cache local como fallback');
            }
        }
    }

    /**
     * Renderiza a lista de arquivos no DOM
     * Aplica animações e estados visuais
     */
    renderFiles() {
        if (!this.elements.filesContainer) return;

        if (this.files.length === 0) {
            this.renderEmptyState();
            return;
        }

        const filesGrid = this.files
            .map(file => this.createFileCard(file))
            .join('');
            
        this.elements.filesContainer.innerHTML = `<div class="files-grid">${filesGrid}</div>`;
        
        // Aplica animações de entrada
        this.animateFileCards();
        
        // Salva dados no cache local
        this.setCachedData(this.files);
    }

    /**
     * Renderiza estado vazio quando não há arquivos
     */
    renderEmptyState() {
        this.elements.filesContainer.innerHTML = `
            <div class="empty-state fade-in">
                <div class="empty-state-icon">📝</div>
                <h3>Nenhuma nota encontrada</h3>
                <p>Adicione arquivos HTML na pasta <code>notes/</code> para começar.</p>
                <p>Os arquivos aparecerão automaticamente após o próximo push.</p>
            </div>
        `;
    }

    /**
     * Cria um card HTML para cada arquivo
     * 
     * @param {Object} file Objeto com dados do arquivo
     * @returns {string} HTML do card
     */
    createFileCard(file) {
        const fileName = file.name.replace('.html', '');
        const fileSize = this.formatFileSize(file.size);
        const lastModified = this.formatDate(file.lastModified);
        
        return `
            <div class="file-card" data-file-name="${file.name.toLowerCase()}" role="article" aria-label="Nota: ${fileName}">
                <a href="${file.url}" class="file-name" target="_blank" rel="noopener noreferrer" aria-describedby="file-info-${fileName}">
                    📝 ${fileName}
                </a>
                <div class="file-info" id="file-info-${fileName}">
                    <span>Tamanho: ${fileSize}</span>
                    ${lastModified ? ` • Modificado: ${lastModified}` : ''}
                </div>
                <div class="file-actions">
                    <a href="${file.url}" class="btn btn-primary" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${fileName} em nova aba">
                        🔗 Abrir Nota
                    </a>
                </div>
            </div>
        `;
    }

    /**
     * Aplica animações de entrada aos cards
     */
    animateFileCards() {
        const cards = document.querySelectorAll('.file-card');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in');
        });
    }

    /**
     * Formata o tamanho do arquivo para exibição
     * 
     * @param {number} bytes Tamanho em bytes
     * @returns {string} Tamanho formatado
     */
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Formata data para exibição
     * 
     * @param {string} dateString Data em formato ISO
     * @returns {string} Data formatada
     */
    formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return '';
        }
    }

    /**
     * Filtra arquivos baseado no termo de busca
     * Implementa busca fuzzy para melhor UX
     * 
     * @param {string} searchTerm Termo de busca
     */
    filterFiles(searchTerm) {
        const cards = document.querySelectorAll('.file-card');
        const term = searchTerm.toLowerCase().trim();

        if (!term) {
            // Se não há termo, mostra todos
            cards.forEach(card => {
                card.style.display = 'block';
                card.classList.remove('hidden');
            });
            return;
        }

        let visibleCount = 0;
        
        cards.forEach(card => {
            const fileName = card.getAttribute('data-file-name');
            const fileContent = card.textContent.toLowerCase();
            
            // Busca fuzzy: verifica se o termo está contido no nome ou conteúdo
            const isVisible = fileName.includes(term) || fileContent.includes(term);
            
            if (isVisible) {
                card.style.display = 'block';
                card.classList.remove('hidden');
                visibleCount++;
            } else {
                card.style.display = 'none';
                card.classList.add('hidden');
            }
        });

        // Feedback visual para resultados da busca
        this.showSearchFeedback(term, visibleCount);
    }

    /**
     * Mostra feedback da busca
     * 
     * @param {string} term Termo buscado
     * @param {number} count Quantidade de resultados
     */
    showSearchFeedback(term, count) {
        // Remove feedback anterior
        const existingFeedback = document.querySelector('.search-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        // Cria novo feedback
        const feedback = document.createElement('div');
        feedback.className = 'search-feedback';
        feedback.innerHTML = `
            <p>🔍 Busca por "<strong>${term}</strong>": ${count} resultado(s) encontrado(s)</p>
        `;
        
        // Insere feedback
        const filesSection = document.querySelector('.files-section');
        if (filesSection) {
            filesSection.insertBefore(feedback, filesSection.querySelector('.files-grid') || filesSection.firstChild);
        }
    }

    /**
     * Atualiza as estatísticas de desempenho
     */
    updateStats() {
        if (this.elements.totalFiles) {
            this.elements.totalFiles.textContent = this.files.length;
        }
        
        if (this.elements.lastUpdated) {
            this.elements.lastUpdated.textContent = new Date().toLocaleTimeString('pt-BR');
        }
    }

    /**
     * Renderiza mensagem de erro
     * 
     * @param {string} message Mensagem de erro
     */
    renderError(message) {
        if (!this.elements.filesContainer) return;
        
        this.elements.filesContainer.innerHTML = `
            <div class="error fade-in" role="alert">
                ⚠️ ${message}
                <button class="btn btn-primary" onclick="window.location.reload()" style="margin-left: 1rem;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }

    /**
     * Configura atualização automática
     */
    setupAutoUpdate() {
        this.autoUpdateInterval = setInterval(() => {
            if (!document.hidden && navigator.onLine) {
                this.loadFiles();
            }
        }, this.cacheDuration);
    }

    /**
     * Pausa atualização automática
     */
    pauseAutoUpdate() {
        if (this.autoUpdateInterval) {
            clearInterval(this.autoUpdateInterval);
            this.autoUpdateInterval = null;
        }
    }

    /**
     * Retoma atualização automática
     */
    resumeAutoUpdate() {
        if (!this.autoUpdateInterval) {
            this.setupAutoUpdate();
        }
    }

    /**
     * Salva dados no localStorage
     * 
     * @param {Array} data Dados a serem salvos
     */
    setCachedData(data) {
        try {
            const cacheData = {
                files: data,
                timestamp: Date.now(),
                version: '1.0.0'
            };
            localStorage.setItem('notes-portal-cache', JSON.stringify(cacheData));
        } catch (error) {
            console.warn('⚠️ Não foi possível salvar cache:', error);
        }
    }

    /**
     * Recupera dados do localStorage
     * 
     * @returns {Array|null} Dados do cache ou null
     */
    getCachedData() {
        try {
            const cached = localStorage.getItem('notes-portal-cache');
            if (!cached) return null;
            
            const data = JSON.parse(cached);
            
            // Verifica se o cache não está muito antigo (1 hora)
            if (Date.now() - data.timestamp > 3600000) {
                localStorage.removeItem('notes-portal-cache');
                return null;
            }
            
            return data.files;
        } catch (error) {
            console.warn('⚠️ Erro ao recuperar cache:', error);
            return null;
        }
    }

    /**
     * Limpa todos os dados de cache
     */
    clearCache() {
        try {
            localStorage.removeItem('notes-portal-cache');
            console.log('🗑️ Cache limpo');
        } catch (error) {
            console.warn('⚠️ Erro ao limpar cache:', error);
        }
    }

    /**
     * Retorna informações de debug do sistema
     * 
     * @returns {Object} Informações de debug
     */
    getDebugInfo() {
        return {
            files: this.files.length,
            repo: this.currentRepo,
            lastUpdate: this.lastUpdate,
            cacheValid: this.isCacheValid(),
            online: navigator.onLine,
            hidden: document.hidden
        };
    }

    /**
     * Destroy instance and cleanup
     */
    destroy() {
        this.pauseAutoUpdate();
        
        // Remove event listeners
        if (this.elements.searchInput) {
            this.elements.searchInput.removeEventListener('input', this.filterFiles);
        }
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.removeEventListener('click', this.loadFiles);
        }
        
        console.log('🧹 Portal de Notas destruído');
    }
}

/**
 * Inicialização do sistema quando o DOM está pronto
 * Implementa padrão de inicialização robusta
 */
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Verifica se o navegador suporta as funcionalidades necessárias
        if (!window.fetch || !window.localStorage) {
            console.error('❌ Navegador não suportado');
            document.body.innerHTML = `
                <div style="text-align: center; padding: 2rem; background: #f8f9fa; margin: 2rem; border-radius: 10px;">
                    <h2>⚠️ Navegador Não Suportado</h2>
                    <p>Este sistema requer um navegador moderno com suporte a ES6+ e LocalStorage.</p>
                    <p>Por favor, atualize seu navegador.</p>
                </div>
            `;
            return;
        }

        // Inicializa o portal
        window.notesPortal = new NotesPortal();
        
        // Expõe funções úteis para debug no console
        window.debugPortal = () => console.table(window.notesPortal.getDebugInfo());
        window.clearPortalCache = () => window.notesPortal.clearCache();
        
        console.log('✅ Sistema inicializado - use debugPortal() para informações de debug');
        
    } catch (error) {
        console.error('💥 Erro crítico na inicialização:', error);
        
        // Fallback para erro crítico
        document.body.innerHTML = `
            <div style="text-align: center; padding: 2rem; background: #fee; margin: 2rem; border-radius: 10px; border: 1px solid #fcc;">
                <h2>💥 Erro no Sistema</h2>
                <p>Ocorreu um erro inesperado. Tente recarregar a página.</p>
                <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    🔄 Recarregar Página
                </button>
            </div>
        `;
    }
});

/**
 * Service Worker registration (opcional)
 * Para funcionalidades offline futuras
 */
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    window.addEventListener('load', async () => {
        try {
            // Registra service worker se disponível
            // const registration = await navigator.serviceWorker.register('/sw.js');
            // console.log('🔧 Service Worker registrado:', registration);
        } catch (error) {
            // console.log('⚠️ Service Worker não disponível:', error);
        }
    });
}

/**
 * Tratamento global de erros não capturados
 */
window.addEventListener('error', (event) => {
    console.error('💥 Erro global capturado:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('💥 Promise rejeitada não tratada:', event.reason);
});

/**
 * Exportação para módulos (se suportado)
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotesPortal };
}
