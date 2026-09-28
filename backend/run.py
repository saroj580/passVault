# Starts the backend server. Electron runs "python run.py" in development,
# and in Step 8 PyInstaller turns this file into backend.exe.
import os
import sys

import uvicorn

from app.main import app

if __name__ == "__main__":
    # A --noconsole exe has no console, so sys.stdout/stderr are None and
    # uvicorn's logging would crash on the first print. Send output nowhere.
    if sys.stdout is None:
        sys.stdout = open(os.devnull, "w")
    if sys.stderr is None:
        sys.stderr = open(os.devnull, "w")

    # We pass the app object itself (not the text "app.main:app"),
    # so PyInstaller can see which code to bundle. No --reload here.
    uvicorn.run(app, host="127.0.0.1", port=5055)
