let activeEvents = [];//as duas arrays para eventos ativos e passados
let pastEvents = [];

let userData = 0;
let page = 1;//página atual do sistema de paginação dos eventos passados, iniciada em 1 e depois alterna por meio da function renderCards.

let honorParticipants = [];
/*Captura o Usuário logado para então requisitar os eventos em que ele está cadastrado, distribui então entre eventos ativos e passados.
*/
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Requisição para obter os dados do usuário autenticado
  const userResponse = await fetch("http://localhost:3000/user", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`, // Certifique-se de que o token está sendo enviado
    },
  });

  if (userResponse.ok) {
    userData = await userResponse.json(); // userData se mantém salvo
    console.log("seu id: ", userData.id);
    document.getElementById(
      "link"
    ).href = `../html/userInfo.html?id=${userData.id}&name=${userData.name}`;
    // Requisição para a rota /userEvents, captura todos os eventos do usuário, desde eventos ativos até eventos que já aconteceram
    const eventsResponse = await fetch(
      `http://localhost:3000/userEvents?userId=${userData.id}`,
      {
        method: "GET",
      }
    );

    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json();
      const now = new Date();

      for (const event of eventsData.allEvents) {
        //separa os eventos em duas arrays, uma para eventos ativos e uma para eventos que já aconteceram
        const eventDate = new Date(event.event_date); // Apenas a data
        const eventTime = event.event_time; // Horário no formato "HH:mm:ss"

        if (isNaN(eventDate.getTime())) {
          console.warn("Data inválida encontrada:", event.event_date);
          continue; // Ignorar eventos com datas inválidas
        }

        // Dividir o tempo em horas, minutos e segundos para montar a data completa
        const [hours, minutes, seconds] = eventTime.split(":").map(Number);
        eventDate.setHours(hours, minutes, seconds); // Adiciona o horário à data

        console.log("Data e hora do evento (convertida):", eventDate);

        if (eventDate < now) {
          pastEvents.push(event); // Evento já aconteceu
        } else {
          activeEvents.push(event); // Evento ainda ativo
        }
      }
    } else {
      console.error("Erro ao buscar eventos do usuário.");
    }
  } else {
    console.log("Erro ao obter dados do usuário.");
  }
  renderCards(0);
}); //fim do DOMContentLoaded

