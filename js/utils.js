// ==========================================
// LÓGICA DO DASHBOARD DE LUCRO (DINÂMICO)
// ==========================================
function salvarPorcentagem(valor) {
    let num = parseInt(valor);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 100) num = 100;
    db.minhaParte = num;
    localStorage.setItem('barber_v6', JSON.stringify(db));
    renderAjustes(); 
}

function renderAjustes() {
    if (db.minhaParte === undefined || db.minhaParte === null) {
        db.minhaParte = 60;
    }
    
    const inputPct = document.getElementById('input-porcentagem');
    if (inputPct) inputPct.value = db.minhaParte;
    
    const mePercentage = parseFloat(db.minhaParte) / 100;
    const storePercentage = 1 - mePercentage;
    
    // Calcula totais separados (apenas pagos)
    let totalServicosPagos = 0;
    let totalProdutosPagos = 0;
    let totalGorjetas = 0;
    
    db.atendimentos.forEach(a => {
        if (a.pendente) return;
        
        // Produtos com preços atuais
        let totalProd = 0;
        if (a.produtos && a.produtos.length > 0) {
            a.produtos.forEach(p => {
                const produtoAtual = db.produtos.find(prod => prod.nome === p.nome);
                const preco = produtoAtual ? parseFloat(produtoAtual.valor || 0) : 0;
                totalProd += preco * p.qtd;
            });
        }
        
        const gorjeta = parseFloat(a.gorjeta || 0);
        const totalAtend = parseFloat(a.total || 0);
        
        // Serviços = Total - Produtos - Gorjeta
        const servicos = totalAtend - totalProd - gorjeta;
        
        totalServicosPagos += servicos;
        totalProdutosPagos += totalProd;
        totalGorjetas += gorjeta;
    });
    
    // Divisão APENAS sobre serviços
    const totalParaDividir = totalServicosPagos;
    const meuLucro  = (totalParaDividir * mePercentage) + totalGorjetas;
    const caixaLoja = (totalParaDividir * storePercentage) + totalProdutosPagos;
    
    const fmt = (valor) => `R$ ${valor.toFixed(2)}`;
    
    const elMyCut  = document.getElementById('dash-meu');
    const elStore  = document.getElementById('dash-custos');
    const labelMeu = document.getElementById('label-meu');
    const labelCustos = document.getElementById('label-custos');
    
    if (elMyCut)  elMyCut.textContent  = fmt(meuLucro);
    if (elStore)  elStore.textContent  = fmt(caixaLoja);
    
    if (labelMeu) {
        labelMeu.innerText = totalGorjetas > 0 
            ? `Minha Parte (${db.minhaParte}% + 💵 ${fmt(totalGorjetas)})`
            : `Minha Parte (${db.minhaParte}%)`;
    }
    if (labelCustos) {
        labelCustos.innerText = totalProdutosPagos > 0
            ? `Loja/Custos (${100 - db.minhaParte}% + 🛍️ ${fmt(totalProdutosPagos)})`
            : `Loja/Custos (${100 - db.minhaParte}%)`;
    }
}

