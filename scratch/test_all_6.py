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
            return data.get("result", {}).get("result", {}).get("value")

user_data = os.path.abspath('scratch/edge_diag_all')
proc = subprocess.Popen([
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    '--headless=new',
    '--remote-debugging-port=9558',
    f'--user-data-dir={user_data}',
    '--no-first-run',
    'http://localhost:8000/'
])

time.sleep(2.5)

try:
    with urllib.request.urlopen('http://localhost:9558/json') as r:
        tabs = json.loads(r.read().decode())
    page_tab = [t for t in tabs if '8000' in t.get('url', '')][0]
    s = ws_connect(page_tab['webSocketDebuggerUrl'])

    # Enable runtime
    ws_send(s, json.dumps({"id": 1, "method": "Runtime.enable"}))
    time.sleep(1)

    # 1. Login
    print("=== Step 0: Logging in ===")
    cdp_eval(s, """
        (async () => {
            document.getElementById('login-lastname').value = 'Коваленко';
            document.getElementById('login-firstname').value = 'Олена';
            document.getElementById('login-grade').value = '8-А';
            document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true }));
        })()
    """)
    time.sleep(2)

    # 2. Test 1: About System Window
    print("\n=== Test 1: About System Dialog Window ===")
    cdp_eval(s, "document.getElementById('start-button').click()")
    time.sleep(0.5)
    cdp_eval(s, "document.getElementById('start-about-btn').click()")
    time.sleep(1)

    about_win_check = cdp_eval(s, """
        (() => {
            const win = document.querySelector('.edu-window');
            if (!win) return { error: 'No window found' };
            const isDialog = win.classList.contains('window-dialog');
            const hasMaxBtn = !!win.querySelector('.win-btn-maximize');
            const hasResizeHandles = win.querySelectorAll('.window-resize-handle').length;
            const textContent = win.textContent;
            const hasOldVersion = textContent.includes('Версія 2.0 (Україна, 2026)') || textContent.includes('Версія 2.0');
            const layout = win.querySelector('.about-system-layout');
            const isScrollNeeded = layout ? (layout.scrollHeight > layout.clientHeight + 4) : false;
            const btn = win.querySelector('#about-btn-close');
            const btnClass = btn ? btn.className : '';
            return {
                isDialog,
                hasMaxBtn,
                hasResizeHandles,
                hasOldVersion,
                isScrollNeeded,
                btnClass,
                scrollHeight: layout?.scrollHeight,
                clientHeight: layout?.clientHeight
            };
        })()
    """)
    print("About System Check:", json.dumps(about_win_check, indent=2, ensure_ascii=False))

    # Close about window
    cdp_eval(s, "document.getElementById('about-btn-close')?.click()")
    time.sleep(0.5)

    # 3. Test 2: Settings Window -> Account Tab
    print("\n=== Test 2: Settings Window -> Account Tab ===")
    cdp_eval(s, """
        (async () => {
            const { eventBus } = await import('./js/core/event-bus.js');
            eventBus.emit('app:launch', { appId: 'settings', params: { tab: 'account' } });
        })()
    """)
    time.sleep(1)
    account_btn_check = cdp_eval(s, """
        (() => {
            const navBtn = Array.from(document.querySelectorAll('.settings-nav-item')).find(el => el.textContent.includes('Обліковий'));
            if (navBtn) navBtn.click();
            const logoutBtn = document.getElementById('set-btn-logout');
            return { hasLogoutBtn: !!logoutBtn };
        })()
    """)
    print("Settings Account Tab Check:", account_btn_check)
    # Close Settings window
    cdp_eval(s, "document.querySelector('.edu-window .win-btn-close')?.click()")
    time.sleep(0.5)

    # 4. Test 3: Task Manager -> Performance Tab (RAM)
    print("\n=== Test 3: Task Manager Performance Tab RAM ===")
    cdp_eval(s, """
        (async () => {
            const { eventBus } = await import('./js/core/event-bus.js');
            eventBus.emit('app:launch', { appId: 'task-manager' });
        })()
    """)
    time.sleep(1)
    tm_check = cdp_eval(s, """
        (() => {
            const perfTabBtn = Array.from(document.querySelectorAll('.tm-tab-btn')).find(el => el.dataset.tab === 'performance');
            if (perfTabBtn) perfTabBtn.click();
            const ramCanvas = document.getElementById('perf-ram-canvas');
            const ramStat = document.getElementById('perf-ram-stat')?.textContent;
            return {
                hasRamCanvas: !!ramCanvas,
                ramStat
            };
        })()
    """)
    print("Task Manager RAM Check:", tm_check)
    time.sleep(1.2)
    ram_stat_updated = cdp_eval(s, "document.getElementById('perf-ram-stat')?.textContent")
    print("Task Manager RAM Stat Updated:", ram_stat_updated)
    # Close Task Manager
    cdp_eval(s, "document.querySelector('.edu-window .win-btn-close')?.click()")
    time.sleep(0.5)

    # 5. Test 4: Menu icons in Notepad, Paint, Archiver
    print("\n=== Test 4: Check absence of redundant icons in menus ===")
    # Notepad
    cdp_eval(s, "(async () => { const { eventBus } = await import('./js/core/event-bus.js'); eventBus.emit('app:launch', { appId: 'notepad' }); })()")
    time.sleep(0.8)
    np_icon = cdp_eval(s, "!!document.querySelector('.notepad-menubar .app-title-icon')")
    print("Notepad menubar has icon:", np_icon)
    cdp_eval(s, "document.querySelector('.edu-window .win-btn-close')?.click()")
    time.sleep(0.4)

    # Paint
    cdp_eval(s, "(async () => { const { eventBus } = await import('./js/core/event-bus.js'); eventBus.emit('app:launch', { appId: 'paint' }); })()")
    time.sleep(0.8)
    paint_icon = cdp_eval(s, "!!document.querySelector('.paint-menubar .app-title-icon')")
    print("Paint menubar has icon:", paint_icon)
    cdp_eval(s, "document.querySelector('.edu-window .win-btn-close')?.click()")
    time.sleep(0.4)

    # Archiver
    cdp_eval(s, "(async () => { const { eventBus } = await import('./js/core/event-bus.js'); eventBus.emit('app:launch', { appId: 'archiver' }); })()")
    time.sleep(0.8)
    arc_icon = cdp_eval(s, "!!document.querySelector('.archiver-toolbar .app-title-icon')")
    print("Archiver toolbar has icon:", arc_icon)
    cdp_eval(s, "document.querySelector('.edu-window .win-btn-close')?.click()")
    time.sleep(0.4)

    # 6. Test 5: Desktop Drag and Drop
    print("\n=== Test 5: Desktop Drag and Drop, Move to Folder, Move to Recycle Bin ===")
    
    # 5a. Create folder and file on desktop
    dnd_setup = cdp_eval(s, """
        (async () => {
            const { vfs } = await import('./js/core/filesystem.js');
            const dtNode = vfs.resolvePath('C:\\\\Користувачі\\\\Учень\\\\Робочий стіл');
            const folder = await vfs.createDirectory(dtNode.id, 'ТестоваПапка');
            const file1 = await vfs.createFile(dtNode.id, 'Файл1.txt', 'Вміст файлу 1');
            const file2 = await vfs.createFile(dtNode.id, 'Файл2.txt', 'Вміст файлу 2');
            return {
                folderId: folder.id,
                file1Id: file1.id,
                file2Id: file2.id
            };
        })()
    """)
    print("Created desktop test elements:", dnd_setup)
    time.sleep(1)

    # 5b. Test Drag & Drop moving icon on desktop grid
    dnd_grid_move = cdp_eval(s, """
        (() => {
            const pcIcon = document.querySelector('.desktop-icon-item[data-id="sys_this_pc"]');
            if (!pcIcon) return { error: 'PC icon not found' };
            const initialLeft = pcIcon.style.left;
            const initialTop = pcIcon.style.top;
            
            // Drag PC icon to (300, 200)
            const rect = pcIcon.getBoundingClientRect();
            const sx = rect.left + 20, sy = rect.top + 20;
            pcIcon.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: sx, clientY: sy, button: 0 }));
            window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 290, clientY: 190 }));
            window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 300, clientY: 200 }));
            window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 300, clientY: 200 }));
            
            const newLeft = pcIcon.style.left;
            const newTop = pcIcon.style.top;
            const savedPositions = JSON.parse(localStorage.getItem('eduos_desktop_icon_positions') || '{}');
            
            return {
                initialLeft,
                initialTop,
                newLeft,
                newTop,
                hasSavedPos: !!savedPositions['sys_this_pc']
            };
        })()
    """)
    print("Desktop Icon Grid Drag Move:", json.dumps(dnd_grid_move, indent=2))

    # 5c. Test dragging File1 into Folder
    dnd_folder_move = cdp_eval(s, """
        (async () => {
            const fileEl = Array.from(document.querySelectorAll('.desktop-icon-item')).find(el => el.textContent.includes('Файл1.txt'));
            const folderEl = Array.from(document.querySelectorAll('.desktop-icon-item')).find(el => el.textContent.includes('ТестоваПапка'));
            if (!fileEl || !folderEl) return { error: 'file or folder element not found' };
            
            const fRect = folderEl.getBoundingClientRect();
            const targetX = fRect.left + fRect.width / 2;
            const targetY = fRect.top + fRect.height / 2;

            const rect = fileEl.getBoundingClientRect();
            fileEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: rect.left + 10, clientY: rect.top + 10, button: 0 }));
            window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: targetX, clientY: targetY }));
            window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: targetX, clientY: targetY }));
            
            await new Promise(r => setTimeout(r, 600));

            const { vfs } = await import('./js/core/filesystem.js');
            const stillOnDesktop = Array.from(document.querySelectorAll('.desktop-icon-item')).some(el => el.textContent.includes('Файл1.txt'));
            const f1Node = vfs.getNode('""" + dnd_setup['file1Id'] + """');
            const inFolder = f1Node && f1Node.parentId === '""" + dnd_setup['folderId'] + """';
            
            return {
                stillOnDesktop,
                inFolder,
                newParentId: f1Node?.parentId
            };
        })()
    """)
    print("Drop File into Folder result:", json.dumps(dnd_folder_move, indent=2))

    # 5d. Test dragging File2 into Recycle Bin
    dnd_recycle_move = cdp_eval(s, """
        (async () => {
            const fileEl = Array.from(document.querySelectorAll('.desktop-icon-item')).find(el => el.textContent.includes('Файл2.txt'));
            const recycleEl = document.querySelector('.desktop-icon-item[data-id="sys_recycle_bin"]');
            if (!fileEl || !recycleEl) return { error: 'file or recycle element not found' };
            
            const rRect = recycleEl.getBoundingClientRect();
            const targetX = rRect.left + rRect.width / 2;
            const targetY = rRect.top + rRect.height / 2;

            const rect = fileEl.getBoundingClientRect();
            fileEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: rect.left + 10, clientY: rect.top + 10, button: 0 }));
            window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: targetX, clientY: targetY }));
            window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: targetX, clientY: targetY }));
            
            await new Promise(r => setTimeout(r, 600));

            const { vfs } = await import('./js/core/filesystem.js');
            const stillOnDesktop = Array.from(document.querySelectorAll('.desktop-icon-item')).some(el => el.textContent.includes('Файл2.txt'));
            const f2Node = vfs.getNode('""" + dnd_setup['file2Id'] + """');
            const isInTrash = f2Node ? (f2Node.isDeleted || f2Node.parentId === 'trash_root') : true;

            return {
                stillOnDesktop,
                isInTrash
            };
        })()
    """)
    print("Drop File into Recycle Bin result:", json.dumps(dnd_recycle_move, indent=2))
    cdp_eval(s, "document.getElementById('taskbar-clock').click()")
    time.sleep(0.6)

    cal_check = cdp_eval(s, """
        (() => {
            const flyout = document.getElementById('taskbar-calendar-flyout');
            if (!flyout) return { error: 'flyout element not found' };
            const isVisible = flyout.classList.contains('visible');
            const liveTime = flyout.querySelector('.cal-live-time')?.textContent;
            const fullDate = flyout.querySelector('.cal-full-date')?.textContent;
            const monthTitle = flyout.querySelector('.cal-month-title')?.textContent?.trim();
            const dayCount = flyout.querySelectorAll('.cal-day').length;
            const hasToday = !!flyout.querySelector('.cal-day.today');
            return {
                isVisible,
                liveTime,
                fullDate,
                monthTitle,
                dayCount,
                hasToday
            };
        })()
    """)
    print("Calendar Flyout Open Check:", json.dumps(cal_check, indent=2, ensure_ascii=False))

    # Test month navigation
    cdp_eval(s, "document.getElementById('cal-next-month')?.click()")
    time.sleep(0.3)
    next_month_title = cdp_eval(s, "document.querySelector('.cal-month-title')?.textContent?.trim()")
    print("Calendar after clicking Next Month:", next_month_title)

    cdp_eval(s, "document.getElementById('cal-reset-today')?.click()")
    time.sleep(0.3)
    reset_month_title = cdp_eval(s, "document.querySelector('.cal-month-title')?.textContent?.trim()")
    print("Calendar after reset to today:", reset_month_title)

    # Toggle close
    cdp_eval(s, "document.getElementById('taskbar-clock').click()")
    time.sleep(0.5)
    cal_closed = not cdp_eval(s, "document.getElementById('taskbar-calendar-flyout')?.classList.contains('visible')")
    print("Calendar Flyout Closed after toggle:", cal_closed)

    print("\n=== ALL 6 TESTS COMPLETED ===")

finally:
    proc.terminate()
