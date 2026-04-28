let db = JSON.parse(localStorage.getItem('barber_v6')) || { clientes: [], atendimentos: [], produtos: [] };
let abaAtual = 'semanal';
let croppieInstance = null;
let itemSendoEditado = null;

const EXTRAS_LISTA = { "Sobrancelha": 10, "Limpeza": 15, "Pezinho": 10, "Botox": 100 };
const CICLO_FIDELIDADE = 5; // Número de atendimentos por ciclo
const dataAtual = new Date();
document.getElementById('data-topo').innerText = dataAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

function mudarAba(aba, el) {
    abaAtual = aba;
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`tab-${aba}`).classList.remove('hidden');
    const botoes = [
        document.getElementById('nav-semanal'), 
        document.getElementById('nav-clientes'), 
        document.getElementById('nav-produtos'),
        document.getElementById('nav-ajustes')
    ];
    botoes.forEach(btn => {
        btn.className = "flex-1 min-w-[85px] bg-slate-50 border-2 border-transparent p-3 rounded-2xl flex flex-col items-center transition-all text-slate-400";
        btn.querySelector('span').className = "text-[9px] font-black uppercase";
        const icon = btn.querySelector('i');
        if (btn.id === 'nav-semanal') icon.className = "fas fa-calendar-alt mb-1";
        if (btn.id === 'nav-clientes') icon.className = "fas fa-users mb-1";
        if (btn.id === 'nav-produtos') icon.className = "fas fa-box-open mb-1";
        if (btn.id === 'nav-ajustes') icon.className = "fas fa-cog mb-1";
    });
    el.className = "flex-1 min-w-[85px] bg-rose-50 border-2 border-rose-500 p-3 rounded-2xl flex flex-col items-center transition-all";
    el.querySelector('i').classList.add('text-rose-600');
    el.querySelector('span').classList.add('text-rose-600');
    
    document.getElementById('page-title').innerText = aba === 'semanal' ? 'Lista Semanal' : (aba === 'clientes' ? 'Clientes' : (aba === 'produtos' ? 'Produtos' : 'Ajustes'));
    
    const fat = document.getElementById('faturamento-container');
    aba === 'semanal' ? fat.classList.remove('hidden') : fat.classList.add('hidden');
    
    if(aba === 'semanal') renderSemana();
    if(aba === 'clientes') renderClientes();
    if(aba === 'produtos') renderProdutos();
    if(aba === 'ajustes') renderAjustes();
}

function renderSemana() {
    const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const ordem = [1, 2, 3, 4, 5, 6, 0];
    const hoje = new Date().getDay();
    const container = document.getElementById('tab-semanal');
    container.innerHTML = '';
    let faturamentoTotal = 0;

    const limiteData = new Date();
    limiteData.setDate(limiteData.getDate() - 7);

    ordem.forEach(idx => {
        const atends = db.atendimentos.filter(a => a.diaIndex === idx && new Date(a.dataHora || 0) >= limiteData);
        const totalDia = atends.reduce((acc, a) => acc + parseFloat(a.total), 0);
        faturamentoTotal += totalDia;
        
        container.innerHTML += `
            <button onclick="toggleDia(${idx})" class="dia-btn">
                <span>${dias[idx].toUpperCase()}</span>
                <span class="text-[10px] bg-slate-100 px-2 py-1 rounded-full font-bold">${atends.length}</span>
            </button>
            <div id="lista-dia-${idx}" class="lista-atendimentos ${idx === hoje ? 'aberta' : ''}">
                ${atends.map((a) => {
                    const idxOriginal = db.atendimentos.indexOf(a);
                    return `
                    <div class="card-atendimento ${a.pendente ? 'border-l-4 border-rose-500' : ''}">
                        <div>
                            <p class="font-black text-xs uppercase">${a.nome} ${a.pendente ? '<span class="text-rose-600 text-[8px]">[PENDENTE]</span>' : ''}</p>
                            <p class="text-[9px] text-slate-400 font-bold uppercase">${a.servicos.join(' + ')}</p>
                            <p class="text-[8px] text-slate-400 italic">${a.pendente ? 'Dinheiro com: ' : 'Recebido por: '} ${a.recebedor || 'N/I'}</p>
                            ${a.produtos && a.produtos.length > 0 ? `<p class="text-[9px] text-blue-500 font-black mt-1">PRODUTOS: ${a.produtos.join(', ')}</p>` : ''}
                            ${a.gorjeta > 0 ? `<p class="text-[9px] text-amber-500 font-black mt-1">💵 GORJETA: R$ ${parseFloat(a.gorjeta).toFixed(2)}</p>` : ''}
                        </div>
                        <div class="text-right">
                            <p class="text-sm font-black text-rose-600">R$ ${a.total}</p>
                            <p class="text-[9px] font-bold text-slate-500 uppercase">${a.pendente ? '' : (a.pagamento || '')}</p>
                            <div class="flex gap-2 justify-end mt-1">
                                <button onclick="editarAtendimento(${idxOriginal})" class="text-[8px] font-bold text-blue-400 uppercase">Editar</button>
                                <button onclick="removerAtend(${idxOriginal})" class="text-[8px] font-bold text-slate-300 uppercase">Remover</button>
                            </div>
                        </div>
                    </div>
                `}).join('') || '<p class="text-center text-slate-300 text-[10px] py-4 font-bold">SEM REGISTROS RECENTES</p>'}
            </div>
        `;
    });
    document.getElementById('total-semanal').innerText = `R$ ${faturamentoTotal.toFixed(2)}`;
}