// ==========================================
// FUNÇÃO DE RELATÓRIO DIDÁTICO (PNG) - AGRUPADO POR DIA
// ==========================================
async function gerarRelatorioPNG() {
    const container = document.getElementById('relatorio-temp');
    const pctMeu = db.minhaParte || 60;
    
    let totalServicosGeral = 0;
    let totalProdutosGeral = 0;
    let totalGorjetasGeral = 0;
    let totalPendenteGeral = 0;
    let totalBarbeiroGeral = 0;

    const limiteData = new Date();
    limiteData.setDate(limiteData.getDate() - 7);
    
    const atendimentosFiltrados = db.atendimentos
        .filter(a => new Date(a.dataHora || 0) >= limiteData)
        .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
    
    // Agrupa por dia
    const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const agrupado = {};
    
    atendimentosFiltrados.forEach(a => {
        const data = new Date(a.dataHora);
        const chave = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        const diaSemana = diasSemana[data.getDay()];
        const diaCompleto = `${diaSemana.substring(0, 3).toUpperCase()} ${chave}`;
        
        if (!agrupado[diaCompleto]) {
            agrupado[diaCompleto] = [];
        }
        agrupado[diaCompleto].push(a);
    });
    
    let html = `
        <div style="font-family: 'Inter', sans-serif; color: #1e293b; background: white; padding: 20px; max-width: 400px;">
            <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 12px;">
                <h1 style="margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; color: #e11d48; letter-spacing: -1px;">Cliente Max</h1>
                <p style="margin: 4px 0 0; font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase">Fechamento Semanal: ${new Date().toLocaleDateString()}</p>
            </div>
    `;
    
    // Renderiza cada dia
    Object.keys(agrupado).forEach(dia => {
        const atends = agrupado[dia];
        let totalDia = 0;
        
        html += `
            <div style="margin-bottom: 12px; background: #f8fafc; border-radius: 12px; padding: 12px;">
                <div style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                    📅 ${dia} — ${atends.length} atend.
                </div>
        `;
        
        atends.forEach(a => {
            let totalAtend = parseFloat(a.total || 0);
            let gorjeta = parseFloat(a.gorjeta || 0);
            let barbeiroValor = parseFloat(a.barbeiroValor || 0);
            
            // Produtos com preços atuais
            let totalProd = 0;
            let produtosTexto = '';
            if (a.produtos && a.produtos.length > 0) {
                const partes = a.produtos.map(p => {
                    const produtoAtual = db.produtos.find(prod => prod.nome === p.nome);
                    const preco = produtoAtual ? parseFloat(produtoAtual.valor || 0) : 0;
                    totalProd += preco * p.qtd;
                    return `${p.qtd}x ${p.nome}`;
                });
                produtosTexto = partes.join(', ');
            }
            
            const servicos = totalAtend - totalProd - gorjeta;
            
            if(a.pendente) {
                totalPendenteGeral += totalAtend;
            } else {
                totalServicosGeral += servicos;
                totalProdutosGeral += totalProd;
                totalGorjetasGeral += gorjeta;
                totalBarbeiroGeral += barbeiroValor;
            }
            
            totalDia += totalAtend;
            
            // Status com recebedor (só se informado)
            const temRecebedor = a.recebedor && a.recebedor !== 'Não informado';
            const statusLinha = a.pendente 
                ? `⚠️ PENDENTE${temRecebedor ? ` • Com: ${a.recebedor}` : ''}`
                : `✅ PAGO${temRecebedor ? ` • Recebido por: ${a.recebedor}` : ''}`;
            
            html += `
                <div style="margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #f1f5f9; font-size: 9px;">
                    <div style="font-weight: 900; text-transform: uppercase;">${a.nome}</div>
                    <div style="color: ${a.pendente ? '#e11d48' : '#64748b'}; font-size: 8px;">${statusLinha}</div>
                    <div style="color: #64748b;">✂️ ${a.servicos.join(' + ')}: R$ ${servicos.toFixed(2)}</div>
                    ${a.desconto > 0 ? `<div style="color: #e11d48;">Desconto: -R$ ${parseFloat(a.desconto).toFixed(2)}</div>` : ''}
                    ${produtosTexto ? `<div style="color: #3b82f6;">🛍️ ${produtosTexto}: R$ ${totalProd.toFixed(2)}</div>` : ''}
                    ${gorjeta > 0 ? `<div style="color: #f59e0b;">💵 Gorjeta: R$ ${gorjeta.toFixed(2)}</div>` : ''}
                    ${a.barbeiroNome ? `<div style="color: #8b5cf6;">+ ${a.barbeiroNome}: R$ ${barbeiroValor.toFixed(2)}</div>` : ''}
                    <div style="text-align: right; font-weight: 900; color: #e11d48;">R$ ${totalAtend.toFixed(2)}</div>
                </div>
            `;
        });
        
        html += `
                <div style="text-align: right; font-weight: 900; font-size: 10px; color: #1e293b; padding-top: 4px;">
                    → Total: R$ ${totalDia.toFixed(2)}
                </div>
            </div>
        `;
    });
    
    const totalParaDividir = totalServicosGeral;
    const valorMinhaParte = ((totalParaDividir * (pctMeu / 100)) + totalGorjetasGeral).toFixed(2);
    const valorLoja = ((totalParaDividir * ((100 - pctMeu) / 100)) + totalProdutosGeral).toFixed(2);
    const totalBruto = totalServicosGeral + totalProdutosGeral + totalGorjetasGeral;
    
    html += `
            <div style="margin-top: 15px; padding: 15px; background: #f8fafc; border-radius: 16px; border: 1px solid #f1f5f9; font-size: 9px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-weight: 800; color: #64748b; text-transform: uppercase;">✂️ Total Serviços:</span>
                    <span style="font-weight: 900;">R$ ${totalServicosGeral.toFixed(2)}</span>
                </div>
                ${totalProdutosGeral > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #3b82f6;">
                    <span style="font-weight: 800; text-transform: uppercase;">🛍️ Total Produtos:</span>
                    <span style="font-weight: 900;">R$ ${totalProdutosGeral.toFixed(2)}</span>
                </div>` : ''}
                ${totalGorjetasGeral > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #f59e0b;">
                    <span style="font-weight: 800; text-transform: uppercase;">💵 Gorjetas (Suas):</span>
                    <span style="font-weight: 900;">R$ ${totalGorjetasGeral.toFixed(2)}</span>
                </div>` : ''}
                ${totalBarbeiroGeral > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #8b5cf6;">
                    <span style="font-weight: 800; text-transform: uppercase;">+ Barbeiros (com você):</span>
                    <span style="font-weight: 900;">R$ ${totalBarbeiroGeral.toFixed(2)}</span>
                </div>` : ''}
                ${totalPendenteGeral > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #e11d48;">
                    <span style="font-weight: 800; text-transform: uppercase;">⚠️ Pendente:</span>
                    <span style="font-weight: 900;">R$ ${totalPendenteGeral.toFixed(2)}</span>
                </div>` : ''}
                <div style="display: flex; justify-content: space-between; border-top: 2px dashed #e2e8f0; padding-top: 8px; margin-top: 6px;">
                    <span style="font-weight: 800; color: #1e293b; text-transform: uppercase;">Total Bruto:</span>
                    <span style="font-size: 12px; font-weight: 900;">R$ ${totalBruto.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 4px;">
                    <span style="font-weight: 800; color: #10b981; text-transform: uppercase;">Minha Parte (${pctMeu}%):</span>
                    <span style="font-size: 14px; font-weight: 900; color: #10b981;">R$ ${valorMinhaParte}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 2px;">
                    <span style="font-weight: 800; color: #64748b; text-transform: uppercase;">Loja (${100 - pctMeu}%):</span>
                    <span style="font-weight: 900; color: #64748b;">R$ ${valorLoja}</span>
                </div>
            </div>
            
            <p style="text-align: center; font-size: 8px; color: #94a3b8; margin-top: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Gerado por Cliente Max</p>
        </div>
    `;

    container.innerHTML = html;

    try {
        const canvas = await html2canvas(container, {
            backgroundColor: "#ffffff",
            scale: 3, 
            logging: false,
            useCORS: true
        });

        canvas.toBlob(async (blob) => {
            const dataRef = new Date().toLocaleDateString().replace(/\//g, '-');
            const file = new File([blob], `relatorio_barbearia_${dataRef}.png`, { type: 'image/png' });
            
            if (navigator.share) {
                await navigator.share({
                    title: 'Relatório Cliente Max',
                    files: [file]
                });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `relatorio_barbearia_${dataRef}.png`;
                link.click();
            }
        }, 'image/png');
    } catch (err) {
        alert("Erro ao gerar imagem do relatório.");
        console.error(err);
    }
}

// ==========================================
// FUNÇÕES DE BACKUP (SISTEMA)
// ==========================================
async function exportarBackup() {
    const dataRef = new Date().toLocaleDateString().replace(/\//g, '-');
    const nomeArquivo = `backup_topindica_${dataRef}.json`;
    const dadosStr = JSON.stringify(db, null, 2);

    if (navigator.share) {
        try {
            const arquivo = new File([dadosStr], nomeArquivo, { type: 'application/json' });
            await navigator.share({
                title: 'Backup Cliente Max',
                files: [arquivo]
            });
            return;
        } catch (err) {
            console.log("Compartilhamento cancelado");
        }
    }

    const blob = new Blob([dadosStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
}

function importarBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const dados = JSON.parse(ev.target.result);
            if (dados.atendimentos || dados.clientes) {
                if(confirm("ATENÇÃO: Isso irá substituir os dados atuais pelos do backup. Continuar?")) {
                    db = dados;
                    localStorage.setItem('barber_v6', JSON.stringify(db));
                    location.reload();
                }
            } else {
                alert("Arquivo de backup inválido.");
            }
        } catch (err) {
            alert("Erro ao ler o arquivo.");
        }
    };
    reader.readAsText(file);
}