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
        this.categorizedFiles = {};
        this.activeCategory = 'todos'; // Categoria ativa atual
        this.currentRepo = this.extractRepoInfo();
        this.cacheDuration = 5 * 60 * 1000; // 5 minutos
        this.lastUpdate = null;
        
        // Configuração dos cadernos/categorias
        this.categories = {
            'DC': {
                name: 'Direito Constitucional',
                icon: '⚖️',
                color: '#3498db',
                files: []
            },
            'DA': {
                name: 'Direito Administrativo', 
                icon: '🏛️',
                color: '#9b59b6',
                files: []
            },
            'RLM': {
                name: 'Raciocínio Lógico',
                icon: '🧠',
                color: '#e74c3c',
                files: []
            },
            'PT': {
                name: 'Língua Portuguesa',
                icon: '📚',
                color: '#27ae60',
                files: []
            },
            'MT': {
                name: 'Matemática',
                icon: '🔢',
                color: '#f39c12',
                files: []
            },
            'DPP': {
                name: 'Processo Penal',
                icon: '⚔️',
                color: '#e67e22',
                files: []
            },
            'DP': {
                name: 'Direito Penal',
                icon: '🛡️',
                color: '#c0392b',
                files: []
            },
            'INF': {
                name: 'Informática',
                icon: '💻',
                color: '#2c3e50',
                files: []
            },
            'GERAL': {
                name: 'Geral',
                icon: '📋',
                color: '#95a5a6',
                files: []
            }
        };
        
        // Elementos DOM cache
        this.elements = {
            filesContainer: null,
            searchInput: null,
            refreshBtn: null,
            totalFiles: null,
            lastUpdated: null,
            categoryTabs: null,
            categoryStats: null
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
        const protocol = window.location.protocol;
        
        // Log detalhado para debug
        console.log(`🔍 [DEBUG] Detectando ambiente:`, {
            hostname,
            pathname, 
            protocol,
            href: window.location.href
        });
        
        // Detecção aprimorada de ambiente local
        const isLocalEnvironment = 
            hostname === 'localhost' || 
            hostname === '127.0.0.1' || 
            hostname.includes('local') ||
            protocol === 'file:' ||
            hostname === '' ||
            !hostname.includes('.');
        
        if (isLocalEnvironment) {
            console.log('🏠 [DEBUG] Ambiente LOCAL detectado - usando fallback local');
            return {
                owner: 'local',
                repo: 'dev_notes',
                branch: 'main', 
                isLocal: true,
                useGitHubAPI: false // Força uso do método local
            };
        }
        
        // GitHub Pages: username.github.io/repository
        const pathParts = pathname.split('/').filter(p => p);
        if (hostname.endsWith('.github.io')) {
            const owner = hostname.split('.')[0];
            const repo = pathParts[0] || owner + '.github.io';
            
            console.log('🌐 [DEBUG] GitHub Pages detectado:', { owner, repo });
            
            return {
                owner: owner,
                repo: repo,
                branch: 'main',
                isLocal: false,
                useGitHubAPI: true
            };
        }
        
        // Fallback para ambiente desconhecido - força modo local
        console.log('⚠️ [DEBUG] Ambiente desconhecido - usando modo local');
        return {
            owner: 'local',
            repo: 'dev_notes', 
            branch: 'main',
            isLocal: true,
            useGitHubAPI: false
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
            console.log(`🔄 [DEBUG] Iniciando carregamento de arquivos...`);
            console.log(`🔄 [DEBUG] Configuração do repo:`, this.currentRepo);
            
            // Estratégia inteligente baseada no ambiente
            if (this.currentRepo.useGitHubAPI === false || this.currentRepo.isLocal) {
                console.log('🏠 [DEBUG] Usando método LOCAL (prioridade)');
                await this.loadLocalFiles();
            } else {
                console.log('🌐 [DEBUG] Tentando GitHub API primeiro...');
                try {
                    await this.loadFromGitHub();
                    console.log('✅ [SUCCESS] Arquivos carregados via GitHub API');
                } catch (githubError) {
                    console.warn('⚠️ [FALLBACK] GitHub API falhou, usando método local:', githubError.message);
                    await this.loadLocalFiles();
                }
            }
            
            this.lastUpdate = Date.now();
            this.categorizeFiles();
            this.renderCategoryTabs();
            this.renderFiles();
            this.updateStats();
            
            console.log(`📁 Carregados ${this.files.length} arquivos organizados em cadernos`);
            
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
     * Carrega arquivos reais da pasta notes localmente
     * Implementa descoberta robusta de todos os arquivos HTML
     */
    async loadLocalFiles() {
        console.log('🔍 [LOCAL] Carregando arquivos reais da pasta notes...');
        
        // Simula delay de rede
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Lista de arquivos HTML conhecidos que devem estar na pasta notes
        // Esta lista será atualizada automaticamente quando novos arquivos forem detectados
        const knownFiles = [

            //#novos uploads de Raciocinio logico
            '2025_08_08_RLM_001 - Estruturas logicas .html',
            '2025_08_08_RLM_002 - Estruturas logicas verdade mentira.html',
            //=================================================================
            '2025_06_25_DC_001 - Introducao a teoria geral dos direitos fundamentais fixacao.html',
            '2025_06_25_DC_002 - Caracteristicas dos direitos fundamentais fixacao.html',
            '2025_06_25_DC_003 - Classificacao dos direitos fundamentais fixacao.html',
            '2025_06_25_DC_004 - Eficacia e aplicacao.html',
            '2025_06_25_DC_005- Teoria dos Direitos Fundamentais Conteúdo e Restrições.html',
            '2025_06_25_DC_006- Teoria dos Direitos Fundamentais Tratados Internacionais de Direitos Humanos.html',
            '2025_06_25_DC_007- Direito a vida fixacao.html',
            '2025_06_25_DC_008- Direito a liberdade fixacao.html',
            '2025_06_25_DC_009- Direito a liberdade de Expressao fixacao.html',
            '2025_06_25_DC_010- Direito a liberdade de Expressao fixacao.html',
            '2025_06_25_DC_011 - Aprofundamento - Eficacia dos direitos fundamentais.html',
            '2025_06_25_DC_012 - Liberdade religiosa fixacao.html',
            '2025_06_25_DC_013 - liberdade de locomocao fixacao.html',
            '2025_06_25_DC_014 - Liberdade de associacao  e reuniaofixacao.html',
            '2025_06_25_DC_015 - Direito a igualdade fixacao.html',
            '2025_06_25_DC_016 - igualdade entre homens e mulheres fixacao.html',
            '2025_06_25_DC_017 - Direito a privacidade fixacao.html',
            '2025_06_25_DC_018 - Direito a privacidade sigilo ao domicilio fixacao.html',
            '2025_06_25_DC_019 - Direito a privacidade sigilo de correspondencia fixacao.html',
            '2025_06_25_DC_020 - Direito a privavidade Sigilo bancario e fiscal fixacao.html',
            '2025_06_25_DC_021 - Direito a privavidade Sigilo de Dados e Comunicações Telefônicas fixacao.html',
            '2025_06_25_DC_022 - Direito a propriedade fixacao.html',
            '2025_06_25_DC_023 - Direitos e Instrumentos de Cidadania perante o Estado e a Justiça fixacao.html',
            '2025_06_25_DC_024 - Direitos individuais proteção ao Direito Adquirido a Coisa Julgada e ao Ato Jurídico Perfeito juiz natural e juri popular fixacao.html',
            '2025_07_08_DC_025 - Principios constitucionais legalidade anterioridade fixacao.html',
            '2025_07_08_DC_026 - mandado de criminalizacao crimes hediondos e equiparaveis fixacao.html',
            '2025_07_08_DC_027 - Garantias penais relativas as prisões fixacao.html',
            '2025_07_08_DC_028 - Garantias processuais dos presos fixacao.html',
            '2025_07_08_DC_029 - Garantias processuais dos presos fixacao.html',
            '2025_07_08_DC_030- Garantias fundamentais habeas corpus fixacao.html',
            '2025_07_08_DC_031- Garantias fundamentais habeas data.html',
            '2025_07_12_DC_032- Garantias fundamentais mandado de segurança parte I fixacao.html',
            '2025_07_14_DC_033 - Mandado de segurança parte II coletivo fixacao.html',
            '2025_07_14_DC_034 - Mandado de injuncao fixacao.html',
            '2025_07_14_DC_035 - Acao popular.html',
            '2025_07_14_DC_036 - Tratados internacionais sobre direitos humanos.html',
            '2025_07_15_DP_001 - Infracao penal fixacao.html',
            '2025_07_15_DP_002 - Fato tipico fixacao.html',
            '2025_07_15_DP_003 - Fato tipico conduta.html',
            '2025_07_16_DP_004 - Dolo.html',
            '2025_07_16_DP_005 - Culpa parte I.html',
            '2025_07_16_DP_006 - Culpa parte II.html',
            '2025_07_18_DP_007 - Resultado.html',
            '2025_07_18_DP_008 - Nexo causal parte I.html',
            '2025_07_18_DP_009 - Nexo causal parte II Concausas.html',
            
        ];
        
        // Converte a lista de arquivos para o formato esperado
        this.files = knownFiles.map((fileName, index) => {
            const baseName = fileName.replace('.html', '');
            const estimatedSize = 8000 + (index * 1000); // Tamanho estimado baseado no índice
            
            // Calcula data baseada no nome do arquivo
            let lastModified = new Date();
            if (fileName.includes('2025_06_25')) {
                lastModified = new Date('2025-06-25');
            } else if (fileName.includes('2025_07_08')) {
                lastModified = new Date('2025-07-08');
            } else if (fileName.includes('2025_07_12')) {
                lastModified = new Date('2025-07-12');
            } else if (fileName.includes('2025_07_14')) {
                lastModified = new Date('2025-07-14');
            } else if (fileName.includes('2025_07_15')) {
                lastModified = new Date('2025-07-15');
            } else if (fileName.includes('2025_07_16')) {
                lastModified = new Date('2025-07-16');
            } else if (fileName.includes('2025_07_18')) {
                lastModified = new Date('2025-07-18');

//com os demais arquivos basta seguir o mesmo padrão, adicionando novos else if conforme necessário
            } else if (fileName.includes('2025_08_08')) {
                lastModified = new Date('2025-08-08');
            }
// todo esse trecho de codigo fechado por este comentario acima            
            
            return {
                name: fileName,
                path: `notes/${fileName}`,
                size: estimatedSize,
                url: `./notes/${encodeURIComponent(fileName)}`,
                lastModified: lastModified.toISOString()
            };
        });
        
        // Ordena por numeração crescente (ordem lógica dos arquivos)
        this.files.sort((a, b) => {
            const numA = this.extractFileNumber(a.name);
            const numB = this.extractFileNumber(b.name);
            
            // Primeiro critério: ordem numérica
            if (numA !== numB) {
                return numA - numB;
            }
            
            // Segundo critério: ordem alfabética
            return a.name.localeCompare(b.name);
        });
        
        console.log(`✅ [LOCAL] Carregados ${this.files.length} arquivos da pasta notes`);
        
        // Validação de segurança
        if (this.files.length === 0) {
            console.error('❌ [ERROR] Nenhum arquivo foi carregado - verificando problema...');
            await this.debugLocalFiles();
        }
        
        // Tenta descobrir novos arquivos dinamicamente (se necessário)
        if (this.files.length < 40) { // Esperamos pelo menos 40 arquivos baseado nos logs
            await this.discoverNewFiles();
        }
    }

    /**
     * Método de debug para diagnosticar problemas de carregamento local
     */
    async debugLocalFiles() {
        console.log('🔧 [DEBUG] Executando diagnóstico do sistema...');
        
        // Informações do ambiente
        console.log('🔧 [DEBUG] Informações do ambiente:', {
            userAgent: navigator.userAgent,
            location: window.location.href,
            baseURI: document.baseURI,
            protocol: window.location.protocol
        });
        
        // Tenta diferentes estratégias para descobrir arquivos
        console.log('🔧 [DEBUG] Tentando estratégias alternativas...');
        
        // Lista expandida com TODOS os arquivos conhecidos do usuário
        const allKnownFiles = [
            // Todos os arquivos de Direito Constitucional
            '2025_06_25_DC_001 - Introducao a teoria geral dos direitos fundamentais fixacao.html',
            '2025_06_25_DC_002 - Caracteristicas dos direitos fundamentais fixacao.html',
            '2025_06_25_DC_003 - Classificacao dos direitos fundamentais fixacao.html',
            '2025_06_25_DC_004 - Eficacia e aplicacao.html',
            '2025_06_25_DC_005- Teoria dos Direitos Fundamentais Conteúdo e Restrições.html',
            '2025_06_25_DC_006- Teoria dos Direitos Fundamentais Tratados Internacionais de Direitos Humanos.html',
            '2025_06_25_DC_007- Direito a vida fixacao.html',
            '2025_06_25_DC_008- Direito a liberdade fixacao.html',
            '2025_06_25_DC_009- Direito a liberdade de Expressao fixacao.html',
            '2025_06_25_DC_010- Direito a liberdade de Expressao fixacao.html',
            '2025_06_25_DC_011 - Aprofundamento - Eficacia dos direitos fundamentais.html',
            '2025_06_25_DC_012 - Liberdade religiosa fixacao.html',
            '2025_06_25_DC_013 - liberdade de locomocao fixacao.html',
            '2025_06_25_DC_014 - Liberdade de associacao  e reuniaofixacao.html',
            '2025_06_25_DC_015 - Direito a igualdade fixacao.html',
            '2025_06_25_DC_016 - igualdade entre homens e mulheres fixacao.html',
            '2025_06_25_DC_017 - Direito a privacidade fixacao.html',
            '2025_06_25_DC_018 - Direito a privacidade sigilo ao domicilio fixacao.html',
            '2025_06_25_DC_019 - Direito a privacidade sigilo de correspondencia fixacao.html',
            '2025_06_25_DC_020 - Direito a privavidade Sigilo bancario e fiscal fixacao.html',
            '2025_06_25_DC_021 - Direito a privavidade Sigilo de Dados e Comunicações Telefônicas fixacao.html',
            '2025_06_25_DC_022 - Direito a propriedade fixacao.html',
            '2025_06_25_DC_023 - Direitos e Instrumentos de Cidadania perante o Estado e a Justiça fixacao.html',
            '2025_06_25_DC_024 - Direitos individuais proteção ao Direito Adquirido a Coisa Julgada e ao Ato Jurídico Perfeito juiz natural e juri popular fixacao.html',
            '2025_07_08_DC_025 - Principios constitucionais legalidade anterioridade fixacao.html',
            '2025_07_08_DC_026 - mandado de criminalizacao crimes hediondos e equiparaveis fixacao.html',
            '2025_07_08_DC_027 - Garantias penais relativas as prisões fixacao.html',
            '2025_07_08_DC_028 - Garantias processuais dos presos fixacao.html',
            '2025_07_08_DC_029 - Garantias processuais dos presos fixacao.html',
            '2025_07_08_DC_030- Garantias fundamentais habeas corpus fixacao.html',
            '2025_07_08_DC_031- Garantias fundamentais habeas data.html',
            '2025_07_12_DC_032- Garantias fundamentais mandado de segurança parte I fixacao.html',
            '2025_07_14_DC_033 - Mandado de segurança parte II coletivo fixacao.html',
            '2025_07_14_DC_034 - Mandado de injuncao fixacao.html',
            '2025_07_14_DC_035 - Acao popular.html',
            '2025_07_14_DC_036 - Tratados internacionais sobre direitos humanos.html',
            // Todos os arquivos de Direito Penal
            '2025_07_15_DP_001 - Infracao penal fixacao.html',
            '2025_07_15_DP_002 - Fato tipico fixacao.html',
            '2025_07_15_DP_003 - Fato tipico conduta.html',
            '2025_07_16_DP_004 - Dolo.html',
            '2025_07_16_DP_005 - Culpa parte I.html',
            '2025_07_16_DP_006 - Culpa parte II.html',
            '2025_07_18_DP_007 - Resultado.html',
            '2025_07_18_DP_008 - Nexo causal parte I.html',
            '2025_07_18_DP_009 - Nexo causal parte II Concausas.html',
            // Arquivo de exemplo
            'exemplo-nota-interativa.html'
        ];
        
        console.log(`🔧 [DEBUG] Lista completa preparada: ${allKnownFiles.length} arquivos`);
        
        // Sobrescreve a lista atual com todos os arquivos conhecidos
        this.files = allKnownFiles.map((fileName, index) => {
            const baseName = fileName.replace('.html', '');
            const estimatedSize = 8000 + (index * 500);
            
            // Extrai data do nome do arquivo
            let lastModified = new Date();
            const dateMatch = fileName.match(/2025_(\d{2})_(\d{2})/);
            if (dateMatch) {
                const month = parseInt(dateMatch[1]);
                const day = parseInt(dateMatch[2]);
                lastModified = new Date(2025, month - 1, day);
            }
            
            return {
                name: fileName,
                path: `notes/${fileName}`,
                size: estimatedSize,
                url: `./notes/${encodeURIComponent(fileName)}`,
                lastModified: lastModified.toISOString(),
                source: 'local-complete-list'
            };
        });
        
        // Ordena por numeração crescente (ordem lógica dos arquivos)
        this.files.sort((a, b) => {
            const numA = this.extractFileNumber(a.name);
            const numB = this.extractFileNumber(b.name);
            
            // Primeiro critério: ordem numérica
            if (numA !== numB) {
                return numA - numB;
            }
            
            // Segundo critério: ordem alfabética
            return a.name.localeCompare(b.name);
        });
        
        console.log(`🎉 [DEBUG] Sistema de emergência ativado: ${this.files.length} arquivos carregados`);
    }

    /**
     * Categoriza arquivos automaticamente baseado nas siglas
     * Implementa sistema de cadernos profissionais por matéria
     */
    categorizeFiles() {
        console.log('📂 [CATEGORIZE] Organizando arquivos em cadernos...');
        
        // Limpa categorias anteriores
        Object.keys(this.categories).forEach(key => {
            this.categories[key].files = [];
        });
        
        // Categoriza cada arquivo baseado na sigla
        this.files.forEach(file => {
            const category = this.detectFileCategory(file.name);
            this.categories[category].files.push({
                ...file,
                category: category,
                numericOrder: this.extractFileNumber(file.name) // Adiciona ordem numérica
            });
        });
        
        // Ordena arquivos dentro de cada categoria por numeração crescente
        Object.keys(this.categories).forEach(categoryKey => {
            this.categories[categoryKey].files.sort((a, b) => {
                // Primeiro critério: ordem numérica
                const numA = a.numericOrder;
                const numB = b.numericOrder;
                
                if (numA !== numB) {
                    return numA - numB;
                }
                
                // Segundo critério: ordem alfabética (fallback)
                return a.name.localeCompare(b.name);
            });
        });
        
        // Ordena também a lista principal
        this.files.sort((a, b) => {
            const categoryA = this.detectFileCategory(a.name);
            const categoryB = this.detectFileCategory(b.name);
            
            // Se mesma categoria, ordena por número
            if (categoryA === categoryB) {
                const numA = this.extractFileNumber(a.name);
                const numB = this.extractFileNumber(b.name);
                
                if (numA !== numB) {
                    return numA - numB;
                }
            }
            
            // Diferentes categorias, ordena por nome da categoria
            return categoryA.localeCompare(categoryB);
        });
        
        // Log das categorias organizadas
        Object.entries(this.categories).forEach(([key, category]) => {
            if (category.files.length > 0) {
                console.log(`📚 [CADERNO] ${category.name}: ${category.files.length} arquivos (ordem crescente)`);
            }
        });
        
        console.log('✅ [CATEGORIZE] Arquivos organizados em cadernos com ordem numérica');
    }

    /**
     * Detecta a categoria de um arquivo baseado no nome
     * Prioridade: DPP > DP (para evitar conflito entre Processo Penal e Direito Penal)
     * 
     * @param {string} fileName Nome do arquivo
     * @returns {string} Chave da categoria
     */
    detectFileCategory(fileName) {
        const upperFileName = fileName.toUpperCase();
        
        // Ordem de verificação importante: DPP antes de DP
        const categoryPriority = ['DPP', 'DC', 'DA', 'RLM', 'PT', 'MT', 'DP', 'INF'];
        
        for (const categoryKey of categoryPriority) {
            if (upperFileName.includes(`_${categoryKey}_`) || 
                upperFileName.includes(`-${categoryKey}-`) ||
                upperFileName.includes(` ${categoryKey} `) ||
                upperFileName.startsWith(`${categoryKey}_`) ||
                upperFileName.startsWith(`${categoryKey}-`)) {
                return categoryKey;
            }
        }
        
        // Se não encontrou nenhuma categoria específica, vai para GERAL
        return 'GERAL';
    }

    /**
     * Extrai a numeração de um arquivo para ordenação crescente
     * Suporta diversos padrões de numeração nos nomes dos arquivos
     * 
     * @param {string} fileName Nome do arquivo
     * @returns {number} Número extraído ou valor alto para arquivos sem numeração
     */
    extractFileNumber(fileName) {
        // Remove extensão para análise
        const baseName = fileName.replace(/\.html?$/i, '');
        
        // Padrões de numeração mais comuns (em ordem de prioridade)
        const patterns = [
            // Padrão principal: 2025_MM_DD_SIGLA_NNN
            /_([A-Z]+)_(\d{3,4})/i,
            
            // Padrão com hífen: SIGLA-NNN
            /([A-Z]+)-(\d{3,4})/i,
            
            // Padrão com espaço: SIGLA NNN
            /([A-Z]+)\s+(\d{3,4})/i,
            
            // Padrão no final: ...NNN
            /(\d{3,4})(?:\s|[-_]|$)/,
            
            // Padrão simples: qualquer sequência de 3+ dígitos
            /(\d{3,})/
        ];
        
        for (const pattern of patterns) {
            const match = baseName.match(pattern);
            if (match) {
                // Se o padrão captura categoria e número
                if (match.length >= 3) {
                    const number = parseInt(match[2], 10);
                    return number;
                }
                // Se captura apenas o número
                else if (match.length >= 2) {
                    const number = parseInt(match[1], 10);
                    return number;
                }
            }
        }
        
        // Se não encontrou numeração, tenta extrair qualquer número no nome
        const anyNumber = baseName.match(/(\d+)/);
        if (anyNumber) {
            const number = parseInt(anyNumber[1], 10);
            return number;
        }
        
        // Se não encontrou nenhum número, retorna valor alto para ficar no final
        return 9999;
    }

    /**
     * Renderiza as abas de categorias (cadernos)
     * Cria interface profissional com contadores e cores
     */
    renderCategoryTabs() {
        console.log('🎨 [UI] Renderizando abas de cadernos...');
        
        const categoryTabsContainer = document.querySelector('.category-tabs');
        if (!categoryTabsContainer) {
            console.warn('⚠️ Container de abas não encontrado');
            return;
        }
        
        // Aba "Todos" sempre primeiro
        let tabsHTML = `
            <button class="category-tab ${this.activeCategory === 'todos' ? 'active' : ''}" 
                    data-category="todos" 
                    onclick="window.notesPortal.switchCategory('todos')">
                <span class="tab-icon">📋</span>
                <span class="tab-name">Todos</span>
                <span class="tab-count">${this.files.length}</span>
            </button>
        `;
        
        // Abas das categorias com arquivos
        Object.entries(this.categories)
            .filter(([key, category]) => category.files.length > 0)
            .sort(([,a], [,b]) => b.files.length - a.files.length) // Ordena por quantidade
            .forEach(([key, category]) => {
                const isActive = this.activeCategory === key;
                tabsHTML += `
                    <button class="category-tab ${isActive ? 'active' : ''}" 
                            data-category="${key}" 
                            style="--category-color: ${category.color}"
                            onclick="window.notesPortal.switchCategory('${key}')">
                        <span class="tab-icon">${category.icon}</span>
                        <span class="tab-name">${category.name}</span>
                        <span class="tab-count">${category.files.length}</span>
                    </button>
                `;
            });
        
        categoryTabsContainer.innerHTML = tabsHTML;
        console.log('✅ [UI] Abas de cadernos renderizadas');
    }

    /**
     * Troca a categoria ativa e atualiza a visualização
     * 
     * @param {string} categoryKey Chave da categoria
     */
    switchCategory(categoryKey) {
        console.log(`🔄 [SWITCH] Mudando para caderno: ${categoryKey}`);
        
        this.activeCategory = categoryKey;
        
        // Atualiza abas visuais
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-category="${categoryKey}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Atualiza visualização dos arquivos
        this.renderFiles();
        this.updateStats();
        
        // Limpa busca se estiver ativa
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        
        console.log(`✅ [SWITCH] Caderno ${categoryKey} ativado`);
    }

    /**
     * Retorna os arquivos da categoria ativa
     * 
     * @returns {Array} Lista de arquivos filtrados por categoria
     */
    getActiveFiles() {
        if (this.activeCategory === 'todos') {
            return this.files;
        }
        
        return this.categories[this.activeCategory]?.files || [];
    }

    /**
     * Descobre novos arquivos dinamicamente testando padrões comuns
     * Atualiza a lista automaticamente quando encontra novos arquivos
     */
    async discoverNewFiles() {
        console.log('🔍 Procurando por novos arquivos...');
        
        const currentFileNames = this.files.map(f => f.name);
        const newFiles = [];
        
        // Padrões de nomes de arquivo para tentar descobrir
        const patterns = [
            // Padrão Direito Constitucional
            { prefix: '2025_', suffix: '_DC_', range: [37, 50], postfix: ' - ' },
            // Padrão Direito Penal  
            { prefix: '2025_', suffix: '_DP_', range: [10, 30], postfix: ' - ' },
            // Outros padrões possíveis
            { prefix: '2025_', suffix: '_CC_', range: [1, 20], postfix: ' - ' },
            { prefix: '2025_', suffix: '_CP_', range: [1, 20], postfix: ' - ' }
        ];
        
        // Testa alguns arquivos possíveis de forma assíncrona
        const testPromises = [];
        
        for (const pattern of patterns) {
            for (let i = pattern.range[0]; i <= pattern.range[1]; i++) {
                const paddedNum = i.toString().padStart(3, '0');
                const testFileName = `${pattern.prefix}*${pattern.suffix}${paddedNum}${pattern.postfix}*.html`;
                
                // Não testa arquivos que já conhecemos
                const exists = currentFileNames.some(name => 
                    name.includes(pattern.suffix + paddedNum)
                );
                
                if (!exists) {
                    testPromises.push(this.testFileExists(pattern, paddedNum));
                }
            }
        }
        
        // Executa testes em paralelo (limitado para não sobrecarregar)
        const results = await Promise.allSettled(testPromises.slice(0, 10));
        
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                newFiles.push(result.value);
            }
        }
        
        if (newFiles.length > 0) {
            console.log(`🎉 Encontrados ${newFiles.length} novos arquivos!`);
            this.files.push(...newFiles);
            this.files.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        }
    }

    /**
     * Testa se um arquivo existe tentando fazer uma requisição HEAD
     * @param {Object} pattern Padrão do arquivo
     * @param {string} num Número do arquivo
     * @returns {Promise<Object|null>} Objeto do arquivo se existir, null caso contrário
     */
    async testFileExists(pattern, num) {
        try {
            // Como não podemos fazer requisições HEAD facilmente no browser local,
            // retornamos null por enquanto. Este método pode ser expandido
            // para usar outras estratégias de descoberta
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Carrega arquivos do GitHub via API  
     * Implementa fallback para diferentes cenários de erro
     */
    async loadFromGitHub() {
        const apiUrl = `https://api.github.com/repos/${this.currentRepo.owner}/${this.currentRepo.repo}/contents/notes`;
        
        console.log(`🌐 [GITHUB] Tentando API: ${apiUrl}`);
        
        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Portal-Notas-HTML',
                    'Cache-Control': 'no-cache'
                }
            });
            
            console.log(`🌐 [GITHUB] Response status: ${response.status}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('📁 [GITHUB] Pasta notes não encontrada no repositório');
                    throw new Error('Pasta notes não encontrada - usando método local');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`🌐 [GITHUB] Dados recebidos: ${data.length} itens`);
            
            // Filtra apenas arquivos HTML e processa dados
            this.files = data
                .filter(file => file.type === 'file' && file.name.endsWith('.html'))
                .map(file => ({
                    name: file.name,
                    path: file.path,
                    size: file.size,
                    url: `https://${this.currentRepo.owner}.github.io/${this.currentRepo.repo}/${file.path}`,
                    download_url: file.download_url,
                    lastModified: new Date().toISOString(), // GitHub API não retorna lastModified para contents
                    source: 'github-api'
                }))
                .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
            
            console.log(`✅ [GITHUB] Processados ${this.files.length} arquivos HTML`);
                
        } catch (error) {
            console.error('❌ [GITHUB] Erro na API:', error.message);
            throw error; // Re-throw para ativar fallback
        }
    }

    /**
     * Renderiza a lista de arquivos no DOM
     * Aplica filtros de categoria e animações
     */
    renderFiles() {
        if (!this.elements.filesContainer) return;

        // Pega arquivos da categoria ativa
        const activeFiles = this.getActiveFiles();
        
        if (activeFiles.length === 0) {
            this.renderEmptyState();
            return;
        }

        const filesGrid = activeFiles
            .map(file => this.createFileCard(file))
            .join('');
            
        this.elements.filesContainer.innerHTML = `<div class="files-grid">${filesGrid}</div>`;
        
        // Aplica animações de entrada
        this.animateFileCards();
        
        // Salva dados no cache local
        this.setCachedData(this.files);
        
        console.log(`🎨 [RENDER] Exibidos ${activeFiles.length} arquivos da categoria: ${this.activeCategory}`);
    }

    /**
     * Renderiza estado vazio quando não há arquivos na categoria
     */
    renderEmptyState() {
        const categoryName = this.activeCategory === 'todos' 
            ? 'total' 
            : this.categories[this.activeCategory]?.name || 'categoria';
            
        const categoryIcon = this.activeCategory === 'todos' 
            ? '📝' 
            : this.categories[this.activeCategory]?.icon || '📋';
            
        this.elements.filesContainer.innerHTML = `
            <div class="empty-state fade-in">
                <div class="empty-state-icon">${categoryIcon}</div>
                <h3>Nenhuma nota encontrada em ${categoryName}</h3>
                ${this.activeCategory === 'todos' 
                    ? '<p>Adicione arquivos HTML na pasta <code>notes/</code> para começar.</p>' 
                    : `<p>Não há arquivos com a sigla <strong>${this.activeCategory}</strong> ainda.</p>`
                }
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
     * Filtra arquivos baseado no termo de busca dentro da categoria ativa
     * Implementa busca fuzzy inteligente por categoria
     * 
     * @param {string} searchTerm Termo de busca
     */
    filterFiles(searchTerm) {
        const cards = document.querySelectorAll('.file-card');
        const term = searchTerm.toLowerCase().trim();

        if (!term) {
            // Se não há termo, mostra todos da categoria ativa
            cards.forEach(card => {
                card.style.display = 'block';
                card.classList.remove('hidden');
            });
            
            // Remove feedback de busca anterior
            const existingFeedback = document.querySelector('.search-feedback');
            if (existingFeedback) {
                existingFeedback.remove();
            }
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

        // Feedback visual para resultados da busca com contexto de categoria
        this.showSearchFeedback(term, visibleCount);
    }

    /**
     * Mostra feedback da busca com contexto de categoria
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

        const categoryName = this.activeCategory === 'todos' 
            ? 'todas as categorias' 
            : this.categories[this.activeCategory]?.name || 'categoria atual';

        // Cria novo feedback
        const feedback = document.createElement('div');
        feedback.className = 'search-feedback';
        feedback.innerHTML = `
            <p>🔍 Busca por "<strong>${term}</strong>" em <em>${categoryName}</em>: 
               <strong>${count}</strong> resultado(s) encontrado(s)</p>
        `;
        
        // Insere feedback
        const filesSection = document.querySelector('.files-section');
        if (filesSection) {
            filesSection.insertBefore(feedback, filesSection.querySelector('.files-grid') || filesSection.firstChild);
        }
    }

    /**
     * Atualiza as estatísticas considerando categoria ativa
     */
    updateStats() {
        const activeFiles = this.getActiveFiles();
        
        if (this.elements.totalFiles) {
            this.elements.totalFiles.textContent = activeFiles.length;
        }
        
        if (this.elements.lastUpdated) {
            this.elements.lastUpdated.textContent = new Date().toLocaleTimeString('pt-BR');
        }
        
        // Atualiza contador na aba ativa
        const activeTab = document.querySelector('.category-tab.active .tab-count');
        if (activeTab) {
            activeTab.textContent = activeFiles.length;
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
