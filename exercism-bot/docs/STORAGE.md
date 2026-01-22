# Exercism Bot Storage Locations

## Exercise Storage

### Where Exercises Are Downloaded

Exercises are downloaded to the **Exercism CLI workspace**, which is configured via:

```bash
exercism configure --workspace=/path/to/workspace
```

**Default location** (if not configured):
- Linux: `~/exercism` (usually `/root/exercism` on VPS)
- macOS: `~/exercism`
- Windows: `%USERPROFILE%\exercism`

**Structure:**
```
/root/exercism/
├── python/
│   ├── hello-world/
│   │   ├── README.md
│   │   ├── hello_world.py
│   │   └── hello_world_test.py
│   └── leap/
│       └── ...
├── javascript/
│   └── ...
└── rust/
    └── ...
```

**How to check workspace:**
- Use `/workspace` command in Discord
- Or run: `exercism workspace` on the server

## Submission Storage

### Submission Files

**Temporary storage:**
- Files uploaded via `/submit` are saved to `/tmp/{filename}` temporarily
- Files are deleted after submission completes

**Permanent storage:**
- Submission files are **NOT stored permanently** by the bot
- Only metadata is tracked (see below)

### Submission Metadata

**Location:** `data/submissions.json`

**Structure:**
```json
{
  "user_id": [
    {
      "exercise": "hello-world",
      "track": "python",
      "file_path": "/tmp/hello_world.py",
      "timestamp": null
    }
  ]
}
```

**Note:** The `file_path` in metadata points to the temporary file location, which is deleted after submission.

## Bot Data Storage

**Location:** `data/` directory (relative to bot root)

**Files:**
- `data/exercises.json` - Tracks which exercises users have downloaded
- `data/submissions.json` - Tracks submission history (metadata only)
- `data/progress.json` - User progress cache

**Structure:**
```
exercism-bot/
├── data/
│   ├── exercises.json
│   ├── submissions.json
│   └── progress.json
└── ...
```

## Configuration

### Setting Workspace on VPS

```bash
# 1. Create workspace directory
mkdir -p /root/exercism

# 2. Configure Exercism CLI (requires API token)
exercism configure --workspace=/root/exercism --token=YOUR_TOKEN

# 3. Verify
exercism workspace
```

**Get API token from:** https://exercism.org/settings/api_cli

### Environment Variables

The bot can use `EXERCISM_WORKSPACE` environment variable, but it's optional. The CLI's configured workspace takes precedence.

## Important Notes

1. **Exercise files** are stored in the Exercism workspace (managed by CLI)
2. **Submission files** are temporary (deleted after submission)
3. **Bot metadata** is stored in `data/` directory
4. **Workspace location** can be checked with `/workspace` command
5. **CLI must be configured** with workspace and token for downloads to work
