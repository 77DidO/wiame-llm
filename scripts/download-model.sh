#!/bin/bash
# Download Qwen3-14B-AWQ model for offline use

set -e

MODEL_NAME="Qwen/Qwen3-14B-AWQ"
MODELS_DIR="./models"

echo "Downloading $MODEL_NAME..."

# Requires huggingface-cli installed: pip install huggingface_hub
huggingface-cli download "$MODEL_NAME" --local-dir "$MODELS_DIR/Qwen3-14B-AWQ"

echo "Model downloaded to $MODELS_DIR/Qwen3-14B-AWQ"
echo ""
echo "Update docker-compose.yml to use local model:"
echo "  --model /models/Qwen3-14B-AWQ"
