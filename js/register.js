document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    
  
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get("id");
  
    try{
        const userResponse = await fetch("http://localhost:3000/user", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  
    const userData = await userResponse.json();
    if(userData){
        if (userId && userId != userData.id) {
            window.location.href = "login.html";
            return;
          }
    }
}catch{
    console.log('sem conta')
}
    const form = document.getElementById("registerForm");
    const messageElement = document.getElementById("message");
    const submitButton = document.getElementById("submitButton");
  
    let isEditing = false;
    let userToEdit = {};
  
    if (userId) {
      isEditing = true;
      submitButton.textContent = "Salvar Alterações";
  
      try {
        const response = await fetch(`http://localhost:3000/userId?id=${userId}`);
        if (!response.ok) throw new Error(`Erro: ${response.statusText}`);
  
        userToEdit = await response.json();
  
        document.getElementById("name").value = userToEdit.name;
        document.getElementById("age").value = userToEdit.age;
        document.getElementById("contact").value = userToEdit.contact_info;
        document.getElementById("password").value = "senha";
  
        if (userToEdit.profile_photo) {
          document.getElementById("previewImage").src = `http://localhost:3000/userImage/${userId}`;
          document.getElementById("previewImage").style.display = "block";
          document.getElementById("defaultIcon").style.display = "none";
        }
      } catch (error) {
        console.error(error);
      }
    }
  
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      const name = document.getElementById("name").value;
      const age = document.getElementById("age").value;
      const contact = document.getElementById("contact").value;
      const password = document.getElementById("password").value;
      const imageInput = document.getElementById("profilePhoto");
  
      const formData = new FormData();
      formData.append(isEditing ? "newName" : "name", name);
      formData.append(isEditing ? "newAge" : "age", age);
      formData.append(isEditing ? "newContactInfo" : "contact_info", contact);
      formData.append(isEditing ? "newPassword" : "password", password);
  
      if (isEditing) {
        formData.append("userId", userId);
      }
  
      if (imageInput.files.length > 0) {
        formData.append("profilePhoto", imageInput.files[0]);
      }
  
      const url = isEditing ? "http://localhost:3000/editUser" : "http://localhost:3000/register";
      const method = isEditing ? "PUT" : "POST";
  
      try {
        const response = await fetch(url, {
          method: method,
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
  
        if (response.ok) {
          messageElement.textContent = isEditing
            ? "Usuário atualizado com sucesso!"
            : "Usuário registrado com sucesso!";

            const response = await fetch('http://localhost:3000/login', {
                method: 'POST', // Define o método HTTP como POST, geralmente usado para enviar dados ao servidor
                headers: {
                    'Content-Type': 'application/json' // Define o tipo de conteúdo como JSON para o servidor entender o formato dos dados
                },
                // Converte o email e a senha em uma string JSON para enviar no corpo da solicitação
                body: JSON.stringify({ name, password })
            });
            if (response.ok) {
                
                const data = await response.json();
                
                localStorage.setItem('token', data.token); 
                
                window.location.href = 'home.html'; 
            } else {
              
            }
        } else {
          messageElement.textContent = await response.text();
        }
      } catch (error) {
        messageElement.textContent = "Erro ao processar a requisição.";
        console.error(error);
      }
    });
  
    document.getElementById('profilePhoto').addEventListener('change', function () {
        const file = this.files[0];
      
        if (file) {
          const reader = new FileReader();
          reader.onloadend = function () {
            // Exibe a imagem pré-visualizada
            document.getElementById('previewImage').src = reader.result;
            document.getElementById('previewImage').style.display = 'block';
            document.getElementById('defaultIcon').style.display = 'none';  // Esconde o ícone "+"
          };
          reader.readAsDataURL(file);
        }
      });
      
      document.getElementById('defaultIcon').addEventListener('click', function () {
        // Limpar o valor do input de imagem para permitir a seleção novamente da mesma imagem
        document.getElementById('profilePhoto').value = '';
        // Em seguida, abrir a janela de seleção de arquivos
        document.getElementById('profilePhoto').click();
      });
  
    document.getElementById('defaultIcon').addEventListener('click', function () {
      document.getElementById('profilePhoto').click();
    });
  });
  