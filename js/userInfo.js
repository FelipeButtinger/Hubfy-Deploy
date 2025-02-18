// Obtém os parâmetros da URL (id e name) para identificar qual usuário o perfil está mostrando
const urlParams = new URLSearchParams(window.location.search);
const thisId = urlParams.get('id');  // ID do usuário que está sendo visualizado
const thisName = urlParams.get('name');  // Nome do usuário que está sendo visualizado

// Evento que é disparado quando o DOM é totalmente carregado
document.addEventListener('DOMContentLoaded', async () => {
    // Exibe o nome do usuário na interface
    document.getElementById('userName').textContent = thisName;

    // Verifica se o token de autenticação está presente no localStorage (caso contrário, redireciona para login)
    const token = localStorage.getItem('token'); 
    if (!token) {
        window.location.href = 'login.html';  // Redireciona para a página de login se o token não existir
        return;
    }

    // Seleciona o elemento onde a mensagem será exibida
    const messageElement = document.getElementById('message');

    // Realiza uma requisição para obter os dados do usuário logado
    const response = await fetch('http://localhost:3000/user', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}` // Envia o token para autenticar a requisição
        }
    });

    // Obtém os dados do usuário logado (para realizar verificações)
    userData = await response.json();    
    console.log(userData.id);

    // Funções que carregam as informações do perfil
    receiveHonors();  // Obtém as honrarias do usuário
    receiveRatings(); // Obtém as avaliações do usuário
    const userImage = await fetchUserImage(thisId);  // Obtém a imagem do perfil do usuário
    document.getElementById('profilePic').src = userImage;  // Exibe a imagem do perfil
});

// Função que busca as honrarias do usuário (como liderança, sociabilidade e participação)
async function receiveHonors(){
    // Requisição para obter as honrarias do usuário pelo ID
    const allHonorResponse = await fetch(`http://localhost:3000/honorInfo?id=${thisId}`, {
        method: 'GET'
    });

    // Obtém os dados de honrarias
    honorData = await allHonorResponse.json();
    // Se algum dado de honraria for nulo, substitui por zero
    if(honorData.leadership_honors == null) honorData.leadership_honors = 0;
    if(honorData.sociable_honors == null) honorData.sociable_honors = 0;
    if(honorData.participative_honors == null) honorData.participative_honors = 0;

    // Exibe as honrarias na interface
    document.getElementById("leadership").textContent = honorData.leadership_honors;
    document.getElementById("sociable").textContent = honorData.sociable_honors;
    document.getElementById("participative").textContent = honorData.participative_honors;
    
    // Se o perfil sendo visualizado for o do próprio usuário logado, exibe os botões de edição
    if(thisId == userData.id){
        showButtons();  // Função que exibe os botões de editar e sair
    }
}

// Função que busca as avaliações do usuário (pontuação média e comentários)
async function receiveRatings(){
    // Requisição para obter as avaliações do usuário
    const ratingsResponse = await fetch(`http://localhost:3000/getRatings?userId=${thisId}`, {
        method: 'GET'
    });
    
    // Obtém as avaliações e a média
    let ratingsResult = await ratingsResponse.json();
    document.getElementById('rating').textContent = parseFloat(ratingsResult.average_rating).toFixed(1);  // Exibe a média das avaliações

    // Para cada avaliação, exibe o comentário ou a avaliação do próprio usuário
    ratingsResult.ratings.forEach(rating => {
        if(rating.rating_user_id != userData.id){
            addComment(rating);  // Exibe os comentários de outros usuários
        }else{
            userComment(rating);  // Exibe o comentário do próprio usuário
        }
    });
}

// Função que exibe o comentário do próprio usuário
async function userComment(rating){
    const userImage = await fetchUserImage(userData.id);  // Obtém a imagem do usuário logado
    // Exibe a avaliação do próprio usuário na interface
    document.getElementById('yourRating').innerHTML = `
    <div id='topHalf' style="height: 5dvh;display:flex;justify-content: space-around">
        <div style="height: 5dvh;display:flex">
            <img style="height: 5dvh;border-radius: 50%" src="${userImage}" alt="Sua Foto">
            <h3>Você</h3>
        </div>
        <div style="height: 5dvh;display:flex">
            <img style="height: 5dvh" src="/src/yellowStar.png" alt="Estrela">
            <h3>${rating.rating_value}</h3>
        </div>
    </div>
    <div id='bottomHalf' style="height: 90%;display:flex; justify-content:center;align-items:center">
        <textarea readonly style="resize: none;height: 60%;width: 35dvw;display:flex" 
                  id="comment" name="description" required maxlength="500">${rating.comment}</textarea>
    </div>
    `;
    // Exibe a avaliação na interface
    document.getElementById('yourRating').style.display = "block";
}

// Função que exibe os comentários de outros usuários
async function addComment(rating) {
    // Busca os dados do usuário que fez a avaliação
    const raterInfo = await getUser(rating.rating_user_id); 
    // Obtém a imagem do usuário que fez a avaliação
    const userImage = await fetchUserImage(rating.rating_user_id); 

    // Cria o elemento de comentário e preenche com os dados
    const div = document.createElement('div');
    div.classList.add('commentCard');
    div.innerHTML = `
        <div id='topHalf' style="height: 5dvh;display:flex;justify-content: space-around">
            <div style="height: 5dvh;display:flex">
                <img style="height: 5dvh; border-radius: 50%;" src="${userImage}" alt="${raterInfo.name}">
                <h3>${raterInfo.name}</h3> 
            </div>
            <div style="height: 5dvh;display:flex">
                <img style="height: 5dvh" src="/src/yellowStar.png" alt="Estrela">
                <h3>${rating.rating_value}</h3>
            </div>
        </div>
        <div id='bottomHalf' style="height: 90%;display:flex; justify-content:center;align-items:center">
            <textarea readonly style="resize: none;height: 60%;width: 35dvw;display:flex" 
                      id="comment" name="description" required maxlength="500">${rating.comment}</textarea>
        </div>
    `;
    // Adiciona o comentário ao container de comentários
    document.getElementById('comments').appendChild(div);
}

// Função que busca os dados do usuário pelo ID
async function getUser(userId){
    const userIdResponse = await fetch(`http://localhost:3000/userId?id=${userId}`);
    if (!userIdResponse.ok) {
        throw new Error(`Erro ao buscar organizador: ${userIdResponse.statusText}`);
    }
    return await userIdResponse.json();
}

// Função que busca a imagem do usuário
async function fetchUserImage(userId) {
    try {
        const response = await fetch(`http://localhost:3000/userImage/${userId}`);
        if (response.ok) {
            const blob = await response.blob();
            return URL.createObjectURL(blob); // Retorna a URL gerada para a imagem
        } else {
            console.error('Erro ao buscar a imagem:', response.statusText);
            return "/src/defaultUser.png"; // Imagem padrão em caso de erro
        }
    } catch (error) {
        console.error('Erro ao buscar a imagem:', error);
        return "/src/sociavel.png"; // Imagem padrão em caso de erro
    }
}

// Função que exibe os botões de edição e logout (caso o perfil seja do próprio usuário logado)
function showButtons(){
    document.getElementById('crudButtons').style.display = 'flex';  // Exibe os botões
}

// Função que realiza o logout, removendo o token e redirecionando para a página de login
function leaveAccount(){
    localStorage.removeItem("token");
    window.location.href = 'login.html';  
}

// Função que redireciona para a página de edição de conta
function editAccount(){
    window.location.href = `/html/register.html?id=${userData.id}`;
}
