import socket, hashlib, base64, json, urllib.request, struct, time, subprocess, os, re

def ws_connect(ws_url):
    m = re.match(r'ws://([^/]+)(/.+)', ws_url)
    host, path = m.group(1), m.group(2)
    h_parts = host.split(':')
    port = int(h_parts[1]) if len(h_parts) > 1 else 80
    host_ip = h_parts[0]
    
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((host_ip, port))
    
    key = base64.b64encode(os.urandom(16)).decode('ascii')
    req = (
        f"GET {path} HTTP/1.1\r\n"
        f"Host: {host}\r\n"
        f"Upgrade: websocket\r\n"
        f"Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        f"Sec-WebSocket-Version: 13\r\n\r\n"
    )
    s.sendall(req.encode('ascii'))
    resp = s.recv(4096).decode('latin1')
    assert "101" in resp, f"WS handshake failed: {resp}"
    return s

def ws_send(s, msg):
    payload = msg.encode('utf-8')
    header = bytearray([0x81])
    length = len(payload)
    mask_key = os.urandom(4)
    if length < 126:
        header.append(0x80 | length)
    elif length <= 0xFFFF:
        header.append(0x80 | 126)
        header.extend(struct.pack('>H', length))
    else:
        header.append(0x80 | 127)
        header.extend(struct.pack('>Q', length))
    header.extend(mask_key)
    masked = bytearray([b ^ mask_key[i % 4] for i, b in enumerate(payload)])
    s.sendall(header + masked)

def ws_recv(s):
    data = s.recv(2)
    if not data: return None
    b1, b2 = data[0], data[1]
    length = b2 & 0x7F
    if length == 126:
        length = struct.unpack('>H', s.recv(2))[0]
    elif length == 127:
        length = struct.unpack('>Q', s.recv(8))[0]
    raw = bytearray()
    while len(raw) < length:
        chunk = s.recv(length - len(raw))
        if not chunk: break
        raw.extend(chunk)
    return raw.decode('utf-8', errors='ignore')

def cdp_eval(s, expr, req_id=[1]):
    req_id[0] += 1
    msg = json.dumps({"id": req_id[0], "method": "Runtime.evaluate", "params": {"expression": expr, "returnByValue": True, "awaitPromise": True}})
    ws_send(s, msg)
    while True:
        resp = ws_recv(s)
        if not resp: break
        data = json.loads(resp)
        if data.get("id") == req_id[0]:
            print(f"DEBUG EVAL [{expr[:35]}...]:", data)
            res = data.get("result", {})
            if "exceptionDetails" in res:
                print("JS Exception:", res["exceptionDetails"])
            return res.get("result", {}).get("value")

user_data = os.path.abspath('scratch/edge_diag_dbg')
proc = subprocess.Popen([
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    '--headless=new',
    '--remote-debugging-port=9560',
    f'--user-data-dir={user_data}',
    '--no-first-run',
    'http://localhost:8000/'
])

time.sleep(2.5)

try:
    with urllib.request.urlopen('http://localhost:9560/json') as r:
        tabs = json.loads(r.read().decode())
    print("All tabs:", [(t.get('title'), t.get('url')) for t in tabs])
    page_tab = [t for t in tabs if '8000' in t.get('url', '')][0]
    print("Selected Page tab URL:", page_tab.get('url'))
    s = ws_connect(page_tab['webSocketDebuggerUrl'])

    ws_send(s, json.dumps({"id": 1, "method": "Runtime.enable"}))
    ws_send(s, json.dumps({"id": 2, "method": "Log.enable"}))
    time.sleep(1)

    print("ReadyState:", cdp_eval(s, "document.readyState"))
    print("Desktop-shell display before login:", cdp_eval(s, "document.getElementById('desktop-shell')?.style.display"))
    print("Login-screen display before login:", cdp_eval(s, "document.getElementById('login-screen')?.style.display"))

    # Login
    print("Calling login...")
    login_res = cdp_eval(s, """
        (async () => {
            const form = document.getElementById('login-form');
            document.getElementById('login-lastname').value = 'Петренко';
            document.getElementById('login-firstname').value = 'Іван';
            document.getElementById('login-grade').value = '8-А';
            const { profileManager } = await import('./js/core/profiles.js');
            const profile = await profileManager.login('Петренко', 'Іван', '8-А');
            return profile ? profile.profileId : 'no profile';
        })()
    """)
    print("Login result:", login_res)
    time.sleep(1.5)

    print("Desktop-shell display after login:", cdp_eval(s, "document.getElementById('desktop-shell')?.style.display"))
    print("Taskbar clock text:", cdp_eval(s, "document.getElementById('taskbar-clock')?.textContent?.trim()"))
    print("Desktop icons count:", cdp_eval(s, "document.querySelectorAll('.desktop-icon-item').length"))

    # Test clock click
    cdp_eval(s, "document.getElementById('taskbar-clock')?.click()")
    time.sleep(0.5)
    cal_vis = cdp_eval(s, "document.getElementById('taskbar-calendar-flyout')?.classList.contains('visible')")
    print("Calendar visible after clock click:", cal_vis)

    # Test About System window
    cdp_eval(s, """
        import('./js/core/event-bus.js').then(({ eventBus }) => {
            eventBus.emit('app:launch', { appId: 'about-system' });
        })
    """)
    time.sleep(1)
    about_check = cdp_eval(s, """
        (() => {
            const win = document.querySelector('.edu-window');
            if (!win) return 'no window';
            return {
                title: win.querySelector('.window-title-text')?.textContent,
                isDialog: win.classList.contains('window-dialog'),
                hasMaxBtn: !!win.querySelector('.win-btn-maximize'),
                hasResizeHandles: win.querySelectorAll('.window-resize-handle').length,
                scrollHeight: win.querySelector('.about-system-layout')?.scrollHeight,
                clientHeight: win.querySelector('.about-system-layout')?.clientHeight
            };
        })()
    """)
    print("About window check:", about_check)

finally:
    proc.terminate()
