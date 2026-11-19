#!/usr/bin/env python3
"""Owner-local offline OTA V2 seq8: visually compact touch-safe stepper.

Never sign in GitHub, never publish automatically. Verify the EXACT existing
owner-signed seq7 ZIP on the phone, preserve its index/profile unchanged,
replace ONLY its previously approved quiet JS path with reviewed seq8 bytes.
"""
from __future__ import annotations
import argparse,base64,getpass,hashlib,json,os,re,stat,subprocess,sys,tempfile,time,zipfile
from pathlib import Path

BUILD,SEQ = 150,8
DOMAIN="AOQAT-WEB-UPDATE-SIGNATURE-V1"
PINNED_PUBLISHER_SPKI="8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d"
PINNED_INDEX_SHA="c57ae34152d8c769a9b68d01925c4f1f5c1e8cce4a14a3abe7e620e7ab5e05d6"
PINNED_SEQ7_JS_SHA="532246499d1b2954f10ad461e4512fa4f00a76fe1596fe16d22af262cfb5e719"
PINNED_SEQ8_JS_SHA="4747836718652dfafc9809cfa00e309ceff6e3cd7e229ae1f5341970dfd5799f"
ROOT="android-updates/build-150/"
INDEX="index.html"
QUIET="js/owner-quiet-seq5.js"
MANIFEST=ROOT+"manifest.json"
INDEX_FILE=ROOT+"files/index.html"
QUIET_FILE=ROOT+"files/"+QUIET
DOWNLOADS=Path.home()/"storage"/"downloads"
KEYS=Path.home()/"aoqat-keys"

def sha(data:bytes)->str:return hashlib.sha256(data).hexdigest()

def run(*parts:str,data:bytes|None=None,pass_fds:tuple[int,...]=())->bytes:
    p=subprocess.run(parts,input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                     pass_fds=pass_fds,check=False)
    if p.returncode:raise ValueError("OpenSSL rejected the provided cryptographic material")
    return p.stdout

def canonical(m:dict)->bytes:
    if m.get("nativeBuild")!=BUILD:raise ValueError("Wrong build; refusing cross-build OTA")
    for key in ("nativeBuild","sequence","expiresAt"):
        if type(m.get(key)) is not int or m[key]<=0:raise ValueError("Invalid signed metadata")
    files=m.get("files")
    if not isinstance(files,dict) or set(files)!={INDEX,QUIET}:
        raise ValueError("Missing or extra signed file paths")
    if any(not isinstance(x,str) or re.fullmatch("[0-9a-f]{64}",x) is None for x in files.values()):
        raise ValueError("Invalid SHA256")
    lines="\n".join(f"{p}:{files[p]}" for p in sorted(files))
    if m.get("revision")!=sha(lines.encode()):raise ValueError("Revision mismatch")
    return "\n".join((DOMAIN,str(BUILD),str(m["sequence"]),str(m["expiresAt"]),
                      m["revision"],lines)).encode()

def verify_signature(m:dict,public:Path)->None:
    try:sig=base64.b64decode(m["signature"],validate=True)
    except (ValueError,KeyError) as e:raise ValueError("No valid publisher signature") from e
    with tempfile.TemporaryDirectory(prefix="aoqat-seq6-verify-") as tmp:
        p=Path(tmp);(p/"canonical").write_bytes(canonical(m));(p/"sig").write_bytes(sig)
        run("openssl","dgst","-sha256","-verify",str(public),"-signature",
            str(p/"sig"),str(p/"canonical"))

def key_id(public:Path)->str:
    return sha(run("openssl","pkey","-pubin","-in",str(public),"-outform","DER"))

def read_verified_seq7(source:Path,public:Path)->bytes:
    if key_id(public)!=PINNED_PUBLISHER_SPKI:
        raise ValueError("Wrong AOQAT OTA V2 publisher public key")
    if not source.is_file():raise ValueError("Signed seq7 ZIP not found in Download")
    with zipfile.ZipFile(source) as z:
        members=z.infolist()
        if len(members)!=3 or set(x.filename for x in members)!={MANIFEST,INDEX_FILE,QUIET_FILE}:
            raise ValueError("Expected exactly three signed seq7 archive members")
        for x in members:
            if (x.is_dir() or x.file_size>6*1024*1024 or
               ((x.external_attr>>16)&0o170000)==stat.S_IFLNK):
                raise ValueError("Unsafe ZIP member")
        manifest=json.loads(z.read(MANIFEST))
        html=z.read(INDEX_FILE)
        previous_js=z.read(QUIET_FILE)
    if (manifest.get("nativeBuild")!=BUILD or manifest.get("sequence")!=7 or
        manifest.get("files")!={INDEX:PINNED_INDEX_SHA,QUIET:PINNED_SEQ7_JS_SHA} or
        sha(html)!=PINNED_INDEX_SHA or sha(previous_js)!=PINNED_SEQ7_JS_SHA):
        raise ValueError("Source is not the reviewed owner-signed seq7 release")
    if manifest["expiresAt"]<=int(time.time()*1000):
        raise ValueError("Source seq7 signature has expired")
    verify_signature(manifest,public)
    if (html.count(b'<script src="js/owner-quiet-seq5.js"></script>')!=1 or
        b'AOQAT_OWNER_PILOT_SEQ4_PROFILE_BUTTONS_V1' not in html):
        raise ValueError("Source index or profile was modified")
    return html

