// =========================
// CONFIGURAÇÕES E ESTADO
// =========================
let grafico;

let taxasMercado = {
  cdi: 0.1125, // Fallback taxa atual
  ipca: 0.045, // Fallback taxa atual
  cdiCurva: {}, // Armazena expectativas por ano { '2024': 0.10, '2025': 0.09... }
  ipcaCurva: {}
};

window.onload = async function () {
  const total = sessionStorage.getItem("total_patrimonio") || 0;
  const aviso = document.getElementById("aviso_sem_patrimonio");

  if (!total || Number(total) === 0) {
    aviso.style.display = "block";
    return;
  }

  aviso.style.display = "none";
  
  // Inicializa valores
  document.getElementById("valor_inicial").value = Number(total).toLocaleString("pt-BR");
  document.getElementById("display_inicial").innerText = "R$ " + Number(total).toLocaleString("pt-BR");

  // Busca Taxas Reais do Banco Central
  await buscarTaxasBCB();

  // Configura os Inputs
  setupInputs();
  
  // Carrega valores salvos se existirem
  const salvos = JSON.parse(sessionStorage.getItem("evolucao_inputs"));
  if (salvos) {
    if (salvos.taxa) document.getElementById("taxa").value = salvos.taxa;
    if (salvos.aporte) document.getElementById("aporte_mensal").value = salvos.aporte;
    if (salvos.anos) document.getElementById("anos").value = salvos.anos;
  }

  // Primeiro cálculo automático
  calcular();
};

async function buscarTaxasBCB() {
  try {
    // API Olinda para Expectativas de Mercado (Relatório Focus)
    // Buscamos as expectativas anuais mais recentes
    const url = "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais?$filter=Indicador eq 'IPCA' or Indicador eq 'Selic'&$orderby=Data desc&$top=100&$format=json";
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.value && data.value.length > 0) {
      // 1. Identificamos a data do último relatório publicado
      const dataUltimoRelatorio = data.value[0].Data;
      
      // 2. Filtramos todas as projeções que pertencem a esse último relatório
      const projecoesAtuais = data.value.filter(item => item.Data === dataUltimoRelatorio);

      projecoesAtuais.forEach(item => {
        const ano = item.DataReferencia;
        const valor = Number(item.Mediana) / 100;

        if (item.Indicador === 'Selic') {
          taxasMercado.cdiCurva[ano] = valor;
        } else if (item.Indicador === 'IPCA') {
          taxasMercado.ipcaCurva[ano] = valor;
        }
      });

      // 3. Definimos a taxa "base" (para legenda e anos fora da curva) como a do ano corrente
      const anoAtual = new Date().getFullYear().toString();
      taxasMercado.cdi = taxasMercado.cdiCurva[anoAtual] || Object.values(taxasMercado.cdiCurva)[0];
      taxasMercado.ipca = taxasMercado.ipcaCurva[anoAtual] || Object.values(taxasMercado.ipcaCurva)[0];

      console.log("Curva CDI capturada:", taxasMercado.cdiCurva);
      console.log("Curva IPCA capturada:", taxasMercado.ipcaCurva);
    }

    // Atualiza legenda na UI (mostrando a do ano atual ou a primeira disponível)
    const elCDI = document.getElementById("legenda_cdi_valor");
    const elIPCA = document.getElementById("legenda_ipca_valor");

    if (elCDI) elCDI.innerText = `CDI Proj. (${(taxasMercado.cdi * 100).toFixed(2)}%)`;
    if (elIPCA) elIPCA.innerText = `IPCA Proj. (${(taxasMercado.ipca * 100).toFixed(2)}%)`;

  } catch (error) {
    console.error("Erro ao buscar taxas projetadas do Relatório Focus:", error);
  }
}

