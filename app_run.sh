#!/bin/bash
cd /home/achira363/Downloads/DataEN_Final-main/DataEN_Final-main/backend
source ../.venv/bin/activate 2>/dev/null || true
python app.py > app.log 2>&1 &
