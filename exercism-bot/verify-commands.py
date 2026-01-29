"""Fetch and print global slash commands registered with Discord for this app.

Use after deploy-commands.py to confirm what Discord actually has. Requires
DISCORD_TOKEN and CLIENT_ID in .env.

Usage:
  python3 verify-commands.py
"""

import json
import os
import urllib.error
import urllib.request

from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")

if not TOKEN or not CLIENT_ID:
    print("DISCORD_TOKEN and CLIENT_ID required in .env")
    exit(1)

url = f"https://discord.com/api/v10/applications/{CLIENT_ID}/commands"
req = urllib.request.Request(url, method="GET")
req.add_header("Authorization", f"Bot {TOKEN}")
req.add_header("Content-Type", "application/json")
req.add_header("User-Agent", "ExercismBot/1.0 verify-commands")

try:
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}: {e.reason}")
    if e.fp:
        body = e.fp.read().decode()
        print("Response:", body[:800])
    print("Check DISCORD_TOKEN and CLIENT_ID in .env (same app as bot in server).")
    exit(1)

names = [c["name"] for c in data]
print(f"Global commands registered: {len(names)}")
print("Names:", names)
if data:
    print("\nFull payload (first command):")
    print(json.dumps(data[0], indent=2))
