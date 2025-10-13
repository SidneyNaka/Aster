const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const saltRounds = 10;

const app = express();
const port = 3000;
const JWT_SECRET = 'braham-eshwald-o-maior-mago-da-historia-benfeitor-de-grid-vampiro-duque-da-sabedoria-lenda-mito-matador-da-hidra-congelador-de-mundos';

// Torna a pasta 'public' acessível para o navegador
app.use(express.static('public'));
app.use('/img', express.static('../img'));

// Configuração mais explícita do CORS para aceitar requisições complexas
app.use(cors({
  origin: '*', // Permite requisições de qualquer origem
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json()); // Habilita o body-parser para ler JSON

// Configuração da conexão com o banco de dados
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Grid@braham9145', // Coloque a senha que você definiu na instalação do MySQL
  database: 'aster'
});

// Conecta de fato ao banco de dados
db.connect(err => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    return;
  }
  console.log('Conectado ao banco de dados MySQL com sucesso!');
});

// Configura onde os arquivos de capa serão salvos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/capas/'); // Salva na pasta 'public/capas'
    },
    filename: function (req, file, cb) {
        // Garante um nome de arquivo único adicionando a data ao nome original
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/avatares/'); // Salva na nova pasta 'public/avatares'
    },
    filename: function (req, file, cb) {
        // Garante um nome de arquivo único para o avatar
        const userId = req.user.id; // Pegaremos o ID do usuário a partir do token
        cb(null, 'avatar-' + userId + Date.now() + path.extname(file.originalname));
    }
});

const uploadAvatar = multer({ storage: avatarStorage });

// Rota para fazer o upload de uma imagem de capa
app.post('/upload', upload.single('capaPlaylist'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }
    // Retorna o caminho do arquivo salvo para o front-end
    res.json({ success: true, filePath: `/capas/${req.file.filename}` });
});

// Rota de teste
app.get('/', (req, res) => {
  res.send('API do Projeto Aster está funcionando!');
});

// Rota de Login ATUALIZADA COM TOKEN JWT
app.post('/login', (req, res) => {
    const { user, password } = req.body;

    const query = "SELECT * FROM usuario WHERE email = ?";

    db.query(query, [user], async (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Erro no servidor." });
        }

        if (results.length > 0) {
            const userFound = results[0];
            // Compara a senha enviada com a senha criptografada no banco
            const match = await bcrypt.compare(password, userFound.senha);

            if (match) {
                // Senhas correspondem, login bem-sucedido!
                // Agora, vamos criar o Token (o "crachá de acesso").
                const userPayload = { 
                    id: userFound.id, 
                    email: userFound.email,
                    nome: userFound.nome_usuario 
                }; 
                
                // Altere jwt.sign para usar a nova constante:
                const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1h' });

                // Envia o token para o front-end
                res.status(200).json({ 
                    success: true, 
                    message: "Login bem-sucedido!", 
                    token: token 
                });

            } else {
                // Senhas não correspondem
                res.status(401).json({ success: false, message: "Email ou senha inválidos." });
            }
        } else {
            // Usuário não encontrado
            res.status(401).json({ success: false, message: "Email ou senha inválidos." });
        }
    });
});

// Rota de Cadastro de Novo Usuário
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Validação simples dos dados recebidos
    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
    }

    try {
        // Criptografa a senha antes de salvar no banco de dados
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const query = "INSERT INTO usuario (nome_usuario, email, senha) VALUES (?, ?, ?)";

        db.query(query, [username, email, hashedPassword], (err, results) => {
            if (err) {
                // Verifica se o erro é de entrada duplicada (email já existe)
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ success: false, message: 'Este email já está em uso.' });
                }
                // Outros erros de banco de dados
                console.error("Erro no banco de dados:", err);
                return res.status(500).json({ success: false, message: 'Erro no servidor ao criar conta.' });
            }

            // Se tudo deu certo
            res.status(201).json({ success: true, message: 'Conta criada com sucesso!' });
        });
    } catch (error) {
        console.error("Erro ao gerar hash da senha:", error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor.' });
    }
});

