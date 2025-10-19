-- =====================================================================
-- SCRIPT COMPLETO DE ESTRUTURA DO BANCO DE DADOS ASTER
-- Descrição: Este script cria todas as tabelas, views, índices e
--            configura o controle de acesso para a aplicação Aster.
-- =====================================================================

-- =====================================================================
-- SEÇÃO 1: ESTRUTURA DAS TABELAS
-- =====================================================================

CREATE TABLE `usuario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome_usuario` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `senha` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url_avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sexo` enum('masculino','feminino','nao-informar') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_nascimento` date DEFAULT NULL,
  `pais` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `consentimento_marketing` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `autor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pais_origem` varchar(35) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uc_autor_nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `genero` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uc_genero_nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `humor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `musica` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `duracao` time NOT NULL,
  `ano_lancamento` int DEFAULT NULL,
  `url_musica` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url_capa` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `playlist` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `nome` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url_capa` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_criacao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `playlist_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `historico_reproducao` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `musica_id` int NOT NULL,
  `data_tocada` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_usuario_data` (`usuario_id`,`data_tocada` DESC),
  KEY `fk_historico_musica` (`musica_id`),
  CONSTRAINT `fk_historico_musica` FOREIGN KEY (`musica_id`) REFERENCES `musica` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_historico_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `musica_autor` (
  `musica_id` int NOT NULL,
  `autor_id` int NOT NULL,
  PRIMARY KEY (`musica_id`,`autor_id`),
  KEY `autor_id` (`autor_id`),
  CONSTRAINT `musica_autor_ibfk_1` FOREIGN KEY (`musica_id`) REFERENCES `musica` (`id`) ON DELETE CASCADE,
  CONSTRAINT `musica_autor_ibfk_2` FOREIGN KEY (`autor_id`) REFERENCES `autor` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `musica_genero` (
  `musica_id` int NOT NULL,
  `genero_id` int NOT NULL,
  PRIMARY KEY (`musica_id`,`genero_id`),
  KEY `genero_id` (`genero_id`),
  CONSTRAINT `musica_genero_ibfk_1` FOREIGN KEY (`musica_id`) REFERENCES `musica` (`id`) ON DELETE CASCADE,
  CONSTRAINT `musica_genero_ibfk_2` FOREIGN KEY (`genero_id`) REFERENCES `genero` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `musica_humor` (
  `musica_id` int NOT NULL,
  `humor_id` int NOT NULL,
  PRIMARY KEY (`musica_id`,`humor_id`),
  KEY `humor_id` (`humor_id`),
  CONSTRAINT `musica_humor_ibfk_1` FOREIGN KEY (`musica_id`) REFERENCES `musica` (`id`) ON DELETE CASCADE,
  CONSTRAINT `musica_humor_ibfk_2` FOREIGN KEY (`humor_id`) REFERENCES `humor` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `musicas_curtidas` (
  `usuario_id` int NOT NULL,
  `musica_id` int NOT NULL,
  `data_curtida` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`usuario_id`,`musica_id`),
  KEY `musica_id` (`musica_id`),
  CONSTRAINT `musicas_curtidas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE,
  CONSTRAINT `musicas_curtidas_ibfk_2` FOREIGN KEY (`musica_id`) REFERENCES `musica` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `playlist_musicas` (
  `playlist_id` int NOT NULL,
  `musica_id` int NOT NULL,
  `ordem` int DEFAULT NULL,
  PRIMARY KEY (`playlist_id`,`musica_id`),
  KEY `musica_id` (`musica_id`),
  CONSTRAINT `playlist_musicas_ibfk_1` FOREIGN KEY (`playlist_id`) REFERENCES `playlist` (`id`) ON DELETE CASCADE,
  CONSTRAINT `playlist_musicas_ibfk_2` FOREIGN KEY (`musica_id`) REFERENCES `musica` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- SEÇÃO 2: VIEWS (VISÕES)
-- =====================================================================

-- VIEW 1: Músicas com detalhes agregados (autores e gêneros)
CREATE OR REPLACE VIEW `vw_musicas_detalhadas` AS
SELECT 
    m.id,
    m.titulo,
    m.duracao,
    m.ano_lancamento,
    m.url_musica,
    m.url_capa,
    (SELECT GROUP_CONCAT(a.nome SEPARATOR ', ') 
     FROM autor a
     JOIN musica_autor ma ON a.id = ma.autor_id
     WHERE ma.musica_id = m.id) AS autores,
    (SELECT GROUP_CONCAT(g.nome SEPARATOR ', ') 
     FROM genero g
     JOIN musica_genero mg ON g.id = mg.genero_id
     WHERE mg.musica_id = m.id) AS generos
FROM 
    musica m;

-- VIEW 2: Playlists com informações do criador
CREATE OR REPLACE VIEW `vw_playlists_usuarios` AS
SELECT
    p.id AS playlist_id,
    p.nome AS nome_playlist,
    p.descricao,
    p.url_capa,
    p.data_criacao,
    u.id AS usuario_id,
    u.nome_usuario
FROM
    playlist p
JOIN
    usuario u ON p.usuario_id = u.id;


-- =====================================================================
-- SEÇÃO 3: ÍNDICES (INDEXES)
-- =====================================================================

-- Índices FULLTEXT para otimização da busca por texto
ALTER TABLE musica ADD FULLTEXT INDEX idx_fulltext_titulo (titulo);
ALTER TABLE autor ADD FULLTEXT INDEX idx_fulltext_nome_autor (nome);

-- Índices em Chaves Estrangeiras para acelerar JOINs
CREATE INDEX idx_pm_musica_id ON playlist_musicas(musica_id);
CREATE INDEX idx_mc_musica_id ON musicas_curtidas(musica_id);
CREATE INDEX idx_hr_musica_id ON historico_reproducao(musica_id);


-- =====================================================================
-- SEÇÃO 4: CONTROLE DE ACESSO (USUÁRIO DA APLICAÇÃO)
-- =====================================================================

-- 1. Cria o usuário específico para a aplicação.

CREATE USER IF NOT EXISTS 'aster_app'@'localhost' IDENTIFIED BY 'uma_senha_muito_forte_aqui';

-- 2. Concede as permissões essenciais de manipulação de dados.
GRANT SELECT, INSERT, UPDATE, DELETE ON aster.* TO 'aster_app'@'localhost';

-- 3. Aplica as novas permissões.
FLUSH PRIVILEGES;

-- =====================================================================
-- FIM DO SCRIPT
-- =====================================================================