function editarAtendimento(idx) {
    const atend = db.atendimentos[idx];
    itemSendoEditado = idx;
    document.getElementById('modal').classList.add('active');
    document.getElementById('modal-title').innerText = "Editar Atendimento";
    document.getElementById('btn-confirmar').innerText = "Salvar Alterações";
    document.getElementById('btn-confirmar').style.display = '';
    
    const container = document.getElementById('campos-dinamicos');
    let htmlProds = '';
    if (db.produtos && db.produtos.length > 0) {
        htmlProds = `<p class="text-[10px] font-black uppercase text-blue-500 mt-4 mb-2">Produtos Vendidos</p>
        <div class="grid grid-cols-3 gap-2">
            ${db.produtos.map((p, i) => {
                const produtoNoAtend = atend.produtos ? atend.produtos.find(pr => pr.includes(p.nome)) : null;
                let qty = 1;
                let checked = '';
                if (produtoNoAtend) {
                    checked = 'checked';
                    const match = produtoNoAtend.match(/^(\d+)x/);
                    if (match) qty = match[1];
                }
                return `
                <div class="flex flex-col">
                    <input type="checkbox" id="prod-${i}" name="prod" value="${p.nome}" data-price="${p.valor || 0}" class="service-chip" ${checked}>
                    <label for="prod-${i}" class="service-label">${p.nome.toUpperCase()}</label>
                    <div class="qty-wrapper" style="${checked ? 'display:flex' : ''}">
                        <input type="number" id="qty-prod-${i}" value="${qty}" min="1" class="qty-input">
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    }

    const servicosMarcados = {};
    ['Corte', 'Barba', ...Object.keys(EXTRAS_LISTA)].forEach(s => {
        servicosMarcados[s] = atend.servicos.includes(s) ? 'checked' : '';
    });

    container.innerHTML = `
        <input type="text" id="m-nome-sem" list="clientes-list" placeholder="Nome do Cliente" value="${atend.nome}">
        <datalist id="clientes-list">${db.clientes.map(c => `<option value="${c.nome}">`).join('')}</datalist>
        
        <p class="text-[10px] font-black uppercase text-slate-400 mb-2">Serviços</p>
        <div class="grid grid-cols-2 gap-2">
            <input type="checkbox" id="s-c" name="serv" value="Corte" class="service-chip" ${servicosMarcados['Corte']}>
            <label for="s-c" class="service-label">CORTE</label>
            <input type="checkbox" id="s-b" name="serv" value="Barba" class="service-chip" ${servicosMarcados['Barba']}>
            <label for="s-b" class="service-label">BARBA</label>
        </div>
        
        <p class="text-[10px] font-black uppercase text-slate-400 mt-4 mb-2">Extras</p>
        <div class="grid grid-cols-2 gap-2">
            ${Object.keys(EXTRAS_LISTA).map((e,i)=>`
                <input type="checkbox" id="e-${i}" name="serv" value="${e}" class="service-chip" ${servicosMarcados[e]}>
                <label for="e-${i}" class="service-label">${e.toUpperCase()}</label>
            `).join('')}
        </div>
        
        ${htmlProds}
        
        <p class="text-[10px] font-black uppercase text-slate-400 mt-4 mb-2">Pagamento</p>
        <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2 p-3 bg-slate-50 rounded-xl mb-1">
                <input type="checkbox" id="m-pendente" onchange="toggleCamposPagamento()" class="w-4 h-4" ${atend.pendente ? 'checked' : ''}>
                <label for="m-pendente" class="text-[10px] font-black uppercase text-rose-500">Pagamento Pendente</label>
            </div>
            
            <div id="wrapper-pg" class="flex gap-2 ${atend.pendente ? 'hidden' : ''}">
                <select id="m-pg" class="flex-1">
                    <option ${atend.pagamento === 'Pix' ? 'selected' : ''}>Pix</option>
                    <option ${atend.pagamento === 'Dinheiro' ? 'selected' : ''}>Dinheiro</option>
                    <option ${atend.pagamento === 'Cartão' ? 'selected' : ''}>Cartão</option>
                </select>
                <input type="number" id="m-desc" placeholder="Desconto R$" class="w-24" value="0">
            </div>
            
            <input type="text" id="m-recebedor" placeholder="Com quem ficou o dinheiro?" class="w-full ${atend.pendente ? '' : 'hidden'}" value="${atend.recebedor || ''}">
        </div>
        
        <div class="bg-amber-50 p-3 rounded-xl mt-4 border border-amber-200">
            <label class="text-[10px] font-black uppercase text-amber-600 mb-1 block">💵 Gorjeta (Sua Parte)</label>
            <input type="number" id="m-gorjeta" placeholder="R$ 0,00" class="w-full font-black text-amber-600" value="${atend.gorjeta || ''}" step="0.01">
            <p class="text-[8px] text-amber-500 font-bold mt-1">Este valor é 100% seu, não divide com a loja</p>
        </div>
        
        <input type="number" id="m-total-manual" placeholder="Total Final R$" class="mt-4 font-black text-rose-600" value="${atend.totalManual || atend.total}">`;
    
    setTimeout(() => {
        toggleCamposPagamento();
    }, 100);
}

