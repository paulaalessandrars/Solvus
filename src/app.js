const CAT_CORES = {
    'Salário':       '#26a69a',
    'Benefícios':    '#66bb6a',
    'Extra':         '#ffa726',
    'Moradia':       '#bb86fc',
    'Transporte':    '#ffb74d',
    'Saúde':         '#4fc3f7',
    'Educação':      '#aed581',
    'Assinaturas':   '#b39ddb',
    'Faturas':       '#ff8a65',
    'Negócios':      '#90caf9',
    'Pet':                '#a5d6a7',
    'Pet - Veterinário':  '#66bb6a',
    'Pet - Alimentação':  '#81c784',
    'Pet - Banho & Tosa': '#4db6ac',
    'Pet - Roupas':       '#f48fb1',
    'Pet - Brinquedos':   '#fff176',
    'Pet - Outros':       '#bcaaa4',
    'Alimentação':   '#03dac6',
    'Vestuário':     '#f48fb1',
    'Beleza':        '#ce93d8',
    'Tecnologia':    '#80deea',
    'Lazer':         '#ef9a9a',
    'Presentes':     '#fff176',
    'Compras':       '#ffcc80',
    'Reserva':       '#c8e6c9',
    'Dívidas':       '#ef5350',
    'Investimentos': '#81d4fa',
    'Outros':        '#78909c',
};

const CATEGORIAS_BASE = [
    { grupo: '— Receitas',         opts: ['Salário', 'Benefícios', 'Extra'] },
    { grupo: '— Gastos Fixos',     opts: ['Moradia', 'Transporte', 'Saúde', 'Educação', 'Assinaturas', 'Faturas', 'Negócios'] },
    { grupo: '— Pets',             opts: ['Pet', 'Pet - Veterinário', 'Pet - Alimentação', 'Pet - Banho & Tosa', 'Pet - Roupas', 'Pet - Brinquedos', 'Pet - Outros'] },
    { grupo: '— Gastos Variáveis', opts: ['Alimentação', 'Vestuário', 'Beleza', 'Tecnologia', 'Lazer', 'Presentes', 'Compras'] },
    { grupo: '— Financeiro',       opts: ['Reserva', 'Dívidas', 'Investimentos'] },
    { grupo: '— Geral',            opts: ['Outros'] },
];
let CATEGORIAS = [...CATEGORIAS_BASE];
let categoriasCustom = [];
const TIPOS = ['Saída', 'Entrada'];

function corCategoria(cat) {
    return CAT_CORES[cat] || '#78909c';
}

function normalizarCat(cat) {
    if (!cat || cat.trim() === '') return 'Outros';
    const mapa = {
        'educacional': 'Educação',
        'salario':     'Salário',
        'salário':     'Salário',
        'dividas':     'Dívidas',
        'dívidas':     'Dívidas',
        'beneficios':  'Benefícios',
    };
    return mapa[cat.trim().toLowerCase()] || cat.trim();
}

function popularSelects() {
    ['man-cat', 'rec-cat'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = '';
        CATEGORIAS.forEach(({ grupo, opts }) => {
            const og = document.createElement('optgroup');
            og.label = grupo;
            opts.forEach(o => {
                const opt = document.createElement('option');
                opt.value = o;
                opt.text  = o;
                og.appendChild(opt);
            });
            sel.appendChild(og);
        });
    });

    ['man-tipo', 'rec-tipo'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = '';
        TIPOS.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.text  = t;
            sel.appendChild(opt);
        });
    });
}

function buildCatSelect(id, selected) {
    const opts = CATEGORIAS.map(({ grupo, opts }) => `
        <optgroup label="${grupo}">
            ${opts.map(o => `<option ${o === selected ? 'selected' : ''}>${o}</option>`).join('')}
        </optgroup>`).join('');
    return `<select id="${id}">${opts}</select>`;
}

let db = { transacoes: [], recorrentes: [], notas: [], metas: [], tema: 'dark' };
let configuracoes = { ocultar: false };
let myChart = null, trendChart = null;
let editNoteId = null;
let _activeDrag = null; 

function showToast(msg, tipo = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerText = msg;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
    }, 3000);
}

function showConfirm(message) {
    const previouslyFocused = document.activeElement;
    return new Promise((resolve) => {
        const overlay  = document.createElement('div');
        overlay.className = 'modal-overlay';
        const box = document.createElement('div');
        box.className = 'modal-box';
        const msg = document.createElement('p');
        msg.innerText = message;
        const actions = document.createElement('div');
        actions.className = 'modal-actions';
        const btnSim = document.createElement('button');
        btnSim.innerText = 'Sim';
        btnSim.className = 'btn-action btn-modal';
        const btnNao = document.createElement('button');
        btnNao.innerText = 'Não';
        btnNao.className = 'btn-cancel btn-modal';

        const close = (v) => {
            try { document.body.removeChild(overlay); } catch {}
            try { if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus(); } catch {}
            resolve(v);
        };
        btnSim.onclick  = () => close(true);
        btnNao.onclick  = () => close(false);
        overlay.onclick = (e) => { if (e.target === overlay) close(false); };
        actions.appendChild(btnSim);
        actions.appendChild(btnNao);
        box.appendChild(msg);
        box.appendChild(actions);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        btnNao.focus();
    });
}

window.addEventListener('DOMContentLoaded', () => {
    popularSelects();

    const hoje    = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesStr  = String(mesAtual + 1).padStart(2, '0');
    const diaStr  = String(hoje.getDate()).padStart(2, '0');
    document.getElementById('man-data').value = `${anoAtual}-${mesStr}-${diaStr}`;

    const selMes  = document.getElementById('filtro-mes');
    const selAno  = document.getElementById('filtro-ano');
    const meses   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    meses.forEach((m, i) => {
        const opt = document.createElement('option');
        opt.value = i; opt.text = m;
        if (i === mesAtual) opt.selected = true;
        selMes.add(opt);
    });
    for (let i = 2024; i <= 2045; i++) {
        const opt = document.createElement('option');
        opt.value = i; opt.text = i;
        if (i === anoAtual) opt.selected = true;
        selAno.add(opt);
    }

    
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoMesAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;
    ['comp-mes-a', 'comp-mes-b'].forEach((id, idx) => {
        const sel = document.getElementById(id);
        if (!sel) return;
        meses.forEach((m, i) => {
            const opt = document.createElement('option');
            opt.value = i; opt.text = m;
            if ((idx === 0 && i === mesAnterior) || (idx === 1 && i === mesAtual)) opt.selected = true;
            sel.add(opt);
        });
    });
    ['comp-ano-a', 'comp-ano-b'].forEach((id, idx) => {
        const sel = document.getElementById(id);
        if (!sel) return;
        for (let i = 2024; i <= 2045; i++) {
            const opt = document.createElement('option');
            opt.value = i; opt.text = i;
            if ((idx === 0 && i === anoMesAnterior) || (idx === 1 && i === anoAtual)) opt.selected = true;
            sel.add(opt);
        }
    });

    
    document.querySelectorAll('.accordion-header[data-target]').forEach(header => {
        header.addEventListener('click', () => toggleAccordion(header.dataset.target));
    });

    
    document.getElementById('btn-toggle-ocultar').addEventListener('click', connectAutoSave);
    document.getElementById('btn-exportar-excel').addEventListener('click', exportarExcel);
    document.getElementById('btn-importar-excel').addEventListener('click', () => document.getElementById('excelInput').click());
    document.getElementById('btn-backup').addEventListener('click', exportarJson);
    document.getElementById('btn-restaurar').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('btn-tema').addEventListener('click', toggleTheme);

    
    document.getElementById('btn-add-man').addEventListener('click', addAvulso);
    document.getElementById('btn-cancel-man').addEventListener('click', () => cancelarEdicao('man'));
    document.getElementById('btn-lancar-selecionadas').addEventListener('click', lancarSelecionadas);
    document.getElementById('btn-add-meta').addEventListener('click', addMeta);

    
    window.addEventListener('scroll', () => {
        document.querySelector('.sticky-top')
            ?.classList.toggle('is-stuck', window.scrollY > 4);
    }, { passive: true });

    
    document.getElementById('btn-add-nota').addEventListener('click', addNota);

    
    document.getElementById('btn-resetar').addEventListener('click', resetarExtrato);
    document.getElementById('filtro-mes').addEventListener('change', render);
    document.getElementById('filtro-ano').addEventListener('change', render);
    document.getElementById('search-input').addEventListener('input', render);
    document.getElementById('filtro-cat').addEventListener('change', render);

    
    document.getElementById('excelInput').addEventListener('change', importarExcel);
    document.getElementById('fileInput').addEventListener('change', loadBackup);

    
    document.getElementById('lista-transacoes').addEventListener('change', e => {
        if (e.target.classList.contains('item-chk')) updateSelectionSummary();
    });

    
    document.getElementById('content-fixas').addEventListener('change', e => {
        if (e.target.classList.contains('rec-chk') || e.target.id === 'chk-todas') {
            updateRecSelectionSummary();
        }
    });

    
    document.getElementById('man-desc').addEventListener('keydown',  e => { if (e.key === 'Enter') addAvulso(); });
    document.getElementById('man-val').addEventListener('keydown',   e => { if (e.key === 'Enter') addAvulso(); });
    document.getElementById('note-text').addEventListener('keydown', e => { if (e.key === 'Enter') addNota(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { cancelarEdicao('man'); cancelarEdicaoInline(); fecharEdicaoMeta(); }
    });

    
    document.getElementById('btn-pin').addEventListener('click', abrirSetupPIN);
    document.getElementById('pin-submit').addEventListener('click', verificarPIN);
    document.getElementById('pin-input').addEventListener('keydown', e => { if (e.key === 'Enter') verificarPIN(); });
    document.getElementById('pin-setup-save').addEventListener('click', salvarNovoPIN);
    document.getElementById('pin-setup-cancel').addEventListener('click', fecharSetupPIN);
    document.getElementById('pin-setup-remove').addEventListener('click', removerPIN);
    document.getElementById('pin-setup-new').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('pin-setup-confirm').focus(); });
    document.getElementById('pin-setup-confirm').addEventListener('keydown', e => { if (e.key === 'Enter') salvarNovoPIN(); });

    
    ['comp-mes-a','comp-ano-a','comp-mes-b','comp-ano-b'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', renderComparativo);
    });

    
    document.getElementById('btn-add-cat-custom').addEventListener('click', addCategoriaCustom);
    document.getElementById('cat-custom-input').addEventListener('keydown', e => { if (e.key === 'Enter') addCategoriaCustom(); });

    carregarDados();
});

