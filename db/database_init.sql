-- Tabela para lançamentos financeiros (baseada no seu objeto 'transacoes')
CREATE TABLE IF NOT EXISTS transacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL, -- Formato YYYY-MM-DD
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    tipo TEXT NOT NULL, -- 'Entrada' ou 'Saída'
    categoria TEXT NOT NULL,
    observacao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para contas fixas/recorrentes (baseada no seu objeto 'recorrentes')
CREATE TABLE IF NOT EXISTS recorrentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    tipo TEXT NOT NULL,
    categoria TEXT NOT NULL,
    observacao TEXT
);

-- Tabela de anotações (com campo de atualização para ordenação)
CREATE TABLE IF NOT EXISTS notas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    texto TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para configurações do usuário (Modo Privacidade, Tema)
CREATE TABLE IF NOT EXISTS configuracoes (
    chave TEXT PRIMARY KEY,
    valor TEXT
);

-- Inserir configurações padrão se não existirem
INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('tema', 'dark');
INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('ocultar_valores', 'false');