// Rota protegida para buscar dados do perfil do usuário
app.get('/perfil', (req, res) => {
    // 1. Pega o token do cabeçalho da requisição
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

    if (token == null) {
        // 2. Se não há token, o acesso é não autorizado
        return res.sendStatus(401); 
    } 

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // 4. Se o token for inválido ou expirado, o acesso é proibido
            return res.sendStatus(403); 
        }

        // 5. Se o token é válido, 'user' contém os dados que salvamos (id, email, nome)
        // Agora, buscamos os dados mais recentes do usuário no banco de dados
        const query = "SELECT id, email, nome_usuario, url_avatar, sexo, data_nascimento, pais, consentimento_marketing, telefone FROM usuario WHERE id = ?";
        db.query(query, [user.id], (dbErr, results) => {
            if (dbErr || results.length === 0) {
                return res.sendStatus(500); // Erro de servidor ou usuário não encontrado
            }
            // 6. Envia os dados do usuário de volta para o front-end
            res.json(results[0]);
        });
    });
});

app.post('/perfil/avatar', (req, res) => {
    // 1. Validação do Token (Middleware "improvisado")
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user; // Adiciona os dados do usuário ao objeto 'req'

        // 2. Processa o Upload com o Multer
        const uploader = uploadAvatar.single('avatar');
        uploader(req, res, function (uploadError) {
            if (uploadError) {
                return res.status(500).json({ message: "Erro ao fazer upload do arquivo.", error: uploadError });
            }
            if (!req.file) {
                return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
            }

            // 3. Atualiza o Banco de Dados
            const filePath = `/avatares/${req.file.filename}`;
            const query = "UPDATE usuario SET url_avatar = ? WHERE id = ?";

            db.query(query, [filePath, req.user.id], (dbErr, results) => {
                if (dbErr) {
                    return res.status(500).json({ message: "Erro ao salvar o caminho no banco de dados." });
                }
                res.json({ success: true, message: "Avatar atualizado com sucesso!", filePath: filePath });
            });
        });
    });
});

app.put('/perfil/info', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const { email, sexo, data_nascimento, pais, consentimento_marketing, telefone } = req.body;
        const usuarioId = user.id;

        const query = "UPDATE usuario SET email = ?, sexo = ?, data_nascimento = ?, pais = ?, consentimento_marketing = ?, telefone = ? WHERE id = ?";

        db.query(query, [email, sexo, data_nascimento, pais, consentimento_marketing, telefone, usuarioId], (dbErr, results) => {
            if (dbErr) return res.status(500).json({ success: false, message: 'Erro no servidor ao atualizar dados.' });
            res.json({ success: true, message: 'Perfil atualizado com sucesso!' });
        });
    });
});

app.post('/perfil/change-password', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const { currentPassword, newPassword } = req.body;
        const usuarioId = user.id;

        // 1. Buscar a senha atual do usuário no banco
        db.query("SELECT senha FROM usuario WHERE id = ?", [usuarioId], async (dbErr, results) => {
            if (dbErr || results.length === 0) {
                return res.status(500).json({ success: false, message: 'Erro ao encontrar usuário.' });
            }

            const currentHashedPassword = results[0].senha;

            // 2. Comparar a senha enviada com a senha do banco
            const match = await bcrypt.compare(currentPassword, currentHashedPassword);

            if (!match) {
                return res.status(403).json({ success: false, message: 'A senha atual está incorreta.' });
            }

            // 3. Se a senha atual estiver correta, criar o hash da nova senha
            const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);

            // 4. Atualizar a senha no banco
            db.query("UPDATE usuario SET senha = ? WHERE id = ?", [newHashedPassword, usuarioId], (updateErr, updateResults) => {
                if (updateErr) {
                    return res.status(500).json({ success: false, message: 'Erro ao atualizar a senha.' });
                }
                res.json({ success: true, message: 'Senha alterada com sucesso!' });
            });
        });
    });
});

app.get('/musicas/humor/:nomeHumor', (req, res) => {
    const nomeHumor = req.params.nomeHumor;

    // Query que junta as tabelas para encontrar músicas pelo nome do humor
    const query = `
        SELECT m.*, GROUP_CONCAT(a.nome SEPARATOR ', ') AS nome_autor
        FROM musica AS m
        JOIN musica_humor AS mh ON m.id = mh.musica_id
        JOIN humor AS h ON mh.humor_id = h.id
        JOIN musica_autor AS ma ON m.id = ma.musica_id
        JOIN autor AS a ON ma.autor_id = a.id
        WHERE h.nome = ?
        GROUP BY m.id
        ORDER BY RAND()
        LIMIT 10;
    `;

    db.query(query, [nomeHumor], (err, results) => {
        if (err) {
            console.error("Erro ao buscar músicas por humor:", err);
            return res.status(500).json({ success: false, message: "Erro no servidor." });
        }
        res.status(200).json(results);
    });
});