async function carregarDados() {
    try {
        const dados = await window.api.getDados();
        db.transacoes = (dados.transacoes || []).map(t => ({
            id:   t.id,
            data: t.data,
            desc: t.descricao || t.desc || 'Sem título',
            val:  Number(t.valor || t.val || 0),
            tipo: t.tipo || 'Saída',
            cat:  normalizarCat(t.categoria || t.cat || ''),
            obs:     t.observacao || t.obs || '',
            vinculo: t.vinculo || ''
        }));
        db.recorrentes = (dados.recorrentes || []).map(r => ({
            id:       r.id,
            desc:     r.descricao || r.desc || '',
            val:      Number(r.valor || r.val || 0),
            tipo:     r.tipo || 'Saída',
            cat:      normalizarCat(r.categoria || r.cat || ''),
            obs:      r.observacao || r.obs || '',
            vinculo:  r.vinculo || '',
            parcelas: r.parcelas ?? null
        }));
        db.notas = (dados.notas || []).map(n => ({
            id: n.id, text: n.texto || n.text || '', data: n.data || ''
        }));
        db.metas = (dados.metas || []).map(m => ({
            ...m,
            historico: m.historico || [],
            aporte: m.aporte || null
        }));
        const conf = dados.configs || dados.config || { tema: 'dark', ocultar: 'false' };
        db.tema = conf.tema || 'dark';
        configuracoes.ocultar = String(conf.ocultar) === 'true';
        document.documentElement.setAttribute('data-theme', db.tema);
        const temaIcons = { dark: '🌙', blue: '🔵', light: '🌞' };
        const temaIconEl = document.getElementById('tema-icon');
        if (temaIconEl) temaIconEl.textContent = temaIcons[db.tema] || '🌙';

        const btnText = document.getElementById('btnText');
        if (btnText) btnText.innerText = configuracoes.ocultar ? 'Mostrar' : 'Ocultar';

        atualizarCategoriasCustom(conf.categorias_custom || []);
        renderCategoriasCustom();

        render();
        applyAccordionState();
        initPIN();
    } catch (err) {
        console.error('Erro ao carregar:', err);
        showToast('Erro ao carregar dados.', 'error');
    }
}

