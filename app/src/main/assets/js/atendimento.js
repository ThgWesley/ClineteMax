// ==========================================
// ATENDIMENTO - atendimento.js
// ==========================================

function abrirModal(ehNovo = true) {
    if (ehNovo) itemSendoEditado = null;
    
    // Trava scroll e toques
    document.body.classList.add('modal-aberto');
    
    const container = document.getElementById('campos-dinamicos');
    const btnConfirmar = document.getElementById('btn-confirmar');
    document.getElementById('modal').classList.add('active');
    btnConfirmar.style.display = '';
    
    if (abaAtual === 'clientes') {
        document.getElementById('modal-title').innerText = ehNovo ? "Novo Registro" : "Editar Registro";
        btnConfirmar.innerText = "Salvar Agora";
        container.innerHTML = `
            <label class="modal-label">Nome Completo</label>
            <input type="text" id="m-nome" placeholder="Ex: Thiago Wesley">
            <label class="modal-label">WhatsApp</label>
            <input type="text" id="m-contato" placeholder="98 9...">
            <label class="modal-label">Tags (Características)</label>
            <input type="text" id="m-tags" placeholder="Ex: Policial, Flamengo, Barba">
            <label class="modal-label">Foto de Perfil</label>
            <input type="file" id="m-foto-input" accept="image/*" onchange="initCropper(this)">
            <div id="crop-container"><div id="cropper-wrap"></div></div>`;
    } else if (abaAtual === 'produtos') {
        document.getElementById('modal-title').innerText = ehNovo ? "Novo Produto" : "Editar Produto";
        btnConfirmar.innerText = "Salvar Produto";
        container.innerHTML = `
            <label class="modal-label">Nome do Produto</label>
            <input type="text" id="p-nome" placeholder="Ex: Pomada">
            <label class="modal-label">Valor (Opcional)</label>
            <input type="number" id="p-valor" placeholder="Ex: 25.00" step="0.01">
            <label class="modal-label">Foto ou Emoji</label>
            <input type="text" id="p-emoji" placeholder="Emoji (ex: 🧴) ou use a foto abaixo">
            <input type="file" id="m-foto-input" accept="image/*" onchange="initCropper(this)">
            <div id="crop-container"><div id="cropper-wrap"></div></div>`;
    } else {
        document.getElementById('modal-title').innerText = "Novo Registro";
        btnConfirmar.innerText = "Confirmar";
        
        let htmlProds = '';
        if (db.produtos && db.produtos.length > 0) {
            htmlProds = `
                <p class="text-[10px] font-black uppercase text-blue-500 mt-4 mb-2">Produtos Vendidos</p>
                <div class="grid grid-cols-3 gap-2">
                    ${db.produtos.map((p, i) => `
                        <div class="flex flex-col">
                            <input type="checkbox" id="prod-${i}" name="prod" value="${p.nome}" class="service-chip">
                            <label for="prod-${i}" class="service-label">${p.nome.toUpperCase()}</label>
                            <div class="qty-wrapper">
                                <input type="number" id="qty-prod-${i}" value="1" min="1" class="qty-input">
                            </div>
                        </div>
                    `).join('')}
                </div>`;
        }
        
        let htmlExtras = '';
        if (db.servicosExtras && db.servicosExtras.length > 0) {
            htmlExtras = `
                <div class="card-extras">
                    <button type="button" onclick="toggleExtrasAccordion()" class="card-extras-header">
                        <span>📦 Serviços Extras</span>
                        <i class="fas fa-chevron-down icone-seta" id="icone-seta-extras"></i>
                    </button>
                    <div class="card-extras-body" id="extras-body">
                        <div class="grid grid-cols-2 gap-2">
                            ${db.servicosExtras.map((s, i) => `
                                <div class="flex flex-col">
                                    <input type="checkbox" id="ext-${i}" name="serv" value="${s.nome}" class="service-chip">
                                    <label for="ext-${i}" class="service-label">${s.nome.toUpperCase()}</label>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>`;
        }
        
        container.innerHTML = `
            <div class="flex items-center gap-3 mb-4">
                <div id="foto-cliente-preview" class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                    <i class="fas fa-user"></i>
                </div>
                <div class="flex-1 relative">
                    <input type="text" id="m-nome-sem" list="clientes-list" placeholder="Nome do Cliente" onkeyup="filtrarClientesDropdown(this.value)" onfocus="filtrarClientesDropdown(this.value)" class="font-black text-sm">
                    <div id="dropdown-clientes" class="hidden"></div>
                </div>
            </div>
            <datalist id="clientes-list">${db.clientes.map(c => `<option value="${c.nome}">`).join('')}</datalist>
            
            <p class="text-[10px] font-black uppercase text-slate-400 mb-2">Serviços</p>
            <div class="grid grid-cols-2 gap-2">
                <input type="checkbox" id="s-c" name="serv" value="Corte" class="service-chip">
                <label for="s-c" class="service-label">CORTE</label>
                <input type="checkbox" id="s-b" name="serv" value="Barba" class="service-chip">
                <label for="s-b" class="service-label">BARBA</label>
            </div>
            
            ${htmlExtras}
            ${htmlProds}
            
            <div class="card-pagamento">
                <span class="card-titulo">💳 Forma de Pagamento</span>
                <div class="flex gap-2">
                    <select id="m-pg" class="flex-1" style="margin-bottom:0">
                        <option>Pix</option>
                        <option>Dinheiro</option>
                        <option>Cartão</option>
                    </select>
                </div>
            </div>
            
            <div class="card-pagamento">
                <span class="card-titulo">💰 Valor Personalizado</span>
                <div class="flex gap-2">
                    <input type="number" id="m-valor-custom" placeholder="Deixe em branco para cálculo automático" class="flex-1" step="0.01" style="margin-bottom:0">
                    <div style="font-size: 11px; color: #64748b; padding: 8px; background: #f1f5f9; border-radius: 8px; min-width: 120px; display: flex; align-items: center; justify-content: center;">
                        <span id="total-preview">R$ 0,00</span>
                    </div>
                </div>
            </div>
            
            <div class="card-pagamento">
                <span class="card-titulo">🏷️ Desconto (Se sem valor personalizado)</span>
                <input type="number" id="m-desc" placeholder="Desconto R$" class="w-full" value="0" step="0.01" style="margin-bottom:0" onchange="atualizarPreview()">
            </div>
            
            <div class="card-barbeiro" style="background: #fee2e2; border-left: 4px solid #e11d48;">
                <span class="card-titulo" style="color: #e11d48;">⚠️ Pagamento Pendente</span>
                <div class="flex gap-2">
                    <input type="text" id="m-recebedor" placeholder="Nome" class="flex-1" style="margin-bottom:0">
                    <input type="number" id="m-recebedor-valor" placeholder="R$ 0,00" class="w-28" step="0.01" style="margin-bottom:0">
                </div>
            </div>
            
            <div class="card-barbeiro">
                <span class="card-titulo">+ Barbeiro</span>
                <div class="flex gap-2">
                    <input type="text" id="m-barbeiro-nome" placeholder="Nome" class="flex-1" style="margin-bottom:0">
                    <input type="number" id="m-barbeiro-valor" placeholder="R$ 0,00" class="w-28" step="0.01" style="margin-bottom:0">
                </div>
                <p class="card-descricao">Valor de outro barbeiro que está com você</p>
            </div>
            
            <div class="card-gorjeta">
                <span class="card-titulo">💵 Gorjeta (Sua Parte)</span>
                <input type="number" id="m-gorjeta" placeholder="R$ 0,00" class="w-full" step="0.01" style="margin-bottom:0">
                <p class="card-descricao">Este valor é 100% seu, não divide com a loja</p>
            </div>`;
    }
}

// ==========================================
// FUNÇÃO PARA ATUALIZAR PREVIEW DO TOTAL
// ==========================================
function atualizarPreview() {
    const sel = Array.from(document.querySelectorAll('input[name="serv"]:checked')).map(i => i.value);
    const prodsChecked = Array.from(document.querySelectorAll('input[name="prod"]:checked'));
    const valorCustomizado = parseFloat(document.getElementById('m-valor-custom')?.value) || null;
    const desc = parseFloat(document.getElementById('m-desc')?.value) || 0;
    
    let diaIdx = new Date().getDay();
    let precoBase = (diaIdx >= 1 && diaIdx <= 3) ? 30 : 35;
    
    let totalServ = 0;
    sel.forEach(s => {
        if (s === 'Corte' || s === 'Barba') {
            totalServ += precoBase;
        } else {
            const extra = (db.servicosExtras || []).find(e => e.nome === s);
            if (extra) totalServ += parseFloat(extra.valor || 0);
        }
    });
    
    let totalProd = 0;
    prodsChecked.forEach(p => {
        const q = parseInt(document.getElementById(`qty-prod-${p.id.split('-')[1]}`)?.value) || 1;
        const produtoAtual = db.produtos.find(prod => prod.nome === p.value);
        const preco = produtoAtual ? parseFloat(produtoAtual.valor || 0) : 0;
        totalProd += preco * q;
    });
    
    let totalFinal;
    if (valorCustomizado !== null && valorCustomizado > 0) {
        totalFinal = parseFloat(valorCustomizado);
    } else {
        totalFinal = totalServ + totalProd - desc;
    }
    
    const previewEl = document.getElementById('total-preview');
    if (previewEl) {
        previewEl.innerText = 'R$ ' + totalFinal.toFixed(2).replace('.', ',');
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
            salvarDB();
            fecharModal();
            abaAtual = 'clientes';
            renderClientes();
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
            salvarDB();
            fecharModal();
            abaAtual = 'produtos';
            renderProdutos();
        }
    } else {
        const nome = document.getElementById('m-nome-sem').value;
        const sel = Array.from(document.querySelectorAll('input[name="serv"]:checked')).map(i => i.value);
        const prodsChecked = Array.from(document.querySelectorAll('input[name="prod"]:checked'));
        const valorCustomizado = parseFloat(document.getElementById('m-valor-custom')?.value) || null;
        const desc = parseFloat(document.getElementById('m-desc')?.value) || 0;
        const pgtoRaw = document.getElementById('m-pg')?.value;
        const recebedor = document.getElementById('m-recebedor')?.value || '';
        const recebedorValor = parseFloat(document.getElementById('m-recebedor-valor')?.value) || 0;
        const gorjeta = parseFloat(document.getElementById('m-gorjeta')?.value) || 0;
        const barbeiroNome = document.getElementById('m-barbeiro-nome')?.value || '';
        const barbeiroValor = parseFloat(document.getElementById('m-barbeiro-valor')?.value) || 0;
        
        const pendente = recebedor.trim().length > 0;

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
        
        let totalServ = 0;
        sel.forEach(s => {
            if (s === 'Corte' || s === 'Barba') {
                totalServ += precoBase;
            } else {
                const extra = (db.servicosExtras || []).find(e => e.nome === s);
                if (extra) totalServ += parseFloat(extra.valor || 0);
            }
        });
        
        let produtosSalvos = [];
        let totalProd = 0;
        prodsChecked.forEach(p => {
            const q = parseInt(document.getElementById(`qty-prod-${p.id.split('-')[1]}`)?.value) || 1;
            const produtoAtual = db.produtos.find(prod => prod.nome === p.value);
            const preco = produtoAtual ? parseFloat(produtoAtual.valor || 0) : 0;
            totalProd += preco * q;
            produtosSalvos.push({ nome: p.value, qtd: q });
        });
        
        // Se tem valor customizado, usa esse. Senão calcula
        let totalFinal;
        if (valorCustomizado !== null && valorCustomizado > 0) {
            // Usa valor personalizado sem descontos
            totalFinal = valorCustomizado.toFixed(2);
        } else {
            // Calcula normalmente com desconto e gorjeta
            let totalCalculado = totalServ + totalProd - desc + gorjeta;
            totalFinal = totalCalculado.toFixed(2);
        }

        if (nome) {
            const atendimento = { 
                nome, 
                servicos: sel, 
                produtos: produtosSalvos,
                total: totalFinal, 
                diaIndex: diaIdx,
                dataHora: dataHora,
                pagamento: pendente ? "PENDENTE" : pgtoRaw,
                pendente: pendente,
                recebedor: recebedor,
                recebedorValor: recebedorValor,
                gorjeta: gorjeta,
                desconto: desc,
                barbeiroNome: barbeiroNome,
                barbeiroValor: barbeiroValor,
                valorCustomizado: valorCustomizado
            };
            
            if (itemSendoEditado !== null) {
                db.atendimentos[itemSendoEditado] = atendimento;
            } else {
                db.atendimentos.push(atendimento);
            }
            
            salvarDB();
            fecharModal(); 
            renderSemana();
        }
    }
}

function initCropper(input) { 
    if (input.files && input.files[0]) { 
        const reader = new FileReader(); 
        const cropContainer = document.getElementById('crop-container');
        const cropperWrap = document.getElementById('cropper-wrap');
        cropContainer.style.display = 'block'; 
        reader.onload = e => { 
            if (croppieInstance) { croppieInstance.destroy(); croppieInstance = null; }
            cropperWrap.innerHTML = '';
            croppieInstance = new Croppie(cropperWrap, { 
                viewport: { width: 160, height: 160, type: 'square' }, 
                boundary: { width: 260, height: 260 } 
            }); 
            croppieInstance.bind({ url: e.target.result }); 
        }; 
        reader.readAsDataURL(input.files[0]); 
    } 
}

function fecharModal() {
    document.body.classList.remove('modal-aberto');
    document.getElementById('modal').classList.remove('active');
    document.getElementById('btn-confirmar').style.display = '';
    itemSendoEditado = null;
    croppieInstance = null;
}