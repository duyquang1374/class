"""Root entrypoint for Render and cloud deployment."""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
hub_dir = ROOT / 'classroom-hub'
sys.path.insert(0, str(hub_dir))
os.chdir(str(hub_dir))

import server

if __name__ == '__main__':
    server.main()
