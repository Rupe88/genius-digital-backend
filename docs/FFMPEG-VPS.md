# FFmpeg on your VPS (video optimization)

The backend can optimize uploaded videos (faststart for streaming). It needs **FFmpeg** installed and visible to the Node process.

## 1. Install FFmpeg on the VPS

SSH into your server, then:

**Debian / Ubuntu**
```bash
sudo apt update
sudo apt install -y ffmpeg
```

**CentOS / RHEL / Fedora**
```bash
sudo dnf install -y ffmpeg
# or: sudo yum install -y ffmpeg
```

**Alpine**
```bash
apk add --no-cache ffmpeg
```

## 2. Check that FFmpeg is in PATH

```bash
which ffmpeg
ffmpeg -version
```

You should see a path (e.g. `/usr/bin/ffmpeg`) and version info. Note the path for step 4 if the app still can’t find it.

## 3. Restart your Node app

Restart the backend (PM2, systemd, or however you run it) so it runs in an environment where `ffmpeg` is available.

## 4. If you still see “Cannot find ffmpeg”

The process that runs Node (e.g. systemd or PM2) may have a **different PATH** and not see `ffmpeg`. Fix it in one of these ways:

**Option A – Set full path in environment**

Set the `FFMPEG_PATH` env var to the full path from `which ffmpeg`:

- In your **.env** (on the VPS):
  ```env
  FFMPEG_PATH=/usr/bin/ffmpeg
  ```
- Or in **DigitalOcean App Platform**: add an env var `FFMPEG_PATH` = ` /usr/bin/ffmpeg` (use the path from `which ffmpeg` on the machine that runs the app).
- Or in **systemd** unit:
  ```ini
  [Service]
  Environment="FFMPEG_PATH=/usr/bin/ffmpeg"
  ```
- Or in **PM2** ecosystem file:
  ```json
  "env": { "FFMPEG_PATH": "/usr/bin/ffmpeg" }
  ```

**Option B – Put FFmpeg in the service PATH**

Example for systemd:

```ini
[Service]
Environment="PATH=/usr/bin:/usr/local/bin:..."
```

(Include the directory that contains `ffmpeg`.)

After changing env or PATH, restart the Node app again.

## 5. Verify from the app

After restart, upload a lesson video. In the logs you should see something like:

- `[Video optimization] Starting FFmpeg optimization...`
- `[Video optimization] Optimization complete. Original: ... bytes, Optimized: ... bytes`

If you still see `Cannot find ffmpeg`, use **Option A** and set `FFMPEG_PATH` to the exact path from `which ffmpeg`.
