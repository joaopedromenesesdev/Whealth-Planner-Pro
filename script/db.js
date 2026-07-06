// db.js - Abstração de Acesso a Dados (Supabase + LocalStorage Fallback)

const DB_STORAGE_KEY = "pace_relatorios";

// Auxiliar para obter a chave do LocalStorage específica para o usuário logado
async function getStorageKey() {
  if (window.supabaseClient) {
    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (session?.user?.id) {
        return `${DB_STORAGE_KEY}_${session.user.id}`;
      }
    } catch (e) {
      console.error("Erro ao obter ID do usuário para o storage key:", e);
    }
  }
  return DB_STORAGE_KEY;
}

// Aguarda a sessão Supabase ser restaurada (resolve race condition no carregamento inicial)
function aguardarSessao(timeoutMs = 3000) {
  return new Promise((resolve) => {
    if (!window.supabaseClient) return resolve(null);

    // Tenta obter a sessão já disponível
    window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) return resolve(session);

      // Ainda não disponível — escuta o evento INITIAL_SESSION
      const timer = setTimeout(() => {
        sub?.data?.subscription?.unsubscribe();
        resolve(null);
      }, timeoutMs);

      const sub = window.supabaseClient.auth.onAuthStateChange((event, s) => {
        if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
          clearTimeout(timer);
          sub?.data?.subscription?.unsubscribe();
          resolve(s);
        }
      });
    });
  });
}

// Verifica se um ID é um UUID válido
function isUUID(str) {
  if (!str) return false;
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return pattern.test(str);
}

// Carregar todos os relatórios
async function dbObterRelatorios() {
  if (window.supabaseClient) {
    try {
      // Aguarda a sessão estar restaurada antes de consultar (evita race condition)
      const session = await aguardarSessao();
      if (!session) {
        console.warn("Sessão não disponível, usando LocalStorage.");
      } else {
        const { data, error } = await window.supabaseClient
          .from('relatorios')
          .select('*')
          .eq('user_id', session.user.id)
          .order('data_criacao', { ascending: false });

        if (error) throw error;

        return data.map(item => ({
          id: item.id,
          nomeCliente: item.nome_cliente,
          nomeAssessor: item.nome_assessor,
          totalPatrimonio: Number(item.total_patrimonio),
          prejuizoTributario: Number(item.prejuizo_tributario),
          dataCriacao: item.data_criacao,
          dataReuniao: item.dados_completos?.data_reuniao || new Date(item.data_criacao).toLocaleDateString("pt-BR"),
          dadosSessao: item.dados_completos
        }));
      }
    } catch (e) {
      console.error("Erro ao carregar dados do Supabase. Usando LocalStorage alternativo.", e);
    }
  }

  // Fallback LocalStorage
  try {
    const key = await getStorageKey();
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    console.error("Erro ao ler relatórios locais:", e);
    return [];
  }
}

// Salvar/Atualizar um relatório
async function dbSalvarRelatorio(relatorio) {
  if (window.supabaseClient) {
    try {
      // Aguarda a sessão estar restaurada antes de salvar (evita race condition)
      const session = await aguardarSessao();
      const userId = session?.user?.id;

      const payload = {
        nome_cliente: relatorio.nomeCliente,
        nome_assessor: relatorio.nomeAssessor,
        total_patrimonio: relatorio.totalPatrimonio,
        prejuizo_tributario: relatorio.prejuizoTributario,
        dados_completos: relatorio.dadosSessao
      };

      if (userId) {
        payload.user_id = userId;
      }

      if (isUUID(relatorio.id)) {
        payload.id = relatorio.id;
        const { error } = await window.supabaseClient
          .from('relatorios')
          .upsert(payload);
        if (error) throw error;
        console.log("Relatório atualizado com sucesso no Supabase!");
      } else {
        // Novo registro, insere e pega o ID gerado pelo banco
        const { data, error } = await window.supabaseClient
          .from('relatorios')
          .insert([payload])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          // Atualiza o ID na sessão atual para que os próximos salvamentos atualizem o mesmo registro
          sessionStorage.setItem("current_report_id", data[0].id);
          console.log("Novo relatório inserido no Supabase com ID:", data[0].id);
        }
      }
      return;
    } catch (e) {
      console.error("Erro ao salvar no Supabase. Usando LocalStorage alternativo.", e);
    }
  }

  // Fallback LocalStorage
  let relatorios = [];
  const key = await getStorageKey();
  try {
    relatorios = JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    relatorios = [];
  }

  const index = relatorios.findIndex(r => r.id === relatorio.id);
  if (index !== -1) {
    relatorio.dataCriacao = relatorios[index].dataCriacao || relatorio.dataCriacao;
    relatorios[index] = relatorio;
  } else {
    relatorios.push(relatorio);
  }

  localStorage.setItem(key, JSON.stringify(relatorios));
  console.log("Relatório salvo localmente (LocalStorage).");
}

// Excluir um relatório
async function dbExcluirRelatorio(id) {
  if (window.supabaseClient) {
    try {
      if (isUUID(id)) {
        const session = await aguardarSessao();
        const userId = session?.user?.id;

        let query = window.supabaseClient
          .from('relatorios')
          .delete()
          .eq('id', id);

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { error } = await query;
        if (error) throw error;
        console.log("Relatório excluído com sucesso do Supabase!");
        return;
      }
    } catch (e) {
      console.error("Erro ao excluir do Supabase. Usando LocalStorage alternativo.", e);
    }
  }

  // Fallback LocalStorage
  let relatorios = [];
  const key = await getStorageKey();
  try {
    relatorios = JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    relatorios = [];
  }

  const atualizados = relatorios.filter(r => r.id !== id);
  localStorage.setItem(key, JSON.stringify(atualizados));
  console.log("Relatório excluído localmente (LocalStorage).");
}