function toggleCamposPagamento() {
    const isPendente = document.getElementById('m-pendente')?.checked;
    const campoPg = document.getElementById('wrapper-pg');
    const campoRecebedor = document.getElementById('m-recebedor');

    if (isPendente) {
        if (campoPg) campoPg.classList.add('hidden');
        if (campoRecebedor) campoRecebedor.classList.remove('hidden');
    } else {
        if (campoPg) campoPg.classList.remove('hidden');
        if (campoRecebedor) campoRecebedor.classList.add('hidden');
    }
}

function abrirModal(ehNovo = true) {
    if (ehNovo) itemSendoEditado = null; 
    
    const container = document.getElementById('campos-dinamicos');
    const btnConfirmar = document.getElementById('btn-confirmar');
    document.getElementById('modal').classList.add('active');
    btnConfirmar.style.display = '';
    
    if (abaAtual === 'clientes') {
        document.getElementById('modal-title').innerText = ehNovo ? "Novo Registro" : "Editar Registro";
        btnConfirmar.innerText = "Salvar Agora";
        container.innerHTML = `<label class="modal-label">Nome Completo</label><input type="text" id="m-nome" placeholder="Ex: Thiago Wesley"><label class="modal-label">WhatsApp</label><input type="text" id="m-contato" placeholder="98 9..."><label class="modal-label">Tags (Características)</label><input type="text" id="m-tags" placeholder="Ex: Policial, Flamengo, Barba"><label class="modal-label">Foto de Perfil</label><input type="file" id="m-foto-input" accept="image/*" onchange="initCropper(this)"><div id="crop-container"><div id="cropper-wrap"></div></div>`;
    } else if (abaAtual === 'produtos') {
        document.getElementById('modal-title').innerText = ehNovo ? "Novo Produto" : "Editar Produto";
        btnConfirmar.innerText = "Salvar Produto";
        container.innerHTML = `<label class="modal-label">Nome do Produto</label><input type="text" id="p-nome" placeholder="Ex: Pomada"><label class="modal-label">Valor (Opcional)</label><input type="number" id="p-valor" placeholder="Ex: 25.00"><label class="modal-label">Foto ou Emoji</label><input type="text" id="p-emoji" placeholder="Emoji (ex: 🧴) ou use a foto abaixo"><input type="file" id="m-foto-input" accept="image/*" onchange="initCropper(this)"><div id="crop-container"><div id="cropper-wrap"></div></div>`;
    } else {
        document.getElementById('modal-title').innerText = "Novo Registro";
        btnConfirmar.innerText = "Confirmar";
        let htmlProds = '';
        if (db.produtos && db.produtos.length > 0) {
            htmlProds = `<p class="text-[10px] font-black uppercase text-blue-500 mt-4 mb-2">Produtos Vendidos</p>
            <div class="grid grid-cols-3 gap-2">
                ${db.produtos.map((p, i) => `
                    <div class="flex flex-col">
                        <input type="checkbox" id="prod-${i}" name="prod" value="${p.nome}" data-price="${p.valor || 0}" class="service-chip">
                        <label for="prod-${i}" class="service-label">${p.nome.toUpperCase()}</label>
                        <div class="qty-wrapper"><input type="number" id="qty-prod-${i}" value="1" min="1" class="qty-input"></div>
                    </div>
                `).join('')}
            </div>`;
        }

        container.innerHTML = `
            <input type="text" id="m-nome-sem" list="clientes-list" placeholder="Nome do Cliente">
            <datalist id="clientes-list">${db.clientes.map(c => `<option value="${c.nome}">`).join('')}</datalist>
            
            <p class="text-[10px] font-black uppercase text-slate-400 mb-2">Serviços</p>
            <div class="grid grid-cols-2 gap-2">
                <input type="checkbox" id="s-c" name="serv" value="Corte" class="service-chip">
                <label for="s-c" class="service-label">CORTE</label>
                <input type="checkbox" id="s-b" name="serv" value="Barba" class="service-chip">
                <label for="s-b" class="service-label">BARBA</label>
            </div>
            
            <p class="text-[10px] font-black uppercase text-slate-400 mt-4 mb-2">Extras</p>
            <div class="grid grid-cols-2 gap-2">
                ${Object.keys(EXTRAS_LISTA).map((e,i)=>`<input type="checkbox" id="e-${i}" name="serv" value="${e}" class="service-chip"><label for="e-${i}" class="service-label">${e.toUpperCase()}</label>`).join('')}
            </div>
            
            ${htmlProds}
            
            <p class="text-[10px] font-black uppercase text-slate-400 mt-4 mb-2">Pagamento</p>
            <div class="flex flex-col gap-2">
                <div class="flex items-center gap-2 p-3 bg-slate-50 rounded-xl mb-1">
                    <input type="checkbox" id="m-pendente" onchange="toggleCamposPagamento()" class="w-4 h-4">
                    <label for="m-pendente" class="text-[10px] font-black uppercase text-rose-500">Pagamento Pendente</label>
                </div>
                
                <div id="wrapper-pg" class="flex gap-2">
                    <select id="m-pg" class="flex-1"><option>Pix</option><option>Dinheiro</option><option>Cartão</option></select>
                    <input type="number" id="m-desc" placeholder="Desconto R$" class="w-24">
                </div>
                
                <input type="text" id="m-recebedor" placeholder="Com quem ficou o dinheiro?" class="w-full hidden">
            </div>
            
            <div class="bg-amber-50 p-3 rounded-xl mt-4 border border-amber-200">
                <label class="text-[10px] font-black uppercase text-amber-600 mb-1 block">💵 Gorjeta (Sua Parte)</label>
                <input type="number" id="m-gorjeta" placeholder="R$ 0,00" class="w-full font-black text-amber-600" step="0.01">
                <p class="text-[8px] text-amber-500 font-bold mt-1">Este valor é 100% seu, não divide com a loja</p>
            </div>
            
            <input type="number" id="m-total-manual" placeholder="Total Final R$" class="mt-4 font-black text-rose-600">`;
    }
}