app.get('/musicas/genero/:nomeGenero', (req, res) => {
    const nomeGenero = req.params.nomeGenero;

    // Query que junta as tabelas para encontrar músicas pelo nome do gênero
    const query = `
        SELECT m.*, GROUP_CONCAT(a.nome SEPARATOR ', ') AS nome_autor
        FROM musica AS m
        JOIN musica_genero AS mg ON m.id = mg.musica_id
        JOIN genero AS g ON mg.genero_id = g.id
        JOIN musica_autor AS ma ON m.id = ma.musica_id
        JOIN autor AS a ON ma.autor_id = a.id
        WHERE g.nome = ?
        GROUP BY m.id;
    `;

    db.query(query, [nomeGenero], (err, results) => {
        if (err) {
            console.error("Erro ao buscar músicas por gênero:", err);
            return res.status(500).json({ success: false, message: "Erro no servidor." });
        }
        res.status(200).json(results);
    });
});

// Rota para buscar todas as músicas com seus respectivos autores
app.get('/musicas', (req, res) => {
    // Esta query SQL é um pouco mais avançada. Ela usa JOIN para combinar
    // informações de 3 tabelas: musica, musica_autor, e autor.
    const query = `
        SELECT 
            m.id, 
            m.titulo, 
            m.duracao, 
            m.url_musica, 
            m.url_capa, 
            GROUP_CONCAT(a.nome SEPARATOR ', ') AS nome_autor
        FROM musica AS m
        JOIN musica_autor AS ma ON m.id = ma.musica_id
        JOIN autor AS a ON ma.autor_id = a.id
        GROUP BY m.id;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Erro ao buscar músicas:", err);
            return res.status(500).json({ success: false, message: "Erro no servidor." });
        }
        
        // Se a busca for bem-sucedida, envia a lista de músicas como resposta.
        res.status(200).json(results);
    });
});

// Rota para curtir/descurtir (toggle) uma música
app.post('/musicas/:id/curtir', (req, res) => {
    // Primeiro, validamos o token do usuário (lógica de rota protegida)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const musicaId = req.params.id;
        const usuarioId = user.id;

        // Verifica se o usuário já curtiu esta música
        const checkQuery = "SELECT * FROM musicas_curtidas WHERE usuario_id = ? AND musica_id = ?";
        db.query(checkQuery, [usuarioId, musicaId], (err, results) => {
            if (err) return res.status(500).json({ message: "Erro no servidor." });

            if (results.length > 0) {
                // Se já curtiu, descurte (DELETE)
                const deleteQuery = "DELETE FROM musicas_curtidas WHERE usuario_id = ? AND musica_id = ?";
                db.query(deleteQuery, [usuarioId, musicaId], (err, results) => {
                    if (err) return res.status(500).json({ message: "Erro no servidor." });
                    res.json({ success: true, curtido: false });
                });
            } else {
                // Se não curtiu, curte (INSERT)
                const insertQuery = "INSERT INTO musicas_curtidas (usuario_id, musica_id) VALUES (?, ?)";
                db.query(insertQuery, [usuarioId, musicaId], (err, results) => {
                    if (err) return res.status(500).json({ message: "Erro no servidor." });
                    res.json({ success: true, curtido: true });
                });
            }
        });
    });
});

// Rota para buscar a lista de músicas curtidas pelo usuário
app.get('/musicas/curtidas', (req, res) => {
    // Lógica de rota protegida
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const usuarioId = user.id;

        // Query que busca os detalhes das músicas curtidas e ordena pela data
        const query = `
            SELECT m.*, GROUP_CONCAT(a.nome SEPARATOR ', ') AS nome_autor
            FROM musicas_curtidas mc
            JOIN musica m ON mc.musica_id = m.id
            JOIN musica_autor ma ON m.id = ma.musica_id
            JOIN autor a ON ma.autor_id = a.id
            WHERE mc.usuario_id = ?
            GROUP BY m.id, mc.data_curtida
            ORDER BY mc.data_curtida DESC;
        `;

        db.query(query, [usuarioId], (err, results) => {
            if (err) return res.status(500).json({ message: "Erro no servidor." });
            res.json(results);
        });
    });
});

// Rota para buscar apenas os IDs das músicas curtidas pelo usuário
app.get('/musicas/curtidas/ids', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const usuarioId = user.id;
        const query = "SELECT musica_id FROM musicas_curtidas WHERE usuario_id = ?";

        db.query(query, [usuarioId], (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Erro no servidor." });
            }
            // Mapeia o resultado para um array simples de IDs: [1, 5, 12]
            const idArray = results.map(row => row.musica_id);
            res.json(idArray);
        });
    });
});

// Rota para buscar as playlists do usuário logado
app.get('/playlists', (req, res) => {
    // ---- O CÓDIGO FALTANTE ESTÁ AQUI ----
    // Primeiro, pegamos o token do cabeçalho, exatamente como nas outras rotas.
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401); // Se não houver token, não autorizado.
    // ------------------------------------

    // Agora, a variável 'token' existe e o restante do código funciona.
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const usuarioId = user.id;
        const query = "SELECT * FROM playlist WHERE usuario_id = ? ORDER BY data_criacao DESC";

        db.query(query, [usuarioId], (err, results) => {
            if (err) {
                console.error("Erro ao buscar playlists:", err); // Adicionado para mais detalhes no futuro
                return res.status(500).json({ message: "Erro no servidor." });
            }
            res.json(results);
        });
    });
});

// 1. ROTA PARA BUSCAR DETALHES DE UMA PLAYLIST E SUAS MÚSICAS
app.get('/playlists/:id', (req, res) => {
    // Rota protegida com JWT
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const playlistId = req.params.id;
        const usuarioId = user.id;

        // Primeiro, busca os detalhes da playlist e verifica se ela pertence ao usuário
        const playlistQuery = "SELECT * FROM playlist WHERE id = ? AND usuario_id = ?";
        db.query(playlistQuery, [playlistId, usuarioId], (err, playlistResults) => {
            if (err || playlistResults.length === 0) {
                return res.status(404).json({ message: "Playlist não encontrada ou não pertence ao usuário." });
            }

            // Se encontrou, busca as músicas dessa playlist
            const songsQuery = `
                SELECT m.*, GROUP_CONCAT(a.nome SEPARATOR ', ') AS nome_autor
                FROM playlist_musicas pm
                JOIN musica m ON pm.musica_id = m.id
                JOIN musica_autor ma ON m.id = ma.musica_id
                JOIN autor a ON ma.autor_id = a.id
                WHERE pm.playlist_id = ?
                GROUP BY m.id, pm.ordem
                ORDER BY pm.ordem;
            `;
            db.query(songsQuery, [playlistId], (err, songsResults) => {
                if (err) return res.status(500).json({ message: "Erro ao buscar músicas da playlist." });

                // Retorna um objeto com os detalhes da playlist e a lista de músicas
                res.json({
                    details: playlistResults[0],
                    songs: songsResults
                });
            });
        });
    });
});

// 2. ROTA PARA ADICIONAR UMA MÚSICA A UMA PLAYLIST
app.post('/playlists/:id/musicas', (req, res) => {
    // Rota protegida com JWT
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const playlistId = req.params.id;
        const { musicaId } = req.body; // Pega o ID da música do corpo da requisição
        const usuarioId = user.id;

        // Verifica se o usuário é o dono da playlist antes de adicionar
        const ownerQuery = "SELECT id FROM playlist WHERE id = ? AND usuario_id = ?";
        db.query(ownerQuery, [playlistId, usuarioId], (err, results) => {
            if (err || results.length === 0) {
                return res.status(403).json({ message: "Acesso negado para esta playlist." });
            }

            // Se for o dono, insere a música na tabela de relacionamento
            const insertQuery = "INSERT INTO playlist_musicas (playlist_id, musica_id) VALUES (?, ?)";
            db.query(insertQuery, [playlistId, musicaId], (err, insertResult) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({ message: "Essa música já está na playlist." });
                    }
                    return res.status(500).json({ message: "Erro ao adicionar música." });
                }
                res.status(201).json({ success: true, message: "Música adicionada com sucesso!" });
            });
        });
    });
});

// Rota para CRIAR uma nova playlist
app.post('/playlists', (req, res) => {
    // Rota protegida com JWT
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const { nome, descricao, url_capa } = req.body;
        const usuarioId = user.id;

        if (!nome) {
            return res.status(400).json({ message: "O nome da playlist é obrigatório." });
        }

        const query = "INSERT INTO playlist (usuario_id, nome, descricao, url_capa) VALUES (?, ?, ?, ?)";

        db.query(query, [usuarioId, nome, descricao, url_capa], (err, results) => {
            if (err) {
                console.error("Erro ao criar playlist:", err);
                return res.status(500).json({ message: "Erro no servidor ao criar playlist." });
            }

            // Envia a resposta de sucesso, incluindo o ID da playlist recém-criada
            res.status(201).json({ 
                success: true, 
                message: "Playlist criada com sucesso!",
                insertId: results.insertId // AQUI ESTÁ O ID QUE O FRONT-END PRECISA!
            });
        });
    });
});

// Rota para DELETAR uma playlist
app.delete('/playlists/:id', (req, res) => {
    // Rota protegida com JWT
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const playlistId = req.params.id;
        const usuarioId = user.id;

        // Query para deletar a playlist.
        // A cláusula WHERE garante que um usuário só pode deletar uma playlist
        // que tenha o ID correto E que pertença a ele (usuario_id).
        const query = "DELETE FROM playlist WHERE id = ? AND usuario_id = ?";

        db.query(query, [playlistId, usuarioId], (err, results) => {
            if (err) {
                console.error("Erro ao deletar playlist:", err);
                return res.status(500).json({ message: "Erro no servidor ao deletar playlist." });
            }

            if (results.affectedRows === 0) {
                // Se nenhuma linha foi afetada, a playlist não foi encontrada ou não pertence ao usuário.
                return res.status(404).json({ message: "Playlist não encontrada ou você não tem permissão para deletá-la." });
            }

            // Se a exclusão for bem-sucedida
            res.status(200).json({ success: true, message: "Playlist deletada com sucesso." });
        });
    });
});

// Rota para REMOVER uma música de uma playlist
app.delete('/playlists/:playlistId/musicas/:musicaId', (req, res) => {
    // Rota protegida com JWT
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const { playlistId, musicaId } = req.params;
        const usuarioId = user.id;

        // Passo 1: Verificar se o usuário é o dono da playlist (segurança)
        const ownerQuery = "SELECT id FROM playlist WHERE id = ? AND usuario_id = ?";
        db.query(ownerQuery, [playlistId, usuarioId], (err, results) => {
            if (err || results.length === 0) {
                return res.status(403).json({ message: "Acesso negado." });
            }

            // Passo 2: Se for o dono, remover a música da tabela de relacionamento
            const deleteQuery = "DELETE FROM playlist_musicas WHERE playlist_id = ? AND musica_id = ?";
            db.query(deleteQuery, [playlistId, musicaId], (err, deleteResult) => {
                if (err) {
                    return res.status(500).json({ message: "Erro ao remover música." });
                }
                if (deleteResult.affectedRows === 0) {
                    return res.status(404).json({ message: "Música não encontrada nesta playlist." });
                }
                res.status(200).json({ success: true, message: "Música removida com sucesso!" });
            });
        });
    });
});


// --- NOVAS ROTAS PARA O HISTÓRICO DE REPRODUÇÃO ---

// Rota para REGISTRAR que uma música foi tocada
app.post('/historico/tocar', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const { musicaId } = req.body;
        const usuarioId = user.id;

        if (!musicaId) {
            return res.status(400).json({ message: "ID da música é obrigatório." });
        }

        const query = "INSERT INTO historico_reproducao (usuario_id, musica_id) VALUES (?, ?)";
        db.query(query, [usuarioId, musicaId], (err, result) => {
            if (err) {
                console.error("Erro ao registrar no histórico:", err);
                return res.status(500).json({ message: "Erro no servidor." });
            }
            res.status(201).json({ success: true, message: "Histórico registrado." });
        });
    });
});

// Rota para BUSCAR as músicas tocadas recentemente
app.get('/historico/recentes', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const usuarioId = user.id;

        // Query complexa para buscar as músicas recentes, sem repetições e ordenadas
        const query = `
            SELECT m.*, GROUP_CONCAT(a.nome SEPARATOR ', ') AS nome_autor
            FROM (
                SELECT musica_id, MAX(data_tocada) AS max_data
                FROM historico_reproducao
                WHERE usuario_id = ?
                GROUP BY musica_id
            ) AS ultimas_tocadas
            JOIN musica AS m ON ultimas_tocadas.musica_id = m.id
            JOIN musica_autor AS ma ON m.id = ma.musica_id
            JOIN autor AS a ON ma.autor_id = a.id
            GROUP BY m.id, ultimas_tocadas.max_data
            ORDER BY ultimas_tocadas.max_data DESC
            LIMIT 20;
        `;

        db.query(query, [usuarioId], (err, results) => {
            if (err) {
                console.error("Erro ao buscar histórico:", err);
                return res.status(500).json({ message: "Erro no servidor." });
            }
            res.json(results);
        });
    });
});

// --- FIM DAS NOVAS ROTAS ---


// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});