def candidate(html:bytes,new_js:bytes)->tuple[bytes,bytes]:
    if sha(html)!=PINNED_INDEX_SHA:raise ValueError("Seq7 index does not match reviewed version")
    if sha(new_js)!=PINNED_SEQ8_JS_SHA:
        raise ValueError("New seq8 script is not the precisely reviewed GitHub version")
    if (b"const SAVE_IDLE_MS=900" not in new_js or
        b"aq-quiet-explain" not in new_js or
        b"width:44px" not in new_js or
        b"aq-quiet-controls" not in new_js or
        b"aq-quiet-unit" not in new_js or
        b"background:transparent!important" not in new_js or
        b"34px 34px no-repeat!important" not in new_js or
        b"window.AoqatApkQuietSettings={render,read};" not in new_js or
        b"const existing=document.getElementById('quietPanel');" not in new_js):
        raise ValueError("Verified quiet responsiveness and layout markers absent")
    return html,new_js

def create_manifest(html:bytes,new_js:bytes)->dict:
    files={INDEX:sha(html),QUIET:sha(new_js)}
    lines="\n".join(f"{p}:{files[p]}" for p in sorted(files))
    return {"nativeBuild":BUILD,"sequence":SEQ,
            "expiresAt":int(time.time()*1000)+14*86400*1000,
            "revision":sha(lines.encode()),"files":files}

def local_sign(private:Path,message:bytes,password:str)->bytes:
    reader,writer=os.pipe()
    try:
        try:os.write(writer,password.encode()+b"\n")
        finally:os.close(writer)
        return run("openssl","dgst","-sha256","-passin","fd:"+str(reader),
                   "-sign",str(private),data=message,pass_fds=(reader,))
    finally:os.close(reader)

def write_zip(path:Path,m:dict,html:bytes,script:bytes)->None:
    if path.exists() or path.is_symlink():
        raise ValueError("Signed output already exists: refusing overwrite")
    with zipfile.ZipFile(path,"x",compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr(MANIFEST,json.dumps(m,separators=(",",":"),ensure_ascii=False).encode())
        z.writestr(INDEX_FILE,html)
        z.writestr(QUIET_FILE,script)

def stage(args:argparse.Namespace)->None:
    html=read_verified_seq7(args.source,args.public_key)
    if not args.script.is_file():raise ValueError("Reviewed quiet seq6 JS missing from Download")
    html,new_js=candidate(html,args.script.read_bytes())
    m=create_manifest(html,new_js)
    if args.review:
        print("PASS: signed seq7 checked and exact seq8 JS pinned. NO SIGN / NO PUBLISH")
        return
    if os.environ.get("GITHUB_ACTIONS","").lower()=="true":
        raise ValueError("Never sign owner updates in GitHub Actions")
    if not args.private_key.is_file():raise ValueError("Private OTA V2 PEM not present in Termux")
    print("Password for AOQAT-OTA-V2 PEM (not APK/ADMIN P12).")
    password=getpass.getpass("OTA V2 key password (hidden): ")
    try:
        if not password:raise ValueError("Empty OTA V2 password")
        signature=local_sign(args.private_key,canonical(m),password)
    finally:password=""
    m["signature"]=base64.b64encode(signature).decode("ascii")
    verify_signature(m,args.public_key)
    write_zip(args.output,m,html,new_js)
    print("PASS: owner-signed B150 seq8 verified locally")
    print("FILE:",args.output)
    print("SHA256:",sha(args.output.read_bytes()))
    print("OWNER PILOT ONLY. NO PUBLIC UPDATES OR USER DISTRIBUTION.")

def main()->int:
    p=argparse.ArgumentParser(description=__doc__)
    modes=p.add_mutually_exclusive_group(required=True)
    modes.add_argument("--owner-stage",action="store_true")
    modes.add_argument("--review",action="store_true")
    p.add_argument("--source",type=Path,default=DOWNLOADS/"AOQAT-B150-OWNER-SEQ7-STEPPER-BALANCED-SIGNED-TEST-ONLY.zip")
    p.add_argument("--script",type=Path,default=DOWNLOADS/"owner-ota-b150-seq8-quiet-ui.js")
    p.add_argument("--public-key",type=Path,default=KEYS/"aoqat-update-public-v2.pem")
    p.add_argument("--private-key",type=Path,default=KEYS/"aoqat-update-private-v2.pem")
    p.add_argument("--output",type=Path,default=DOWNLOADS/"AOQAT-B150-OWNER-SEQ8-STEPPER-VISUAL-SIGNED-TEST-ONLY.zip")
    a=p.parse_args()
    try:stage(a);return 0
    except (OSError,ValueError,KeyError,TypeError,zipfile.BadZipFile,
            subprocess.SubprocessError,json.JSONDecodeError) as e:
        print("STOP:",str(e),file=sys.stderr);return 2
if __name__=="__main__":
    raise SystemExit(main())
