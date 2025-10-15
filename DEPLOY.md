# 🚀 Guia de Deploy - AgarCrypto

**Deploy em Produção usando Testnet (Recomendado para Hackathon)**

Este projeto está configurado para usar **Stacks Testnet** mesmo em produção. Isso significa:
- ✅ **Grátis** - Não precisa de STX real
- ✅ **Seguro** - Perfeito para demos e testes
- ✅ **Funcional** - Todas as features blockchain funcionam
- ✅ **Fácil** - Usuários podem pegar STX testnet de graça no faucet

---

## 📋 Pré-requisitos

- ✅ Conta no [Railway](https://railway.app)
- ✅ Conta no [Cloudflare](https://dash.cloudflare.com)
- ✅ Código no GitHub
- ✅ 15 minutos de tempo

**Custo Total Mensal**: ~$5-10 USD (Railway) + $0 (Cloudflare Pages)

---

# PARTE 1: Deploy do Backend (Railway)

## 🚂 1. Criar Projeto Railway

### 1.1. Setup Inicial

1. Acesse **https://railway.app** e faça login com GitHub
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Escolha: `pedro-gattai/agarIoCryptoStacksChain`

### 1.2. ⚠️ IMPORTANTE: Remover Serviços Auto-Detectados

**Railway detecta automaticamente monorepos** e pode criar 3 serviços:
- `@agar-crypto/database` ❌ (não é necessário)
- `client` ❌ (vai para Cloudflare Pages)
- `@agar-crypto/server` ✅ (mantenha este)

**Ação necessária:**

1. **Deletar serviço "client"**:
   - Clique no card do serviço "client"
   - Settings → Danger → **"Delete Service"**
   - Confirme a remoção

2. **Deletar serviço "@agar-crypto/database"** (se existir):
   - Clique no card do serviço "@agar-crypto/database"
   - Settings → Danger → **"Delete Service"**
   - Confirme a remoção

3. **Manter apenas "@agar-crypto/server"**:
   - Este é o único serviço de aplicação que você precisa
   - Não delete este!

**Resultado esperado:** Apenas 1 serviço de aplicação no Railway.

### 1.3. Adicionar PostgreSQL Database

1. No projeto Railway, clique em **"+ New"**
2. Selecione **"Database"** → **"PostgreSQL"**
3. Railway cria automaticamente
4. A `DATABASE_URL` aparece em "Variables"

---

## 🔧 2. Configurar Backend

### 2.1. Build Configuration

Clique no serviço do backend (`@agar-crypto/server`) → **Settings** → Configure:

**Root Directory**: `server`

**Build Command** (ou usar `railway.json` - veja abaixo):
```bash
cd ../shared && npm install && npm run build && cd ../server && npm install && npm run build && npx prisma generate && npx prisma migrate deploy
```

**Start Command**:
```bash
node dist/index.js
```

**Watch Paths**: `server/**`, `shared/**`

**💡 Dica:** O projeto já inclui `server/railway.json` com essas configurações. Railway detecta automaticamente e usa essas configurações, então você não precisa configurar manualmente no dashboard (a menos que queira sobrescrever).

### 2.2. Environment Variables

No Railway, vá em **"Variables"** e adicione:

```bash
# ========================================
# DATABASE (Railway auto-injeta)
# ========================================
DATABASE_URL=${{Postgres.DATABASE_URL}}

# ========================================
# STACKS BLOCKCHAIN - TESTNET (PRODUÇÃO)
# ========================================
# ⚠️ IMPORTANTE: Mantendo TESTNET mesmo em produção
# Perfeito para hackathon - grátis e funcional!
STACKS_NETWORK=testnet
STACKS_API_URL=https://api.testnet.hiro.so
STACKS_CONTRACT_ADDRESS=ST1ZFTT97Z1BBTD5Y2JK7N1Y3MJ9SYCDN1F4803GZ
STACKS_CONTRACT_NAME=game-pool

# ========================================
# SERVER CONFIG
# ========================================
PORT=3000
NODE_ENV=production

# ⚠️ ATUALIZAR depois que Cloudflare Pages gerar a URL
CLIENT_URL=https://agarcrypto.pages.dev

# ========================================
# SEGURANÇA
# ========================================
# Gerar com: openssl rand -base64 32
JWT_SECRET=GENERATE_A_STRONG_RANDOM_KEY_HERE

# ========================================
# GAME CONFIG
# ========================================
DEFAULT_ENTRY_FEE=0.001
MAX_PLAYERS_PER_GAME=20
HOUSE_FEE_PERCENTAGE=20

# ========================================
# DEMO MODE
# ========================================
DEMO_MODE=false
```

**📝 Como gerar JWT_SECRET:**
```bash
openssl rand -base64 32
```

### 2.3. Deploy

1. Railway faz deploy automaticamente
2. Aguarde 5-10 minutos (primeira vez)
3. Anote a **URL do backend**: `https://[seu-projeto].up.railway.app`

### 2.4. Testar

```bash
curl https://[seu-projeto].up.railway.app/health
```

Deve retornar: `{"status":"ok"}`

---

# PARTE 2: Deploy do Frontend (Cloudflare Pages)

## ☁️ 3. Setup Cloudflare Pages

### 3.1. Criar Projeto

1. Acesse **https://dash.cloudflare.com**
2. **Workers & Pages** → **Create** → **Pages**
3. **Connect to Git** → Autorize GitHub
4. Selecione: `pedro-gattai/agarIoCryptoStacksChain`

### 3.2. Build Configuration

**Project name**: `agarcrypto`

**Production branch**: `main`

**Build command**:
```bash
cd shared && npm install && npm run build && cd ../client && npm install && npm run build
```

**Build output directory**: `client/dist`

**Root directory**: `/` (deixe vazio)

### 3.3. Environment Variables

Adicione estas variáveis:

```bash
# Node version
NODE_VERSION=18.17.0

# ⚠️ IMPORTANTE: URL do seu backend Railway
VITE_SERVER_URL=https://[seu-projeto].up.railway.app

# ⚠️ IMPORTANTE: Mantendo TESTNET mesmo em produção
VITE_STACKS_NETWORK=testnet

# Feature flags
VITE_DEMO_MODE=false
VITE_BYPASS_BLOCKCHAIN=false
```

**🔥 CRITICAL:** Substitua `[seu-projeto]` pela URL real do Railway!

### 3.4. Deploy

1. Clique **"Save and Deploy"**
2. Aguarde 5-10 minutos
3. URL gerada: `https://agarcrypto.pages.dev`

---

## 🔗 4. Conectar Frontend e Backend

### 4.1. Atualizar CLIENT_URL no Railway

1. Volte no **Railway**
2. Vá em **Variables** do backend
3. Atualize:
   ```
   CLIENT_URL=https://agarcrypto.pages.dev
   ```
4. Railway redeploya automaticamente

### 4.2. Testar Conexão

Abra `https://agarcrypto.pages.dev` e:
1. Abra o DevTools Console (F12)
2. Procure por: `📝 App Configuration`
3. Verifique se `serverUrl` está correto

---

# PARTE 3: Testnet Setup

## 🧪 5. Usar Stacks Testnet

### 5.1. Explicar para Usuários

**Importante:** Seu app usa **Stacks Testnet** (não mainnet).

**Para os usuários:**

1. **Instalar Wallet**:
   - Hiro Wallet: https://wallet.hiro.so
   - Xverse: https://www.xverse.app

2. **Mudar para Testnet**:
   - Hiro: Settings → Network → Testnet
   - Xverse: Settings → Network → Testnet

3. **Pegar STX Grátis**:
   - Faucet: https://explorer.hiro.so/sandbox/faucet?chain=testnet
   - Cole seu endereço Stacks
   - Recebe 500 STX testnet de graça!

### 5.2. Adicionar Aviso no Site

Recomendo adicionar um banner no site:

```
⚠️ TESTNET DEMO - Este app usa Stacks Testnet
Não precisa de STX real! Pegue STX testnet grátis no faucet
```

---

# PARTE 4: Monitoramento

## 📊 6. Verificar Deploy

### 6.1. Checklist

**Backend (Railway):**
- [ ] `/health` retorna OK
- [ ] Logs não mostram erros
- [ ] Database conectado
- [ ] WebSocket funcionando

**Frontend (Cloudflare):**
- [ ] Site carrega
- [ ] Console não mostra erros
- [ ] Conecta com backend

**Integração:**
- [ ] Wallet conecta (testnet)
- [ ] Socket.IO conecta
- [ ] Pode entrar em lobby

### 6.2. Ver Logs

**Railway:**
```bash
railway logs --project [seu-projeto] --service backend
```

Ou no dashboard: **Deployments** → **View Logs**

**Cloudflare:**
- Dashboard → Workers & Pages → agarcrypto
- **Deployments** → **Build log**

---

# PARTE 5: Updates & Manutenção

## 🔄 7. Fazer Updates

### 7.1. Deploy Automático

Ambos fazem deploy automático quando você faz push:

```bash
git add .
git commit -m "feat: nova feature"
git push origin main
```

- **Cloudflare**: Deploy automático do frontend
- **Railway**: Deploy automático do backend

### 7.2. Rollback

**Cloudflare:**
1. Deployments → Selecione deploy anterior
2. "Rollback to this deployment"

**Railway:**
1. Deployments → Três pontos no deploy anterior
2. "Redeploy"

---

# PARTE 6: Custom Domain (Opcional)

## 🌐 8. Adicionar Domínio Próprio

### 8.1. Cloudflare Pages

1. **Custom domains** → **Set up a custom domain**
2. Digite: `agarcrypto.com` (seu domínio)
3. Cloudflare configura DNS automaticamente
4. SSL grátis incluído!

### 8.2. Atualizar CLIENT_URL

No Railway, atualizar:
```
CLIENT_URL=https://agarcrypto.com
```

---

# PARTE 7: Troubleshooting

## 🔧 9. Problemas Comuns

### "Cannot connect to server"

**Causa:** URL do backend errada

**Solução:**
1. Verificar `VITE_SERVER_URL` no Cloudflare
2. Verificar `CLIENT_URL` no Railway
3. Ambos devem corresponder

### "WebSocket connection failed"

**Causa:** CORS ou WebSocket não configurado

**Solução:** Backend já tem isso, mas verifique em `server/src/index.ts`:
```typescript
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true
  },
  transports: ['websocket', 'polling']
});
```

### "Wallet showing mainnet not testnet"

**Causa:** Usuário não mudou wallet para testnet

**Solução:** Instruir usuário:
1. Abrir wallet settings
2. Mudar Network para "Testnet"
3. Pegar STX grátis no faucet

### "Build failed - Module not found: shared"

**Causa:** Shared package não buildou

**Solução:** Build command deve incluir:
```bash
cd ../shared && npm install && npm run build && cd ../client
```

### "Railway detectou 3 serviços (client, database, server)"

**Causa:** Railway auto-detecta monorepos e cria serviços para cada workspace

**Solução:**
1. Deletar manualmente os serviços "client" e "@agar-crypto/database"
2. Manter apenas "@agar-crypto/server"
3. Adicionar PostgreSQL como Database Service (não workspace)
4. Configurar Root Directory para `server`

**Por que isso acontece?**
- Railway detecta o `package.json` na raiz com workspaces
- Tenta criar serviços para cada package
- Mas você quer apenas o backend no Railway
- Frontend vai para Cloudflare Pages (grátis)

---

# PARTE 8: Migração Futura para Mainnet

## 🚀 10. Quando Migrar para Mainnet

**Mantenha testnet até:**
- ✅ Hackathon terminar
- ✅ Todos os bugs corrigidos
- ✅ Smart contract auditado
- ✅ Pronto para dinheiro real

**Para migrar:**

1. **Deploy novo smart contract na mainnet**:
```bash
cd contracts
clarinet deploy --mainnet
```

2. **Atualizar variáveis de ambiente**:

**Railway:**
```bash
STACKS_NETWORK=mainnet
STACKS_API_URL=https://api.mainnet.hiro.so
STACKS_CONTRACT_ADDRESS=[seu novo endereço mainnet]
```

**Cloudflare:**
```bash
VITE_STACKS_NETWORK=mainnet
```

3. **Avisar usuários!** Agora é dinheiro real.

---

# RESUMO RÁPIDO

## ✅ Checklist Completo

**Configuração Inicial (uma vez):**
- [ ] Criar projeto Railway
- [ ] ⚠️ Deletar serviços indesejados (client e @agar-crypto/database)
- [ ] Manter apenas serviço @agar-crypto/server
- [ ] Adicionar PostgreSQL Database no Railway
- [ ] Configurar Root Directory do server para `server`
- [ ] Configurar variáveis de ambiente Railway
- [ ] Criar projeto Cloudflare Pages
- [ ] Configurar variáveis de ambiente Cloudflare
- [ ] Verificar builds completaram

**URLs Importantes:**
- Backend: `https://[projeto].up.railway.app`
- Frontend: `https://agarcrypto.pages.dev`
- Faucet Testnet: https://explorer.hiro.so/sandbox/faucet?chain=testnet

**Variáveis Críticas:**
```bash
# Railway
DATABASE_URL=[auto]
STACKS_NETWORK=testnet
CLIENT_URL=https://agarcrypto.pages.dev
JWT_SECRET=[gerar]

# Cloudflare
VITE_SERVER_URL=https://[projeto].up.railway.app
VITE_STACKS_NETWORK=testnet
```

---

# 📞 Links Úteis

- **Railway Docs**: https://docs.railway.app
- **Cloudflare Pages**: https://developers.cloudflare.com/pages
- **Stacks Testnet Explorer**: https://explorer.hiro.so/?chain=testnet
- **Testnet Faucet**: https://explorer.hiro.so/sandbox/faucet?chain=testnet
- **Hiro Wallet**: https://wallet.hiro.so

---

**🎉 Pronto! Seu projeto estará rodando em produção com Testnet!**

**Vantagens de usar Testnet em produção:**
- ✅ Grátis (sem custos de STX)
- ✅ Seguro (sem risco financeiro)
- ✅ Funcional (todas as features blockchain)
- ✅ Perfeito para demos de hackathon
- ✅ Fácil para usuários testarem

**Quando migrar para Mainnet:**
- Após hackathon
- Após auditoria de segurança
- Quando quiser aceitar dinheiro real
