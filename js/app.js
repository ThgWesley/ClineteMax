let db = JSON.parse(localStorage.getItem('barber_v6')) || { clientes: [], atendimentos: [], produtos: [] };
let abaAtual = 'semanal';
let croppieInstance = null;
let itemSendoEditado = null;

const EXTRAS_LISTA = { "Sobrancelha": 10, "Limpeza": 15, "Pezinho": 10, "Botox": 100 };
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
                ${atends.map((a, i_orig) => `
                    <div class="card-atendimento ${a.pendente ? 'border-l-4 border-rose-500' : ''}">
                        <div>
                            <p class="font-black text-xs uppercase">${a.nome} ${a.pendente ? '<span class="text-rose-600 text-[8px]">[PENDENTE]</span>' : ''}</p>
                            <p class="text-[9px] text-slate-400 font-bold uppercase">${a.servicos.join(' + ')}</p>
                            <p class="text-[8px] text-slate-400 italic">${a.pendente ? 'Dinheiro com: ' : 'Recebido por: '} ${a.recebedor || 'N/I'}</p>
                            ${a.produtos && a.produtos.length > 0 ? `<p class="text-[9px] text-blue-500 font-black mt-1">PRODUTOS: ${a.produtos.join(', ')}</p>` : ''}
                        </div>
                        <div class="text-right">
                            <p class="text-sm font-black text-rose-600">R$ ${a.total}</p>
                            <p class="text-[9px] font-bold text-slate-500 uppercase">${a.pendente ? '' : (a.pagamento || '')}</p> 
                            <button onclick="removerAtend(${db.atendimentos.indexOf(a)})" class="text-[8px] font-bold text-slate-300 uppercase">Remover</button>
                        </div>
                    </div>
                `).join('') || '<p class="text-center text-slate-300 text-[10px] py-4 font-bold">SEM REGISTROS RECENTES</p>'}
            </div>
        `;
    });
    document.getElementById('total-semanal').innerText = `R$ ${faturamentoTotal.toFixed(2)}`;
}

// NOVA FUNÇÃO AUXILIAR PARA O FORMULÁRIO DINÂMICO
function toggleCamposPagamento() {
    const isPendente = document.getElementById('m-pendente').checked;
    const campoPg = document.getElementById('wrapper-pg');
    const campoRecebedor = document.getElementById('m-recebedor');

    if (isPendente) {
        campoPg.classList.add('hidden');
        campoRecebedor.classList.remove('hidden');
    } else {
        campoPg.classList.remove('hidden');
        campoRecebedor.classList.add('hidden');
    }
}

function abrirModal(ehNovo = true) {
    if (ehNovo) itemSendoEditado = null; 
    
    const container = document.getElementById('campos-dinamicos');
    const btnConfirmar = document.getElementById('btn-confirmar');
    document.getElementById('modal').classList.add('active');
    
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
            <input type="number" id="m-total-manual" placeholder="Total Final R$" class="mt-4 font-black text-rose-600">`;
    }
}

async function salvarDados() {
    const diaIdx = new Date().getDay();
    
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
        const pendente = document.getElementById('m-pendente').checked;
        const recebedor = document.getElementById('m-recebedor').value || "Não informado";
        const totalManual = document.getElementById('m-total-manual').value;

        let precoBase = (diaIdx >= 1 && diaIdx <= 3) ? 30 : 35;
        let totalServ = sel.reduce((acc, s) => acc + ((s==='Corte'||s==='Barba') ? precoBase : (EXTRAS_LISTA[s]||0)), 0);
        let totalProd = 0; let pResumo = [];
        
        prodsChecked.forEach(p => {
            const pr = parseFloat(p.getAttribute('data-price')) || 0;
            const q = parseInt(document.getElementById(`qty-${p.id}`).value) || 1;
            totalProd += pr * q; pResumo.push(`${q}x ${p.value}`);
        });
        
        let totalCalculado = (totalServ + totalProd) - desc;
        let totalFinal = totalManual ? parseFloat(totalManual).toFixed(2) : totalCalculado.toFixed(2);

        if (nome) {
            db.atendimentos.push({ 
                nome, 
                servicos: sel, 
                produtos: pResumo, 
                total: totalFinal, 
                diaIndex: diaIdx, 
                dataHora: new Date().toISOString(),
                pagamento: pendente ? "PENDENTE" : pgtoRaw,
                pendente: pendente,
                recebedor: recebedor 
            });
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
        return `<div class="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
            <div class="flex items-center gap-3">
                ${c.foto ? `<img src="${c.foto}" class="w-12 h-12 rounded-full object-cover">` : `<div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300"><i class="fas fa-user"></i></div>`}
                <div><p class="font-black text-sm uppercase">${c.nome}</p><p class="text-[10px] text-slate-400 font-bold">${c.contato || 'S/ CONTATO'}</p></div>
            </div>
            <div class="flex gap-4"><button onclick="prepararEdicao(${idx})" class="text-slate-300"><i class="fas fa-edit"></i></button><button onclick="excluirCliente(${idx})" class="text-slate-200"><i class="fas fa-trash-alt"></i></button></div>
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

function initCropper(input) { if (input.files && input.files[0]) { const reader = new FileReader(); document.getElementById('crop-container').style.display = 'block'; reader.onload = e => { if (croppieInstance) croppieInstance.destroy(); croppieInstance = new Croppie(document.getElementById('cropper-wrap'), { viewport: { width: 160, height: 160, type: 'square' }, boundary: { width: 260, height: 260 } }); croppieInstance.bind({ url: e.target.result }); }; reader.readAsDataURL(input.files[0]); } }
function toggleDia(idx) { document.getElementById(`lista-dia-${idx}`).classList.toggle('aberta'); }
function fecharModal() { document.getElementById('modal').classList.remove('active'); itemSendoEditado = null; if(croppieInstance) croppieInstance.destroy(); croppieInstance = null; }
function removerAtend(idx) { db.atendimentos.splice(idx, 1); localStorage.setItem('barber_v6', JSON.stringify(db)); renderSemana(); }
function aplicarFiltroTag(t) { document.getElementById('filtro-cliente').value = t; renderClientes(); }

renderSemana();
