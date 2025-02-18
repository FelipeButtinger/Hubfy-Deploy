// Importa os módulos necessários para configurar o servidor
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); 
const multer = require('multer');
const path = require('path');


// Configuração do multer para processar uploads de arquivos
const upload = multer({
    limits: {
        fileSize: 50 * 1024 * 1024, // Limite de 50MB para o arquivo
    },
});
const app = express();
const SECRET_KEY = 'seu_segredo_aqui'; // Substitua por um segredo seguro para gerar tokens JWT



// Serve arquivos estáticos (HTML, CSS, JS, imagens)

// Middleware para habilitar o CORS (Cross-Origin Resource Sharing)
app.use(cors());
app.use(bodyParser.json()); // Middleware para processar o corpo das requisições em JSON

// Configura a conexão com o banco de dados MySQL
const db = mysql.createConnection({
  host: 'yamanote.proxy.rlwy.net',
  user: 'root', // Ajuste conforme necessário
  password: 'crCCcnBsQMuEJKcUpfTGIOcIopKAXiHI', // Insira a senha se aplicável
  database: 'railway', // Nome do banco de dados
  port: 12716 // Use a porta correta aqui
});

// Conecta ao banco de dados e exibe mensagem de sucesso ou erro
db.connect((err) => {
  if (err) throw err;
  console.log('Conectado ao banco de dados MySQL!');
});


app.post('/register', upload.single('profilePhoto'), async (req, res) => {
  const { name, contact_info, age, password } = req.body;
  const profilePhoto = req.file ? req.file.buffer : null; // O arquivo é acessado via req.file

  if (!profilePhoto) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10); // Criptografa a senha

  const sql = 'INSERT INTO users (name, age, contact_info, password, profile_photo) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [name, age, contact_info, hashedPassword, profilePhoto], (err, result) => {
      if (err) {
          console.error('Erro ao registrar usuário:', err);
          return res.status(500).json({ error: 'Erro no servidor' });
      }
      res.json({ message: 'Usuário registrado com sucesso!', userId: result.insertId });
  });
});

// Rota para buscar a imagem do usuário
app.get('/userImage/:id', (req, res) => {
  const userId = req.params.id;

  db.query('SELECT profile_photo FROM users WHERE id = ?', [userId], (err, result) => {
      if (err) {
          console.error('Erro ao buscar imagem:', err);
          return res.status(500).json({ error: 'Erro no servidor' });
      }

      if (result.length > 0 && result[0].profile_photo) {
          res.contentType('image/jpeg'); // Ou 'image/png' conforme o tipo
          res.send(result[0].profile_photo);
      } else {
          res.status(404).send('Imagem não encontrada');
      }
  });
});
app.post('/eventRegister', upload.single('image'), (req, res) => {
  // Recupera os dados do formulário e a imagem enviada
  const { name, organizer_id, description, event_type, participants, event_date, event_time, CEP, phone_number } = req.body;
  const imageBuffer = req.file ? req.file.buffer : null; // Aqui estamos pegando a imagem em formato binário

  // Insere os dados no banco de dados
  db.query(
    'INSERT INTO events (name, organizer_id, description, event_type, participants, event_date, event_time, CEP, phone_number, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [name, organizer_id, description, event_type, participants, event_date, event_time, CEP, phone_number, imageBuffer],
    (err, result) => {
      if (err) throw err;
      res.send('Evento registrado com sucesso');
    }
  );
});

// Rota para obter a imagem armazenada no banco de dados
app.get('/eventImage/:id', (req, res) => {
  const eventId = req.params.id;

  db.query('SELECT image FROM events WHERE id = ?', [eventId], (err, result) => {
    if (err) {
      console.error('Erro ao buscar imagem:', err);
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    if (result.length > 0 && result[0].image) {
      res.contentType('image/jpeg'); // Ou 'image/png' dependendo do tipo de imagem
      res.send(result[0].image);
    } else {
      res.status(404).send('Imagem não encontrada');
    }
  });
});

app.post('/participantsRegister', async (req, res) => {
  const { event_id, participant_id} = req.body;
    db.query('INSERT INTO event_participants (event_id, user_id) VALUES (?, ?)', [event_id, participant_id], (err, result) => {
      if (err) throw err;
      res.send('Relação registrada com sucesso');
    });
  
});//esta rota cria a relação entre um participante com o grupo que ele entrou


// Rota para login de usuários
app.post('/login', async (req, res) => {
  const { name, password } = req.body; // Obtém o email e senha do corpo da requisição

  // Consulta o usuário no banco de dados
  db.query('SELECT * FROM users WHERE name= ?', [name], async (err, result) => {
    if (err) throw err;

    // Verifica se o usuário existe e se a senha está correta
    if (result.length === 0 || !(await bcrypt.compare(password, result[0].password))) {
      return res.status(400).send('Login ou senha inválidos');
    }

    // Gera o token JWT
    const token = jwt.sign({ name }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token }); // Retorna o token ao cliente
  });
});