function setupInputs() {
  const inputTaxa = document.getElementById("taxa");
  const inputAporte = document.getElementById("aporte_mensal");
  const inputAnos = document.getElementById("anos");

  // Máscara para Rentabilidade (Percentual)
  inputTaxa.addEventListener("input", function(e) {
    let value = e.target.value.replace(/\D/g, "");
    value = (value / 100).toFixed(2).replace(".", ",");
    e.target.value = value;
    calcular();
  });

  // Máscara para Aporte Mensal (Moeda)
  inputAporte.addEventListener("input", function(e) {
    let value = e.target.value.replace(/\D/g, "");
    if (value) {
      value = (Number(value) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      e.target.value = "R$ " + value;
    } else {
      e.target.value = "";
    }
    calcular();
    salvarInputs();
  });

  inputAnos.addEventListener("input", () => {
    calcular();
    salvarInputs();
  });

  inputTaxa.addEventListener("change", salvarInputs);
}

function salvarInputs() {
  const taxa = document.getElementById("taxa").value;
  const aporte = document.getElementById("aporte_mensal").value;
  const anos = document.getElementById("anos").value;

  sessionStorage.setItem("evolucao_inputs", JSON.stringify({ taxa, aporte, anos }));
}

// =========================
// CÁLCULO CORE
// =========================
function parseValue(id) {
  const val = document.getElementById(id).value;
  if (!val) return 0;
  // Remove pontos de milhar e troca vírgula por ponto
  return Number(val.replace(/\./g, "").replace(",", "."));
}

function calcular() {
  const valorInicial = Number(sessionStorage.getItem("total_patrimonio")) || 0;
  const taxaAnual = parseValue("taxa") / 100;
  const aporteMensal = parseValue("aporte_mensal");
  const anosProjecao = Number(document.getElementById("anos").value);

  const aporteAnual = aporteMensal * 12;

  const anosArr = [];
  const valoresArr = [];
  const cdiArr = [];
  const ipcaArr = [];

  let valorAcumulado = valorInicial;
  let cdiAcumulado = valorInicial;
  let ipcaAcumulado = valorInicial;

  const anoBase = new Date().getFullYear();

  for (let i = 0; i <= anosProjecao; i++) {
    const anoAtual = (anoBase + i).toString();
    
    // Pega a taxa específica para aquele ano na curva do Focus, ou usa a última conhecida
    const taxaCDIAnual = taxasMercado.cdiCurva[anoAtual] || taxasMercado.cdi;
    const taxaIPCAAnual = taxasMercado.ipcaCurva[anoAtual] || taxasMercado.ipca;

    anosArr.push("Ano " + i);
    valoresArr.push(Math.round(valorAcumulado));
    cdiArr.push(Math.round(cdiAcumulado));
    ipcaArr.push(Math.round(ipcaAcumulado));

    // Evolução com juros compostos ano a ano
    valorAcumulado = valorAcumulado * (1 + taxaAnual) + aporteAnual;
    cdiAcumulado = cdiAcumulado * (1 + taxaCDIAnual) + aporteAnual;
    ipcaAcumulado = ipcaAcumulado * (1 + taxaIPCAAnual) + aporteAnual;
  }

  // 4. Calcular Médias para a Legenda (Exibir o impacto real do período)
  // Como as taxas variam ano a ano no Focus, mostramos a média aritmética do período selecionado
  let somaCDI = 0;
  let somaIPCA = 0;
  let anosComDados = 0;
  for (let i = 0; i < anosProjecao; i++) {
    const ano = (anoBase + i).toString();
    somaCDI += taxasMercado.cdiCurva[ano] || taxasMercado.cdi;
    somaIPCA += taxasMercado.ipcaCurva[ano] || taxasMercado.ipca;
    anosComDados++;
  }
  const mediaCDI = (somaCDI / anosComDados) * 100;
  const mediaIPCA = (somaIPCA / anosComDados) * 100;

  // Atualiza legendas com a média do período
  const elCDI = document.getElementById("legenda_cdi_valor");
  const elIPCA = document.getElementById("legenda_ipca_valor");
  if (elCDI) elCDI.innerText = `CDI Proj. (${mediaCDI.toFixed(2)}%)`;
  if (elIPCA) elIPCA.innerText = `IPCA Proj. (${mediaIPCA.toFixed(2)}%)`;

  updateDashboard(valoresArr[valoresArr.length - 1], valorInicial);
  renderChart(anosArr, valoresArr, cdiArr, ipcaArr);
  generateMagicInsight(taxaAnual, aporteMensal, anosProjecao, valoresArr[valoresArr.length - 1]);

  // Salva persistência
  sessionStorage.setItem("evolucao_dados", JSON.stringify({
    anos: anosArr,
    resultados: valoresArr,
    taxa: document.getElementById("taxa").value,
    tempo: anosProjecao,
    aporteAnual: aporteAnual
  }));
}

// =========================
// DASHBOARD & INSIGHTS
// =========================
function updateDashboard(final, inicial) {
  const multiplicador = final / inicial;
  const rendaMensal = final * 0.005; // Estimativa de 0.5% ao mês

  document.getElementById("insight_final").innerText = "R$ " + final.toLocaleString("pt-BR");
  document.getElementById("insight_multiplicador").innerText = multiplicador.toFixed(1) + "x";
  document.getElementById("insight_renda").innerText = "R$ " + rendaMensal.toLocaleString("pt-BR");

  // Animação de contagem (opcional, mas elegante)
  animateValue("insight_multiplicador", 0, multiplicador, 1000, "x");
}

function animateValue(id, start, end, duration, suffix = "") {
  const obj = document.getElementById(id);
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const current = (progress * (end - start) + start).toFixed(1);
    obj.innerHTML = current + suffix;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

function generateMagicInsight(taxa, aporte, tempo, totalFinal) {
  const magicText = document.getElementById("magic_text");
  
  if (taxa > 0.12) {
    magicText.innerHTML = "🚀 <b>Perfil Arrojado:</b> Sua rentabilidade projetada está acima da média de mercado. Certifique-se de diversificar ativos para mitigar riscos de volatilidade.";
  } else if (aporte > 10000) {
    magicText.innerHTML = "💰 <b>Poder de Aporte:</b> Seu aporte mensal é o maior motor do seu crescimento. Em " + tempo + " anos, os aportes representarão uma fatia significativa do seu montante total.";
  } else if (tempo > 20) {
    magicText.innerHTML = "⏳ <b>Juros Compostos:</b> O tempo é seu maior aliado. Note como a curva do gráfico se torna exponencial nos últimos 5 anos da projeção.";
  } else {
    magicText.innerHTML = "💡 <b>Dica Pace:</b> Aumentar seu aporte mensal em 20% poderia antecipar sua meta financeira em quase 4 anos.";
  }
}

// =========================
// RENDERIZAÇÃO DO GRÁFICO
// =========================
function renderChart(labels, data, cdi, ipca) {
  const ctx = document.getElementById("graficoEvolucao").getContext("2d");

  // Gradient Background
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, "rgba(11, 83, 184, 0.3)");
  gradient.addColorStop(1, "rgba(11, 83, 184, 0.0)");

  if (grafico) {
    grafico.destroy();
  }

  grafico = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Sua Projeção",
          data: data,
          borderColor: "#0B53B8",
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          borderWidth: 4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#0B53B8",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 3
        },
        {
          label: "CDI Projetado",
          data: cdi,
          borderColor: "#1D6F42",
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0
        },
        {
          label: "IPCA Projetado",
          data: ipca,
          borderColor: "#e53935",
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          titleColor: "#000",
          bodyColor: "#000",
          borderColor: "#e1e8f0",
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: function (context) {
              return context.dataset.label + ": R$ " + context.raw.toLocaleString("pt-BR");
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false }
        },
        y: {
          beginAtZero: false,
          ticks: {
            callback: value => "R$ " + (value / 1000000).toFixed(1) + "M",
            stepSize: 500000
          },
          grid: { color: "rgba(0,0,0,0.05)" }
        }
      }
    }
  });
}

function resetar() {
  document.getElementById("taxa").value = "10,00";
  document.getElementById("aporte_mensal").value = "0,00";
  document.getElementById("anos").value = 10;
  
  calcular();
}