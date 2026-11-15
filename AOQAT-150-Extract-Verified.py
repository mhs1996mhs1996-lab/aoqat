#!/usr/bin/env python3
"""Owner-only recovery: locate exact reviewed B150 APK inside Android Downloads ZIP.
No secrets, no network, no modifications to any existing file.
"""
from pathlib import Path
from zipfile import ZipFile, BadZipFile
import hashlib, os, sys, tempfile

EXPECTED="095d7d39bf34591c48258d675471e19b80ff8e4efe22b072a02bf96b606023fa"
ROOT=Path.home()/"storage"/"downloads"
OUT=ROOT/"AOQAT-150-Unsigned-Verified.apk"

def sha(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for b in iter(lambda:f.read(1024*1024),b""): h.update(b)
    return h.hexdigest()

def main():
    if not ROOT.is_dir(): raise ValueError("Termux Downloads unavailable")
    if OUT.exists():
        if OUT.is_file() and sha(OUT)==EXPECTED:
            print("PASS: already verified:",OUT)
            return
        raise ValueError("Existing output path not verified; WILL NOT overwrite")
    archives=sorted((x for x in ROOT.iterdir() if x.is_file() and
                     x.suffix.lower()==".zip" and
                     90*1024*1024<=x.stat().st_size<=230*1024*1024),
                     key=lambda x:x.stat().st_mtime,reverse=True)
    print("Candidate ZIP files in Termux Downloads:",len(archives))
    for archive in archives:
        print("Checking ZIP:",archive.name)
        try:
            with ZipFile(archive) as z:
                for entry in z.infolist():
                    if not entry.filename.endswith(".apk") or not (90*1024*1024<=entry.file_size<=180*1024*1024):
                        continue
                    print("Checking APK member:",entry.filename)
                    fd,tmp=tempfile.mkstemp(prefix=".aoqat150-",suffix=".tmp",dir=ROOT)
                    try:
                        digest=hashlib.sha256()
                        with os.fdopen(fd,"wb") as dst,z.open(entry) as src:
                            total=0
                            for buf in iter(lambda:src.read(1024*1024),b""):
                                total+=len(buf)
                                if total>180*1024*1024: raise ValueError("APK oversized")
                                digest.update(buf)
                                dst.write(buf)
                        if digest.hexdigest()!=EXPECTED:
                            print("NOT MATCHING B150 SHA:",digest.hexdigest())
                            continue
                        # Android shared-storage FUSE may forbid hard links: use same-dir rename.
                        if OUT.exists(): raise ValueError("Output exists; will not overwrite")
                        os.rename(tmp,OUT)
                        print("PASS: exact build150 verified:",EXPECTED)
                        print("Saved:",OUT)
                        return
                    finally: Path(tmp).unlink(missing_ok=True)
        except (BadZipFile,OSError,EOFError) as e:
            print("Cannot read ZIP:",type(e).__name__)
    raise ValueError("No reviewed B150 APK found. Show printed ZIP names; no file overwritten.")

if __name__=="__main__":
    try: main()
    except (OSError,ValueError) as e:
        print("STOP:",e,file=sys.stderr)
        sys.exit(1)
