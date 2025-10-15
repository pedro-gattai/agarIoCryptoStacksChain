# 🔧 Deploy Fix - Ações Manuais Necessárias

Este arquivo contém as configurações manuais que você precisa fazer nos dashboards do Cloudflare Pages e Railway para completar o deploy.

---

## ☁️ CLOUDFLARE PAGES - Ajustar Output Directory

### Problema:
Build completa com sucesso, mas Cloudflare procura arquivos em `dist/` quando estão em `client/dist/`

### Solução (2 minutos):

1. Acesse: https://dash.cloudflare.com
2. Workers & Pages → Seu projeto (agarcrypto)
3. **Settings** → **Builds & deployments**
4. Na seção **Build configurations**:
   - **Build output directory**: Mudar de `dist` para `client/dist`
5. Clique em **Save**
6. Volte para **Deployments** → Clique em **Retry deployment** no último build

**Resultado esperado**: Build deve completar e fazer deploy com sucesso! ✅

---

## 🚂 RAILWAY - Configurar Serviços Corretos

### Problema:
Railway auto-detectou 3 serviços do monorepo, mas você precisa de apenas 1 Service + 1 Database

### Situação Atual (ERRADA):
```
├── @agar-crypto/server  ❌ (tentando usar server/railway.json que não existe)
├── @agar-crypto/database ❌ (não é um serviço, só schemas Prisma)
└── client               ❌ (vai para Cloudflare Pages)
```

### Situação Ideal (CORRETA):
```
├── Backend Service  ✅ (Node.js aplicação)
└── PostgreSQL Database ✅ (Database nativo do Railway)
```

---

### Opção A: Reconfigurar do Zero (RECOMENDADO - 5 minutos)

Esta é a opção mais limpa e garantida:

#### Passo 1: Deletar serviços existentes

1. Acesse seu projeto no Railway
2. Para cada um dos 3 serviços (`@agar-crypto/server`, `@agar-crypto/database`, `client`):
   - Clique no card do serviço
   - **Settings** (aba lateral)
   - Role até o final → **Danger Zone**
   - **Delete Service from All Environments**
   - Confirme digitando o nome do serviço

#### Passo 2: Criar novo serviço Backend

1. No projeto Railway (agora vazio), clique **+ New**
2. Selecione **GitHub Repo**
3. Escolha: `pedro-gattai/agarIoCryptoStacksChain`
4. Railway vai começar a fazer deploy automaticamente
5. **IMPORTANTE**: Vá em **Settings** do novo serviço e configure:

**Configurações essenciais:**
- **Service Name**: `backend` ou `server`
- **Root Directory**: Deixe vazio (raiz do projeto)
- **Build Command**: Railway usará o `railway.json` automaticamente
- **Start Command**: Railway usará o `railway.json` automaticamente

#### Passo 3: Adicionar PostgreSQL Database

1. No projeto, clique **+ New**
2. Selecione **Database** → **Add PostgreSQL**
3. Railway cria o database automaticamente
4. Vai automaticamente criar a variável `DATABASE_URL` e injetá-la no serviço backend

#### Passo 4: Adicionar Variáveis de Ambiente

No serviço **backend**, vá em **Variables** e adicione:

```bash
# DATABASE_URL será injetado automaticamente pelo PostgreSQL
# Adicione manualmente estas:

STACKS_NETWORK=testnet
STACKS_API_URL=https://api.testnet.hiro.so
STACKS_CONTRACT_ADDRESS=ST1ZFTT97Z1BBTD5Y2JK7N1Y3MJ9SYCDN1F4803GZ
STACKS_CONTRACT_NAME=game-pool

PORT=3000
NODE_ENV=production

# ⚠️ Atualizar depois que Cloudflare gerar a URL
CLIENT_URL=https://agarcrypto.pages.dev

# Gerar com: openssl rand -base64 32
JWT_SECRET=GENERATE_A_STRONG_RANDOM_KEY_HERE

DEFAULT_ENTRY_FEE=0.001
MAX_PLAYERS_PER_GAME=20
HOUSE_FEE_PERCENTAGE=20

DEMO_MODE=false
```

**Para gerar JWT_SECRET:**
```bash
openssl rand -base64 32
```

#### Passo 5: Trigger Deploy

Railway deve fazer deploy automaticamente. Se não:
1. **Deployments** → **Deploy**
2. Aguarde ~5-10 minutos

---

### Opção B: Ajustar Serviços Existentes (Mais Rápido, Menos Garantido)

Se preferir não deletar, tente:

1. **Deletar apenas 2 serviços indesejados**:
   - Deletar `@agar-crypto/database`
   - Deletar `client`
   - **Manter** `@agar-crypto/server`

2. **Configurar o serviço que sobrou** (`@agar-crypto/server`):
   - Settings → **Root Directory**: deixar vazio
   - Settings → **Build Command**: deixar vazio (usa railway.json)
   - Settings → **Start Command**: deixar vazio (usa railway.json)

3. **Adicionar PostgreSQL** (mesmo processo da Opção A, Passo 3)

4. **Adicionar variáveis** (mesmo processo da Opção A, Passo 4)

---

## ✅ Verificação Final

Após fazer as configurações:

### Cloudflare Pages:
```bash
curl https://agarcrypto.pages.dev
```
Deve retornar a página HTML do seu app

### Railway Backend:
```bash
curl https://[seu-projeto].up.railway.app/health
```
Deve retornar: `{"status":"ok"}`

### Integração:
1. Abra https://agarcrypto.pages.dev
2. Abra DevTools (F12) → Console
3. Procure por: `📝 App Configuration`
4. Verifique se `serverUrl` aponta para sua URL Railway

---

## 📞 Troubleshooting

### "Build ainda falhando no Railway"
- Certifique-se que deletou os serviços antigos
- Verifique se o novo serviço tem Root Directory vazio
- Veja os logs em Deployments → Build Logs

### "Cloudflare ainda procurando dist/"
- Limpe o cache: Settings → Builds → Clear cache
- Retry deployment

### "DATABASE_URL não aparece"
- Certifique-se que criou o PostgreSQL Database
- Vá em Variables do backend service e verifique se aparece `${{Postgres.DATABASE_URL}}`
- Se não aparecer, adicione manualmente: `DATABASE_URL=${{Postgres.DATABASE_URL}}`

---

## 🎯 Resumo do que Mudou no Código

1. **package.json**: Adicionado script `build:backend` que builda apenas shared + server (sem client)
2. **railway.json**: Atualizado para usar `npm run build:backend`
3. **.railwayignore**: Melhorado para ignorar explicitamente client/, contracts/, database/

Estas mudanças garantem que Railway **só builda o backend**, resolvendo o erro TypeScript do client.
