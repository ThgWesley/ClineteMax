// ==========================================
// LÓGICA DO DASHBOARD DE LUCRO (DINÂMICO)
// ==========================================
function salvarPorcentagem(valor) {
    let num = parseInt(valor);
    
    // Evita que coloque números negativos, letras ou mais que 100%
    if (isNaN(num) || num < 0) num = 0;
    if (num > 100) num = 100;
    
    // Salva a sua escolha no banco de dados principal
    db.minhaParte = num;
    localStorage.setItem('barber_v6', JSON.stringify(db));
    
    // Atualiza a tela em tempo real
    renderAjustes(); 
}

function renderAjustes() {
    // Se for a primeira vez abrindo o app e não tiver porcentagem, define como 60%
    if (db.minhaParte === undefined) {
        db.minhaParte = 60;
    }
    
    const pctMeu = db.minhaParte;
    const pctLoja = 100 - pctMeu;
    
    // Atualiza os textos da interface com a porcentagem escolhida
    const inputPct = document.getElementById('input-porcentagem');
    if (inputPct) inputPct.value = pctMeu;

    const labelMeu = document.getElementById('label-meu');
    if (labelMeu) labelMeu.innerText = `Minha Parte (${pctMeu}%)`;

    const labelCustos = document.getElementById('label-custos');
    if (labelCustos) labelCustos.innerText = `Loja/Custos (${pctLoja}%)`;

    // Faz os cálculos matemáticos com base no faturamento real
    const totalBruto = db.atendimentos.reduce((acc, a) => acc + parseFloat(a.total), 0);
    const minhaParteVal = (totalBruto * (pctMeu / 100)).toFixed(2);
    const custosLojaVal = (totalBruto * (pctLoja / 100)).toFixed(2);
    
    // Joga os valores finais na tela
    const dashMeu = document.getElementById('dash-meu');
    if (dashMeu) dashMeu.innerText = `R$ ${minhaParteVal}`;

    const dashCustos = document.getElementById('dash-custos');
    if (dashCustos) dashCustos.innerText = `R$ ${custosLojaVal}`;
}

// ==========================================
// FUNÇÃO DE RELATÓRIO DIDÁTICO (PNG)
// ==========================================
async function gerarRelatorioPNG() {
    const container = document.getElementById('relatorio-temp');
    const pctMeu = db.minhaParte || 60;
    
    let totalGeralServicos = 0;
    let totalGeralVendas = 0;
    
    // Início da montagem do HTML do relatório
    let html = `
        <div style="font-family: 'Inter', sans-serif; color: #1e293b; background: white;">
            <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 15px;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 900; text-transform: uppercase; color: #e11d48; letter-spacing: -1px;">Cliente Max</h1>
                <p style="margin: 5px 0 0; font-size: 10px; font-weight: 800; color: #64748b; uppercase">Relatório de Fechamento: ${new Date().toLocaleDateString()}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                    <tr style="text-align: left; border-bottom: 1px solid #e2e8f0; color: #94a3b8;">
                        <th style="padding: 8px 0; uppercase">Detalhes do Cliente</th>
                        <th style="padding: 8px 0; text-align: right; uppercase">Valor</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Percorre os atendimentos para listar e somar
    db.atendimentos.forEach(atend => {
        // Lógica para separar o que é serviço do que é produto no total do atendimento
        // Como o app soma tudo no 'total', precisamos deduzir se houver produtos listados
        // Para este relatório, vamos considerar o 'total' como base de serviços 
        // e identificar os produtos visualmente.
        
        let valorTotal = parseFloat(atend.total);
        totalGeralServicos += valorTotal;

        html += `
            <tr style="border-bottom: 1px solid #f8fafc;">
                <td style="padding: 12px 0;">
                    <div style="font-weight: 900; text-transform: uppercase; font-size: 12px;">${atend.nome}</div>
                    <div style="font-size: 9px; color: #64748b; font-weight: 600;">
                        <i class="fas fa-cut"></i> ${atend.servicos.join(' + ')} 
                        <span style="margin-left: 5px; color: #94a3b8;">[${atend.pagamento}]</span>
                    </div>
                    ${atend.produtos && atend.produtos.length > 0 ? 
                        `<div style="font-size: 9px; color: #3b82f6; font-weight: 800; margin-top: 2px;">
                            <i class="fas fa-shopping-bag"></i> PRODUTOS: ${atend.produtos.join(', ')}
                         </div>` : ''}
                </td>
                <td style="padding: 12px 0; text-align: right; font-weight: 900; color: #1e293b; font-size: 13px;">
                    R$ ${valorTotal.toFixed(2)}
                </td>
            </tr>
        `;
    });

    const valorMinhaParte = (totalGeralServicos * (pctMeu / 100)).toFixed(2);

    html += `
                </tbody>
            </table>

            <div style="margin-top: 25px; padding: 20px; background: #f8fafc; border-radius: 24px; border: 1px solid #f1f5f9;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Total em Serviços:</span>
                    <span style="font-size: 14px; font-weight: 900; color: #1e293b;">R$ ${totalGeralServicos.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 2px dashed #e2e8f0; padding-bottom: 10px; margin-bottom: 10px;">
                    <span style="font-size: 11px; font-weight: 800; color: #10b981; text-transform: uppercase;">Minha Porcentagem (${pctMeu}%):</span>
                    <span style="font-size: 16px; font-weight: 900; color: #10b981;">R$ ${valorMinhaParte}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="font-size: 11px; font-weight: 800; color: #3b82f6; text-transform: uppercase;">Vendas (Produtos):</span>
                    <span style="font-size: 14px; font-weight: 900; color: #3b82f6;">R$ 0,00</span>
                </div>
            </div>
            
            <p style="text-align: center; font-size: 9px; color: #94a3b8; margin-top: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Gerado por Cliente Max</p>
        </div>
    `;

    container.innerHTML = html;

    try {
        const canvas = await html2canvas(container, {
            backgroundColor: "#ffffff",
            scale: 3, // Alta qualidade para leitura no WhatsApp
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