/*preenche todos os cards ativos e passados com as informações, como a quantidade de eventos passados é ilimitada, determina páginas para eventos passados, mostrando 6 por vez
então por meio dos botões "back" e "next" faz a navegação entra as páginas, enquanto trabalha desabilitando e habilitando estes botões em casos específicos.*/
async function renderCards(action) {
  //preenche todos os cards com os eventos referentes.
  let pageQuantity = pastEvents.length / 6; //calcula a quantidade de páginas que os eventos que já aconteceram vão ocupar, mostra 6 eventos por vez.

  for (let index = 0; index < activeEvents.length; index++) {
    //para cada evento ativo vai preencher sucessivamente um dos 3 cards de eventos passados.
    //carrega eventos programados
    let label = "ver";
    if (activeEvents[index].organizer_id == userData.id) {
      //Dependendo do organizador do evento altera o que está escrito no botão que abre o card do evento.
      label = "editar";
    }

    const cepData = await cepSearch(activeEvents[index].CEP); //Faz a requisição da localização do evento para preencher nos cards.

    const data = activeEvents[index].event_date.slice(0, -14);
    const partes = data.split("-"); //divite e reorganiza a data para o formato dd/mm/aa.

    document.getElementById(`activeCard${index}`).innerHTML = `
        <h3 id="activeName0">${activeEvents[index].name}</h3>
                    <div class="divide">
                        <p  id="activeType0"><strong>Tipo:</strong>${
                          activeEvents[index].event_type
                        }</p>
                    </div>
                    <div class="divide">
                        <p id="activeDate0"><strong>Data:</strong> ${
                          partes[2] + "/" + partes[1] + "/" + partes[0]
                        }</p>
                        <p id="activeTime0"><strong>Hora:</strong> ${activeEvents[
                          index
                        ].event_time.slice(0, -3)}</p>
                    </div>
                    <p id="activeAddress0"><strong>Endereço:</strong> ${
                      cepData.bairro +
                      " - " +
                      cepData.localidade +
                      " - " +
                      cepData.uf
                    }</p>
                    <button id="activeButton${index}" value='${JSON.stringify([
      index,
      activeEvents[index].organizer_id,
    ])}' onclick="entrarCardEvento(this)">${label}</button>
    `;
    document.getElementById(`activeCard${index}`).style.display = "flex"; //mostra o card que foi preenchido
    document.getElementById(`createIcon${index}`).style.display = "none"; //enquanto desabilita o card que leva até a criação de eventos
  }
  if (pastEvents.length < 7) {
    //se a quantidade de eventos passados couber em uma só página, desabilita a navegação entre páginas.
    document.getElementById("next").disabled = true;
  }
  switch (
    action //seleciona qual foi o tipo de ação, 0 = back e 1 = next
  ) {
    case 0:
      if (page == 1) {
        document.getElementById("back").disabled = true; //se estiver na primeira página, desabilita o botão pra voltar
      } else if (page - 1 == 1) {
        document.getElementById("back").disabled = true; //se estiver na primeira página, desabilita o botão pra voltar
        page = page - 1;
      } else {
        page = page - 1; //altera a página atual
        document.getElementById("next").disabled = false; //sempre que voltar a página, automaticamente habilita o botão next.
      }

      if (pastEvents.length == 0) {
        document.getElementById("next").disabled = true; //se não houver nenhum evento passado, desabilita o botão de avançar páginas.
      }
      break;
    case 1:
      if (!pastEvents[6 * (page + 1)]) {
        document.getElementById("next").disabled = true; //se não existir um evento na posição calculada, desabilita o botão next pois não há eventos na página seguinte
      }
      page = page + 1;
      document.getElementById("back").disabled = false;
      break;
  }

  for (let index2 = 6 * page - 6, index = 0; index < 6; index++, index2++) {
    //preenche os card passados com pase na página atual.
    //carrega cada evento que já
    if (!pastEvents[index2]) {
      document.getElementById(`pastCard${index}`).innerHTML = `
            
        `;
    } else {
      const cepData = await cepSearch(pastEvents[index2].CEP);

      const data = pastEvents[index2].event_date.slice(0, -14);
      const partes = data.split("-");

      document.getElementById(`pastCard${index}`).innerHTML = `
                <h3 id="activeName0">${pastEvents[index2].name}</h3>
                            <div class="divide">
                                <p  id="activeType0"><strong>Tipo:</strong>${
                                  pastEvents[index2].event_type
                                }</p>
                            </div>
                            <div class="divide">
                                <p id="activeDate0"><strong>Data:</strong> ${
                                  partes[2] + "/" + partes[1] + "/" + partes[0]
                                }</p>
                                <p id="activeTime0"><strong>Hora:</strong> ${pastEvents[
                                  index2
                                ].event_time.slice(0, -3)}</p>
                            </div>
                            <p id="activeAddress0"><strong>Endereço:</strong> ${
                              cepData.bairro +
                              " - " +
                              cepData.localidade +
                              " - " +
                              cepData.uf
                            }</p>
                            <button id="pastButton${index2}" value='${JSON.stringify(
        [index2, pastEvents[index2].organizer_id]
      )}' onclick="entrarCardEvento(this)">ver</button>
            `;
    }
  }
  if (pastEvents.length / 6 != parseInt(pastEvents.length / 6)) {
    pageQuantity = parseInt(pastEvents.length / 6) + 1;
  } //Determina o número total de página para preencher o contador de páginas da página
  document.getElementById("pageNumber").textContent = `${page}/${pageQuantity}`; //altea a página atual no visual.
}
//ativa quando o botão "ver" de algum card é selecionado, então direciona decidindo se foi o de um evento ativo ou passado.
function entrarCardEvento(button) {
  //Direciona para eventos ativos ou passados quando os detalhes de um card forem abertos.
  const values = JSON.parse(button.value); // Converte a string JSON de volta para array
  const index = values[0]; // Pega o index armazenada em cada card.

  document.getElementById("backgroundLocker").style.display = "flex"; //mostra o elemento que bloqueia o acesso a botões que não estão dentro do card aberto.

  if (button.id.startsWith("activeButton")) {
    //Se o card aberto for de um evento ativo, esconde as divs que mostram nota e honra do eventos, para que não sejam alterados.
    document.getElementById("rateOrganizer").style.display = "none";
    document.getElementById("participantsHonor").style.display = "none";
    document.getElementById("backgroundLocker").style.justifyContent = "center";

    renderActiveCard(button);
  } else {
    renderPastCard(index, values[1]); // Passa o índice correto e o organizer_id
  }
}
/*Recebe o id do evento selecionado para ser visualizado, assim como o id do seu organizador para comparar e fazer requisições
dependendo se o User logado for o organizador deste evento, esconde algumas funcionalidades enquanto mostra outras.
*/
async function renderPastCard(index, organizerId) {
  document.getElementById("rate").style.display = "flex";
  console.log("Índice recebido:", index);
  console.log("Evento encontrado:", pastEvents[index]);

  if (!pastEvents[index]) {
    console.error(`Erro: Não existe pastEvents[${index}]`);
    return;
  }
  const phoneNumber = pastEvents[index].phone_number.replace(/\D+/g, "").trim();
  let phoneLink = '';
  let organizerName = 'você'
  // Exibir elementos corretos
  if (organizerId != userData.id) {
    let exists = false;//remover
    phoneLink = `<a href="https://api.whatsapp.com/send?phone=55${phoneNumber}">Entrar em contato</a>`
    
    document.getElementById("rateOrganizer").style.display = "flex";
    document.getElementById("stars").value = organizerId;
    const ratingsResponse = await fetch(
      `http://localhost:3000/getRatings?userId=${organizerId}`,
      {
        method: "GET",
      }
      
    );
   
    let ratingsResult = await ratingsResponse.json();
    for (let i = 0; i < ratingsResult.ratings.length; i++) {
      if (ratingsResult.ratings[i].rating_user_id != userData.id) {
        continue;
      } else {
        changeRating(ratingsResult.ratings[i].rating_value);
        document.getElementById("comment").value =
          ratingsResult.ratings[i].comment;
      }
    }
  } else {
    document.getElementById("rateOrganizer").style.display = "none";
  }

  document.getElementById("participantsHonor").style.display = "flex";
  document.getElementById("backgroundLocker").style.justifyContent =
    "space-evenly";

  // Buscar dados dos participantes
  const participantsData2 = await participantsInfo(pastEvents[index].id);
  console.log("Participantes:", participantsData2.result);
  fillHonorCards(participantsData2.result);

  // Buscar CEP
  const cepData = await cepSearch(pastEvents[index].CEP);
  console.log("CEP encontrado:", cepData);

  // Formatar data
  const data = pastEvents[index].event_date.slice(0, -14);
  const partes = data.split("-");

  // Buscar quantidade de participantes
  const participantsData = await participantsQuantity(pastEvents[index].id);

  // Buscar nome do organizador usando organizerId (corrigido)
  const userIdResponse = await fetch(
    `http://localhost:3000/userId?id=${organizerId}`
  );
  if (!userIdResponse.ok) {
    throw new Error(`Erro ao buscar organizador: ${userIdResponse.statusText}`);
  }
  
  const organizerData = await userIdResponse.json();
  console.log("Organizador encontrado:", organizerData);
  const imageUrl = `http://localhost:3000/eventImage/${pastEvents[index].id}`;
  organizerName = organizerData.name
  // Atualizar o card com os dados
  document.getElementById("card").innerHTML = `
    <button onclick="closeCards()">fechar</button>
        <h3>${pastEvents[index].name}</h3>
        <img style="width:80%;" src="${imageUrl}" alt="Sua Foto">
            <textarea readonly style="resize: none;width: 90%;height:15%;display:flex" 
                  id="description" name="description" required maxlength="500">${
                    pastEvents[index].description
                  }</textarea>
                  <a style="color: black; font-size:2rem" href="../html/userInfo.html?id=${
                    organizerData.id
                  }&name=${organizerData.name}">${organizerName}</a>
        <p>${pastEvents[index].event_type}</p>
        <div class="divide">
            <p><strong>Data:</strong> ${partes[2]}/${partes[1]}/${partes[0]}</p>
            <p><strong>Hora:</strong> ${pastEvents[index].event_time.slice(
              0,
              -3
            )}</p>
        </div>
        <p>Participantes: ${participantsData.participants}/${
    pastEvents[index].participants
  }</p>
        ${phoneLink}
        <p><strong>Endereço:</strong> ${cepData.bairro} - ${
    cepData.localidade
  } - ${cepData.uf}</p>
    `;

  console.log("Card atualizado com sucesso!");
}
/*Recebe o id do evento selecionado para ser visualizado e preenche o card de visualização com os dados dele
Dependendo se o User logado é o dono do evento, esconde algumas funcionalidades enquanto mostra outras*/
async function renderActiveCard(button) {
  document.getElementById("rate").style.display = "none";
  const values = JSON.parse(button.value);
  const index = values[0];
  const organizerId = values[1];

  if (!activeEvents[index]) {
    console.error(`Erro: Evento não encontrado no índice ${index}`);
    return;
  }

  const cepData = await cepSearch(activeEvents[index].CEP);
  const participantsData = await participantsQuantity(activeEvents[index].id);
  const data = activeEvents[index].event_date.split("T")[0];
  const imageUrl = `http://localhost:3000/eventImage/${activeEvents[index].id}`;

  let organizerName = "você";

  const organizerData = await (
    await fetch(`http://localhost:3000/userId?id=${organizerId}`)
  ).json();
  

  const phoneNumber = activeEvents[index].phone_number
    .replace(/\D+/g, "")
    .trim();
 
    let phoneLink = '';
    
    if(organizerId != userData.id){
      phoneLink = `<a href="https://api.whatsapp.com/send?phone=55${phoneNumber}">Entrar em contato</a>`
      organizerName = organizerData.name
    }
  
  console.log(organizerData);
  document.getElementById(`card`).innerHTML = `
        <button onclick="closeCards()">fechar</button>
        <h3 id="activeName0">${activeEvents[index].name}</h3>
        <img style="width:70%;" src="${imageUrl}" alt="Sua Foto"></img>
        <textarea readonly style="resize: none;width: 90%;height:15%;display:flex" id="description" name="description" maxlength="500">${
          activeEvents[index].description
        }</textarea>
        <a style="color: black; font-size:2rem" href="../html/userInfo.html?id=${organizerData.id}&name=${organizerData.name}">${organizerName}</a>
        <p>${activeEvents[index].event_type}</p>
        <div class="divide">
            <p><strong>Data:</strong> ${data.split("-").reverse().join("/")}</p>
            <p><strong>Hora:</strong> ${activeEvents[index].event_time.slice(
              0,
              -3
            )}</p>
        </div>
        <p>Participantes: ${participantsData.participants}/${
    activeEvents[index].participants
  }</p>
        ${phoneLink}
        <p><strong>Endereço:</strong> ${cepData.bairro} - ${
    cepData.localidade
  } - ${cepData.uf}</p>
        ${
          organizerId === userData.id
            ? `
            <button onclick="redirect(${activeEvents[index].id})">Editar</button>
            <button onclick="deleteEvent(${activeEvents[index].id})">Excluir</button>
        `
            : `<button onclick="deleteUserEvent(${index})">Sair</button>`
        }
    `;
}