// Middleware para verificar o token JWT nas requisições
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    console.log('Token não fornecido');
    return res.sendStatus(401);
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.log('Erro ao verificar token:', err);
      return res.sendStatus(403);
    }
    console.log('Usuário autenticado:', user); // Certifique-se de que o username está correto
    req.user = user;
    next();
  });
};

// Rota para obter dados do usuário logado
app.get('/user', authenticateToken, (req, res) => {
  
  db.query('SELECT name, contact_info,id FROM users WHERE name = ?', [req.user.name], (err, result) => {
    if (err) throw err;
    if (result.length === 0) {
      return res.status(404).send('Usuário não encontrado');
    }
    res.json(result[0]); 
  });
});

app.get('/events/ids', (req, res) => {
  db.query('SELECT id FROM events', (err, results) => {
    if (err) {
      console.error('Erro ao buscar IDs de eventos:', err);
      return res.status(500).json({ error: 'Erro ao buscar IDs de eventos' });
    }

    const eventIds = results.map(event => event.id); // Mapeia apenas os IDs dos resultados
    res.json(eventIds); 
  });
});// Retorna os IDs como uma array para que os use


app.get('/eventId', (req, res) => {//retorna algumas informações com o id fornecido
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID do evento não fornecido' });
  }

  const query = 'SELECT * FROM events WHERE id = ?';

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Erro no servidor:', err);
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    // Retorna o primeiro resultado (espera-se que o ID seja único)
    res.json(results[0]);
  });
});
app.get('/participants', async (req, res)=>{
  const { groupId } = req.query;

  if (!groupId){
    return res.status(400).json({ error: 'Id go grupo necessário' });
  }

  db.query('SELECT COUNT(user_id) AS total_participants FROM event_participants WHERE event_id = ?', [groupId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ participants: result[0].total_participants });
  });
})

app.get('/participantsInfo', async (req, res) => {
  const { groupId } = req.query;

  if (!groupId) {
    return res.status(400).json({ error: 'Id do grupo necessário' });
  }

  db.query(
    'SELECT u.id, u.name FROM event_participants ep JOIN users u ON ep.user_id = u.id WHERE ep.event_id = ?;',
    [groupId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Erro no servidor' });
      }

      // Retorna lista vazia se não houver participantes
      res.status(200).json({ result: result || [] });
    }
  );
});


app.get("/userEvents", async (req, res) => {
  const { userId } = req.query;

  // Consulta para buscar eventos criados pelo usuário
  const queryCreatedEvents = `
    SELECT * 
    FROM events 
    WHERE organizer_id = ?`;

  // Consulta para buscar eventos em que o usuário está cadastrado
  const queryMemberEvents = `
    SELECT e.* 
    FROM event_participants ue
    INNER JOIN events e ON ue.event_id = e.id
    WHERE ue.user_id = ?`;

  // Executar as consultas em paralelo
  db.query(queryCreatedEvents, [userId], (err, createdEvents) => {
    if (err) {
      console.error("Erro ao buscar eventos criados:", err);
      return res.status(500).json({ error: "Erro ao buscar eventos criados." });
    }

    db.query(queryMemberEvents, [userId], (err, memberEvents) => {
      if (err) {
        console.error("Erro ao buscar eventos do usuário:", err);
        return res.status(500).json({ error: "Erro ao buscar eventos do usuário." });
      }

      // Combinar os resultados
      const allEvents = [...createdEvents, ...memberEvents];

      res.status(200).json({
allEvents
      });
    });
  });
});
app.get('/userId', (req, res) => {//retorna algumas informações com o id fornecido
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID do usuário não fornecido' });
  }

  const query = 'SELECT * FROM users WHERE id = ?';

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Erro no servidor:', err);
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    
    res.json(results[0]);
  });
});


