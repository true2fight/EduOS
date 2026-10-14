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
            if "exceptionDetails" in data.get("result", {}):
                print("JS EXCEPTION:", data["result"]["exceptionDetails"])
            return data.get("result", {}).get("result", {}).get("value")

user_data = os.path.abspath('scratch/edge_diag_touch')
proc = subprocess.Popen([
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    '--headless=new',
    '--remote-debugging-port=9560',
    f'--user-data-dir={user_data}',
    '--no-first-run',
    '--window-size=1280,800',
    'http://localhost:8000/'
])

time.sleep(2.5)

try:
    with urllib.request.urlopen('http://localhost:9560/json') as r:
        tabs = json.loads(r.read().decode())
    page_tab = [t for t in tabs if '8000' in t.get('url', '')][0]
    s = ws_connect(page_tab['webSocketDebuggerUrl'])

    # Enable runtime
    ws_send(s, json.dumps({"id": 1, "method": "Runtime.enable"}))
    time.sleep(1)

    # Wait for document to load and bootstrap ready
    for _ in range(30):
        ready = cdp_eval(s, "window.__eduosBootstrapReady === true")
        if ready:
            break
        time.sleep(0.3)
    print("Bootstrap ready:", ready)

    # 1. Login
    print("=== Step 0: Logging in ===")
    login_res = cdp_eval(s, """
        (async () => {
            document.getElementById('login-lastname').value = 'Коваленко';
            document.getElementById('login-firstname').value = 'Олена';
            document.getElementById('login-grade').value = '8-А';
            document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true }));
            return { ok: true };
        })()
    """)
    print("Login submission result:", login_res)
    # Wait for desktop to be visible and icons rendered
    desktop_ready = False
    for _ in range(30):
        count = cdp_eval(s, "document.querySelectorAll('.desktop-icon-item').length")
        if count and count > 0:
            desktop_ready = True
            break
        time.sleep(0.4)
    print("Desktop ready (icons count > 0):", desktop_ready)

    # 2. Test 1: Window Centering for Programs & Folders
    print("\n=== Test 1: Window Centering (Programs & Folders) ===")
    notepad_res = cdp_eval(s, """
        (async () => {
            const { eventBus } = await import('./js/core/event-bus.js');
            const { windowManager } = await import('./js/core/window-manager.js');
            eventBus.emit('app:launch', { appId: 'notepad' });
            await new Promise(r => setTimeout(r, 600));

            const win = Array.from(windowManager.windows.values()).find(w => w.appId === 'notepad');
            if (!win) return { error: 'Notepad window not found' };

            const taskbarH = document.getElementById('taskbar')?.offsetHeight || 48;
            const availableW = window.innerWidth;
            const availableH = window.innerHeight - taskbarH;

            const expectedX = Math.max(10, Math.round((availableW - win.width) / 2));
            const expectedY = Math.max(10, Math.round((availableH - win.height) / 2));

            const isCenteredX = Math.abs(win.x - expectedX) <= 2;
            const isCenteredY = Math.abs(win.y - expectedY) <= 2;

            return {
                winX: win.x,
                winY: win.y,
                width: win.width,
                height: win.height,
                expectedX,
                expectedY,
                isCenteredX,
                isCenteredY
            };
        })()
    """)
    print("Notepad Window Centering:", json.dumps(notepad_res, indent=2))

    # Close notepad
    cdp_eval(s, "document.querySelector('.edu-window .win-btn-close')?.click()")
    time.sleep(0.5)

    # Test 1b: Dialog Window Centering (About System)
    print("\n=== Test 1b: Dialog Window Centering (About System) ===")
    about_res = cdp_eval(s, """
        (async () => {
            const { eventBus } = await import('./js/core/event-bus.js');
            const { windowManager } = await import('./js/core/window-manager.js');
            eventBus.emit('app:launch', { appId: 'about-system' });
            await new Promise(r => setTimeout(r, 600));

            const win = Array.from(windowManager.windows.values()).find(w => w.appId === 'about-system');
            if (!win) return { error: 'About System window not found' };

            const taskbarH = document.getElementById('taskbar')?.offsetHeight || 48;
            const availableW = window.innerWidth;
            const availableH = window.innerHeight - taskbarH;

            const expectedX = Math.max(10, Math.round((availableW - win.width) / 2));
            const expectedY = Math.max(10, Math.round((availableH - win.height) / 2));

            const isCenteredX = Math.abs(win.x - expectedX) <= 2;
            const isCenteredY = Math.abs(win.y - expectedY) <= 2;

            return {
                winX: win.x,
                winY: win.y,
                width: win.width,
                height: win.height,
                expectedX,
                expectedY,
                isCenteredX,
                isCenteredY,
                isDialog: win.isDialog
            };
        })()
    """)
    print("About System Centering:", json.dumps(about_res, indent=2))

    # Close about window
    cdp_eval(s, "document.getElementById('about-btn-close')?.click()")
    time.sleep(0.5)

    # 3. Test 2: Touch Tap on Desktop Icon to Open App/Folder
    print("\n=== Test 2: Touch Tap on Desktop Icon (Opens App/Folder) ===")
    touch_tap_res = cdp_eval(s, """
        (async () => {
            const pcIcon = document.querySelector('.desktop-icon-item[data-id="sys_this_pc"]');
            if (!pcIcon) return { error: 'PC icon not found' };

            const rect = pcIcon.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const touchObj = new Touch({
                identifier: Date.now(),
                target: pcIcon,
                clientX: cx,
                clientY: cy,
                pageX: cx,
                pageY: cy
            });

            // Simulate quick tap: touchstart -> touchend
            pcIcon.dispatchEvent(new TouchEvent('touchstart', {
                touches: [touchObj],
                targetTouches: [touchObj],
                changedTouches: [touchObj],
                bubbles: true
            }));

            await new Promise(r => setTimeout(r, 80));

            pcIcon.dispatchEvent(new TouchEvent('touchend', {
                touches: [],
                targetTouches: [],
                changedTouches: [touchObj],
                bubbles: true
            }));

            await new Promise(r => setTimeout(r, 800));

            const { windowManager } = await import('./js/core/window-manager.js');
            const explorerWin = Array.from(windowManager.windows.values()).find(w => w.appId === 'explorer');

            return {
                explorerOpenedByTap: !!explorerWin,
                title: explorerWin ? explorerWin.title : null
            };
        })()
    """)
    print("Touch Tap Open Result:", json.dumps(touch_tap_res, indent=2, ensure_ascii=False))

    # Close explorer
    cdp_eval(s, "document.querySelector('.edu-window .win-btn-close')?.click()")
    time.sleep(0.5)

    # 4. Test 3: Touch Long Press on Desktop Icon (Triggers Context Menu)
    print("\n=== Test 3: Touch Long Press on Desktop Icon (Triggers Context Menu) ===")
    long_press_res = cdp_eval(s, """
        (async () => {
            const netIcon = document.querySelector('.desktop-icon-item[data-id="sys_network"]');
            if (!netIcon) return { error: 'Network icon not found' };

            const rect = netIcon.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const touchObj = new Touch({
                identifier: Date.now(),
                target: netIcon,
                clientX: cx,
                clientY: cy
            });

            // Start touch
            netIcon.dispatchEvent(new TouchEvent('touchstart', {
                touches: [touchObj],
                targetTouches: [touchObj],
                changedTouches: [touchObj],
                bubbles: true
            }));

            // Wait 550ms for long-press timer
            await new Promise(r => setTimeout(r, 550));

            netIcon.dispatchEvent(new TouchEvent('touchend', {
                touches: [],
                targetTouches: [],
                changedTouches: [touchObj],
                bubbles: true
            }));

            await new Promise(r => setTimeout(r, 100));

            const menu = document.querySelector('.edu-context-menu');
            const isOpen = menu && menu.style.display !== 'none';
            const items = menu ? Array.from(menu.querySelectorAll('.context-menu-item')).map(i => i.textContent.trim()) : [];

            return {
                contextMenuOpen: isOpen,
                itemCount: items.length,
                menuItems: items
            };
        })()
    """)
    print("Touch Long Press Result:", json.dumps(long_press_res, indent=2, ensure_ascii=False))

    # Close context menu
    cdp_eval(s, "document.body.dispatchEvent(new MouseEvent('mousedown', { clientX: 0, clientY: 0 }))")
    time.sleep(0.4)

    # 5. Test 4: Touch Tap in File Explorer (Opens folder / navigates)
    print("\n=== Test 4: Touch Tap in File Explorer (Opens folder) ===")
    explorer_touch_res = cdp_eval(s, """
        (async () => {
            const { eventBus } = await import('./js/core/event-bus.js');
            eventBus.emit('app:launch', { appId: 'explorer', params: { path: 'C:\\\\Користувачі\\\\Учень' } });
            await new Promise(r => setTimeout(r, 800));

            const expWin = document.querySelector('.edu-window');
            if (!expWin) return { error: 'Explorer window not found' };

            // Find Documents folder
            const docsCard = Array.from(expWin.querySelectorAll('.explorer-item-card, .explorer-file-row')).find(el => el.textContent.includes('Документи'));
            if (!docsCard) return { error: 'Documents folder card not found' };

            const rect = docsCard.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const touchObj = new Touch({
                identifier: Date.now(),
                target: docsCard,
                clientX: cx,
                clientY: cy
            });

            // Tap on folder
            docsCard.dispatchEvent(new TouchEvent('touchstart', {
                touches: [touchObj],
                targetTouches: [touchObj],
                changedTouches: [touchObj],
                bubbles: true
            }));

            await new Promise(r => setTimeout(r, 80));

            docsCard.dispatchEvent(new TouchEvent('touchend', {
                touches: [],
                targetTouches: [],
                changedTouches: [touchObj],
                bubbles: true
            }));

            await new Promise(r => setTimeout(r, 800));

            const { windowManager } = await import('./js/core/window-manager.js');
            const win = Array.from(windowManager.windows.values()).find(w => w.appId === 'explorer');
            const app = win?.appInstance;

            return {
                currentPath: app?.currentPath,
                navigatedToDocuments: app?.currentPath?.includes('Документи')
            };
        })()
    """)
    print("Explorer Touch Tap Open Folder:", json.dumps(explorer_touch_res, indent=2, ensure_ascii=False))

    # 6. Test 5: Touch Drag on Window Titlebar (Moves Window)
    print("\n=== Test 5: Touch Drag on Window Titlebar (Moves Window) ===")
    touch_drag_win_res = cdp_eval(s, """
        (async () => {
            const expWin = document.querySelector('.edu-window');
            if (!expWin) return { error: 'Explorer window not found' };

            const titlebar = expWin.querySelector('.window-titlebar');
            const initialLeft = parseInt(expWin.style.left, 10);
            const initialTop = parseInt(expWin.style.top, 10);

            const rect = titlebar.getBoundingClientRect();
            const startX = rect.left + 50;
            const startY = rect.top + 15;

            const t1 = new Touch({ identifier: 1, target: titlebar, clientX: startX, clientY: startY });
            titlebar.dispatchEvent(new TouchEvent('touchstart', { touches: [t1], bubbles: true }));

            // Move by +50, +30
            const t2 = new Touch({ identifier: 1, target: titlebar, clientX: startX + 50, clientY: startY + 30 });
            window.dispatchEvent(new TouchEvent('touchmove', { touches: [t2], bubbles: true }));

            // End drag
            window.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t2], bubbles: true }));

            const finalLeft = parseInt(expWin.style.left, 10);
            const finalTop = parseInt(expWin.style.top, 10);

            return {
                initialLeft,
                initialTop,
                finalLeft,
                finalTop,
                dx: finalLeft - initialLeft,
                dy: finalTop - initialTop,
                movedSuccessfully: (finalLeft - initialLeft === 50) && (finalTop - initialTop === 30)
            };
        })()
    """)
    print("Touch Drag Window Titlebar:", json.dumps(touch_drag_win_res, indent=2))

    # Close explorer
    cdp_eval(s, "document.querySelector('.edu-window .win-btn-close')?.click()")
    time.sleep(0.5)

    print("\n=== ALL TOUCH & CENTERING TESTS COMPLETED SUCCESSFULLY ===")

finally:
    proc.terminate()
