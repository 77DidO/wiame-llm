# Déploiement wiame-llm

## Prérequis serveur

| Composant | Minimum | Recommandé |
|-----------|---------|------------|
| OS | Ubuntu 22.04+ | Ubuntu 24.04 |
| GPU | NVIDIA 16GB VRAM | NVIDIA 24GB+ VRAM |
| RAM | 32GB | 64GB+ |
| Stockage | 50GB SSD | 100GB+ NVMe |
| Docker | 24.0+ | 25.0+ |
| NVIDIA Driver | 535+ | 550+ |

## Installation rapide

```bash
# 1. Cloner le projet
git clone https://github.com/77DidO/wiame-llm.git
cd wiame-llm

# 2. Créer le fichier .env avec ton token Hugging Face
cat > .env << 'EOF'
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxx
EOF

# 3. Lancer (télécharge le modèle ~30GB, 5-10 min)
docker compose up -d

# 4. Suivre le chargement
docker logs -f wiame-vllm
```

Quand tu vois `Uvicorn running on http://0.0.0.0:8000` → c'est prêt.

---

## Installation détaillée

### 1. NVIDIA Container Toolkit

```bash
# Ajouter le repo NVIDIA
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Configurer Docker
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Vérifier
docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi
```

### 2. Cloner le projet

```bash
cd /opt
sudo git clone https://github.com/77DidO/wiame-llm.git
sudo chown -R $USER:$USER wiame-llm
cd wiame-llm
```

### 3. Créer le fichier .env

Le fichier `.env` contient le token Hugging Face (non versionné pour sécurité).

```bash
cat > .env << 'EOF'
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxx
EOF
```

**Pour obtenir un token Hugging Face :**
1. Créer un compte sur https://huggingface.co
2. Settings → Access Tokens → New token
3. Type : Read
4. Copier le token (commence par `hf_`)

### 4. Démarrage

```bash
# Premier démarrage (télécharge le modèle ~30GB)
docker compose up -d

# Suivre le chargement du modèle
docker logs -f wiame-vllm

# Attendre "Uvicorn running on http://0.0.0.0:8000"
```

### 5. Vérification

```bash
# API disponible ?
curl http://localhost:8000/v1/models

# Test chat
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-14B-AWQ",
    "messages": [{"role": "user", "content": "Dis bonjour en français"}]
  }'
```

## Service systemd (optionnel)

```bash
sudo nano /etc/systemd/system/wiame-llm.service
```

```ini
[Unit]
Description=Wiame LLM Server
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/wiame-llm
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable wiame-llm
sudo systemctl start wiame-llm
```

## Mise à jour

```bash
cd /opt/wiame-llm
git pull

# Si modification du MCP server
docker compose build mcp-server

# Redémarrer
docker compose down && docker compose up -d
```

## Monitoring

### Logs

```bash
# vLLM
docker logs -f wiame-vllm

# MCP
docker logs -f wiame-mcp

# Tous
docker compose logs -f
```

### Métriques GPU

```bash
# Dans le container
docker exec wiame-vllm nvidia-smi

# Monitoring continu
watch -n 1 'docker exec wiame-vllm nvidia-smi'
```

### Health checks

```bash
# vLLM
curl -s http://localhost:8000/health | jq

# MCP (via tool)
# Utiliser le tool 'health' depuis un client MCP
```

## Dépannage

### vLLM ne démarre pas

```bash
# Vérifier les logs
docker logs wiame-vllm 2>&1 | tail -100

# Causes communes :
# - HF_TOKEN invalide
# - Pas assez de VRAM
# - Driver NVIDIA trop ancien
```

### Modèle trop lent

```bash
# Vérifier utilisation GPU
docker exec wiame-vllm nvidia-smi

# Si GPU à 0%, vérifier que CUDA est détecté
docker exec wiame-vllm python -c "import torch; print(torch.cuda.is_available())"
```

### MCP ne répond pas

```bash
# Vérifier que vLLM est healthy
curl http://localhost:8000/health

# Reconstruire MCP
docker compose build mcp-server --no-cache
docker compose up -d mcp-server
```

## Outils d'administration serveur

### Portainer (gestion Docker via web)

```bash
# Installer Portainer CE
docker volume create portainer_data

docker run -d -p 8000:8000 -p 9443:9443 \
  --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

Accès : `https://<IP_SERVEUR>:9443` (HTTPS auto-signé).
Permet de gérer containers, logs, volumes, réseaux depuis un navigateur.

### Cockpit (administration serveur)

```bash
sudo apt install cockpit -y
sudo systemctl enable --now cockpit.socket
```

Accès : `https://<IP_SERVEUR>:9090` (login = compte Linux du serveur).
Permet de surveiller CPU, RAM, stockage, réseau et d'accéder au terminal.

**Optionnel** — historique des métriques (nécessite accès internet pour apt) :
```bash
sudo apt install cockpit-pcp -y
```

## Sauvegarde

```bash
# Le modèle est téléchargé dans un volume Docker
# Pour le sauvegarder localement :
docker run --rm -v wiame-llm_huggingface-cache:/data -v $(pwd)/backup:/backup \
  alpine tar czf /backup/hf-cache.tar.gz -C /data .
```
