# Solvus — Controle Financeiro Pessoal

Aplicativo desktop para controle financeiro pessoal, desenvolvido com Electron. Leve, offline e sem necessidade de cadastro — seus dados ficam salvos localmente no seu computador.

## Download

Acesse a aba [Releases](../../releases) e baixe o executável `Solvus-1.1.0.exe`. Basta executar, sem instalação.

## Funcionalidades

### Lançamentos
- Registro de entradas e saídas por categoria
- Contas fixas/recorrentes com suporte a **parcelas** (decrementa automaticamente a cada lançamento)
- Seleção múltipla de itens para somar valores antes de lançar
- Mapeamento de gastos por dia do mês

### Visão Geral
- Cards com saldo do mês, saldo anual e saldo total
- Taxa de poupança, maior gasto, média diária e comparativo com o mês anterior
- Gráfico de tendência anual (entradas vs. saídas + saldo acumulado)
- Comparativo entre meses

### Metas
- Cadastro de metas financeiras de longo prazo
- Cálculo automático de tempo estimado para atingir a meta com base no padrão de gastos

### Radar Financeiro
- Ticket médio de compra
- Padrão de consumo
- Sugestões de economia cruzadas com as metas
- Progresso das metas em percentual e tempo restante
- Dicas financeiras contra compras por impulso

### Outros
- Seção de gastos com **pets**
- **Vínculos e dívidas**: associe lançamentos a pessoas ou instituições
- Categorias personalizadas
- Modo escuro / claro
- **Ocultar valores** com um clique (privacidade rápida)
- **Senha de acesso** com hash SHA-256
- Exportação para Excel (.xlsx)
- Backup e restauração em JSON
- Auto-backup semanal automático

## Tecnologias

- [Electron](https://www.electronjs.org/)
- JavaScript, HTML5, CSS3
- [Chart.js](https://www.chartjs.org/) — gráficos
- [SheetJS](https://sheetjs.com/) — exportação Excel
- Armazenamento local em JSON (`AppData`)

## Como rodar localmente

```bash
# Clone o repositório
git clone https://github.com/paulaalessandrars/Solvus.git
cd Solvus

# Instale as dependências
npm install

# Inicie o app
npm start
```

> Requer [Node.js](https://nodejs.org/) instalado.

## Compilar o executável

```bash
npm run build
```

O arquivo `Solvus-x.x.x.exe` será gerado na pasta `dist/`.

## Privacidade

Todos os dados são salvos **exclusivamente no seu computador** (`%APPDATA%\solvus\`). Nenhuma informação é enviada para servidores externos.
