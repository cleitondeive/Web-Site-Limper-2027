# Guia de Deploy em Produção — Limper MT (Hostinger VPS + Easypanel + PostgreSQL + Registro.br)

Este projeto já está preparado com **backend Express + banco de dados PostgreSQL 16** com **migrações idempotentes (zero perda de dados)**, pronto para atualização automática via **GitHub → Easypanel** sem jamais apagar produtos, pedidos, clientes, orçamentos ou configurações cadastradas no painel administrativo.

---

## Como a Proteção Zero-Data-Loss Funciona

1. **Banco isolado em container separado**: o PostgreSQL roda no seu próprio serviço no Easypanel com volume persistente em disco.
2. **Atualização via GitHub mexe só no App**: quando você faz `git push` para o GitHub, o Easypanel reconstrói apenas o container da aplicação (`limper-app`). O container do PostgreSQL (`limper-db`) **não é reiniciado nem apagado**.
3. **Migração não-destrutiva + Seed Único**:
   - Na **1ª inicialização** em banco vazio, o servidor cria todas as 16 tabelas (`CREATE TABLE IF NOT EXISTS`) e popula o catálogo inicial Quimiprol, gravando a marcação `initial_seed_completed` na tabela `app_meta`.
   - Em **todas as próximas atualizações**, o servidor detecta `initial_seed_completed` e **nunca sobrescreve nem reseta** nenhum dado salvo na área administrativa.

---

## Passo 1 — Criar o Banco de Dados PostgreSQL no Easypanel

1. Acesse seu Easypanel na VPS da Hostinger.
2. Crie um projeto chamado **`limper-mt`**.
3. Dentro do projeto, clique em **+ Service → Postgres** (ou **PostgreSQL**).
4. Configure:
   - **Name**: `limper-db`
   - **Database Name**: `limpermt`
   - **Username**: `limper_admin`
   - **Password**: gere uma senha forte (ex.: 24 caracteres)
5. Clique em **Create** e aguarde ficar verde (**Running**).
6. Na aba **Overview / Connection** do serviço `limper-db`, copie a **Internal Connection URL**, que terá o formato:
   ```text
   postgres://limper_admin:SUA_SENHA_FORTE@limper-mt_limper-db:5432/limpermt
   ```
   *(Use sempre o **Internal Host** mostrado pelo Easypanel para tráfego 100% privado dentro da sua VPS!)*

---

## Passo 2 — Criar o Serviço do Site com Auto-Deploy do GitHub

1. No mesmo projeto `limper-mt` no Easypanel, clique em **+ Service → App**.
2. Nomeie como **`limper-app`**.
3. Na aba **Source**:
   - Escolha **GitHub** e conecte seu repositório.
   - Selecione a branch principal (ex.: `main`).
   - Em **Build**, selecione **Dockerfile** (o arquivo `Dockerfile` na raiz do projeto já está pronto!).
   - Ative **Auto Deploy** (ou configure o Webhook do GitHub exibido pelo Easypanel). Assim, todo `git push` atualiza o site automaticamente!
4. Na aba **Environment**, adicione as variáveis abaixo:
   ```env
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgres://limper_admin:SUA_SENHA_FORTE@limper-mt_limper-db:5432/limpermt
   DATABASE_SSL=false
   ADMIN_MASTER_PASSWORD=ESCOLHA_UMA_SENHA_MASTER_FORTE
   SESSION_SECRET=GERE_UMA_CHAVE_ALEATORIA_COM_32_OU_MAIS_CARACTERES
   APP_URL=https://limpermt.com.br
   ```
   *(Observação: se você não definir `ADMIN_MASTER_PASSWORD`, na 1ª abertura de `https://limpermt.com.br/#admin` o sistema exibirá a tela segura de configuração inicial para você criar a senha Master diretamente no PostgreSQL.)*
5. Clique em **Save** e depois em **Deploy**.
6. Verifique o endpoint de saúde: `https://limpermt.com.br/api/health` — deve retornar `"engine": "postgresql"` e `"connected": true`.

---

## Passo 3 — Configurar o Domínio `limpermt.com.br` no Registro.br + SSL

1. No painel do **Registro.br**, abra a zona DNS de **`limpermt.com.br`** e adicione/atualize:
   - Tipo **`A`** | Nome: `@` (ou em branco) | Dados: `179.66.141.32`
   - Tipo **`A`** | Nome: `www` | Dados: `179.66.141.32`
2. No **Easypanel**, abra o serviço **`limper-app` → Domains**:
   - Adicione **`limpermt.com.br`** (Porta interna: `3000`, **HTTPS / Let's Encrypt: Ativado**).
   - Adicione **`www.limpermt.com.br`** (Porta interna: `3000`, **HTTPS: Ativado**).
3. Aguarde a propagação do DNS (normalmente 5 a 30 minutos). O certificado SSL HTTPS será emitido e renovado automaticamente.

---

## Passo 4 — Fluxo de Atualizações Futuras (Sem Perder Dados)

Sempre que quiser publicar uma melhoria no site:
1. Envie o código para o GitHub (`git push origin main`).
2. O Easypanel detecta o push, constrói a nova imagem Docker do `limper-app` e sobe a nova versão automaticamente.
3. Todos os dados cadastrados no painel (`produtos`, `categorias`, `banners`, `pedidos`, `cupons`, `kits`, `orçamentos de vendedores`, `metas`, `usuários` e `backups`) permanecem 100% intactos no PostgreSQL da sua VPS.

---

## Dica Extra de Segurança na VPS

- No serviço **`limper-db`** do Easypanel, mantenha o **Backup Automático do PostgreSQL** ativado (ex.: diário às 03:00), além dos snapshots internos disponíveis no painel **Acesso & Segurança** da Limper MT.
- Troque a senha do painel administrativo se um dia suspeitar de acesso indevido — basta alterar `ADMIN_MASTER_PASSWORD` no Easypanel ou atualizar em **Usuários & Acessos**.
