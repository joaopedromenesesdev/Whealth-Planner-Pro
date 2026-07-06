// auth.js - Gerenciamento de AutenticaÃ§Ã£o do Supabase

// Garante que o cliente do supabase esteja disponÃ­vel
function getSupabase() {
  if (window.supabaseClient) return window.supabaseClient;
  if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
  if (window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return window.supabaseClient;
  }
  return null;
}

// Verifica se o usuÃ¡rio atual estÃ¡ logado (retorna promessa com dados do user ou null)
async function authObterUsuario() {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    return session ? session.user : null;
  } catch (e) {
    console.error("Erro ao obter sessÃ£o:", e);
    return null;
  }
}

// Efetuar Login
async function authEntrar(email, password) {
  const client = getSupabase();
  if (!client) throw new Error("Cliente Supabase nÃ£o configurado.");

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Criar Conta
async function authCadastrar(email, password, metadata = {}) {
  const client = getSupabase();
  if (!client) throw new Error("Cliente Supabase nÃ£o configurado.");

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: metadata // Ex: { full_name: fullname }
    }
  });
  if (error) throw error;
  return data;
}

// Fazer Logout (Sair)
async function authSair() {
  const client = getSupabase();
  if (client) {
    await client.auth.signOut();
  }
  // Limpar TODA a sessÃ£o de simulaÃ§Ã£o para nÃ£o contaminar o prÃ³ximo usuÃ¡rio
  sessionStorage.clear();
  window.location.href = "login.html";
}

// Guarda de Rotas para ser executada no inÃ­cio das pÃ¡ginas protegidas
async function authProtegerRota() {
  const user = await authObterUsuario();
  if (!user) {
    // Redireciona para o login se nÃ£o estiver logado
    window.location.href = "login.html";
  }
  return user;
}

// CÃ³digo especÃ­fico para a pÃ¡gina login.html
document.addEventListener("DOMContentLoaded", () => {
  const authForm = document.getElementById("auth-form");
  if (!authForm) return; // NÃ£o estÃ¡ na tela de login

  const isLoginMode = () => !groupFullname.classList.contains("hidden");

  const title = document.getElementById("login-title");
  const subtitle = document.getElementById("login-subtitle");
  const groupFullname = document.getElementById("group-fullname");
  const fullnameInput = document.getElementById("fullname");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const btnSubmit = document.getElementById("btn-submit");
  const btnText = document.getElementById("btn-text");
  const btnSpinner = document.getElementById("btn-spinner");
  const toggleLink = document.getElementById("toggle-link");
  const toggleText = document.getElementById("toggle-text");
  const alertDiv = document.getElementById("auth-alert");

  let isSignUp = false;

  // Alternar entre Login e Cadastro
  toggleLink.addEventListener("click", () => {
    isSignUp = !isSignUp;
    alertDiv.classList.add("hidden");

    if (isSignUp) {
      title.textContent = "Criar Conta";
      subtitle.textContent = "Cadastre-se para criar e gerenciar seus planejamentos.";
      groupFullname.classList.remove("hidden");
      fullnameInput.setAttribute("required", "required");
      btnText.textContent = "Cadastrar";
      toggleText.textContent = "JÃ¡ tem uma conta?";
      toggleLink.textContent = "Acessar Conta";
    } else {
      title.textContent = "Acessar Conta";
      subtitle.textContent = "Entre com suas credenciais para gerenciar seus planejamentos.";
      groupFullname.classList.add("hidden");
      fullnameInput.removeAttribute("required");
      btnText.textContent = "Entrar";
      toggleText.textContent = "NÃ£o tem uma conta?";
      toggleLink.textContent = "Criar Conta";
    }
    lucide.createIcons();
  });

  // Envio do formulÃ¡rio
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // UI Feedback
    btnSubmit.disabled = true;
    btnSpinner.classList.remove("hidden");
    btnText.style.opacity = "0.7";
    alertDiv.classList.add("hidden");

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const fullname = fullnameInput.value.trim();

    try {
      if (isSignUp) {
        await authCadastrar(email, password, { full_name: fullname });

        // Exibir mensagem de sucesso/confirmaÃ§Ã£o
        alertDiv.className = "auth-alert success";
        alertDiv.textContent = "Conta criada com sucesso! Se necessÃ¡rio, verifique seu e-mail ou faÃ§a login agora.";
        alertDiv.classList.remove("hidden");

        // Alterna automaticamente para o login apÃ³s 2 segundos
        setTimeout(() => {
          toggleLink.click();
          passwordInput.value = "";
        }, 3000);
      } else {
        await authEntrar(email, password);

        // Limpa TODA a sessÃ£o de simulaÃ§Ã£o anterior antes de entrar (seguranÃ§a entre usuÃ¡rios)
        sessionStorage.clear();

        // Redireciona para o dashboard
        window.location.href = "index.html";
      }
    } catch (err) {
      console.error(err);
      alertDiv.className = "auth-alert error";

      let msg = err.message || "Ocorreu um erro ao processar a autenticaÃ§Ã£o.";
      if (msg === "Email not confirmed") {
        msg = "Seu e-mail foi cadastrado, mas ainda nÃ£o foi verificado. Por favor, confirme o e-mail na sua caixa de entrada (ou spam) ou desative a confirmaÃ§Ã£o de e-mail no painel do Supabase.";
      } else if (msg === "Invalid login credentials") {
        msg = "E-mail ou senha invÃ¡lidos. Por favor, tente novamente.";
      } else if (msg === "User already registered") {
        msg = "Este endereÃ§o de e-mail jÃ¡ estÃ¡ cadastrado.";
      }

      alertDiv.textContent = msg;
      alertDiv.classList.remove("hidden");
    } finally {
      btnSubmit.disabled = false;
      btnSpinner.classList.add("hidden");
      btnText.style.opacity = "1";
    }
  });

  // Redireciona se o usuÃ¡rio jÃ¡ estiver logado
  authObterUsuario().then(user => {
    if (user) {
      window.location.href = "index.html";
    }
  });
});

// Renderizar informaÃ§Ãµes do usuÃ¡rio na navbar
function renderizarNavAuth(user) {
  const menu = document.querySelector(".navbar .menu");
  if (!menu) return;

  if (document.getElementById("user-nav-item")) return;

  const email = user.email;
  const shortEmail = email.split("@")[0];
  const userDisplayName = user.user_metadata?.full_name || shortEmail;

  const userDiv = document.createElement("div");
  userDiv.id = "user-nav-item";
  userDiv.className = "user-nav-container";
  userDiv.innerHTML = `
    <span class="user-name"><i data-lucide="user"></i> ${userDisplayName}</span>
    <a href="javascript:void(0)" onclick="authSair()" class="btn-logout"><i data-lucide="log-out"></i> Sair</a>
  `;

  menu.appendChild(userDiv);
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Executa a proteÃ§Ã£o de rota se nÃ£o estiver na pÃ¡gina de login
if (!window.location.pathname.endsWith("login.html")) {
  authProtegerRota().then(user => {
    if (user) {
      // Se o DOM jÃ¡ carregou, renderiza. Caso contrÃ¡rio, aguarda o DOM.
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => renderizarNavAuth(user));
      } else {
        renderizarNavAuth(user);
      }
    }
  });
}

