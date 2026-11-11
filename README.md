# ⏱️ BreatheTime

Aplicativo desktop para Windows (**Electron + React + TypeScript + Vite**) focado em gestão de tempo com múltiplos cronômetros em 3 níveis (**Projeto → Tarefa → Divisões de Cronômetro**), projetado para facilitar o lançamento de horas no **Bitrix24**.

---

## ✨ Funcionalidades

- **Hierarquia em 3 Níveis (`Projeto → Tarefa → Divisões`)**:
  - Agrupe tarefas por Projeto/Cliente com cores identificadoras e soma automática do tempo total.
  - Crie tarefas que já nascem com o cronômetro principal pronto para dar Play.
  - Divida uma mesma tarefa em múltiplos sub-cronômetros com **Labels Rápidas e Editáveis** (`Desenvolvimento`, `Pesquisa`, `Reunião`, `Análise`, `Testes`, `Ajustes`, etc.).
- **Otimizado para o Bitrix24**:
  - Visores destacam separadamente **Horas (`XXh`)** e **Minutos (`YYm`)** para leitura imediata ao preencher o Bitrix24.
  - **Cópia de 1 Clique**: Copia `[Label] Descrição` (ou `Descrição` pura) individualmente por divisão, ou copia todas as descrições consolidadas da tarefa inteira.
- **Correção Manual de Tempo**:
  - Clique direto no visor de tempo para digitar Horas e Minutos manualmente ou use os botões rápidos `-5m` e `+5m`.
- **Histórico do Dia**:
  - Ao clicar em **Concluir**, o tempo sai da lista ativa e vai para a aba **Histórico do Dia**, permitindo consultar o total trabalhado, copiar novamente a descrição ou restaurar o cronômetro.
- **Modo Desktop & Mini-Barra Flutuante**:
  - Suporte a **Sempre no Topo (`Pin`)**, controle de **Transparência/Opacidade** e **Modo Compacto (Pílula)**.
- **Atalhos Globais de Teclado** (funcionam em qualquer tela do Windows):
  - `Alt + Shift + P`: Play / Pause no cronômetro ativo
  - `Alt + Shift + M`: Alternar Modo Compacto ↔ Janela Expandida
  - `Alt + Shift + B`: Minimizar ↔ Abrir de volta na tela
  - *Todos os atalhos são personalizáveis pelo ícone `⌨️` na barra superior.*

---

## 🚀 Como Rodar e Compilar

### Instalar dependências
```bash
npm install
```

### Rodar em modo desenvolvimento
```bash
npm run dev
```

### Gerar o executável nativo (`BreatheTime.exe`) + Atalho na Área de Trabalho
```bash
npm run dist:exe
```
O executável será gerado em `release/BreatheTime/BreatheTime.exe` e um atalho será criado automaticamente no seu Desktop.
