// Define uma lista para armazenar eventos ativos
let activeEvents = [];

// Evento disparado quando o conteúdo da página for completamente carregado
document.addEventListener("DOMContentLoaded", async () => {
  // Obtém o token do localStorage (armazenamento local)
  const token = localStorage.getItem("token");

  // Se não houver token, o usuário será redirecionado para a página de login
  if (!token) {
    window.location.href = "login.html"; // Redireciona para a página de login
    return; // Finaliza a execução da função
  }

  // Realiza uma requisição para obter os dados do usuário logado
  const userResponse = await fetch("https://hubfy-deploy-production.up.railway.app/user", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }, // Passa o token no cabeçalho da requisição
  });

  // Converte a resposta para o formato JSON
  const userData = await userResponse.json(); // Dados do usuário logado

  // Define o link de acesso à página de informações do usuário, passando os dados como parâmetros na URL
  document.getElementById(
    "link"
  ).href = `/html/userInfo.html?id=${userData.id}&name=${userData.name}`;

  // Obtém os parâmetros da URL
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("eventId"); // Obtém o ID do evento, caso exista
  const form = document.getElementById("eventRegisterForm"); // Obtém o formulário de cadastro de evento
  const messageElement = document.getElementById("message"); // Obtém o elemento para exibir mensagens ao usuário

  let isEditing = false; // Flag para verificar se o evento está sendo editado
  let eventData = {}; // Variável para armazenar os dados do evento, caso esteja sendo editado

  // Verifica se existe um evento para edição (caso tenha o 'eventId' na URL)
  if (eventId) {
    isEditing = true; // Marca que estamos editando um evento
    document.querySelector("h2").textContent = "Editar Evento"; // Atualiza o título da página
    document.querySelector('button[type="submit"]').textContent =
      "Salvar Alterações"; // Atualiza o texto do botão de envio

    try {
      // Realiza uma requisição para obter os dados do evento que será editado
      const response = await fetch(
        `https://hubfy-deploy-production.up.railway.app/eventId?id=${eventId}`
      );
      if (!response.ok) throw new Error(`Erro: ${response.statusText}`); // Se não obtiver resposta OK, gera um erro

      // Converte a resposta para JSON
      eventData = await response.json();

      // 🔴 Verifica se o usuário logado é o organizador do evento
      if (eventData.organizer_id !== userData.id) {
        window.location.href = "index.html"; // Se não for o organizador, redireciona para a página inicial
        return;
      }

      // Preenche o formulário com os dados do evento para edição
      document.getElementById("name").value = eventData.name;
      document.getElementById("description").value = eventData.description;
      document.getElementById("event_type").value = eventData.event_type;
      document.getElementById("participants").value = eventData.participants;
      document.getElementById("event_date").value =
        eventData.event_date.split("T")[0]; // Extrai apenas a data (sem horário)
      document.getElementById("event_time").value = eventData.event_time;
      document.getElementById("cep").value = eventData.CEP;
      document.getElementById("phone_number").value = eventData.phone_number;

      // Se existir uma imagem associada ao evento, a exibe no formulário
      if (eventData.image) {
        document.getElementById(
          "previewImage"
        ).innerHTML = `<img src="https://hubfy-deploy-production.up.railway.app/eventImage/${eventId}" alt="Imagem do evento" style="width: 80%;">`;
      }
    } catch (error) {
      console.error(error); // Caso ocorra erro na requisição, exibe no console
    }
  }

  // Realiza uma requisição para buscar os eventos do usuário logado
  const eventsResponse = await fetch(
    `https://hubfy-deploy-production.up.railway.app/userEvents?userId=${userData.id}`,
    {
      method: "GET",
    }
  );

  // Se a requisição for bem-sucedida, processa os dados dos eventos
  if (eventsResponse.ok) {
    const eventsData = await eventsResponse.json();
    const now = new Date(); // Obtém a data e hora atual

    // Itera sobre todos os eventos retornados
    for (const event of eventsData.allEvents) {
      const eventDate = new Date(event.event_date); // Cria um objeto Date com a data do evento
      const eventTime = event.event_time; // Obtém o horário do evento

      // Verifica se a data do evento é válida
      if (isNaN(eventDate.getTime())) {
        console.warn("Data inválida encontrada:", event.event_date); // Exibe aviso no console
        continue; // Ignora eventos com datas inválidas
      }

      // Separa as horas, minutos e segundos do evento
      const [hours, minutes, seconds] = eventTime.split(":").map(Number);
      eventDate.setHours(hours, minutes, seconds); // Adiciona o horário à data do evento

      // Verifica se o evento ainda está ativo
      if (eventDate < now) {
        // Evento já passou (nada a fazer)
      } else {
        activeEvents.push(event); // Adiciona o evento à lista de eventos ativos
      }
    }
  } else {
    console.error("Erro ao buscar eventos do usuário."); // Se a requisição falhar, exibe no console
  }

  // Evento disparado quando o formulário de cadastro de evento é enviado
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // Impede o envio do formulário de forma tradicional

    // Se não for uma edição e o usuário já tiver 3 eventos ativos, não permite criar outro evento
    if (!isEditing && activeEvents.length >= 3) {
      alert("Você atingiu o limite de 3 eventos ativos ao mesmo tempo, saia de um para criar ou entrar em um novo");
      setTimeout(function () {
        window.location.href = 'index.html'; // Redireciona o usuário para a página inicial após 3 segundos
      }, 3000);
    } else {
      // Coleta os valores dos campos do formulário
      const name = document.getElementById("name").value;
      const description = document.getElementById("description").value;
      const event_type = document.getElementById("event_type").value;
      const participants = document.getElementById("participants").value;
      const event_date = document.getElementById("event_date").value;
      const event_time = document.getElementById("event_time").value;
      const CEP = document.getElementById("cep").value;
      const phone_number = document.getElementById("phone_number").value;
      const imageInput = document.getElementById("image"); // Obtém o campo de imagem do formulário

      // Cria um objeto FormData para enviar os dados do formulário
      const formData = new FormData();
      formData.append(isEditing ? "newName" : "name", name); // Se for edição, usa 'newName', caso contrário 'name'
      formData.append(
        isEditing ? "sameOrganizerId" : "organizer_id",
        userData.id
      ); // Define o organizador como o usuário logado
      formData.append(isEditing ? "newDescription" : "description", description);
      formData.append(isEditing ? "newEvent_Type" : "event_type", event_type);
      formData.append(
        isEditing ? "newParticipants" : "participants",
        participants
      );
      formData.append(isEditing ? "newEvent_Date" : "event_date", event_date);
      formData.append(isEditing ? "newEvent_Time" : "event_time", event_time);
      formData.append(isEditing ? "newCep" : "CEP", CEP);
      formData.append(
        isEditing ? "newPhoneNumber" : "phone_number",
        phone_number
      );

      // Se for edição, inclui o ID do evento
      if (isEditing) {
        formData.append("event_id", eventId);
      }

      // Se o usuário selecionou uma imagem, adiciona ao FormData
      if (imageInput.files.length > 0) {
        formData.append("image", imageInput.files[0]);
      }

      // Define a URL da requisição e o método dependendo se está criando ou editando o evento
      const url = isEditing
        ? "https://hubfy-deploy-production.up.railway.app/editEvent"
        : "https://hubfy-deploy-production.up.railway.app/eventRegister";
      const method = isEditing ? "PUT" : "POST";

      try {
        // Realiza a requisição para registrar ou editar o evento
        const response = await fetch(url, {
          method: method, // Usa POST ou PUT
          headers: { Authorization: `Bearer ${token}` }, // Inclui o token no cabeçalho
          body: formData, // Envia os dados do formulário
        });

        // Se a resposta for OK, exibe uma mensagem e redireciona
        if (response.ok) {
          messageElement.textContent = isEditing
            ? "Evento atualizado com sucesso!"
            : "Evento registrado com sucesso!";
          window.location.href = "user.html"; // Redireciona para a página do usuário
        } else {
          messageElement.textContent = await response.text(); // Exibe a mensagem de erro retornada pelo servidor
        }
      } catch (error) {
        messageElement.textContent = "Erro ao processar a requisição."; // Exibe mensagem de erro se a requisição falhar
        console.error(error); // Exibe o erro no console
      }
    }
  });

  // Evento que impede a escolha de uma data anterior à data atual no campo 'event_date'
  document.getElementById("event_date").addEventListener("input", function () {
    const today = new Date().toISOString().split("T")[0]; // Obtém a data atual no formato 'YYYY-MM-DD'
    if (this.value < today) {
      alert("A data do evento não pode ser em um dia anterior ao atual!"); // Exibe alerta
      this.value = ""; // Limpa o campo de data
    }
  });
});