// Função para buscar dados do CEP
async function cepSearch(cep) {
  const cepResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!cepResponse.ok) {
    throw new Error(`Erro ao buscar CEP: ${cepResponse.statusText}`);
  }
  const cepData = await cepResponse.json();
  return cepData;
}

// Função para buscar a quantidade de participantes de um evento
async function participantsQuantity(groupId) {
  const participantsResponse = await fetch(
    `http://localhost:3000/participants?groupId=${groupId}`
  );
  if (!participantsResponse.ok) {
    throw new Error(`Erro: ${participantsResponse.statusText}`);
  }
  participantsData = await participantsResponse.json();
  return participantsData;
}

document.getElementById("card").addEventListener("submit", async (e) => {
  if (e.target && e.target.id === "editForm") {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const name = document.getElementById("name").value;
    const description = document.getElementById("description").value;
    const event_type = document.getElementById("event_type").value;
    const participants = document.getElementById("participants").value;
    const event_date = document.getElementById("event_date").value;
    const event_time = document.getElementById("event_time").value;
    const CEP = document.getElementById("cep").value;
    const phone_number = document.getElementById("phone_number").value;
    const groupId = document.getElementById("deleteButton").value;
    const updateResponse = await fetch("http://localhost:3000/editEvent", {
      method: "PUT", // Método HTTP PUT para atualização
      headers: {
        "Content-Type": "application/json", // Define o tipo de conteúdo como JSON
        Authorization: `Bearer ${token}`, // Envia o token no cabeçalho para autenticação
      },
      body: JSON.stringify({
        newName: name,
        newDescription: description,
        newEvent_Type: event_type,
        newParticipants: participants,
        newEvent_Date: event_date,
        newEvent_Time: event_time,
        newCep: CEP,
        newPhoneNumber: phone_number,
        event_id: groupId,
      }), // Envia os novos dados no corpo da requisição
      //newName, newDescription, newEvent_Type, newParticipants, newEvent_Date, newEvent_Time, newCep, newPhoneNumber, organizer_id
    });

    console.log(document.getElementById("deleteButton").value);
    location.reload();
  }
});