app.delete('/leaveEvent', async (req, res) => {
  const { user_id, event_id } = req.body;

  if (!user_id || !event_id) {
    return res.status(400).json({ error: 'user_id e event_id são obrigatórios' });
  }

  try {
    const [result] = await db.promise().query(
      'DELETE FROM event_participants WHERE user_id = ? AND event_id = ?',
      [user_id, event_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }

    res.json({ message: 'Registro deletado com sucesso' });
  } catch (err) {
    console.error('Erro no servidor:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.put('/editEvent', authenticateToken, upload.single('image'), async (req, res) => {
  const { newName, newDescription, newEvent_Type, newParticipants, newEvent_Date, newEvent_Time, newCep, newPhoneNumber, event_id } = req.body;
  const imageBuffer = req.file ? req.file.buffer : null;

  // Monta a query e os valores dinamicamente
  let query = 'UPDATE events SET name = ?, description = ?, event_type = ?, participants = ?, event_date = ?, event_time = ?, CEP = ?, phone_number = ?';
  let values = [newName, newDescription, newEvent_Type, newParticipants, newEvent_Date, newEvent_Time, newCep, newPhoneNumber];
  
  if (imageBuffer) {
    query += ', image = ?';
    values.push(imageBuffer);
  }
  
  query += ' WHERE id = ?';
  values.push(event_id);

  // Executa a query
  db.query(query, values, (err, result) => {
    if (err) throw err;

    if (result.affectedRows === 0) {
      return res.status(404).send('Evento não encontrado');
    }

    res.send('Evento atualizado com sucesso');
  });
});

app.delete('/event', (req, res) => {
  
  const { eventId } = req.body;
  db.query('DELETE FROM events WHERE id = ?', [eventId], (err, result) => {
    if (err) throw err;

    if (result.affectedRows === 0) {
      return res.status(404).send('evento não encontrado');
    }

    res.send('evento deletado com sucesso');
  });
});
app.put('/editUser', authenticateToken, upload.single('profilePhoto'), async (req, res) => {
  const { newName, newAge, newContactInfo, newPassword, userId } = req.body;
  const profilePhotoBuffer = req.file ? req.file.buffer : null;
  const newHhashedPassword = await bcrypt.hash(newPassword, 10); // Criptografa a senha

  let query = 'UPDATE users SET name = ?, age = ?, contact_info = ?, password = ?';
  let values = [newName, newAge, newContactInfo, newHhashedPassword];

  if (profilePhotoBuffer) {
      query += ', profile_photo = ?';
      values.push(profilePhotoBuffer);
  }

  query += ' WHERE id = ?';
  values.push(userId);

  db.query(query, values, (err, result) => {
      if (err) throw err;

      if (result.affectedRows === 0) {
          return res.status(404).send('Usuário não encontrado');
      }

      res.send('Usuário atualizado com sucesso');
  });
});
app.delete('/user', (req, res) => {
  const { userId } = req.body;
  db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
    if (err) throw err;

    if (result.affectedRows === 0) {
      return res.status(404).send('Usuário não encontrado');
    }

    res.send('Usuário deletado com sucesso');
  });
});
app.get('/honorInfo', (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID do usuário não fornecido' });
  }

  const query = `
    SELECT 
      SUM(CASE WHEN honor_type = 'sociable' THEN 1 ELSE 0 END) AS sociable_honors,
      SUM(CASE WHEN honor_type = 'leadership' THEN 1 ELSE 0 END) AS leadership_honors,
      SUM(CASE WHEN honor_type = 'participative' THEN 1 ELSE 0 END) AS participative_honors
    FROM honors
    WHERE honored_user_id = ?;
  `;

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Erro no servidor:', err);
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    if (results.length === 0 || !results[0]) {
      return res.status(404).json({ error: 'Nenhuma honra encontrada para o usuário' });
    }

    res.json(results[0]);
  });
});

app.post('/addHonor', (req, res) => {
  const { fromUserId, toUserId, honorType } = req.body;

  if (!fromUserId || !toUserId || !honorType) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios: fromUserId, toUserId e honorType' });
  }

  const query = `
    INSERT INTO honors (honoring_user_id, honored_user_id, honor_type) 
    VALUES (?, ?, ?);
  `;

  db.query(query, [fromUserId, toUserId, honorType], (err, result) => {
    if (err) {
      console.error('Erro no servidor:', err);
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    res.status(201).json({ message: 'Honra adicionada com sucesso' });
  });
});