async function salvarDados() {
    if (abaAtual === 'clientes') {
        const nome = document.getElementById('m-nome').value;
        const contato = document.getElementById('m-contato').value;
        const tags = document.getElementById('m-tags').value;
        let fotoFinal = itemSendoEditado !== null ? db.clientes[itemSendoEditado].foto : '';
        
        if (croppieInstance) {
            fotoFinal = await croppieInstance.result({ 
                type: 'base64', 
                size: { width: 150, height: 150 }, 
                format: 'jpeg',
                quality: 0.7 
            });
        }
        
        if (nome) {
            const d = { nome, contato, tags, foto: fotoFinal };
            if (itemSendoEditado !== null) {
                db.clientes[itemSendoEditado] = d; 
            } else {
                db.clientes.push(d);
            }
            localStorage.setItem('barber_v6', JSON.stringify(db));
            fecharModal(); renderClientes();
        }
    } else if (abaAtual === 'produtos') {
        const nome = document.getElementById('p-nome').value;
        const valor = document.getElementById('p-valor').value;
        const emoji = document.getElementById('p-emoji').value;
        let fotoFinal = itemSendoEditado !== null ? db.produtos[itemSendoEditado].foto : (emoji || '');
        
        if (croppieInstance) {
            fotoFinal = await croppieInstance.result({ 
                type: 'base64', 
                size: { width: 150, height: 150 }, 
                format: 'jpeg',
                quality: 0.7 
            });
        }
        
        if (nome) {
            const d = { nome, valor, foto: fotoFinal };
            if (itemSendoEditado !== null) {
                db.produtos[itemSendoEditado] = d; 
            } else {
                db.produtos.push(d);
            }
            localStorage.setItem('barber_v6', JSON.stringify(db));
            fecharModal(); renderProdutos();
        }
    } else {
        const nome = document.getElementById('m-nome-sem').value;
        const sel = Array.from(document.querySelectorAll('input[name="serv"]:checked')).map(i => i.value);
        const prodsChecked = Array.from(document.querySelectorAll('input[name="prod"]:checked'));
        const desc = parseFloat(document.getElementById('m-desc')?.value) || 0;
        const pgtoRaw = document.getElementById('m-pg')?.value;
        const pendente = document.getElementById('m-pendente')?.checked || false;
        const recebedor = document.getElementById('m-recebedor')?.value || "Não informado";
        const totalManual = document.getElementById('m-total-manual')?.value;
        const gorjeta = parseFloat(document.getElementById('m-gorjeta')?.value) || 0;

        // Preserva o dia original se for edição
        let diaIdx;
        let dataHora;
        
        if (itemSendoEditado !== null) {
            diaIdx = db.atendimentos[itemSendoEditado].diaIndex;
            dataHora = db.atendimentos[itemSendoEditado].dataHora;
        } else {
            diaIdx = new Date().getDay();
            dataHora = new Date().toISOString();
        }

        let precoBase = (diaIdx >= 1 && diaIdx <= 3) ? 30 : 35;
        let totalServ = sel.reduce((acc, s) => acc + ((s==='Corte'||s==='Barba') ? precoBase : (EXTRAS_LISTA[s]||0)), 0);
        let totalProd = 0; let pResumo = [];
        
        prodsChecked.forEach(p => {
            const pr = parseFloat(p.getAttribute('data-price')) || 0;
            const q = parseInt(document.getElementById(`qty-prod-${p.id.split('-')[1]}`)?.value) || 1;
            totalProd += pr * q; pResumo.push(`${q}x ${p.value}`);
        });
        
        let totalCalculado = (totalServ + totalProd) - desc;
        let totalFinal = totalManual ? parseFloat(totalManual).toFixed(2) : totalCalculado.toFixed(2);

        if (nome) {
            const atendimento = { 
                nome, 
                servicos: sel, 
                produtos: pResumo, 
                total: totalFinal, 
                diaIndex: diaIdx,
                dataHora: dataHora,
                pagamento: pendente ? "PENDENTE" : pgtoRaw,
                pendente: pendente,
                recebedor: recebedor,
                gorjeta: gorjeta,
                totalManual: totalManual || ''
            };
            
            if (itemSendoEditado !== null && abaAtual === 'semanal') {
                db.atendimentos[itemSendoEditado] = atendimento;
            } else {
                db.atendimentos.push(atendimento);
            }
            
            localStorage.setItem('barber_v6', JSON.stringify(db));
            fecharModal(); renderSemana();
        }
    }
}

