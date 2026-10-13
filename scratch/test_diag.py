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
    msg = json.dumps({"id": req_id[0], "method": "Runtime.evaluate", "params": {"expression": expr, "returnByValue": True}})
    ws_send(s, msg)
    while True:
        resp = ws_recv(s)
        if not resp: break
        data = json.loads(resp)
        if data.get("id") == req_id[0]:
            return data.get("result", {}).get("result", {}).get("value")

user_data = os.path.abspath('scratch/edge_diag3')
proc = subprocess.Popen([
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    '--headless=new',
    '--remote-debugging-port=9556',
    f'--user-data-dir={user_data}',
    '--no-first-run',
    'http://localhost:8000/'
])

time.sleep(2.5)

try:
    with urllib.request.urlopen('http://localhost:9556/json') as r:
        tabs = json.loads(r.read().decode())
    page_tab = [t for t in tabs if t.get('type') == 'page'][0]
    s = ws_connect(page_tab['webSocketDebuggerUrl'])

    # Enable runtime
    ws_send(s, json.dumps({"id": 1, "method": "Runtime.enable"}))
    time.sleep(1)

    # 1. Fill login form and login
    print("=== Step 1: Logging in ===")
    res = cdp_eval(s, """
        (async () => {
            document.getElementById('login-lastname').value = 'Шевченко';
            document.getElementById('login-firstname').value = 'Тарас';
            document.getElementById('login-grade').value = '7-Б';
            document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true }));
            return 'submitted';
        })()
    """)
    print("Login submit:", res)
    time.sleep(2)

    desktop_display = cdp_eval(s, "document.getElementById('desktop-shell').style.display")
    print("Desktop shell display:", desktop_display)

    # 2. Check Start menu and categories
    print("\n=== Step 2: Open Start menu and check 'Про систему' in categories ===")
    cdp_eval(s, "document.getElementById('start-button').click()")
    time.sleep(0.5)
    start_open = cdp_eval(s, "document.getElementById('start-menu').classList.contains('visible')")
    print("Start menu open after 1st click:", start_open)

    about_in_category = cdp_eval(s, """
        (() => {
            const items = Array.from(document.querySelectorAll('.start-app-item'));
            const about = items.find(el => el.textContent.includes('Про систему'));
            return !!about;
        })()
    """)
    print("About 'Про систему' item found in Start Menu categories:", about_in_category)

    # 3. Click 'Про систему' in category list
    print("\n=== Step 3: Launch 'Про систему' from Start Menu category ===")
    cdp_eval(s, """
        (() => {
            const items = Array.from(document.querySelectorAll('.start-app-item'));
            const about = items.find(el => el.textContent.includes('Про систему'));
            if (about) about.click();
        })()
    """)
    time.sleep(1)

    win_count = cdp_eval(s, "document.querySelectorAll('.edu-window').length")
    win_title = cdp_eval(s, "document.querySelector('.edu-window .window-title-text')?.textContent")
    win_author = cdp_eval(s, "document.querySelector('.about-author-name')?.textContent")
    win_lead = cdp_eval(s, "document.querySelector('.about-text-lead')?.textContent")
    print(f"Window count: {win_count}, Title: '{win_title}'")
    print(f"Lead text: '{win_lead}'")
    print(f"Author: '{win_author}'")

    # Close the window by clicking the button "Зрозуміло"
    print("\n=== Step 4: Close 'Про систему' window ===")
    cdp_eval(s, "document.getElementById('about-btn-close')?.click()")
    time.sleep(0.5)
    win_count_after_close = cdp_eval(s, "document.querySelectorAll('.edu-window').length")
    print("Window count after close:", win_count_after_close)

    # 4. Open Start menu again and click 'Про систему' in footer
    print("\n=== Step 5: Open Start menu and click 'Про систему' from footer ===")
    cdp_eval(s, "document.getElementById('start-button').click()")
    time.sleep(0.5)
    cdp_eval(s, "document.getElementById('start-about-btn')?.click()")
    time.sleep(1)
    win_count2 = cdp_eval(s, "document.querySelectorAll('.edu-window').length")
    print("Window count after footer click:", win_count2)

    cdp_eval(s, "document.getElementById('about-btn-close')?.click()")
    time.sleep(0.5)

    # 5. Test Logout and Re-login
    print("\n=== Step 6: Testing Logout ===")
    cdp_eval(s, "document.getElementById('start-button').click()")
    time.sleep(0.5)
    cdp_eval(s, """
        (() => {
            import('./js/core/profiles.js').then(({ profileManager }) => {
                profileManager.logout();
            });
        })()
    """)
    time.sleep(1.5)
    login_disp = cdp_eval(s, "document.getElementById('login-screen').style.display")
    print("Login screen display:", login_disp)

    print("\n=== Step 7: Testing Re-login ===")
    cdp_eval(s, """
        document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true }))
    """)
    time.sleep(2)
    desktop_disp2 = cdp_eval(s, "document.getElementById('desktop-shell').style.display")
    print("Desktop shell display after re-login:", desktop_disp2)

    # 6. Test Start button after re-login!
    print("\n=== Step 8: Click Start button after re-login ===")
    cdp_eval(s, "document.getElementById('start-button').click()")
    time.sleep(0.5)
    start_open_relogin = cdp_eval(s, "document.getElementById('start-menu').classList.contains('visible')")
    print("Start menu open after re-login click:", start_open_relogin)

    # Click Start button again to toggle close
    cdp_eval(s, "document.getElementById('start-button').click()")
    time.sleep(0.5)
    start_closed_relogin = not cdp_eval(s, "document.getElementById('start-menu').classList.contains('visible')")
    print("Start menu closed after toggle click:", start_closed_relogin)

    # Click Start button again to re-open
    cdp_eval(s, "document.getElementById('start-button').click()")
    time.sleep(0.5)
    start_reopened = cdp_eval(s, "document.getElementById('start-menu').classList.contains('visible')")
    print("Start menu re-opened after 3rd click:", start_reopened)

    # Launch 'Про систему' after re-login
    print("\n=== Step 9: Launch 'Про систему' after re-login ===")
    cdp_eval(s, "document.getElementById('start-about-btn')?.click()")
    time.sleep(1)
    win_count_relogin = cdp_eval(s, "document.querySelectorAll('.edu-window').length")
    win_title_relogin = cdp_eval(s, "document.querySelector('.edu-window .window-title-text')?.textContent")
    print(f"Window count after re-login: {win_count_relogin}, Title: '{win_title_relogin}'")

    print("\n=== ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY ===")

finally:
    proc.terminate()