app.get('/checkHonor', (req, res) => {
  const { fromUserId, toUserId, honorType } = req.query;

  if (!fromUserId || !toUserId || !honorType) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios: fromUserId, toUserId e honorType' });
  }

  const query = `
    SELECT * 
    FROM honors 
    WHERE honoring_user_id = ? AND honored_user_id = ? AND honor_type = ?;
  `;

  db.query(query, [fromUserId, toUserId, honorType], (err, result) => {
    if (err) {
      console.error('Erro no servidor:', err);
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    if (result.length > 0) {
      return res.status(200).json({ exists: true, message: 'Honra já existe' });
    }

    res.status(404).json({ exists: false, message: 'Honra não encontrada' });
  });
});
app.delete('/deleteHonor', (req, res) => {
  const { fromUserId, toUserId, honorType } = req.body;

  if (!fromUserId || !toUserId || !honorType) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios: fromUserId, toUserId e honorType' });
  }

  const query = `
    DELETE FROM honors 
    WHERE honoring_user_id = ? AND honored_user_id = ? AND honor_type = ?;
  `;

  db.query(query, [fromUserId, toUserId, honorType], (err, result) => {
    if (err) {
      console.error('Erro no servidor:', err);
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Honra não encontrada' });
    }

    res.status(200).json({ message: 'Honra excluída com sucesso' });
  });
});
app.get('/getRatings', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
      return res.status(400).json({ error: 'Parâmetro obrigatório: userId' });
  }

  // Query para buscar todas as avaliações recebidas pelo usuário
  const queryRatings = `
      SELECT rating_user_id, rating_value, comment, created_at 
      FROM ratings 
      WHERE rated_user_id = ?;
  `;

  // Query para calcular a média das avaliações recebidas
  const queryAverage = `
      SELECT COALESCE(AVG(rating_value), 0) AS average_rating 
      FROM ratings 
      WHERE rated_user_id = ?;
  `;

  db.query(queryRatings, [userId], (err, ratingsResult) => {
      if (err) {
          console.error('Erro ao buscar avaliações:', err);
          return res.status(500).json({ error: 'Erro no servidor ao buscar avaliações' });
      }

      db.query(queryAverage, [userId], (err, averageResult) => {
          if (err) {
              console.error('Erro ao calcular média:', err);
              return res.status(500).json({ error: 'Erro no servidor ao calcular média' });
          }

          res.status(200).json({
              ratings: ratingsResult,
              average_rating: averageResult[0].average_rating
          });
      });
  });
});
app.post('/addRating', (req, res) => {
  const { fromUserId, toUserId, rating, comment } = req.body;

  if (!fromUserId || !toUserId || !rating || !comment) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios: fromUserId, toUserId e honorType' });
  }

  const query = `
    INSERT INTO ratings (rating_user_id, rated_user_id, rating_value, comment) 
    VALUES (?, ?, ?, ?);
  `;

  db.query(query, [fromUserId, toUserId, rating, comment], (err, result) => {
    if (err) {
      console.error('Erro no servidor:', err);
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    res.status(201).json({ message: 'nota adicionada com sucesso' });
  });
});
app.put('/editRating', async (req, res) => {
  const { fromUserId, toUserId, rating, comment } = req.body;  
  

  // Atualiza o email e senha do usuário
  db.query('UPDATE ratings SET rating_value = ?, comment = ? WHERE rating_user_id = ? and rated_user_id = ?', [rating, comment, fromUserId, toUserId], (err, result) => {
    if (err) throw err;

    // Verifica se a atualização foi bem-sucedida
    if (result.affectedRows === 0) {
      return res.status(404).send('Evento não encontrado');
    }

    res.json({ message: 'nota atualizada com sucesso' });
  });
});
app.use(express.static(path.join(__dirname, 'html')));
app.use(express.static(path.join(__dirname, 'css')));
app.use(express.static(path.join(__dirname, 'js')));
app.use(express.static(path.join(__dirname, 'src'))); 
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'index.html'));
});


// Inicia o servidor na porta 3000
app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});







