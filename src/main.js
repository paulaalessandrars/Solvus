const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'banco_financeiro.json');

let db = { transacoes: [], recorrentes: [], notas: [], configs: { tema: 'dark', ocultar: 'false' } };

function initDB() {
    if (fs.existsSync(dbPath)) {
        try {
            db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        } catch(e) {
            const backupPath = dbPath.replace('.json', `_corrompido_${Date.now()}.json`);
            try { fs.copyFileSync(dbPath, backupPath); } catch {}
            console.error('Banco corrompido. Backup criado em:', backupPath);
        }
    } else {
        salvarDB();
    }
    if (!db.transacoes)  db.transacoes  = [];
    if (!db.recorrentes) db.recorrentes = [];
    if (!db.notas)       db.notas       = [];
    if (!db.metas)       db.metas       = [];
    if (!db.configs)     db.configs     = { tema: 'dark', ocultar: 'false' };
}

function salvarDB() {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function createWindow() {
    const iconPath = path.join(__dirname, '../assets/icon.ico');
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    win.loadFile(path.join(__dirname, 'index.html'));
    win.removeMenu();
}

function autoBackup() {
    try {
        const backupDir = path.join(userDataPath, 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
        const dest  = path.join(backupDir, `backup_${stamp}.json`);
        fs.writeFileSync(dest, JSON.stringify(db, null, 2));
        
        const arquivos = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
            .sort();
        if (arquivos.length > 10) {
            arquivos.slice(0, arquivos.length - 10).forEach(f => {
                try { fs.unlinkSync(path.join(backupDir, f)); } catch {}
            });
        }
        console.log('[AutoBackup] Salvo em:', dest);
    } catch (e) {
        console.error('[AutoBackup] Erro:', e);
    }
}

app.whenReady().then(() => {
    initDB();
    createWindow();
    autoBackup(); 
    setInterval(autoBackup, 7 * 24 * 60 * 60 * 1000); 
});

app.on('window-all-closed', () => { 
    if (process.platform !== 'darwin') app.quit(); 
});

ipcMain.handle('get-dados', () => {
    return {
        transacoes: db.transacoes,
        recorrentes: db.recorrentes,
        notas: db.notas,
        metas: db.metas || [],
        config: db.configs,
        configs: db.configs
    };
});

ipcMain.handle('add-meta', (e, item) => {
    const novoId = Date.now() + Math.floor(Math.random() * 1000);
    db.metas.push({
        id: novoId,
        nome: item.nome,
        objetivo: item.objetivo,
        atual: item.atual,
        icone: item.icone || '🎯',
        aporte: item.aporte || null,
        historico: item.atual > 0 ? [{ data: new Date().toLocaleDateString('pt-BR'), valor: item.atual }] : []
    });
    salvarDB();
    return novoId;
});

ipcMain.handle('update-meta', (e, item) => {
    const idx = db.metas.findIndex(m => m.id === item.id);
    if (idx !== -1) {
        const metaAtual = db.metas[idx];
        const historico = metaAtual.historico || [];
        if (item.atual !== metaAtual.atual) {
            historico.push({ data: new Date().toLocaleDateString('pt-BR'), valor: item.atual });
            if (historico.length > 12) historico.splice(0, historico.length - 12);
        }
        db.metas[idx] = { ...item, historico };
        salvarDB();
    }
});

ipcMain.handle('save-config', (e, { chave, valor }) => { 
    db.configs[chave] = valor; 
    salvarDB(); 
});

ipcMain.handle('add-transacao', (e, item) => {
    const novoId = Date.now() + Math.floor(Math.random() * 1000);
    db.transacoes.push({
        id: novoId,
        data: item.data,
        descricao: item.desc,
        valor: item.val,
        tipo: item.tipo,
        categoria: item.cat,
        observacao: item.obs,
        vinculo: item.vinculo || ''
    });
    salvarDB(); 
    return novoId;
});

ipcMain.handle('update-transacao', (e, item) => {
    const idx = db.transacoes.findIndex(t => t.id === item.id);
    if (idx !== -1) { 
        db.transacoes[idx] = {
            id: item.id,
            data: item.data,
            descricao: item.desc,
            valor: item.val,
            tipo: item.tipo,
            categoria: item.cat,
            observacao: item.obs,
            vinculo: item.vinculo || ''
        };
        salvarDB(); 
    }
});

ipcMain.handle('delete-item', (e, { id, tabela }) => {
    if (db[tabela]) { 
        db[tabela] = db[tabela].filter(item => item.id !== id); 
        salvarDB(); 
    }
});

ipcMain.handle('save-nota', (e, { id, text }) => {
    const dataAtual = new Date().toLocaleString('pt-BR');
    if (id) { 
        const idx = db.notas.findIndex(n => n.id === id); 
        if (idx !== -1) {
            db.notas[idx].texto = text;
            db.notas[idx].data = dataAtual;
        }
    } else { 
        db.notas.push({ id: Date.now(), texto: text, data: dataAtual }); 
    }
    salvarDB();
});

function normalizarCategoria(cat) {
    if (!cat || cat.trim() === '') return 'Outros';
    const mapa = {
        'educacional': 'Educação',
        'salario':     'Salário',
        'salário':     'Salário',
        'compras':     'Compras',
        'dividas':     'Dívidas',
        'dívidas':     'Dívidas',
        'beneficios':  'Benefícios',
        'benefícios':  'Benefícios',
        'assinaturas': 'Assinaturas',
        'faturas':     'Faturas',
        'vestuario':   'Vestuário',
        'vestuário':   'Vestuário',
        'negocios':    'Negócios',
        'negócios':    'Negócios',
        'reserva':     'Reserva',
        'investimentos':'Investimentos',
        'tecnologia':  'Tecnologia',
        'presentes':   'Presentes',
        'beleza':      'Beleza',
        'pet':         'Pet',
        'extra':       'Extra',
    };
    return mapa[cat.trim().toLowerCase()] || cat.trim();
}

ipcMain.handle('importar-json', (e, backupData) => {
    db.transacoes = [];
    db.recorrentes = [];
    db.notas = [];

    if (backupData.transacoes && Array.isArray(backupData.transacoes)) {
        backupData.transacoes.forEach(t => {
            let dataFinal = t.data || t.Data || new Date().toISOString().split('T')[0];
            if (dataFinal.includes('/')) { 
                const p = dataFinal.split('/'); 
                if(p.length === 3) dataFinal = `${p[2]}-${p[1]}-${p[0]}`; 
            }
            db.transacoes.push({
                id: t.id || Date.now(),
                data: dataFinal,
                descricao: t.desc || t.descricao,
                valor: Math.abs(parseFloat(t.val || t.valor || 0)),
                tipo: t.tipo,
                categoria: normalizarCategoria(t.cat || t.categoria || ''),
                observacao: t.obs || '',
                vinculo: t.vinculo || ''
            });
        });
    }
    
    if (backupData.recorrentes) {
        db.recorrentes = backupData.recorrentes.map(r => ({
            ...r,
            categoria: normalizarCategoria(r.categoria || r.cat || ''),
            valor: Math.abs(parseFloat(r.valor || r.val || 0))
        }));
    }

    if (backupData.notas && Array.isArray(backupData.notas)) { 
        backupData.notas.forEach(n => { 
            const textoReal = n.texto || n.text;
            
            if (textoReal && textoReal !== "undefined") {
                db.notas.push({ 
                    id: n.id || Date.now(), 
                    texto: textoReal, 
                    data: n.data || '' 
                }); 
            }
        }); 
    }
    
    db.configs = backupData.configs || backupData.config || { tema: 'dark', ocultar: 'false' };
    if (backupData.metas && Array.isArray(backupData.metas)) { db.metas = backupData.metas; }
    salvarDB();
    return true;
});

ipcMain.handle('reordenar-recorrentes', (e, ids) => {
    const sorted = ids.map(id => db.recorrentes.find(r => r.id === id)).filter(Boolean);
    db.recorrentes = sorted;
    salvarDB();
});

ipcMain.handle('add-recorrente', (e, item) => {
    const novoId = Date.now() + Math.floor(Math.random() * 1000);
    db.recorrentes.push({
        id:        novoId,
        descricao: item.desc,
        valor:     item.val,
        tipo:      item.tipo,
        categoria: item.cat,
        observacao: item.obs,
        vinculo:   item.vinculo || '',
        parcelas:  item.parcelas ?? null
    });
    salvarDB();
    return novoId;
});

ipcMain.handle('update-recorrente', (e, item) => {
    const idx = db.recorrentes.findIndex(r => r.id === item.id);
    if (idx !== -1) {
        db.recorrentes[idx] = {
            id:        item.id,
            descricao: item.desc,
            valor:     item.val,
            tipo:      item.tipo,
            categoria: item.cat,
            observacao: item.obs,
            vinculo:   item.vinculo || '',
            parcelas:  item.parcelas ?? null
        };
        salvarDB();
    }
});

ipcMain.handle('exportar-excel', async (e, transacoes) => {
    const { dialog } = require('electron');
    const XLSX = require('xlsx');

    if (!transacoes || transacoes.length === 0) return { sucesso: false };

    const dadosFormatados = transacoes.map(t => ({
        Data: t.data.split('-').reverse().join('/'),
        Descrição: t.desc,
        Categoria: t.cat || 'Geral',
        Tipo: t.tipo,
        Valor: t.val,
        Observação: t.obs || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Financeiro");

    const { filePath } = await dialog.showSaveDialog({
        title: 'Salvar Planilha Financeira',
        defaultPath: 'Meus_Gastos.xlsx',
        filters: [{ name: 'Planilhas Excel', extensions: ['xlsx'] }]
    });

    if (filePath) {
        XLSX.writeFile(workbook, filePath);
        return { sucesso: true, caminho: filePath };
    }
    return { sucesso: false };
});

ipcMain.handle('exportar-json', async () => {
    const { dialog } = require('electron');
    const { filePath } = await dialog.showSaveDialog({
        title: 'Salvar Backup',
        defaultPath: 'Meu_Backup.json',
        filters: [{ name: 'Arquivo JSON', extensions: ['json'] }]
    });

    if (filePath) {
        fs.writeFileSync(filePath, JSON.stringify(db, null, 2));
        return { sucesso: true, caminho: filePath };
    }
    return { sucesso: false };
});

ipcMain.handle('save-categorias-custom', (e, cats) => {
    db.configs.categorias_custom = cats;
    salvarDB();
});

const SALT = 'solvus_pin_v1';
ipcMain.handle('save-pin', (e, pin) => {
    db.configs.pin_hash = pin ? crypto.createHash('sha256').update(pin + SALT).digest('hex') : null;
    salvarDB();
});
ipcMain.handle('verify-pin', (e, pin) => {
    if (!db.configs.pin_hash) return true;
    return crypto.createHash('sha256').update(pin + SALT).digest('hex') === db.configs.pin_hash;
});
ipcMain.handle('check-pin-set', () => !!db.configs.pin_hash);