function renderProdutos() {
    const l = document.getElementById('lista-produtos');
    const f = document.getElementById('filtro-produto').value.toLowerCase();
    const filtered = (db.produtos || []).filter(p => p.nome.toLowerCase().includes(f));
    l.innerHTML = filtered.map(p => {
        const idx = db.produtos.indexOf(p);
        const isEmoji = p.foto && p.foto.length < 10;
        return `<div class="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
            <div class="flex items-center gap-3">
                ${p.foto ? (isEmoji ? `<div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl">${p.foto}</div>` : `<img src="${p.foto}" class="w-12 h-12 rounded-full object-cover">`) : `<div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300"><i class="fas fa-box"></i></div>`}
                <div><p class="font-black text-sm uppercase">${p.nome}</p>${p.valor ? `<p class="text-[10px] text-rose-500 font-bold">R$ ${parseFloat(p.valor).toFixed(2)}</p>` : ''}</div>
            </div>
            <div class="flex gap-4"><button onclick="prepararEdicaoProd(${idx})" class="text-slate-300"><i class="fas fa-edit"></i></button><button onclick="excluirProd(${idx})" class="text-slate-200"><i class="fas fa-trash-alt"></i></button></div>
        </div>`;
    }).join('') || '<p class="text-center text-slate-300 text-[10px] py-10 font-bold uppercase">Sem produtos</p>';
}