function editarTransacao(id, triggerEl) {
    const t = db.transacoes.find(x => x.id === id);
    if (!t) return;

    
    document.querySelectorAll('.inline-edit-form').forEach(el => el.remove());

    const listItem = triggerEl?.closest('.list-item');
    if (!listItem) return;

    const form = document.createElement('div');
    form.className = 'inline-edit-form';
    form.innerHTML = `
        <div class="ie-header">✏️ Editando lançamento</div>
        <input type="date" id="ie-data" value="${t.data}">
        <input type="text" id="ie-desc" value="${t.desc}" placeholder="Descrição">
        <input type="text" id="ie-obs" class="input-obs" value="${t.obs || ''}" placeholder="Obs (Opcional)">
        <input type="text" id="ie-vinculo" class="input-vinculo" value="${t.vinculo || ''}" placeholder="🔗 Vínculo">
        <div class="row">
            <input type="number" id="ie-val" value="${t.val}" step="0.01" min="0">
            <select id="ie-tipo" class="select-tipo">
                ${TIPOS.map(tp => `<option ${tp === t.tipo ? 'selected' : ''}>${tp}</option>`).join('')}
            </select>
        </div>
        ${buildCatSelect('ie-cat', t.cat)}
        <div class="row--sm">
            <button class="btn-action" onclick="salvarEdicaoTransacao(${id})">💾 Salvar</button>
            <button class="btn-cancel" onclick="cancelarEdicaoInline()">Cancelar</button>
        </div>
    `;

    listItem.insertAdjacentElement('afterend', form);
    form.querySelector('#ie-desc').focus();
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function editarRecorrente(id, triggerEl) {
    const r = db.recorrentes.find(x => x.id === id);
    if (!r) return;

    document.querySelectorAll('.inline-edit-form').forEach(el => el.remove());

    const listItem = triggerEl?.closest('.list-item');
    if (!listItem) return;

    const form = document.createElement('div');
    form.className = 'inline-edit-form';
    form.innerHTML = `
        <div class="ie-header">✏️ Editando modelo fixo</div>
        <input type="text" id="ie-desc" value="${r.desc}" placeholder="Nome do Modelo">
        <input type="text" id="ie-obs" class="input-obs" value="${r.obs || ''}" placeholder="Obs (Opcional)">
        <input type="text" id="ie-vinculo" class="input-vinculo" value="${r.vinculo || ''}" placeholder="🔗 Vínculo">
        <div class="row">
            <input type="number" id="ie-val" value="${r.val}" min="0">
            <select id="ie-tipo" class="select-tipo">
                ${TIPOS.map(tp => `<option ${tp === r.tipo ? 'selected' : ''}>${tp}</option>`).join('')}
            </select>
        </div>
        ${buildCatSelect('ie-cat', r.cat)}
        <div class="row--sm">
            <button class="btn-action btn-action--primary" onclick="salvarEdicaoRecorrente(${id})">💾 Salvar</button>
            <button class="btn-cancel" onclick="cancelarEdicaoInline()">Cancelar</button>
        </div>
    `;

    listItem.insertAdjacentElement('afterend', form);
    form.querySelector('#ie-desc').focus();
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function salvarEdicaoTransacao(id) {
    const data = document.getElementById('ie-data')?.value;
    const desc = document.getElementById('ie-desc')?.value.trim();
    const val  = document.getElementById('ie-val')?.value;
    if (!data)                    return showToast('Selecione uma data.', 'warning');
    if (!desc)                    return showToast('Preencha a descrição.', 'warning');
    if (!val || Number(val) <= 0) return showToast('Informe um valor válido.', 'warning');

    await window.api.updateTransacao({
        id,
        data,
        desc,
        val:     Number(val),
        tipo:    document.getElementById('ie-tipo')?.value,
        cat:     document.getElementById('ie-cat')?.value,
        obs:     document.getElementById('ie-obs')?.value.trim(),
        vinculo: document.getElementById('ie-vinculo')?.value.trim()
    });
    showToast('Lançamento atualizado!', 'success');
    cancelarEdicaoInline();
    carregarDados();
}

async function salvarEdicaoRecorrente(id) {
    const desc = document.getElementById('ie-desc')?.value.trim();
    const val  = document.getElementById('ie-val')?.value;
    if (!desc)                    return showToast('Preencha o nome do modelo.', 'warning');
    if (!val || Number(val) <= 0) return showToast('Informe um valor válido.', 'warning');

    await window.api.updateRecorrente({
        id,
        desc,
        val:     Number(val),
        tipo:    document.getElementById('ie-tipo')?.value,
        cat:     document.getElementById('ie-cat')?.value,
        obs:     document.getElementById('ie-obs')?.value.trim(),
        vinculo: document.getElementById('ie-vinculo')?.value.trim()
    });
    showToast('Modelo atualizado!', 'success');
    cancelarEdicaoInline();
    carregarDados();
}

function cancelarEdicaoInline() {
    document.querySelectorAll('.inline-edit-form').forEach(el => el.remove());
}

function cancelarEdicao() {
    ['man-desc','man-val','man-obs','man-vinculo'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('btn-cancel-man').classList.add('hidden');
}

function setLaunchMode(mode) {
    const isFixa = mode === 'fixa';
    document.getElementById('toggle-avulso').classList.toggle('active',  !isFixa);
    document.getElementById('toggle-fixa').classList.toggle('active',     isFixa);
    document.getElementById('man-data-wrap').classList.toggle('hidden',   isFixa);
    document.getElementById('parcelas-wrap').classList.toggle('hidden',  !isFixa);
    document.getElementById('btn-add-man').textContent = isFixa ? '⚡ Salvar Modelo' : 'Adicionar';
    if (!isFixa) document.getElementById('man-parcelas').value = '';
}

async function addAvulso() {
    const isFixa = document.getElementById('toggle-fixa').classList.contains('active');
    const desc   = document.getElementById('man-desc').value.trim();
    const val    = document.getElementById('man-val').value;

    if (!desc)                    return showToast('Preencha a descrição / nome do modelo.', 'warning');
    if (!val || Number(val) <= 0) return showToast('Informe um valor válido.', 'warning');

    const base = {
        desc,
        val:     Number(val),
        tipo:    document.getElementById('man-tipo').value,
        cat:     document.getElementById('man-cat').value,
        obs:     document.getElementById('man-obs').value.trim(),
        vinculo: document.getElementById('man-vinculo').value.trim()
    };

    if (isFixa) {
        
        const parcelasVal = parseInt(document.getElementById('man-parcelas')?.value);
        const parcelas = (!isNaN(parcelasVal) && parcelasVal >= 1) ? parcelasVal : null;
        await window.api.addRecorrente({ ...base, parcelas });
        const msg = parcelas
            ? `Conta fixa salva com ${parcelas} parcela${parcelas > 1 ? 's' : ''}! Acesse o Extrato → Contas Fixas.`
            : 'Conta fixa salva! Acesse o Extrato → Contas Fixas.';
        showToast(msg, 'success');
        document.getElementById('man-parcelas').value = '';
    } else {
        
        const data = document.getElementById('man-data').value;
        if (!data) return showToast('Selecione uma data.', 'warning');
        await window.api.addTransacao({ ...base, data });
        showToast('Lançamento adicionado!', 'success');
    }

    ['man-desc','man-val','man-obs','man-vinculo'].forEach(id => document.getElementById(id).value = '');
    carregarDados();
}

function isLancada(rec, mesIdx, anoIdx) {
    return db.transacoes.some(t => {
        const [a, m] = t.data.split('-').map(Number);
        return a === anoIdx
            && (m - 1) === mesIdx
            && t.desc === rec.desc
            && t.tipo === rec.tipo
            && t.obs  === 'Conta Fixa';
    });
}

function render() {
    const selMes = document.getElementById('filtro-mes');
    const selAno = document.getElementById('filtro-ano');
    if (!selMes || !selAno) return;

    const mesIdx = parseInt(selMes.value);
    const anoIdx = parseInt(selAno.value);
    const busca    = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
    const catFiltro = document.getElementById('filtro-cat')?.value || '';
    const fmt    = v => configuracoes.ocultar
        ? 'R$ •••••'
        : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    
    const divNotas = document.getElementById('lista-notas');
    if (divNotas) {
        divNotas.innerHTML = db.notas.length === 0
            ? '<div class="empty-state">Nenhuma anotação ainda</div>'
            : db.notas.map(n => `
                <div class="nota-card">
                    <span class="nota-data">📅 ${n.data}</span>
                    <div class="note-row">
                        <span class="note-text-span">${n.text}</span>
                        <div class="note-actions">
                            <button class="btn-list btn-edit" onclick="editarNota(${n.id})">✏️</button>
                            <button class="btn-list" onclick="remover(${n.id},'notas')">✕</button>
                        </div>
                    </div>
                </div>`).join('');
    }

    
    const divRec = document.getElementById('lista-recorrentes');
    if (divRec) {
        if (db.recorrentes.length === 0) {
            divRec.innerHTML = '<div class="empty-state">Nenhum modelo salvo</div>';
        } else {
            const allLancadas = db.recorrentes.every(r => isLancada(r, mesIdx, anoIdx));
            const header = `
                <div class="rec-toolbar">
                    <label class="chk-label">
                        <input type="checkbox" id="chk-todas"
                               onchange="toggleSelecionarTodas(this.checked)"
                               ${allLancadas ? 'disabled' : ''}>
                        <span>Selecionar todas</span>
                    </label>
                </div>`;

            const items = db.recorrentes.map(r => {
                const lancada = isLancada(r, mesIdx, anoIdx);
                return `
                <div class="list-item rec-drag-item ${lancada ? 'rec-lancada' : ''}"
                     data-rec-id="${r.id}">
                    <span class="drag-handle" title="Segure e arraste para reordenar">⠿</span>
                    <label class="chk-label rec-chk-wrap">
                        <input type="checkbox" class="rec-chk" id="chk-${r.id}"
                               value="${r.id}"
                               data-val="${r.val}"
                               data-tipo="${r.tipo}"
                               ${lancada ? 'checked disabled' : ''}>
                    </label>
                    <div class="rec-item-main">
                        <span>${r.desc}</span>
                        ${lancada ? '<span class="badge-lancada">✓ lançado</span>' : ''}
                        ${r.parcelas != null ? (() => {
                            const cls = r.parcelas <= 1 ? 'parcelas-badge--danger' : r.parcelas <= 3 ? 'parcelas-badge--warning' : '';
                            return `<span class="parcelas-badge ${cls}">📅 ${r.parcelas}× restante${r.parcelas > 1 ? 's' : ''}</span>`;
                        })() : ''}
                        ${r.vinculo ? `<span class="vinculo-tag">🔗 ${r.vinculo}</span>` : ''}
                        ${r.obs ? `<span class="obs-text">${r.obs}</span>` : ''}
                    </div>
                    <div class="rec-item-actions">
                        <span class="${r.tipo === 'Entrada' ? 'rec-val--entrada' : 'rec-val--saida'}">${fmt(r.val)}</span>
                        <button class="btn-list btn-edit" onclick="editarRecorrente(${r.id}, this)">✏️</button>
                        <button class="btn-list" onclick="remover(${r.id},'recorrentes')">✕</button>
                    </div>
                </div>`;
            }).join('');

            divRec.innerHTML = header + items;
            initRecDragDrop();
            document.getElementById('rec-selection-summary')?.classList.add('hidden');
        }
    }

    
    document.getElementById('selection-summary')?.classList.add('hidden');

    
    const divTrans = document.getElementById('lista-transacoes');
    if (!divTrans) return;

    let ent = 0, sai = 0, aEnt = 0, aSai = 0;

    const filtradas = db.transacoes.filter(t => {
        const [ano, mes] = t.data.split('-').map(Number);
        const m = mes - 1;
        if (ano === anoIdx) { t.tipo === 'Entrada' ? aEnt += t.val : aSai += t.val; }
        const noMes      = m === mesIdx && ano === anoIdx;
        const matchBusca = !busca
            || t.desc.toLowerCase().includes(busca)
            || t.cat.toLowerCase().includes(busca)
            || (t.obs     && t.obs.toLowerCase().includes(busca))
            || (t.vinculo && t.vinculo.toLowerCase().includes(busca));
        const matchCat   = !catFiltro || t.cat === catFiltro;
        return noMes && matchBusca && matchCat;
    }).sort((a, b) => new Date(b.data) - new Date(a.data));

    
    const filtroCategEl = document.getElementById('filtro-cat');
    if (filtroCategEl) {
        const cats = [...new Set(
            db.transacoes
                .filter(t => { const [a,m] = t.data.split('-').map(Number); return a === anoIdx && (m-1) === mesIdx; })
                .map(t => t.cat)
        )].sort();
        const valAtual = filtroCategEl.value;
        filtroCategEl.innerHTML = `<option value="">Todas as categorias</option>`
            + cats.map(c => `<option value="${c}" ${c === valAtual ? 'selected' : ''}>${c}</option>`).join('');
    }

    if (filtradas.length === 0) {
        divTrans.innerHTML = `<div class="empty-state">${busca ? 'Nenhum resultado encontrado' : 'Nenhum lançamento neste mês'}</div>`;
    } else {
        divTrans.innerHTML = filtradas.map(t => {
            if (t.tipo === 'Entrada') ent += t.val; else sai += t.val;
            const dia = t.data.split('-').reverse().slice(0, 2).join('/');
            return `
            <div class="list-item">
                <label class="chk-label item-sel-wrap">
                    <input type="checkbox" class="item-chk"
                           data-val="${t.val}" data-tipo="${t.tipo}">
                </label>
                <div class="item-info">
                    <span class="date-muted">${dia}</span> ${t.desc}
                    ${t.obs ? `<span class="obs-text">${t.obs}</span>` : ''}
                    ${t.vinculo ? `<span class="vinculo-tag">🔗 ${t.vinculo}</span>` : ''}
                </div>
                <div class="item-actions">
                    <span class="${t.tipo === 'Entrada' ? 'val-plus' : 'val-minus'}">${fmt(t.val)}</span>
                    <button class="btn-list btn-edit" onclick="editarTransacao(${t.id}, this)">✏️</button>
                    <button class="btn-list" onclick="remover(${t.id},'transacoes')">✕</button>
                </div>
            </div>`;
        }).join('');
    }

    
    const saldo = ent - sai;
    document.getElementById('v-ent').innerText = fmt(ent);
    document.getElementById('v-sai').innerText = fmt(sai);

    const elSal = document.getElementById('v-sal');
    elSal.innerText = fmt(saldo);
    applyMoneyColor(elSal, saldo);

    const saldoAnual = aEnt - aSai;
    const elAnual = document.getElementById('v-anual');
    elAnual.innerText = fmt(saldoAnual);
    applyMoneyColor(elAnual, saldoAnual);

    const total = db.transacoes.reduce((acc, t) => t.tipo === 'Entrada' ? acc + t.val : acc - t.val, 0);
    const elTotal = document.getElementById('v-total');
    elTotal.innerText = fmt(total);
    applyMoneyColor(elTotal, total);

    
    const searchSummary = document.getElementById('search-summary');
    if (searchSummary) {
        if (busca && filtradas.length > 0) {
            let bEnt = 0, bSai = 0;
            filtradas.forEach(t => { t.tipo === 'Entrada' ? bEnt += t.val : bSai += t.val; });
            const saldoBusca = bEnt - bSai;
            const corSaldo   = saldoBusca >= 0 ? 'var(--secondary)' : 'var(--danger)';
            searchSummary.classList.remove('hidden');
            searchSummary.innerHTML = `
                <span class="ss-count">${filtradas.length} item(s)</span>
                ${bEnt > 0 ? `<span class="val-plus ss-val">+${fmt(bEnt)}</span>` : ''}
                ${bSai > 0 ? `<span class="val-minus ss-val">−${fmt(bSai)}</span>` : ''}
                <span class="ss-saldo" style="color:${corSaldo}">= ${fmt(Math.abs(saldoBusca))}</span>
            `;
        } else {
            searchSummary.classList.add('hidden');
        }
    }

    updateChart(filtradas);
    renderHeatmap(filtradas, mesIdx, anoIdx);
    updateTrendChart(anoIdx);
    updateInsights(filtradas, mesIdx, anoIdx);
    updateSmartFeed(filtradas, mesIdx, anoIdx);
    updateVinculos();
    updatePainelPet(filtradas);
    renderMetas();
}

function updateChart(filtradas) {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('myChart');
    if (!ctx) return;
    const g = {};
    filtradas.forEach(t => { if (t.tipo === 'Saída') g[t.cat] = (g[t.cat] || 0) + t.val; });
    const labels = Object.keys(g).sort((a, b) => g[b] - g[a]);
    const data   = labels.map(l => g[l]);
    const cores  = labels.map(l => corCategoria(l));
    if (myChart) myChart.destroy();
    if (!labels.length) return;
    myChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: cores, borderWidth: 0 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#888', font: { size: 11 }, padding: 10 }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct   = ((ctx.parsed / total) * 100).toFixed(1);
                            const val   = ctx.parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                            return ` ${ctx.label}: ${val} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateTrendChart(ano) {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    const meses    = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const entradas = new Array(12).fill(0);
    const saidas   = new Array(12).fill(0);
    db.transacoes.forEach(t => {
        const [a, m] = t.data.split('-').map(Number);
        if (a === ano) { t.tipo === 'Entrada' ? entradas[m - 1] += t.val : saidas[m - 1] += t.val; }
    });
    
    const saldoAcumulado = [];
    let acum = 0;
    for (let i = 0; i < 12; i++) {
        acum += entradas[i] - saidas[i];
        saldoAcumulado.push(acum);
    }
    if (trendChart) trendChart.destroy();
    trendChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                { label: 'Entradas', data: entradas, backgroundColor: 'rgba(3,218,198,0.55)',   borderColor: '#03dac6', borderWidth: 1 },
                { label: 'Saídas',   data: saidas,   backgroundColor: 'rgba(207,102,121,0.55)', borderColor: '#cf6679', borderWidth: 1 },
                { label: 'Saldo Acumulado', data: saldoAcumulado, type: 'line', borderColor: '#ffd700', backgroundColor: 'rgba(255,215,0,0.08)', borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 6, fill: true, tension: 0.4, order: 0 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#888' } } },
            scales: {
                x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: {
                    ticks: { color: '#888', callback: v => 'R$ ' + v.toLocaleString('pt-BR') },
                    grid:  { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    });
}

function updateInsights(filtradas, mesIdx, anoIdx) {
    const elCards = document.getElementById('insights-panel');
    const elTips  = document.getElementById('tips-panel');
    if (!elCards) return;

    let ent = 0, sai = 0;
    filtradas.forEach(t => { t.tipo === 'Entrada' ? ent += t.val : sai += t.val; });

    const taxa        = ent > 0 ? ((ent - sai) / ent * 100) : null;
    const daysInMonth = new Date(anoIdx, mesIdx + 1, 0).getDate();
    const mediaDiaria = sai > 0 ? sai / daysInMonth : 0;

    const cats = {};
    filtradas.filter(t => t.tipo === 'Saída').forEach(t => { cats[t.cat] = (cats[t.cat] || 0) + t.val; });
    const maiorCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];

    const prevMes = mesIdx === 0 ? 11 : mesIdx - 1;
    const prevAno = mesIdx === 0 ? anoIdx - 1 : anoIdx;
    let saiAnterior = 0, entAnterior = 0;
    db.transacoes.forEach(t => {
        const [a, m] = t.data.split('-').map(Number);
        if (a === prevAno && (m - 1) === prevMes) {
            t.tipo === 'Saída' ? saiAnterior += t.val : entAnterior += t.val;
        }
    });
    const varPct = saiAnterior > 0 ? ((sai - saiAnterior) / saiAnterior * 100) : null;

    const fmtV  = v => configuracoes.ocultar ? '••••' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtPt = v => (v >= 0 ? '+' : '') + v.toFixed(1) + '%';

    const clsTaxa = taxa === null ? '' : taxa >= 20 ? 'color-success' : taxa > 0 ? 'color-warning' : 'color-danger';
    const clsVar  = varPct === null ? '' : varPct <= 0 ? 'color-success' : varPct < 15 ? 'color-warning' : 'color-danger';
    const clsSaldo = ent - sai >= 0 ? 'color-success' : 'color-danger';

    elCards.innerHTML = `
        <div class="insight-card">
            <span class="insight-icon">💰</span>
            <span class="insight-label">Saldo do Mês</span>
            <span class="insight-value ${clsSaldo}">${fmtV(ent - sai)}</span>
        </div>
        <div class="insight-card">
            <span class="insight-icon">🏦</span>
            <span class="insight-label">Taxa de Poupança</span>
            <span class="insight-value ${clsTaxa}">${taxa !== null ? taxa.toFixed(1) + '%' : '—'}</span>
            <span class="insight-sub">${taxa !== null && taxa >= 20 ? 'Ótimo!' : taxa !== null && taxa < 0 ? 'Gastos acima da renda' : taxa !== null ? 'Meta: 20%' : ''}</span>
        </div>
        <div class="insight-card">
            <span class="insight-icon">🔥</span>
            <span class="insight-label">Maior Gasto</span>
            <span class="insight-value">${maiorCat ? maiorCat[0] : '—'}</span>
            ${maiorCat ? `<span class="insight-sub">${fmtV(maiorCat[1])}</span>` : ''}
        </div>
        <div class="insight-card">
            <span class="insight-icon">📅</span>
            <span class="insight-label">Média Diária</span>
            <span class="insight-value">${mediaDiaria > 0 ? fmtV(mediaDiaria) : '—'}</span>
            <span class="insight-sub">em gastos</span>
        </div>
        <div class="insight-card">
            <span class="insight-icon">📊</span>
            <span class="insight-label">vs. Mês Anterior</span>
            <span class="insight-value ${clsVar}">${varPct !== null ? fmtPt(varPct) : '—'}</span>
            <span class="insight-sub">em gastos</span>
        </div>
    `;

    if (!elTips) return;

    const tips = [];
    const hoje = new Date();
    const isSameMonth = hoje.getFullYear() === anoIdx && hoje.getMonth() === mesIdx;

    if (isSameMonth && sai > 0) {
        const daysPassed = hoje.getDate();

        
        const saiFixa     = filtradas
            .filter(t => t.tipo === 'Saída' && t.obs === 'Conta Fixa')
            .reduce((acc, t) => acc + t.val, 0);
        const saiVariavel = sai - saiFixa;

        
        const diasBase    = Math.max(daysPassed, 3);
        const projVariavel = (saiVariavel / diasBase) * daysInMonth;
        const projFim     = saiFixa + projVariavel;
        const restante    = projFim - sai;

        const tipo = projFim > ent && ent > 0 ? 'danger' : projFim > ent * 0.85 ? 'warning' : 'success';
        tips.push({
            tipo,
            emoji: tipo === 'danger' ? '⚠️' : tipo === 'warning' ? '📊' : '✅',
            text:  `No ritmo atual, você deve gastar ${fmtV(projFim)} até o fim do mês`
                 + (saiFixa > 0 ? ` (${fmtV(saiFixa)} fixos + ${fmtV(projVariavel)} variáveis projetados)` : '')
                 + (restante > 0 && !configuracoes.ocultar ? `. Ainda ${fmtV(restante)} de margem.` : '.')
        });
    }

    if (taxa !== null) {
        if (taxa >= 30) {
            tips.push({ tipo: 'success', emoji: '🎉', text: `Excelente! Você está poupando ${taxa.toFixed(0)}% da renda este mês — continue assim!` });
        } else if (taxa < 0) {
            tips.push({ tipo: 'danger',  emoji: '🚨', text: `Seus gastos superaram sua renda registrada em ${Math.abs(taxa).toFixed(0)}% este mês.` });
        } else if (taxa < 10) {
            tips.push({ tipo: 'warning', emoji: '💡', text: `Sua poupança está em ${taxa.toFixed(0)}%. Especialistas recomendam poupar pelo menos 20% da renda.` });
        }
    }

    const histCats = {}, histMeses = {};
    db.transacoes.forEach(t => {
        const [a, m] = t.data.split('-').map(Number);
        if (a === anoIdx && (m - 1) === mesIdx) return;
        if (t.tipo !== 'Saída') return;
        const chave = `${a}-${m}`;
        if (!histCats[t.cat]) { histCats[t.cat] = 0; histMeses[t.cat] = new Set(); }
        histCats[t.cat] += t.val;
        histMeses[t.cat].add(chave);
    });

    Object.entries(cats).forEach(([cat, val]) => {
        if (!histCats[cat] || histMeses[cat].size < 2) return;
        const media = histCats[cat] / histMeses[cat].size;
        const pct   = ((val - media) / media) * 100;
        if (pct > 25) {
            tips.push({ tipo: 'warning', emoji: '📈', text: `${cat}: ${pct.toFixed(0)}% acima da sua média mensal (média: ${fmtV(media)}).` });
        } else if (pct < -25) {
            tips.push({ tipo: 'success', emoji: '📉', text: `${cat}: ${Math.abs(pct).toFixed(0)}% abaixo da sua média mensal — ótimo controle!` });
        }
    });

    let streak = 0;
    const baseYM = anoIdx * 12 + mesIdx;
    for (let i = 1; i <= 24; i++) {
        const ym = baseYM - i;
        const a  = Math.floor(ym / 12);
        const m  = ym % 12;
        let e = 0, s = 0;
        db.transacoes.forEach(t => {
            const [ta, tm] = t.data.split('-').map(Number);
            if (ta === a && (tm - 1) === m) { t.tipo === 'Entrada' ? e += t.val : s += t.val; }
        });
        const temDados = db.transacoes.some(t => {
            const [ta, tm] = t.data.split('-').map(Number);
            return ta === a && (tm - 1) === m;
        });
        if (!temDados) break;
        if (e > s) streak++; else break;
    }
    if (streak >= 2) {
        tips.push({ tipo: 'success', emoji: '🏆', text: `Você fechou ${streak} mês(es) consecutivo(s) no positivo! Sequência mantida.` });
    }

    if (sai > 0) {
        const todasCats = ['Moradia','Alimentação','Transporte','Lazer','Saúde','Educação'];
        const semGasto  = todasCats.filter(c => !cats[c] && histCats[c]);
        if (semGasto.length > 0 && semGasto.length <= 3) {
            tips.push({ tipo: 'success', emoji: '✨', text: `Sem gastos em ${semGasto.join(', ')} este mês — comparando com seu histórico, isso é positivo.` });
        }
    }

    
    elTips.innerHTML = '';
}

function updateSmartFeed(filtradas, mesIdx, anoIdx) {
    const el = document.getElementById('smart-feed');
    if (!el) return;

    const ocultar = configuracoes.ocultar;
    const fmt = v => ocultar ? '••••' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtV = fmt; 

    let ent = 0, sai = 0;
    filtradas.forEach(t => { t.tipo === 'Entrada' ? ent += t.val : sai += t.val; });
    const saldo = ent - sai;
    const taxa  = ent > 0 ? (saldo / ent) * 100 : null;
    const hoje  = new Date();

    
    const cats = {};
    filtradas.filter(t => t.tipo === 'Saída').forEach(t => { cats[t.cat] = (cats[t.cat] || 0) + t.val; });
    const topCats = Object.entries(cats).sort((a, b) => b[1] - a[1]);

    
    const histCats = {}, histMeses = {};
    db.transacoes.forEach(t => {
        const [a, m] = t.data.split('-').map(Number);
        if (t.tipo !== 'Saída' || (a === anoIdx && (m - 1) === mesIdx)) return;
        if (!histCats[t.cat]) { histCats[t.cat] = 0; histMeses[t.cat] = new Set(); }
        histCats[t.cat] += t.val;
        histMeses[t.cat].add(`${a}-${m}`);
    });

    
    const ultimos3 = [];
    for (let i = 1; i <= 3; i++) {
        const d = new Date(anoIdx, mesIdx - i, 1);
        let s = 0;
        db.transacoes.forEach(t => {
            const [ta, tm] = t.data.split('-').map(Number);
            if (ta === d.getFullYear() && (tm - 1) === d.getMonth() && t.tipo === 'Saída') s += t.val;
        });
        if (s > 0) ultimos3.push(s);
    }
    const mediaTrend = ultimos3.length > 0 ? ultimos3.reduce((a, b) => a + b, 0) / ultimos3.length : 0;

    
    const transacoesSaida = filtradas.filter(t => t.tipo === 'Saída');
    const ticketMedio = transacoesSaida.length > 0 ? sai / transacoesSaida.length : 0;

    
    const gastosPorDia = {};
    const diasNome = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    filtradas.filter(t => t.tipo === 'Saída').forEach(t => {
        const d = new Date(t.data + 'T12:00:00');
        const dia = d.getDay();
        gastosPorDia[dia] = (gastosPorDia[dia] || 0) + t.val;
    });
    const maiorDia = Object.entries(gastosPorDia).sort((a, b) => b[1] - a[1])[0];

    
    let score = 50;
    if (taxa !== null) { if (taxa >= 20) score += 20; else if (taxa > 0) score += 10; else score -= 20; }
    if (mediaTrend > 0) { if (sai < mediaTrend * 0.9) score += 15; else if (sai > mediaTrend * 1.1) score -= 10; }
    if (db.recorrentes.length > 0) score += 10;
    if (db.metas && db.metas.length > 0) score += 5;
    score = Math.max(0, Math.min(100, score));
    const scoreLabel    = score >= 80 ? 'Excelente 🌟' : score >= 60 ? 'Bom 👍' : score >= 40 ? 'Regular ⚡' : 'Atenção 🚨';
    const scoreClsColor = score >= 80 ? 'color-success' : score >= 60 ? 'color-primary' : score >= 40 ? 'color-warning' : 'color-danger';
    const scoreClsBar   = score >= 80 ? 'bar--success'  : score >= 60 ? 'bar--primary'  : score >= 40 ? 'bar--warning'  : 'bar--danger';

    const cards = [];

    
    cards.push(`
    <div class="feed-card">
        <div class="feed-card-top"><span class="feed-icon">💚</span><span class="feed-label">Saúde Financeira</span></div>
        <div class="feed-title">${scoreLabel}</div>
        <div class="feed-value ${scoreClsColor}">${score}<span class="feed-score-suffix">/100</span></div>
        <div class="feed-progress-wrap"><div class="feed-progress-bar ${scoreClsBar}" style="width:${score}%"></div></div>
        <div class="feed-text">Baseado em poupança, controle de gastos e organização financeira.</div>
    </div>`);

    
    if (mediaTrend > 0 && sai > 0) {
        const diffPct = ((sai - mediaTrend) / mediaTrend) * 100;
        const subindo = diffPct > 5, estavel = Math.abs(diffPct) <= 5;
        cards.push(`
        <div class="feed-card feed-card--${subindo ? 'alerta' : 'dica'}">
            <div class="feed-card-top"><span class="feed-icon">${subindo ? '📈' : estavel ? '➡️' : '📉'}</span><span class="feed-label">Tendência de Gastos</span></div>
            <div class="feed-title">${estavel ? 'Gastos estáveis' : subindo ? `+${diffPct.toFixed(0)}% acima da média` : `${Math.abs(diffPct).toFixed(0)}% abaixo da média`}</div>
            <div class="feed-text">Média dos últimos ${ultimos3.length} meses: ${fmt(mediaTrend)}.<br>${subindo ? 'Seus gastos estão crescendo — reveja hábitos.' : estavel ? 'Você mantém um padrão consistente.' : 'Gastando menos que o habitual — ótimo controle!'}</div>
        </div>`);
    }

    
    if (ticketMedio > 0 && transacoesSaida.length >= 3) {
        cards.push(`
        <div class="feed-card feed-card--dica">
            <div class="feed-card-top"><span class="feed-icon">🧾</span><span class="feed-label">Ticket Médio por Compra</span></div>
            <div class="feed-title">${fmt(ticketMedio)} por transação</div>
            <div class="feed-text">${transacoesSaida.length} transações de saída este mês. ${ticketMedio > 300 ? 'Compras de alto valor — avalie se todas são essenciais.' : ticketMedio < 50 ? 'Muitos pequenos gastos somam mais do que parece no mês.' : 'Distribuição equilibrada.'}</div>
        </div>`);
    }

    
    if (maiorDia && transacoesSaida.length >= 4) {
        cards.push(`
        <div class="feed-card feed-card--alerta">
            <div class="feed-card-top"><span class="feed-icon">📅</span><span class="feed-label">Padrão de Consumo</span></div>
            <div class="feed-title">${diasNome[maiorDia[0]]}feira — dia de maior gasto</div>
            <div class="feed-text">${fmt(maiorDia[1])} concentrados nesse dia. Planeje compras com antecedência e evite ir ao mercado com fome ou sem lista.</div>
        </div>`);
    }

    
    let melhorOport = null;
    topCats.forEach(([cat, val]) => {
        if (melhorOport || !histCats[cat] || histMeses[cat].size < 2) return;
        const media = histCats[cat] / histMeses[cat].size;
        if ((val - media) / media > 0.2) melhorOport = { cat, val, media };
    });
    if (melhorOport) {
        const economia = melhorOport.val - melhorOport.media;
        cards.push(`
        <div class="feed-card feed-card--meta">
            <div class="feed-card-top"><span class="feed-icon">✂️</span><span class="feed-label">Oportunidade de Economia</span></div>
            <div class="feed-title">${melhorOport.cat} acima do normal</div>
            <div class="feed-value color-primary">${fmt(economia)} a mais este mês</div>
            <div class="feed-text">Sua média histórica é ${fmt(melhorOport.media)}/mês. Cortar esse excesso libera <strong>${fmt(economia * 12)}</strong> por ano — suficiente para investir ou pagar uma meta.</div>
        </div>`);
    }

    
    if (db.metas && db.metas.length > 0) {
        const emAndamento = db.metas.filter(m => m.atual < m.objetivo).sort((a, b) => (b.atual / b.objetivo) - (a.atual / a.objetivo))[0];
        if (emAndamento) {
            const pct = Math.min(100, (emAndamento.atual / emAndamento.objetivo) * 100);
            let totalPoupado = 0, mesesComDados = 0;
            for (let i = 1; i <= 6; i++) {
                const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
                let e = 0, s = 0;
                db.transacoes.forEach(t => {
                    const [ta, tm] = t.data.split('-').map(Number);
                    if (ta === d.getFullYear() && (tm - 1) === d.getMonth()) t.tipo === 'Entrada' ? e += t.val : s += t.val;
                });
                if (e > 0 || s > 0) { totalPoupado += Math.max(0, e - s); mesesComDados++; }
            }
            const mediaMensal = mesesComDados > 0 ? totalPoupado / mesesComDados : 0;
            const falta = emAndamento.objetivo - emAndamento.atual;
            const meses = mediaMensal > 0 ? Math.ceil(falta / mediaMensal) : 0;
            const etaText = meses > 0 ? (meses < 12 ? `~${meses} meses` : `~${Math.ceil(meses/12)} ano${meses >= 24 ? 's' : ''}`) : '';
            cards.push(`
            <div class="feed-card feed-card--conquista">
                <div class="feed-card-top"><span class="feed-icon">${emAndamento.icone || '🎯'}</span><span class="feed-label">Meta em andamento</span></div>
                <div class="feed-title">${emAndamento.nome}</div>
                <div class="feed-value color-gold">${pct.toFixed(0)}% concluído</div>
                <div class="feed-progress-wrap"><div class="feed-progress-bar bar--gold" style="width:${pct}%"></div></div>
                <div class="feed-text">Faltam ${fmt(falta)}${etaText ? ` · Estimativa: ${etaText}` : ''}. Acesse 🎯 Metas para atualizar.</div>
            </div>`);
        }
    }

    
    if (saldo > 500 && taxa !== null && taxa > 10) {
        const op = saldo >= 10000 ? { nome: 'Tesouro IPCA+', obs: 'Protege da inflação no longo prazo. Ideal para objetivos com prazo definido.' }
                 : saldo >= 3000  ? { nome: 'CDB ou LCI', obs: 'Rendimento acima da poupança com proteção do FGC até R$ 250k.' }
                 : { nome: 'Tesouro Selic', obs: 'Liquidez diária, risco baixíssimo. Ótimo ponto de partida para investir.' };
        cards.push(`
        <div class="feed-card feed-card--investimento">
            <div class="feed-card-top"><span class="feed-icon">📈</span><span class="feed-label">Onde investir o que sobrou?</span></div>
            <div class="feed-title">${op.nome}</div>
            <div class="feed-text">${op.obs} Aporte sugerido: ${fmt(Math.min(saldo * 0.8, saldo - 500))}.</div>
        </div>`);
    }

    
    const dicas = [
        { emoji: '💡', titulo: 'Regra 50-30-20', texto: '50% necessidades · 30% desejos · 20% poupança. Simples e comprovadamente eficaz.' },
        { emoji: '🧾', titulo: 'Fundo de Emergência', texto: 'Guarde 3 a 6 meses de despesas em um CDB de liquidez diária ou Tesouro Selic antes de qualquer outro investimento.' },
        { emoji: '⏰', titulo: 'Regra das 48 horas', texto: 'Antes de qualquer compra acima de R$ 100, espere 48 horas. Elimina 80% das compras por impulso.' },
        { emoji: '🏦', titulo: 'Pague-se primeiro', texto: 'Assim que receber, transfira o valor de investimento. Gaste apenas o que sobrar — não o contrário.' },
        { emoji: '📱', titulo: 'Auditoria de Assinaturas', texto: 'Streaming, apps, planos... Cancelar 2 assinaturas desnecessárias pode poupar R$ 80-250/mês.' },
        { emoji: '🛒', titulo: 'Lista de Compras Salva Dinheiro', texto: 'Ir ao mercado com lista planejada reduz gastos em até 30% e elimina desperdício.' },
        { emoji: '📊', titulo: 'Diversifique Investimentos', texto: 'Não concentre tudo em um produto. Tesouro, CDB, fundos imobiliários e ações têm comportamentos diferentes.' },
        { emoji: '🔄', titulo: 'Priorize Dívidas Caras', texto: 'Dívidas com juros acima de 2% ao mês devem ser quitadas antes de qualquer investimento.' },
        { emoji: '🎯', titulo: 'Meta com Prazo Real', texto: 'Uma meta sem data é só um sonho. Defina: quanto + até quando. Isso aumenta 70% a chance de realizar.' },
        { emoji: '📅', titulo: 'Dia de Revisão Mensal', texto: 'Reserve 10 minutos no dia 1° de cada mês para lançar tudo e planejar o mês que começa.' },
        { emoji: '💰', titulo: 'Juros Compostos', texto: 'R$ 300/mês investidos a 12% a.a. viram R$ 70k em 10 anos e R$ 300k em 20 anos. Tempo é o maior aliado.' },
        { emoji: '🏠', titulo: 'Custo Real de Moradia', texto: 'Moradia (aluguel + condomínio + IPTU) não deve ultrapassar 30% da renda líquida.' },
    ];
    const dica = dicas[(mesIdx + anoIdx) % dicas.length];
    cards.push(`
    <div class="feed-card feed-card--dica">
        <div class="feed-card-top"><span class="feed-icon">${dica.emoji}</span><span class="feed-label">Dica Financeira</span></div>
        <div class="feed-title">${dica.titulo}</div>
        <div class="feed-text">${dica.texto}</div>
    </div>`);

    el.innerHTML = cards.length === 0
        ? `<div class="feed-card"><div class="feed-text" style="text-align:center;padding:20px 0">Adicione lançamentos para ver seus insights 📊</div></div>`
        : cards.join('');
}

async function addMeta() {
    const nome  = document.getElementById('meta-nome').value.trim();
    const obj   = parseFloat(document.getElementById('meta-obj').value);
    const atual = parseFloat(document.getElementById('meta-atual').value) || 0;
    const icone = document.getElementById('meta-icone').value.trim() || '🎯';
    const aporte = parseFloat(document.getElementById('meta-aporte').value) || null;
    if (!nome)           return showToast('Preencha o nome da meta.', 'warning');
    if (!obj || obj <= 0) return showToast('Informe o valor objetivo.', 'warning');
    if (atual > obj)     return showToast('Valor atual não pode superar o objetivo.', 'warning');
    await window.api.addMeta({ nome, objetivo: obj, atual, icone, aporte });
    ['meta-nome','meta-obj','meta-atual','meta-icone','meta-aporte'].forEach(id => document.getElementById(id).value = '');
    showToast('Meta criada! 🎯', 'success');
    carregarDados();
}

async function atualizarMeta(id, novoAtual) {
    const meta = db.metas.find(m => m.id === id);
    if (!meta) return;
    if (isNaN(novoAtual) || novoAtual < 0) return showToast('Valor inválido.', 'warning');
    await window.api.updateMeta({ ...meta, atual: novoAtual });
    showToast('Meta atualizada!', 'success');
    carregarDados();
}

function editarMeta(id) {
    const meta = db.metas.find(m => m.id === id);
    if (!meta) return;

    
    document.querySelectorAll('.meta-edit-form').forEach(el => el.remove());

    const card = document.querySelector(`.meta-card[data-meta-id="${id}"]`);
    if (!card) return;

    const form = document.createElement('div');
    form.className = 'meta-edit-form';
    form.innerHTML = `
        <div class="ie-header">✏️ Editando meta</div>
        <div class="meta-edit-row">
            <input type="text" id="me-icone-${id}" value="${meta.icone || '🎯'}" maxlength="2" class="meta-icone-input" placeholder="🎯">
            <input type="text" id="me-nome-${id}" value="${meta.nome}" placeholder="Nome da meta" style="flex:1">
        </div>
        <input type="number" id="me-obj-${id}" value="${meta.objetivo}" placeholder="Valor objetivo (R$)" min="0" step="0.01">
        <input type="number" id="me-atual-${id}" value="${meta.atual}" placeholder="Valor atual (R$)" min="0" step="0.01">
        <input type="number" id="me-aporte-${id}" value="${meta.aporte || ''}" placeholder="Aporte mensal (R$)" min="0" step="0.01">
        <div class="row--sm">
            <button class="btn-action" onclick="salvarEdicaoMeta(${id})">💾 Salvar</button>
            <button class="btn-cancel" onclick="fecharEdicaoMeta()">Cancelar</button>
        </div>
    `;

    card.appendChild(form);
    form.querySelector(`#me-nome-${id}`).focus();
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function salvarEdicaoMeta(id) {
    const nome  = document.getElementById(`me-nome-${id}`)?.value.trim();
    const obj   = parseFloat(document.getElementById(`me-obj-${id}`)?.value);
    const atual = parseFloat(document.getElementById(`me-atual-${id}`)?.value) || 0;
    const icone = document.getElementById(`me-icone-${id}`)?.value.trim() || '🎯';
    const aporte = parseFloat(document.getElementById(`me-aporte-${id}`)?.value) || null;

    if (!nome)            return showToast('Preencha o nome da meta.', 'warning');
    if (!obj || obj <= 0) return showToast('Informe um valor objetivo válido.', 'warning');
    if (atual > obj)      return showToast('Valor atual não pode superar o objetivo.', 'warning');

    await window.api.updateMeta({ id, nome, objetivo: obj, atual, icone, aporte });
    showToast('Meta editada com sucesso!', 'success');
    fecharEdicaoMeta();
    carregarDados();
}

function fecharEdicaoMeta() {
    document.querySelectorAll('.meta-edit-form').forEach(el => el.remove());
}

function renderMetas() {
    const el = document.getElementById('lista-metas');
    if (!el) return;
    if (!db.metas || db.metas.length === 0) {
        el.innerHTML = '<p class="meta-empty">Nenhuma meta ainda. Crie sua primeira acima! 🚀</p>';
        return;
    }
    const hoje = new Date();
    let totalPoupado = 0, mesesComDados = 0;
    for (let i = 1; i <= 6; i++) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        let e = 0, s = 0;
        db.transacoes.forEach(t => {
            const [ta, tm] = t.data.split('-').map(Number);
            if (ta === d.getFullYear() && (tm - 1) === d.getMonth()) t.tipo === 'Entrada' ? e += t.val : s += t.val;
        });
        if (e > 0 || s > 0) { totalPoupado += Math.max(0, e - s); mesesComDados++; }
    }
    const mediaMensal = mesesComDados > 0 ? totalPoupado / mesesComDados : 0;
    const fmt = v => configuracoes.ocultar ? '••••' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    el.innerHTML = db.metas.map(meta => {
        const pct  = Math.min(100, meta.atual > 0 ? (meta.atual / meta.objetivo) * 100 : 0);
        const falta = meta.objetivo - meta.atual;
        const barCls = falta <= 0 ? 'bar--success' : pct >= 75 ? 'bar--success' : pct >= 40 ? 'bar--primary' : 'bar--warning';
        let etaText = falta <= 0 ? '🎉 Meta atingida!' : mediaMensal > 0
            ? (() => { const m = Math.ceil(falta / mediaMensal); return m < 12 ? `~${m} meses` : `~${Math.floor(m/12)} ano${m>=24?'s':''}`+( m%12 > 0 ? ` e ${m%12} meses` : ''); })()
            : 'Adicione renda para estimar';
        
        let mediaRealMensal = null;
        if (meta.aporte) {
            let totalPoupadoMeta = 0, mesesMeta = 0;
            for (let i = 1; i <= 6; i++) {
                const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
                let e = 0, s = 0;
                db.transacoes.forEach(t => {
                    const [ta, tm] = t.data.split('-').map(Number);
                    if (ta === d.getFullYear() && (tm - 1) === d.getMonth()) t.tipo === 'Entrada' ? e += t.val : s += t.val;
                });
                if (e > 0 || s > 0) { totalPoupadoMeta += Math.max(0, e - s); mesesMeta++; }
            }
            mediaRealMensal = mesesMeta > 0 ? totalPoupadoMeta / mesesMeta : null;
        }

        return `
        <div class="meta-card" data-meta-id="${meta.id}">
            <div class="meta-card-header">
                <span class="meta-icone">${meta.icone || '🎯'}</span>
                <div class="meta-info">
                    <div class="meta-nome">${meta.nome}</div>
                    <div class="meta-valores">${fmt(meta.atual)}<span class="meta-sep">/</span>${fmt(meta.objetivo)}</div>
                </div>
                <div class="meta-card-actions">
                    <button class="btn-list btn-edit" onclick="editarMeta(${meta.id})" title="Editar meta">✏️</button>
                    <button class="btn-list" onclick="remover(${meta.id},'metas')" title="Remover">✕</button>
                </div>
            </div>
            <div class="meta-progress-wrap"><div class="meta-progress-bar ${barCls}" style="width:${pct}%"></div></div>
            <div class="meta-footer">
                <span class="meta-pct">${pct.toFixed(0)}%</span>
                ${falta > 0 ? `<span class="meta-eta">Faltam ${fmt(falta)}</span>` : ''}
                <span class="meta-eta">${etaText}</span>
                ${meta.aporte ? `<span class="meta-aporte">💳 ${fmt(meta.aporte)}/mês planejado${mediaRealMensal !== null ? ` · Real: ${fmt(mediaRealMensal)}` : ''}</span>` : ''}
            </div>
            ${meta.historico && meta.historico.length > 1 ? `
            <div class="meta-historico">
              <div class="meta-historico-title">📈 Histórico</div>
              ${meta.historico.slice(-4).reverse().map(h => `
                <div class="meta-historico-item">
                  <span class="meta-historico-data">${h.data}</span>
                  <span class="meta-historico-val">${fmt(h.valor)}</span>
                </div>
              `).join('')}
            </div>` : ''}
        </div>`;
    }).join('');
}

function applyMoneyColor(el, value) {
    el.classList.remove('money--positive', 'money--negative');
    if (value > 0) el.classList.add('money--positive');
    else if (value < 0) el.classList.add('money--negative');
}

function initRecDragDrop() {
    document.querySelectorAll('.drag-handle').forEach(handle => {
        handle.addEventListener('mousedown', recDragStart);
    });
}

function recDragStart(e) {
    
    if (e.button !== 0) return;
    e.preventDefault(); 

    const item = e.currentTarget.closest('.rec-drag-item');
    if (!item) return;

    _activeDrag = {
        id:     parseInt(item.dataset.recId),
        item:   item,
        target: null
    };

    item.classList.add('is-dragging');

    document.addEventListener('mousemove', recDragMove);
    document.addEventListener('mouseup',   recDragEnd);
}

function recDragMove(e) {
    if (!_activeDrag) return;

    
    _activeDrag.item.style.pointerEvents = 'none';
    const under = document.elementFromPoint(e.clientX, e.clientY);
    _activeDrag.item.style.pointerEvents = '';

    const target = under ? under.closest('.rec-drag-item') : null;

    
    document.querySelectorAll('.rec-drag-item.drag-over')
            .forEach(el => el.classList.remove('drag-over'));

    if (target && target !== _activeDrag.item) {
        target.classList.add('drag-over');
        _activeDrag.target = target;
    } else {
        _activeDrag.target = null;
    }
}

async function recDragEnd() {
    document.removeEventListener('mousemove', recDragMove);
    document.removeEventListener('mouseup',   recDragEnd);

    if (!_activeDrag) return;

    const { id: fromId, item, target } = _activeDrag;
    _activeDrag = null;

    item.classList.remove('is-dragging');
    document.querySelectorAll('.rec-drag-item.drag-over')
            .forEach(el => el.classList.remove('drag-over'));

    if (!target) return; 

    const toId = parseInt(target.dataset.recId);
    if (fromId === toId) return;

    const fromIdx = db.recorrentes.findIndex(r => r.id === fromId);
    const toIdx   = db.recorrentes.findIndex(r => r.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    const arr = [...db.recorrentes];
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    db.recorrentes = arr;
    render();

    await window.api.reordenarRecorrentes(arr.map(r => r.id));
}

function getAccordionState() {
    try { return JSON.parse(localStorage.getItem('solvus_accordions') || '{}'); } catch { return {}; }
}
function saveAccordionState(id, isOpen) {
    const s = getAccordionState(); s[id] = isOpen;
    localStorage.setItem('solvus_accordions', JSON.stringify(s));
}
function applyAccordionState() {
    const s = getAccordionState();
    Object.entries(s).forEach(([id, isOpen]) => {
        const el = document.getElementById(id);
        const header = document.querySelector(`[data-target="${id}"]`);
        if (!el || !header) return;
        el.classList.toggle('active', isOpen);
        const seta = header.querySelector('span');
        if (seta) seta.innerText = isOpen ? '▼' : '▶';
    });
}

function toggleAccordion(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('active');
    const isOpen = el.classList.contains('active');
    const header = document.querySelector(`[data-target="${id}"]`);
    if (header) {
        const seta = header.querySelector('span');
        if (seta) seta.innerText = isOpen ? '▼' : '▶';
    }
    saveAccordionState(id, isOpen);
}

async function remover(id, tabela) {
    const snapshot = db[tabela]?.find(x => x.id === id);
    if (!snapshot) return;

    const nomes = { transacoes: 'esta transação', recorrentes: 'esta conta fixa', metas: 'esta meta', notas: 'esta nota' };
    const alvo = nomes[tabela] || 'este item';
    if (!await showConfirm(`Deseja excluir ${alvo}?`)) return;

    await window.api.deleteItem(id, tabela);
    db[tabela] = (db[tabela] || []).filter(x => x.id !== id);
    render();

    
    showUndoToast('Item excluído.', async () => {
        
        if (tabela === 'transacoes') {
            await window.api.addTransacao({ data: snapshot.data, desc: snapshot.desc, val: snapshot.val, tipo: snapshot.tipo, cat: snapshot.cat, obs: snapshot.obs, vinculo: snapshot.vinculo || '' });
        } else if (tabela === 'recorrentes') {
            await window.api.addRecorrente({ desc: snapshot.desc, val: snapshot.val, tipo: snapshot.tipo, cat: snapshot.cat, obs: snapshot.obs, vinculo: snapshot.vinculo || '' });
        } else if (tabela === 'metas') {
            await window.api.addMeta({ nome: snapshot.nome, objetivo: snapshot.objetivo, atual: snapshot.atual, icone: snapshot.icone || '🎯' });
        } else if (tabela === 'notas') {
            await window.api.saveNota(null, snapshot.text || snapshot.texto || '');
        }
        showToast('Ação desfeita!', 'success');
        carregarDados();
    });
}

function showUndoToast(msg, onUndo) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast-undo show';
    toast.innerHTML = `
        <span>${msg}</span>
        <button class="toast-undo-btn" type="button">Desfazer</button>
    `;

    let undone = false;
    const btnUndo = toast.querySelector('.toast-undo-btn');
    btnUndo.addEventListener('click', () => {
        undone = true;
        toast.classList.remove('show');
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
        onUndo();
    });

    container.appendChild(toast);
    const dismiss = () => {
        if (!undone) {
            toast.classList.remove('show');
            setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
        }
    };
    let timer = setTimeout(dismiss, 10000);

    
    toast.addEventListener('mouseenter', () => clearTimeout(timer));
    toast.addEventListener('mouseleave', () => { if (!undone) timer = setTimeout(dismiss, 3000); });
}

async function lancarSelecionadas() {
    if (!db.recorrentes.length) return showToast('Nenhum modelo de conta fixa salvo.', 'warning');

    const mesIdx = parseInt(document.getElementById('filtro-mes').value);
    const anoIdx = parseInt(document.getElementById('filtro-ano').value);

    const selecionadas = db.recorrentes.filter(r => {
        const chk = document.getElementById(`chk-${r.id}`);
        return chk && chk.checked && !chk.disabled;
    });

    if (!selecionadas.length) return showToast('Selecione ao menos uma conta para lançar.', 'warning');
    if (!await showConfirm(`Lançar ${selecionadas.length} conta(s) no mês selecionado?`)) return;

    const d = `${anoIdx}-${String(mesIdx + 1).padStart(2, '0')}-01`;
    let quitadas = 0;
    for (const rec of selecionadas) {
        await window.api.addTransacao({ data: d, desc: rec.desc, tipo: rec.tipo, val: rec.val, cat: rec.cat, obs: 'Conta Fixa', vinculo: rec.vinculo || '' });

        
        if (rec.parcelas != null) {
            const novasParcelas = rec.parcelas - 1;
            if (novasParcelas <= 0) {
                await window.api.deleteItem(rec.id, 'recorrentes');
                quitadas++;
            } else {
                await window.api.updateRecorrente({ id: rec.id, desc: rec.desc, val: rec.val, tipo: rec.tipo, cat: rec.cat, obs: rec.obs, vinculo: rec.vinculo || '', parcelas: novasParcelas });
            }
        }
    }
    if (quitadas > 0) showToast(`🎉 ${quitadas} conta(s) quitada(s) e removida(s)!`, 'success');
    showToast(`${selecionadas.length} conta(s) lançada(s)!`, 'success');
    carregarDados();
}

function toggleSelecionarTodas(checked) {
    document.querySelectorAll('.rec-chk:not(:disabled)').forEach(chk => {
        chk.checked = checked;
    });
    updateRecSelectionSummary();
}

async function toggleTheme() {
    const themes = ['dark', 'blue', 'light'];
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = themes[(themes.indexOf(current) + 1) % themes.length];
    document.documentElement.setAttribute('data-theme', next);
    db.tema = next;
    await window.api.saveConfig('tema', next);
    const icons = { dark: '🌙', blue: '🔵', light: '🌞' };
    const el = document.getElementById('tema-icon');
    if (el) el.textContent = icons[next];
}

async function connectAutoSave() {
    configuracoes.ocultar = !configuracoes.ocultar;
    const btnText = document.getElementById('btnText');
    if (btnText) btnText.innerText = configuracoes.ocultar ? 'Mostrar' : 'Ocultar';
    await window.api.saveConfig('ocultar', String(configuracoes.ocultar));
    render();
}

function editarNota(id) {
    const n = db.notas.find(x => x.id === id);
    if (!n) return;
    document.getElementById('note-text').value = n.text;
    editNoteId = id;
    document.getElementById('btn-add-nota').innerText = '💾';
}

async function addNota() {
    const text = document.getElementById('note-text').value.trim();
    if (!text) return showToast('Escreva algo antes de salvar.', 'warning');
    await window.api.saveNota(editNoteId, text);
    editNoteId = null;
    document.getElementById('note-text').value = '';
    document.getElementById('btn-add-nota').innerText = '+';
    showToast('Anotação salva!', 'success');
    carregarDados();
}

async function exportarExcel() {
    if (!db.transacoes.length) return showToast('Não há dados para exportar.', 'warning');
    try {
        const r = await window.api.exportarExcel(db.transacoes);
        if (r && r.sucesso) showToast('Planilha exportada!', 'success');
    } catch { showToast('Erro ao gerar planilha.', 'error'); }
}

async function exportarJson() {
    try {
        const r = await window.api.exportarJson();
        if (r && r.sucesso) showToast('Backup salvo!', 'success');
    } catch { showToast('Erro ao salvar backup.', 'error'); }
}

async function resetarExtrato() {
    const sMes   = document.getElementById('filtro-mes');
    const sAno   = document.getElementById('filtro-ano');
    const mesIdx = parseInt(sMes.value);
    const anoSel = parseInt(sAno.value);
    const nomeMes = sMes.options[sMes.selectedIndex].text;
    if (!await showConfirm(`Apagar TODOS os lançamentos de ${nomeMes}/${anoSel}?`)) return;
    const paraApagar = db.transacoes.filter(t => {
        const [a, m] = t.data.split('-').map(Number);
        return a === anoSel && (m - 1) === mesIdx;
    });
    for (const t of paraApagar) await window.api.deleteItem(t.id, 'transacoes');
    showToast(`Extrato de ${nomeMes} limpo.`, 'info');
    carregarDados();
}

async function loadBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
        try {
            const d = JSON.parse(ev.target.result);
            await window.api.importarJson(d);
            showToast('Backup importado com sucesso!', 'success');
            carregarDados();
        } catch {
            showToast('Arquivo inválido ou corrompido.', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function importarExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') return showToast('Biblioteca XLSX não disponível.', 'error');
    const reader = new FileReader();
    reader.onload = async (ev) => {
        try {
            const wb    = XLSX.read(ev.target.result, { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows  = XLSX.utils.sheet_to_json(sheet);
            if (!rows.length) return showToast('Planilha vazia ou formato inválido.', 'warning');
            const transacoes = rows.map(row => ({
                data:       parseExcelDate(row['Data'] || row['data'] || ''),
                descricao:  row['Descrição'] || row['Descricao'] || row['descricao'] || row['desc'] || 'Importado',
                valor:      Math.abs(parseFloat(row['Valor'] || row['valor'] || 0)),
                tipo:       row['Tipo'] || row['tipo'] || 'Saída',
                categoria:  normalizarCat(row['Categoria'] || row['categoria'] || row['cat'] || ''),
                observacao: row['Observação'] || row['Observacao'] || row['obs'] || ''
            })).filter(t => t.valor > 0);
            if (!transacoes.length) return showToast('Nenhum dado válido na planilha.', 'warning');
            if (!await showConfirm(`Importar ${transacoes.length} linha(s)? Os dados existentes serão mantidos.`)) return;
            for (const t of transacoes) {
                await window.api.addTransacao({ data: t.data, desc: t.descricao, val: t.valor, tipo: t.tipo, cat: t.categoria, obs: t.observacao });
            }
            showToast(`${transacoes.length} lançamento(s) importado(s)!`, 'success');
            carregarDados();
        } catch (err) {
            console.error(err);
            showToast('Erro ao ler planilha. Verifique o formato.', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
}

function updateSelectionSummary() {
    const summaryEl = document.getElementById('selection-summary');
    if (!summaryEl) return;
    const checked = document.querySelectorAll('.item-chk:checked');

    if (checked.length === 0) {
        summaryEl.classList.add('hidden');
        return;
    }

    const fmt = v => configuracoes.ocultar
        ? 'R$ •••••'
        : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    let sEnt = 0, sSai = 0;
    checked.forEach(chk => {
        const val = parseFloat(chk.dataset.val);
        if (chk.dataset.tipo === 'Entrada') sEnt += val; else sSai += val;
    });
    const saldo  = sEnt - sSai;
    const corSaldo = saldo >= 0 ? 'var(--secondary)' : 'var(--danger)';

    summaryEl.classList.remove('hidden');
    summaryEl.innerHTML = `
        <span class="ss-count">✓ ${checked.length} selecionado(s)</span>
        ${sEnt > 0 ? `<span class="val-plus ss-val">+${fmt(sEnt)}</span>` : ''}
        ${sSai > 0 ? `<span class="val-minus ss-val">−${fmt(sSai)}</span>` : ''}
        <span class="ss-saldo" style="color:${corSaldo}">= ${fmt(Math.abs(saldo))}</span>
        <button class="btn-list" onclick="limparSelecao()" title="Limpar seleção" style="margin-left:auto;opacity:1;">✕ Limpar</button>
    `;
}

function limparSelecao() {
    document.querySelectorAll('.item-chk').forEach(chk => { chk.checked = false; });
    document.getElementById('selection-summary')?.classList.add('hidden');
}

function updateRecSelectionSummary() {
    const summaryEl = document.getElementById('rec-selection-summary');
    if (!summaryEl) return;

    const checked = document.querySelectorAll('.rec-chk:checked:not(:disabled)');

    if (checked.length === 0) {
        summaryEl.classList.add('hidden');
        return;
    }

    const fmt = v => configuracoes.ocultar
        ? 'R$ •••••'
        : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    let sEnt = 0, sSai = 0;
    checked.forEach(chk => {
        const val = parseFloat(chk.dataset.val) || 0;
        if (chk.dataset.tipo === 'Entrada') sEnt += val;
        else                                sSai += val;
    });

    summaryEl.classList.remove('hidden');
    summaryEl.innerHTML = `
        <span class="ss-count">✓ ${checked.length} selecionado(s)</span>
        ${sEnt > 0 ? `<span class="val-plus ss-val">+${fmt(sEnt)}</span>` : ''}
        ${sSai > 0 ? `<span class="val-minus ss-val">−${fmt(sSai)}</span>` : ''}
        ${sEnt > 0 && sSai > 0 ? `<span class="ss-saldo" style="color:${(sEnt-sSai)>=0?'var(--secondary)':'var(--danger)'}">= ${fmt(Math.abs(sEnt-sSai))}</span>` : ''}
    `;
}

function updateVinculos() {
    const painel = document.getElementById('painel-vinculos-content');
    if (!painel) return;

    
    const vincMap = {};
    db.transacoes.forEach(t => {
        const v = (t.vinculo || '').trim();
        if (!v) return;
        if (!vincMap[v]) vincMap[v] = { saidas: 0, entradas: 0 };
        if (t.tipo === 'Saída') vincMap[v].saidas += t.val;
        else                    vincMap[v].entradas += t.val;
    });

    const vinculos = Object.entries(vincMap);
    if (vinculos.length === 0) {
        painel.innerHTML = '<div class="empty-state">Nenhum vínculo cadastrado ainda.<br>Use o campo 🔗 Vínculo ao adicionar lançamentos.</div>';
        return;
    }

    const fmt = v => configuracoes.ocultar
        ? 'R$ •••••'
        : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    
    vinculos.sort((a, b) => (b[1].saidas - b[1].entradas) - (a[1].saidas - a[1].entradas));

    painel.innerHTML = vinculos.map(([nome, dados]) => {
        const saldo  = dados.saidas - dados.entradas;
        const cor    = saldo > 0 ? 'var(--danger)' : 'var(--secondary)';
        const label  = saldo > 0 ? '↑ A pagar' : '↓ A receber';
        const icon   = saldo > 0 ? '🔴' : '🟢';
        return `
        <div class="list-item vinculo-item">
            <div class="item-info">
                <span class="vinculo-nome">${icon} ${nome}</span>
                <span class="obs-text">${label}
                    ${dados.saidas   > 0 ? ` · Saídas: ${fmt(dados.saidas)}`    : ''}
                    ${dados.entradas > 0 ? ` · Entradas: ${fmt(dados.entradas)}` : ''}
                </span>
            </div>
            <div class="item-actions">
                <span class="vinculo-saldo" style="color:${cor}">${fmt(Math.abs(saldo))}</span>
            </div>
        </div>`;
    }).join('');
}

function petIcon(cat) {
    if (cat.includes('Veterinário'))              return '🏥';
    if (cat.includes('Alimentação'))              return '🍖';
    if (cat.includes('Banho') || cat.includes('Tosa')) return '✂️';
    if (cat.includes('Brinquedos'))               return '🎾';
    if (cat.includes('Roupas'))                   return '👕';
    return '🐾';
}

function updatePainelPet(filtradas) {
    const painel = document.getElementById('pet-panel');
    if (!painel) return;

    const petGastos = filtradas.filter(t =>
        t.tipo === 'Saída' && (t.cat === 'Pet' || t.cat.startsWith('Pet -'))
    );

    if (petGastos.length === 0) {
        painel.innerHTML = '';
        return;
    }

    const fmt   = v => configuracoes.ocultar ? '••••' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const total = petGastos.reduce((acc, t) => acc + t.val, 0);

    const porCat = {};
    petGastos.forEach(t => { porCat[t.cat] = (porCat[t.cat] || 0) + t.val; });
    const sorted = Object.entries(porCat).sort((a, b) => b[1] - a[1]);

    painel.innerHTML = `
        <div class="pet-panel-header">
            🐾 Gastos com Pets este mês — <strong>${fmt(total)}</strong>
        </div>
        <div class="pet-cards">
            ${sorted.map(([cat, val]) => {
                const label = cat === 'Pet' ? 'Geral' : cat.replace('Pet - ', '');
                const pct   = ((val / total) * 100).toFixed(0);
                return `
                <div class="insight-card">
                    <span class="insight-icon">${petIcon(cat)}</span>
                    <span class="insight-label">${label}</span>
                    <span class="insight-value">${fmt(val)}</span>
                    <span class="insight-sub">${pct}% do total</span>
                </div>`;
            }).join('')}
        </div>
    `;
}

function renderHeatmap(filtradas, mesIdx, anoIdx) {
    const el = document.getElementById('heatmap-gastos');
    if (!el) return;

    const saidas = filtradas.filter(t => t.tipo === 'Saída');
    if (saidas.length === 0) { el.innerHTML = '<div class="comparativo-empty">Sem gastos no mês.</div>'; return; }

    const diasGasto = {};
    saidas.forEach(t => {
        const dia = parseInt(t.data.split('-')[2]);
        diasGasto[dia] = (diasGasto[dia] || 0) + t.val;
    });

    const maxGasto = Math.max(...Object.values(diasGasto));
    const totalDias = new Date(anoIdx, mesIdx + 1, 0).getDate();
    const dowNomes = ['D','S','T','Q','Q','S','S'];

    
    const diasComGasto = Object.entries(diasGasto).map(([d, v]) => ({ dia: parseInt(d), val: v }));
    diasComGasto.sort((a, b) => b.val - a.val);
    const maiorDia = diasComGasto[0];
    const menorDia = diasComGasto[diasComGasto.length - 1];

    const cells = [];
    for (let d = 1; d <= totalDias; d++) {
        const gasto = diasGasto[d] || 0;
        const dow = new Date(anoIdx, mesIdx, d).getDay();
        const alpha = gasto > 0 ? Math.max(0.12, gasto / maxGasto) : 0;
        const bg = gasto > 0 ? `rgba(207,102,121,${alpha.toFixed(2)})` : '';
        const valStr = gasto > 0 ? (gasto >= 1000 ? (gasto / 1000).toFixed(1) + 'k' : gasto.toFixed(0)) : '';
        cells.push(`<div class="heatmap-cell" style="${bg ? `background:${bg};` : ''}" title="${gasto > 0 ? 'R$ ' + gasto.toLocaleString('pt-BR', {minimumFractionDigits:2}) : ''}">
            <span class="heatmap-day">${d}</span>
            <span class="heatmap-dow">${dowNomes[dow]}</span>
            ${valStr ? `<span class="heatmap-val">${valStr}</span>` : ''}
        </div>`);
    }

    el.innerHTML = `
        ${maiorDia && menorDia ? `<div class="heatmap-hint">🔴 Maior: dia ${maiorDia.dia} &nbsp;·&nbsp; 🟢 Menor: dia ${menorDia.dia}</div>` : ''}
        <div class="heatmap-grid">${cells.join('')}</div>
    `;
}

function renderComparativo() {
    const mesA = parseInt(document.getElementById('comp-mes-a')?.value ?? -1);
    const anoA = parseInt(document.getElementById('comp-ano-a')?.value ?? 0);
    const mesB = parseInt(document.getElementById('comp-mes-b')?.value ?? -1);
    const anoB = parseInt(document.getElementById('comp-ano-b')?.value ?? 0);
    const el   = document.getElementById('comparativo-result');
    if (!el) return;
    if (isNaN(mesA) || isNaN(anoA) || isNaN(mesB) || isNaN(anoB)) return;

    const calc = (mes, ano) => {
        let ent = 0, sai = 0;
        db.transacoes.forEach(t => {
            const [a, m] = t.data.split('-').map(Number);
            if (a === ano && (m - 1) === mes) { t.tipo === 'Entrada' ? ent += t.val : sai += t.val; }
        });
        return { ent, sai, saldo: ent - sai };
    };

    const a = calc(mesA, anoA);
    const b = calc(mesB, anoB);
    const fmt = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const varPct = (vA, vB) => vA === 0 ? null : ((vB - vA) / Math.abs(vA) * 100);
    const varStr = (v, tipo) => {
        if (v === null) return '<span style="color:var(--muted)">—</span>';
        const up = v > 0;
        
        const positivo = tipo === 'saida' ? !up : up;
        const cor = v === 0 ? 'var(--muted)' : positivo ? 'var(--secondary)' : 'var(--danger)';
        return `<span style="color:${cor};font-weight:700">${v > 0 ? '+' : ''}${v.toFixed(1)}%</span>`;
    };

    const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    el.innerHTML = `
    <table class="comparativo-table">
        <thead>
            <tr>
                <th>Métrica</th>
                <th>${mesesNomes[mesA]}/${anoA}</th>
                <th>${mesesNomes[mesB]}/${anoB}</th>
                <th>Variação</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Entradas</td>
                <td class="color-success">${fmt(a.ent)}</td>
                <td class="color-success">${fmt(b.ent)}</td>
                <td>${varStr(varPct(a.ent, b.ent), 'entrada')}</td>
            </tr>
            <tr>
                <td>Saídas</td>
                <td class="color-danger">${fmt(a.sai)}</td>
                <td class="color-danger">${fmt(b.sai)}</td>
                <td>${varStr(varPct(a.sai, b.sai), 'saida')}</td>
            </tr>
            <tr class="comp-saldo-row">
                <td>Saldo</td>
                <td class="${a.saldo >= 0 ? 'color-success' : 'color-danger'}">${fmt(a.saldo)}</td>
                <td class="${b.saldo >= 0 ? 'color-success' : 'color-danger'}">${fmt(b.saldo)}</td>
                <td>${varStr(varPct(a.saldo, b.saldo), 'saldo')}</td>
            </tr>
        </tbody>
    </table>`;
}

function atualizarCategoriasCustom(cats) {
    categoriasCustom = cats || [];
    CATEGORIAS = categoriasCustom.length > 0
        ? [...CATEGORIAS_BASE, { grupo: '— Personalizadas', opts: [...categoriasCustom] }]
        : [...CATEGORIAS_BASE];
    popularSelects();
}

async function addCategoriaCustom() {
    const input = document.getElementById('cat-custom-input');
    if (!input) return;
    const nome = input.value.trim();
    if (!nome) return showToast('Digite um nome para a categoria.', 'warning');
    if (categoriasCustom.includes(nome)) return showToast('Categoria já existe.', 'warning');
    categoriasCustom.push(nome);
    await window.api.saveCategoriasCustom([...categoriasCustom]);
    atualizarCategoriasCustom([...categoriasCustom]);
    renderCategoriasCustom();
    input.value = '';
    showToast('Categoria adicionada!', 'success');
}

async function removerCategoriaCustom(nome) {
    if (!await showConfirm(`Deseja excluir a categoria "${nome}"?`)) return;
    categoriasCustom = categoriasCustom.filter(c => c !== nome);
    await window.api.saveCategoriasCustom([...categoriasCustom]);
    atualizarCategoriasCustom([...categoriasCustom]);
    renderCategoriasCustom();
    showToast('Categoria removida.', 'info');
}

function renderCategoriasCustom() {
    const el = document.getElementById('lista-cats-custom');
    if (!el) return;
    if (categoriasCustom.length === 0) {
        el.innerHTML = '<div class="empty-state">Nenhuma categoria personalizada.</div>';
        return;
    }
    el.innerHTML = categoriasCustom.map(c => `
        <div class="list-item">
            <div class="item-info"><span>🏷️ ${c}</span></div>
            <div class="item-actions">
                <button class="btn-list" onclick="removerCategoriaCustom('${c.replace(/'/g, "\\'")}')">✕</button>
            </div>
        </div>`).join('');
}

async function initPIN() {
    const temPin = await window.api.checkPinSet();
    if (temPin) {
        document.getElementById('pin-overlay').classList.remove('hidden');
        setTimeout(() => document.getElementById('pin-input').focus(), 100);
    }
}

async function verificarPIN() {
    const pin = document.getElementById('pin-input').value;
    if (!pin) return;
    const ok = await window.api.verifyPin(pin);
    if (ok) {
        document.getElementById('pin-overlay').classList.add('hidden');
        document.getElementById('pin-input').value = '';
        document.getElementById('pin-error').classList.add('hidden');
    } else {
        const inp = document.getElementById('pin-input');
        inp.value = '';
        inp.classList.add('pin-shake');
        document.getElementById('pin-error').classList.remove('hidden');
        setTimeout(() => inp.classList.remove('pin-shake'), 450);
        inp.focus();
    }
}

async function abrirSetupPIN() {
    const temPin = await window.api.checkPinSet();
    document.getElementById('pin-setup-remove').classList.toggle('hidden', !temPin);
    document.getElementById('pin-setup-modal').classList.remove('hidden');
    document.getElementById('pin-setup-new').focus();
}

async function salvarNovoPIN() {
    const nova = document.getElementById('pin-setup-new').value;
    const conf = document.getElementById('pin-setup-confirm').value;
    if (!nova) return showToast('Digite uma senha.', 'warning');
    if (nova.length < 4) return showToast('A senha deve ter pelo menos 4 caracteres.', 'warning');
    if (nova !== conf) return showToast('As senhas não conferem.', 'warning');
    await window.api.savePin(nova);
    fecharSetupPIN();
    showToast('🔐 Senha configurada! Ativa na próxima abertura.', 'success');
}

async function removerPIN() {
    if (!await showConfirm('Remover a senha de acesso?')) return;
    await window.api.savePin(null);
    fecharSetupPIN();
    showToast('Senha removida.', 'info');
}

function fecharSetupPIN() {
    document.getElementById('pin-setup-modal').classList.add('hidden');
    document.getElementById('pin-setup-new').value = '';
    document.getElementById('pin-setup-confirm').value = '';
}

function parseExcelDate(val) {
    if (!val) return new Date().toISOString().split('T')[0];
    if (typeof val === 'number') {
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
    }
    const str = String(val);
    if (str.includes('/')) {
        const p = str.split('/');
        if (p.length === 3) {
            const y = p[2].length === 2 ? '20' + p[2] : p[2];
            return `${y}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
        }
    }
    return str;
}
