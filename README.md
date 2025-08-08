# 📝 Portal de Notas HTML

Sistema estático para hospedagem de notas HTML pessoais no GitHub Pages.

## 🎯 Objetivo

Este projeto foi desenvolvido para hospedar suas páginas HTML pessoais de forma simples e automática no GitHub Pages. Qualquer arquivo HTML que você criar fica automaticamente disponível online com uma interface elegante para navegação.

## 🚀 Como Usar

### 1. Configuração Inicial

1. **Clone/Fork este repositório**
2. **Ative o GitHub Pages**:
   - Vá em Settings > Pages
   - Source: GitHub Actions
   - O workflow já está configurado em `.github/workflows/pages.yml`

### 2. Adicionando Notas

1. **Crie seus arquivos HTML** na pasta `notes/`
2. **Faça commit e push**:
   ```bash
   git add notes/sua-nota.html
   git commit -m "Adiciona nova nota"
   git push
   ```
3. **Acesse automaticamente** via GitHub Pages

### 3. Estrutura dos Arquivos

Cada arquivo HTML deve ser **autocontido** (HTML + CSS + JS em um único arquivo). Veja o exemplo em `notes/exemplo-nota-interativa.html`.

## 📁 Estrutura do Projeto

```
dev_notes/
├── index.html              # Página principal (auto-lista arquivos)
├── notes/                  # Pasta para suas notas HTML
│   ├── .gitkeep           # Mantém pasta no git
│   └── exemplo-nota-interativa.html
├── .github/workflows/      # Configuração GitHub Actions
│   └── pages.yml          # Deploy automático
├── _config.yml            # Configuração Jekyll
└── README.md              # Este arquivo
```

## ✨ Funcionalidades

### 🏠 Portal Principal (index.html)
- 🔍 **Auto-descoberta** de arquivos HTML via GitHub API
- 🔎 **Sistema de busca** em tempo real
- 📊 **Estatísticas** de arquivos
- 📱 **Design responsivo** e moderno
- ⚡ **Atualização automática** da lista

### 📝 Notas HTML Interativas
- ✅ **Sistema de tarefas** com checkboxes
- 📁 **Seções colapsíveis** para organização
- 📊 **Estatísticas** em tempo real
- 🎨 **Design moderno** e legível
- ⌨️ **Atalhos de teclado** e persistência de dados

## 🛠️ Tecnologias

- **HTML5 + CSS3 + JavaScript**: Páginas estáticas autocontidas
- **GitHub Pages**: Hospedagem gratuita
- **GitHub Actions**: Deploy automático
- **GitHub API**: Auto-descoberta de arquivos
- **Jekyll**: Processamento de páginas estáticas

## 📝 Exemplo de Fluxo de Trabalho

1. **Crio uma nota** (ex: Anotações de reunião)
2. **Salvo como HTML** em `notes/reuniao-projeto-01.html`
3. **Commit e push**:
   ```bash
   git add notes/reuniao-projeto-01.html
   git commit -m "Adiciona notas da reunião do projeto"
   git push
   ```
4. **Automaticamente disponível** em: `https://username.github.io/dev_notes/`

## 🔧 Personalização

### Para modificar o design:
- Edite os estilos CSS nos arquivos HTML
- Mantenha cada arquivo autocontido

### Para adicionar funcionalidades:
- Modifique o JavaScript nos arquivos
- Seguir padrão de documentação profissional

## 📚 Arquivos de Exemplo

- `notes/exemplo-nota-interativa.html`: Exemplo completo de nota HTML interativa
- Inclui sistema de tarefas, seções colapsíveis, estatísticas e persistência de dados

## 🎉 Resultado Final

Após o setup, você terá:
- ✅ Portal online acessível via GitHub Pages
- ✅ Listagem automática de todas as suas notas
- ✅ Sistema de busca e estatísticas
- ✅ Deploy automático a cada push
- ✅ Interface moderna e responsiva

**URL de acesso**: `https://[seu-usuario].github.io/dev_notes/`