function prepararEdicaoProd(i) { 
    abrirModal(false); 
    itemSendoEditado = i; 
    const p = db.produtos[i]; 
    setTimeout(() => { 
        document.getElementById('p-nome').value = p.nome; 
        document.getElementById('p-valor').value = p.valor; 
        document.getElementById('p-emoji').value = p.foto.length < 10 ? p.foto : ''; 
    }, 50); 
}

function excluirProd(i) { if(confirm('Excluir?')) { db.produtos.splice(i, 1); localStorage.setItem('barber_v6', JSON.stringify(db)); renderProdutos(); } }

function renderClientes() {
    const l = document.getElementById('lista-clientes');
    const f = document.getElementById('filtro-cliente').value.toLowerCase();
    const tagContainer = document.getElementById('container-tags');
    let tags = []; db.clientes.forEach(c => { if(c.tags) c.tags.split(',').forEach(t => { if(!tags.includes(t.trim().toLowerCase())) tags.push(t.trim().toLowerCase()); })});
    tagContainer.innerHTML = tags.map(t => `<button onclick="aplicarFiltroTag('${t}')" class="whitespace-nowrap px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase text-slate-500">#${t}</button>`).join('');
    l.innerHTML = db.clientes.filter(c => (c.nome + (c.tags||'')).toLowerCase().includes(f)).map(c => {
        const idx = db.clientes.indexOf(c);
        const totalAtendimentos = db.atendimentos.filter(a => a.nome.toLowerCase() === c.nome.toLowerCase()).length;
        return `<div class="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform" onclick="verHistorico('${c.nome.replace(/'/g, "\\'")}')">
            <div class="flex items-center gap-3">
                ${c.foto ? `<img src="${c.foto}" class="w-12 h-12 rounded-full object-cover">` : `<div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300"><i class="fas fa-user"></i></div>`}
                <div>
                    <p class="font-black text-sm uppercase">${c.nome}</p>
                    <p class="text-[10px] text-slate-400 font-bold">${c.contato || 'S/ CONTATO'}</p>
                </div>
            </div>
            <div class="flex items-center gap-3" onclick="event.stopPropagation()">
                <span class="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-full">${totalAtendimentos} atend.</span>
                <button onclick="prepararEdicao(${idx})" class="text-slate-300"><i class="fas fa-edit"></i></button>
                <button onclick="excluirCliente(${idx})" class="text-slate-200"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>`;
    }).join('');
}

function prepararEdicao(i) { 
    abrirModal(false); 
    itemSendoEditado = i; 
    const c = db.clientes[i]; 
    setTimeout(() => { 
        document.getElementById('m-nome').value = c.nome; 
        document.getElementById('m-contato').value = c.contato; 
        document.getElementById('m-tags').value = c.tags; 
    }, 50); 
}

function excluirCliente(i) { if(confirm('Excluir?')) { db.clientes.splice(i, 1); localStorage.setItem('barber_v6', JSON.stringify(db)); renderClientes(); } }

// ==========================================
// HISTÓRICO DO CLIENTE COM CICLOS DE FIDELIDADE
// ==========================================

function verHistorico(nomeCliente) {
    const atendimentosDoCliente = db.atendimentos
        .filter(a => a.nome.toLowerCase() === nomeCliente.toLowerCase())
        .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
    
    const container = document.getElementById('campos-dinamicos');
    const btnConfirmar = document.getElementById('btn-confirmar');
    
    document.getElementById('modal').classList.add('active');
    document.getElementById('modal-title').innerText = `📋 ${nomeCliente}`;
    btnConfirmar.style.display = 'none';
    
    if (atendimentosDoCliente.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-[12px] font-black uppercase text-slate-300">Nenhum atendimento encontrado</p>
                <p class="text-[10px] text-slate-400 mt-2">Os atendimentos aparecerão aqui quando registrados</p>
            </div>`;
        return;
    }
    
    const totalGasto = atendimentosDoCliente.reduce((acc, a) => acc + parseFloat(a.total), 0);
    const totalAtendimentos = atendimentosDoCliente.length;
    const servicosFavoritos = {};
    atendimentosDoCliente.forEach(a => {
        a.servicos.forEach(s => {
            servicosFavoritos[s] = (servicosFavoritos[s] || 0) + 1;
        });
    });
    const servicoTop = Object.entries(servicosFavoritos).sort((a,b) => b[1] - a[1])[0];
    
    // Cálculo dos ciclos de fidelidade
    const ciclosCompletos = Math.floor(totalAtendimentos / CICLO_FIDELIDADE);
    const progressoCicloAtual = totalAtendimentos % CICLO_FIDELIDADE;
    const faltamParaProximo = CICLO_FIDELIDADE - progressoCicloAtual;
    
    function montarCard(a) {
        const data = new Date(a.dataHora);
        const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
        const diaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][data.getDay()];
        
        return `
            <div class="bg-white p-3 rounded-xl border-l-4 ${a.pendente ? 'border-rose-500' : 'border-emerald-500'}">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-[9px] font-black uppercase text-slate-500">${diaSemana}, ${dataFormatada}</p>
                        <p class="text-[11px] font-black uppercase mt-1">${a.servicos.join(' + ')}</p>
                        ${a.produtos && a.produtos.length > 0 ? `<p class="text-[9px] text-blue-500 font-bold mt-1">🛍️ ${a.produtos.join(', ')}</p>` : ''}
                        ${a.gorjeta > 0 ? `<p class="text-[9px] text-amber-500 font-bold">💵 Gorjeta: R$ ${parseFloat(a.gorjeta).toFixed(2)}</p>` : ''}
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-black text-rose-600">R$ ${a.total}</p>
                        <p class="text-[8px] font-bold uppercase ${a.pendente ? 'text-rose-500' : 'text-emerald-500'}">${a.pendente ? '⚠️ PENDENTE' : '✅ PAGO'}</p>
                        <p class="text-[7px] text-slate-400 mt-1">${a.pagamento || ''}</p>
                    </div>
                </div>
            </div>`;
    }
    
    // Mostra apenas os atendimentos do ciclo atual (limite 5)
    const inicioCiclo = ciclosCompletos * CICLO_FIDELIDADE;
    const fimCiclo = inicioCiclo + CICLO_FIDELIDADE;
    const atendimentosCicloAtual = atendimentosDoCliente.slice(inicioCiclo, fimCiclo);
    
    let html = `
        <div class="grid grid-cols-3 gap-2 mb-4">
            <div class="bg-rose-50 p-3 rounded-xl text-center">
                <p class="text-[8px] font-black uppercase text-rose-400">Atendimentos</p>
                <p class="text-lg font-black text-rose-600">${totalAtendimentos}</p>
            </div>
            <div class="bg-emerald-50 p-3 rounded-xl text-center">
                <p class="text-[8px] font-black uppercase text-emerald-400">Total Gasto</p>
                <p class="text-lg font-black text-emerald-600">R$ ${totalGasto.toFixed(2)}</p>
            </div>
            <div class="bg-blue-50 p-3 rounded-xl text-center">
                <p class="text-[8px] font-black uppercase text-blue-400">Favorito</p>
                <p class="text-[10px] font-black text-blue-600">${servicoTop ? servicoTop[0] : 'N/A'}</p>
            </div>
        </div>
        
        <!-- Fidelidade -->
        <div class="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-2xl mb-4 border border-amber-200">
            <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-black uppercase text-amber-700">🏆 Fidelidade: ${ciclosCompletos} ${ciclosCompletos === 1 ? 'ciclo' : 'ciclos'}</span>
                ${ciclosCompletos > 0 ? `<span class="text-[8px] font-bold text-amber-500 bg-amber-100 px-2 py-1 rounded-full">${ciclosCompletos * CICLO_FIDELIDADE} atend.</span>` : ''}
            </div>
            <div class="flex items-center gap-3">
                <span class="text-[10px] font-black uppercase text-amber-600">📊 Ciclo atual: ${progressoCicloAtual}/${CICLO_FIDELIDADE}</span>
                ${faltamParaProximo > 0 ? `<span class="text-[8px] text-amber-500 font-bold">(faltam ${faltamParaProximo})</span>` : '<span class="text-[8px] text-emerald-500 font-bold">🎉 Completo!</span>'}
            </div>
            <div class="mt-2 bg-amber-200 rounded-full h-2 overflow-hidden">
                <div class="bg-amber-500 h-full rounded-full transition-all duration-500" style="width: ${(progressoCicloAtual / CICLO_FIDELIDADE) * 100}%"></div>
            </div>
        </div>
        
        <!-- Histórico (accordion) -->
        <div class="bg-slate-100 rounded-2xl overflow-hidden">
            <button onclick="toggleHistorico(this)" class="w-full p-4 flex justify-between items-center font-black uppercase text-[10px] text-slate-600 active:bg-slate-200 transition-colors">
                <span>📜 Últimos atendimentos (${atendimentosCicloAtual.length})</span>
                <i class="fas fa-chevron-down text-slate-400 transition-transform duration-300" id="icone-seta"></i>
            </button>
            <div id="historico-lista" class="hidden px-4 pb-4 space-y-2">
                ${atendimentosCicloAtual.map(a => montarCard(a)).join('')}
            </div>
        </div>`;
    
    container.innerHTML = html;
}