async function deleteEvent(id) {
  const deleteResponse = await fetch("http://localhost:3000/event", {
    method: "DELETE", // Método HTTP DELETE
    headers: {
      "Content-Type": "application/json", // Tipo do conteúdo enviado
    },
    body: JSON.stringify({ eventId: id }), // Corpo da requisição enviado como JSON
  });

  location.reload();
}
async function deleteUserEvent(eventIndex) {
  try {
    const response = await fetch("http://localhost:3000/leaveEvent", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userData.id,
        event_id: activeEvents[eventIndex].id,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Erro:", result);
      return;
    }

    console.log("Sucesso:", result.message);
    location.reload();
  } catch (error) {
    console.error("Erro na requisição:", error);
  }
}

async function participantsInfo(groupId) {
  const participantsResponse = await fetch(
    `http://localhost:3000/participantsInfo?groupId=${groupId}`
  );
  if (!participantsResponse.ok) {
    throw new Error(`Erro: ${participantsResponse.statusText}`);
  }
  participantsData = await participantsResponse.json();

  return participantsData;
}

async function fillHonorCards(participants) {
  document.querySelectorAll(".honorBlock").forEach((div) => div.remove());
  honorParticipants = participants;
  for (let i = 0; i < participants.length; i++) {
    if (participants[i].id == userData.id) {
    } else {
      const allHonorResponse = await fetch(
        `http://localhost:3000/honorInfo?id=${participants[i].id}`,
        {
          method: "GET",
        }
      );

      honorData = await allHonorResponse.json();
      if (honorData.leadership_honors == null) {
        honorData.leadership_honors = 0;
      }
      if (honorData.sociable_honors == null) {
        honorData.sociable_honors = 0;
      }
      if (honorData.participative_honors == null) {
        honorData.participative_honors = 0;
      }
      const div = document.createElement("div");
      div.classList.add("honorBlock");
      div.id = `honorCard${i}`;
      div.innerHTML = `
        <a style="color: black; font-size:2rem" href="../html/userInfo.html?id=${participants[i].id}&name=${participants[i].name}">${participants[i].name}</a>
        <div class ='honorCard'>
            
            <div class="honorImages"> 
            <button onclick="changeHonor(${participants[i].id},'leadership')"><img src="../src/lider.png" title="Liderança"></button>
            </div>
            <h2>${honorData.leadership_honors}</h2>
            <div class="honorImages"> 
            <button onclick="changeHonor(${participants[i].id},'sociable')"><img src="../src/sociavel.png" title="Sociável"></button>
            </div>
            <h2>${honorData.sociable_honors}</h2>
            <div class="honorImages"> 
               <button onclick="changeHonor(${participants[i].id},'participative')"><img src="../src/participativo.png" title="Participativo"></button>
            </div>
             <h2>${honorData.participative_honors}</h2>
             </div>
        `;

      document.getElementById("participantsHonor").appendChild(div);
    }
  }
}
async function changeHonor(honoredId, honor_type) {
  const honorResponse = await fetch(
    `http://localhost:3000/checkHonor?fromUserId=${userData.id}&toUserId=${honoredId}&honorType=${honor_type}`,
    {
      method: "GET",
    }
  );

  let honorResult = await honorResponse.json();
  if (honorResult.exists) {
    const response = await fetch("http://localhost:3000/deleteHonor", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fromUserId: userData.id,
        toUserId: honoredId,
        honorType: honor_type,
      }),
    });

    const result = await response.json();
  } else {
    const response = await fetch("http://localhost:3000/addHonor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({
        fromUserId: userData.id,
        toUserId: honoredId,
        honorType: honor_type,
      }),
    });
    const result = await response.json();
  }
  fillHonorCards(honorParticipants);
}
async function changeRating(button) {
  let rating;
  if (button.value) {
    rating = parseInt(button.value); // Converte para número
  } else {
    rating = button;
  }

  document.getElementById("finishRatingBtn").value = rating;

  for (let i = 1; i <= 5; i++) {
    document.getElementById(`star${i}`).src = "../src/blankStar.png";
  }
  for (let i = 1; i <= rating; i++) {
    document.getElementById(`star${i}`).src = "../src/yellowStar.png";
  }
}
async function rate(button) {
  let ratedId = document.getElementById("stars").value;
  let userComment = document.getElementById("comment").value;
  let ratingValue = button.value;
  let exists = false;
  console.log(ratedId, userComment, ratingValue, userData.id);

  const ratingsResponse = await fetch(
    `http://localhost:3000/getRatings?userId=${ratedId}`,
    {
      method: "GET",
    }
  );

  let ratingsResult = await ratingsResponse.json();
  for (let i = 0; i < ratingsResult.ratings.length; i++) {
    if (ratingsResult.ratings[i].rating_user_id != userData.id) {
      continue;
    } else {
      exists = true;
    }
  }

  if (exists) {
    const response = await fetch("http://localhost:3000/editRating", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fromUserId: userData.id,
        toUserId: ratedId,
        rating: ratingValue,
        comment: userComment,
      }),
    });
    const result = await response.json();
  } else {
    const response = await fetch("http://localhost:3000/addRating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({
        fromUserId: userData.id,
        toUserId: ratedId,
        rating: ratingValue,
        comment: userComment,
      }),
    });
    const result = await response.json();
    console.log(result);
  }
  fillHonorCards(honorParticipants);
}

function closeCards() {
  location.reload();
}
function redirect(eventId) {
  window.location.href = `eventCreation.html?eventId=${eventId}`;
}
