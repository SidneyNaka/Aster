# Estrutura do Banco de Dados Aster

Este diretório contém o script para a criação completa da estrutura do banco de dados da aplicação Aster.

## Como Usar (Para um Novo Ambiente)

O arquivo `schema.sql` contém todos os comandos `CREATE TABLE`, `CREATE VIEW` e `CREATE INDEX` necessários para configurar um banco de dados limpo.

### Passos para Configuração:

1.  Certifique-se de que o MySQL está em execução.
2.  Crie o banco de dados `aster` com o seguinte comando no seu cliente MySQL:
    ```sql
    CREATE DATABASE IF NOT EXISTS aster;
    ```
3.  Selecione o banco de dados recém-criado:
    ```sql
    USE aster;
    ```
4.  Execute o conteúdo das seções **1, 2 e 3** do arquivo `schema.sql` para criar todas as tabelas e estruturas.

## Configuração de Segurança (Passo Final)

O projeto deve usar um usuário de banco de dados dedicado para segurança.

1.  Execute a **Seção 4** do arquivo `schema.sql`, **substituindo `'uma_senha_muito_forte_aqui'`** por uma senha segura de sua escolha.

2.  Atualize o arquivo `backend/server.js` para usar essas novas credenciais:
    ```javascript
    const db = mysql.createConnection({
      host: 'localhost',
      user: 'aster_app',
      password: 'a_senha_forte_que_voce_criou',
      database: 'aster'
    });
    ```