function toggleHistorico(btn) {
    const lista = document.getElementById('historico-lista');
    const icone = document.getElementById('icone-seta');
    
    if (lista.classList.contains('hidden')) {
        lista.classList.remove('hidden');
        icone.style.transform = 'rotate(180deg)';
    } else {
        lista.classList.add('hidden');
        icone.style.transform = 'rotate(0deg)';
    }
}

function initCropper(input) { if (input.files && input.files[0]) { const reader = new FileReader(); document.getElementById('crop-container').style.display = 'block'; reader.onload = e => { if (croppieInstance) croppieInstance.destroy(); croppieInstance = new Croppie(document.getElementById('cropper-wrap'), { viewport: { width: 160, height: 160, type: 'square' }, boundary: { width: 260, height: 260 } }); croppieInstance.bind({ url: e.target.result }); }; reader.readAsDataURL(input.files[0]); } }
function toggleDia(idx) { document.getElementById(`lista-dia-${idx}`).classList.toggle('aberta'); }
function fecharModal() { 
    document.getElementById('modal').classList.remove('active'); 
    document.getElementById('btn-confirmar').style.display = '';
    itemSendoEditado = null; 
    if(croppieInstance) croppieInstance.destroy(); 
    croppieInstance = null; 
}
function removerAtend(idx) { if(confirm('Remover este atendimento?')) { db.atendimentos.splice(idx, 1); localStorage.setItem('barber_v6', JSON.stringify(db)); renderSemana(); } }
function aplicarFiltroTag(t) { document.getElementById('filtro-cliente').value = t; renderClientes(); }

renderSemana();