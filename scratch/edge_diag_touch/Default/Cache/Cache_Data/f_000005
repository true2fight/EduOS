/**
 * VirtualFileSystem (VFS): Центральний компонент EduOS
 * Керує віртуальними дисками C:, D:, NET:, Кошиком та вузлами файлової системи.
 */
import { storage } from './storage.js';
import { eventBus } from './event-bus.js';
import { auditLogger } from './audit-log.js';
import { profileManager } from './profiles.js';

export class VirtualFileSystem {
  constructor() {
    this.nodes = new Map(); // Cache: id -> VFSNode
    this.isLoaded = false;
  }

  generateId() {
    return 'node_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
  }

  resolveNetworkAlias(segment) {
    if (!segment) return null;
    const s = segment.trim().toLowerCase();
    const map = {
      'teacher': 'Teacher',
      'вчитель': 'Teacher',
      '192.168.1.10': 'Teacher',
      'library': 'Library',
      'бібліотека': 'Library',
      '192.168.1.20': 'Library',
      'server': 'Server',
      'сервер': 'Server',
      'server-school': 'Server',
      '192.168.1.1': 'Server',
      'pc-01': 'PC-01',
      'pc01': 'PC-01',
      'pc-1': 'PC-01',
      'pc1': 'PC-01',
      '192.168.1.101': 'PC-01',
      'pc-02': 'PC-02',
      'pc02': 'PC-02',
      'pc-2': 'PC-02',
      'pc2': 'PC-02',
      '192.168.1.102': 'PC-02',
      'pc-03': 'PC-03',
      'pc03': 'PC-03',
      'pc-3': 'PC-03',
      'pc3': 'PC-03',
      '192.168.1.103': 'PC-03'
    };
    return map[s] || null;
  }

  normalizePath(pathStr = '', cwd = 'C:\\Користувачі\\Учень') {
    if (!pathStr) return cwd;
    let p = pathStr.trim().replace(/\//g, '\\');

    // Перевірка мережевих запитів до кореня мережі
    if (
      p === '\\' ||
      p === '\\\\' ||
      p.toLowerCase() === 'мереж' ||
      p.toLowerCase() === 'мережеве оточення' ||
      p.toLowerCase() === 'network'
    ) {
      return 'NET:\\';
    }

    // UNC-шляхи вигляду \\Teacher або \\192.168.1.10\папка
    if (p.startsWith('\\\\')) {
      const stripped = p.substring(2);
      const segments = stripped.split('\\').filter(Boolean);
      if (segments.length === 0) return 'NET:\\';
      const alias = this.resolveNetworkAlias(segments[0]) || segments[0];
      const rest = segments.slice(1).join('\\');
      return rest ? `NET:\\${alias}\\${rest}` : `NET:\\${alias}`;
    }

    // Шляхи, що починаються з NET:\ або NET:
    if (/^net:/i.test(p)) {
      const stripped = p.substring(4).replace(/^\\+/, '');
      const segments = stripped.split('\\').filter(Boolean);
      if (segments.length === 0) return 'NET:\\';
      const alias = this.resolveNetworkAlias(segments[0]) || segments[0];
      const rest = segments.slice(1).join('\\');
      return rest ? `NET:\\${alias}\\${rest}` : `NET:\\${alias}`;
    }

    // Пряме введення імені мережевого ПК або його віртуальної IP-адреси
    const firstSegment = p.split('\\')[0];
    const netAlias = this.resolveNetworkAlias(firstSegment);
    if (netAlias) {
      const rest = p.split('\\').slice(1).join('\\');
      return rest ? `NET:\\${netAlias}\\${rest}` : `NET:\\${netAlias}`;
    }

    // Якщо це відносний шлях, додаємо cwd
    if (!/^[a-zA-Z]:\\/.test(p)) {
      p = cwd.endsWith('\\') ? `${cwd}${p}` : `${cwd}\\${p}`;
    }

    // Розбираємо частини шляху з урахуванням . та ..
    const parts = p.split('\\');
    const resolved = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part || part === '.') continue;
      if (part === '..') {
        if (resolved.length > 1) {
          resolved.pop();
        }
      } else {
        resolved.push(part);
      }
    }

    // Відновлюємо шлях
    if (resolved.length === 1 && /^[a-zA-Z]:$/.test(resolved[0])) {
      return `${resolved[0]}\\`;
    }
    return resolved.join('\\');
  }

  async initForProfile(profileId) {
    this.nodes.clear();
    const storedNodes = await storage.getByIndex('vfs_nodes', 'by_profile', profileId);

    if (storedNodes && storedNodes.length > 0) {
      storedNodes.forEach((node) => this.nodes.set(node.id, node));
      await this.ensureNetworkNodes(profileId);
    } else {
      await this.buildDefaultTree(profileId);
    }

    this.isLoaded = true;
    eventBus.emit('vfs:ready', { profileId, totalNodes: this.nodes.size });
  }

  async buildDefaultTree(profileId) {
    const now = Date.now();

    // 1. Корінь: Диск C:
    const driveC = {
      id: `drive_c_${profileId}`,
      profileId,
      parentId: null,
      name: 'Локальний диск (C:)',
      type: 'drive',
      extension: '',
      size: 0,
      createdAt: now,
      updatedAt: now,
      attributes: { readonly: false, hidden: false, system: true },
      permissions: { owner: 'system', r: true, w: true, x: true },
      content: null,
      metadata: { driveLetter: 'C:', label: 'Локальний диск' }
    };
    this.nodes.set(driveC.id, driveC);
    await storage.put('vfs_nodes', driveC);

    // 2. Корінь: Навчальний диск D:
    const driveD = {
      id: `drive_d_${profileId}`,
      profileId,
      parentId: null,
      name: 'Навчальний диск (D:)',
      type: 'drive',
      extension: '',
      size: 0,
      createdAt: now,
      updatedAt: now,
      attributes: { readonly: false, hidden: false, system: false },
      permissions: { owner: 'student', r: true, w: true, x: true },
      content: null,
      metadata: { driveLetter: 'D:', label: 'Навчальний диск' }
    };
    this.nodes.set(driveD.id, driveD);
    await storage.put('vfs_nodes', driveD);

    // 3. Корінь: Мережевий диск NET:
    const driveNet = {
      id: `drive_net_${profileId}`,
      profileId,
      parentId: null,
      name: 'Мережеве оточення',
      type: 'drive',
      extension: '',
      size: 0,
      createdAt: now,
      updatedAt: now,
      attributes: { readonly: true, hidden: false, system: true },
      permissions: { owner: 'network', r: true, w: false, x: true },
      content: null,
      metadata: { driveLetter: 'NET:', label: 'Мережа' }
    };
    this.nodes.set(driveNet.id, driveNet);
    await storage.put('vfs_nodes', driveNet);

    // 4. Корінь: Кошик
    const trashRoot = {
      id: `trash_root_${profileId}`,
      profileId,
      parentId: null,
      name: 'Кошик',
      type: 'drive',
      extension: '',
      size: 0,
      createdAt: now,
      updatedAt: now,
      attributes: { readonly: false, hidden: false, system: true },
      permissions: { owner: 'system', r: true, w: true, x: true },
      content: null,
      metadata: { isRecycleBin: true }
    };
    this.nodes.set(trashRoot.id, trashRoot);
    await storage.put('vfs_nodes', trashRoot);

    // 5. Структура на C:
    const usersDir = await this._addNode(profileId, driveC.id, 'Користувачі', 'directory');
    const studentDir = await this._addNode(profileId, usersDir.id, 'Учень', 'directory');

    const desktopDir = await this._addNode(profileId, studentDir.id, 'Робочий стіл', 'directory');
    const docsDir = await this._addNode(profileId, studentDir.id, 'Документи', 'directory');
    const picsDir = await this._addNode(profileId, studentDir.id, 'Зображення', 'directory');
    const musicDir = await this._addNode(profileId, studentDir.id, 'Музика', 'directory');
    const videoDir = await this._addNode(profileId, studentDir.id, 'Відео', 'directory');
    const downloadsDir = await this._addNode(profileId, studentDir.id, 'Завантаження', 'directory');

    // Файли привітання
    await this._addNode(
      profileId,
      desktopDir.id,
      'Ласкаво_просимо.txt',
      'file',
      'Вітаємо в інтерактивній навчальній операційній системі EduOS v2.0!\n\nТут ви можете виконувати практичні роботи з інформатики, малювати в Paint, писати програми, працювати в терміналі та отримувати персональні сертифікати.'
    );

    await this._addNode(
      profileId,
      docsDir.id,
      'Пам\'ятка_безпеки_в_інтернеті.txt',
      'Правила безпечної поведінки в мережі Інтернет:\n1. Ніколи не передавайте персональні паролі стороннім особам.\n2. Перевіряйте розширення завантажених файлів.\n3. Не переходьте за підозрілими посиланнями.'
    );

    // 6. Структура на D:
    await this._addNode(profileId, driveD.id, 'Інформатика', 'directory');
    await this._addNode(profileId, driveD.id, 'Практичні роботи', 'directory');
    await this._addNode(profileId, driveD.id, 'Проєкти', 'directory');

    // 7. Структура навчальної локальної мережі класу (Teacher, Library, Server, PC-01, PC-02, PC-03)
    await this.ensureNetworkNodes(profileId);
  }

  async ensureNetworkNodes(profileId) {
    let driveNet = null;
    for (const node of this.nodes.values()) {
      if (node.type === 'drive' && node.metadata && node.metadata.driveLetter === 'NET:') {
        driveNet = node;
        break;
      }
    }

    if (!driveNet) {
      const now = Date.now();
      driveNet = {
        id: `drive_net_${profileId}`,
        profileId,
        parentId: null,
        name: 'Мережеве оточення',
        type: 'drive',
        extension: '',
        size: 0,
        createdAt: now,
        updatedAt: now,
        attributes: { readonly: true, hidden: false, system: true },
        permissions: { owner: 'network', r: true, w: false, x: true },
        content: null,
        metadata: { driveLetter: 'NET:', label: 'Мережа' }
      };
      this.nodes.set(driveNet.id, driveNet);
      await storage.put('vfs_nodes', driveNet);
    }

    const netChildren = this.listChildren(driveNet.id);
    const existingMap = new Map();
    netChildren.forEach((c) => existingMap.set(c.name.toLowerCase(), c));

    // Навчальні віртуальні комп'ютери локальної мережі класу
    const computersConfig = [
      {
        name: 'Teacher',
        ip: '192.168.1.10',
        label: 'Комп\'ютер вчителя (Teacher)',
        role: 'teacher',
        folders: [
          {
            name: 'Завдання_та_інструкції',
            files: [
              {
                name: 'Критерії_оцінювання_практичних.txt',
                content: 'Критерії оцінювання навчальних практичних робіт в EduOS:\n1. Точність виконання покрокових інструкцій — до 6 балів.\n2. Робота з файлами, папками та дисками — до 4 балів.\n3. Робота в мережі та терміналі — до 2 балів.\nЗагальна оцінка: 12-бальна шкала МОН України.'
              },
              {
                name: 'Тема_Уроку_Локальні_мережі.txt',
                content: 'Тема уроку: Основи побудови локальних комп\'ютерних мереж.\n\nОсновні поняття:\n1. IP-адреса — унікальний ідентифікатор комп\'ютера в мережі (наприклад 192.168.1.10).\n2. Мережні ресурси — спільні папки (Shared Folders) та файли, доступні для інших комп\'ютерів.\n3. Мережевий шлях UNC: \\\\Teacher або \\\\192.168.1.10\n4. Команда ping — утиліта для перевірки наявності зв\'язку між комп\'ютерами.'
              },
              {
                name: 'Вказівки_до_роботи.txt',
                content: 'Увага учням!\nПеред початком виконання практичної роботи перевірте доступність спільної папки та завантажте роздаткові матеріали.'
              }
            ]
          },
          {
            name: 'Спільна_папка_Вчителя',
            files: [
              {
                name: 'Зразки_виконаних_робіт.txt',
                content: 'Зразки оформлення звітів практичних робіт:\n- Практична робота 5 класу: Робочий стіл та Paint.\n- Практична робота 6 класу: Файли та папки на диску D:.\n- Практична робота 7 класу: Архівація ZIP та розархівування.'
              },
              {
                name: 'Додаткові_матеріали.txt',
                content: 'Довідкові таблиці мережевих протоколів та адресації для 8-9 класів.'
              }
            ]
          }
        ]
      },
      {
        name: 'Library',
        ip: '192.168.1.20',
        label: 'Комп\'ютер бібліотеки (Library)',
        role: 'library',
        folders: [
          {
            name: 'Електронні_книги',
            files: [
              {
                name: 'Каталог_бібліотеки.txt',
                content: 'Каталог електронних підручників шкільної бібліотеки:\n1. Інформатика 5 клас (НУШ)\n2. Інформатика 6 клас (НУШ)\n3. Інформатика 7 клас\n4. Інформатика 8 клас\n5. Інформатика 9 клас\n6. Інформатика 10-11 класи (стандарт та профільний)'
              },
              {
                name: 'Енциклопедія_комп\'ютерів.txt',
                content: 'Коротка енциклопедія історії обчислювальної техніки:\n- Покоління ЕОМ.\n- Архітектура фон Неймана.\n- Розвиток операційних систем та графічного інтерфейсу.'
              }
            ]
          },
          {
            name: 'Медіатека',
            files: [
              {
                name: 'Правила_користування_бібліотекою.txt',
                content: 'Правила користування ресурсами шкільної медіатеки:\n- Дбайливо ставтеся до цифрових матеріалів.\n- Забороняється несанкціоноване видалення спільних файлів.'
              }
            ]
          }
        ]
      },
      {
        name: 'Server',
        ip: '192.168.1.1',
        label: 'Шкільний загальний сервер (Server)',
        role: 'server',
        folders: [
          {
            name: 'Спільні_ресурси',
            files: [
              {
                name: 'Підручник_з_інформатики.txt',
                content: 'Підручник з інформатики для учнів 5-11 класів.\nРозділ 1: Операційні системи та файлові менеджери.\nРозділ 2: Архівація та передача даних.\nРозділ 3: Локальні та глобальні мережі.'
              },
              {
                name: 'ПЗ_для_уроків.txt',
                content: 'Рекомендоване базове навчальне програмне забезпечення для комп\'ютерного класу:\n- Текстовий редактор Блокнот\n- Графічний редактор Paint\n- Архіватор ZIP/7Z\n- Командний рядок CMD та Bash'
              },
              {
                name: 'Шкільні_правила.txt',
                content: 'Правила поведінки та безпеки життєдіяльності в кабінеті інформатики.'
              }
            ]
          },
          {
            name: 'Загальний_обмін',
            files: [
              {
                name: 'Оголошення_школи.txt',
                content: 'Шкільні новини: Олімпіада з інформатики відбудеться наступного тижня!'
              }
            ]
          }
        ]
      },
      {
        name: 'PC-01',
        ip: '192.168.1.101',
        label: 'Учнівський комп\'ютер 1 (PC-01)',
        role: 'workstation',
        folders: [
          {
            name: 'Спільні_документи',
            files: [
              {
                name: 'Проєкт_Групи_1.txt',
                content: 'Спільний навчальний проєкт учнівської групи 1: Дослідження мережевих ресурсів.'
              }
            ]
          }
        ]
      },
      {
        name: 'PC-02',
        ip: '192.168.1.102',
        label: 'Учнівський комп\'ютер 2 (PC-02)',
        role: 'workstation',
        folders: [
          {
            name: 'Спільні_документи',
            files: [
              {
                name: 'Презентація_Команди_2.txt',
                content: 'Матеріали навчальної презентації команди 2: Безпека у локальних мережах.'
              }
            ]
          }
        ]
      },
      {
        name: 'PC-03',
        ip: '192.168.1.103',
        label: 'Учнівський комп\'ютер 3 (PC-03)',
        role: 'workstation',
        folders: [
          {
            name: 'Спільні_документи',
            files: [
              {
                name: 'Звіт_Практичної_роботи_3.txt',
                content: 'Звіт про виконання практичної роботи: налаштування мережі та передача файлів.'
              }
            ]
          }
        ]
      }
    ];

    for (const comp of computersConfig) {
      let compNode = existingMap.get(comp.name.toLowerCase());
      if (!compNode) {
        // Якщо раніше була стара назва 'SERVER-SCHOOL' і зараз ми створюємо 'Server'
        if (comp.name === 'Server' && existingMap.has('server-school')) {
          compNode = existingMap.get('server-school');
          compNode.name = 'Server';
        } else {
          compNode = await this._addNode(profileId, driveNet.id, comp.name, 'directory', null, { readonly: true });
        }
      }

      compNode.metadata = {
        ...(compNode.metadata || {}),
        ip: comp.ip,
        computerName: comp.name,
        label: comp.label,
        role: comp.role,
        isComputer: true
      };
      await storage.put('vfs_nodes', compNode);

      for (const folder of comp.folders) {
        let folderNode = this.listChildren(compNode.id).find((c) => c.name.toLowerCase() === folder.name.toLowerCase());
        if (!folderNode) {
          folderNode = await this._addNode(profileId, compNode.id, folder.name, 'directory');
        }

        const existingFiles = new Set(this.listChildren(folderNode.id).map((c) => c.name.toLowerCase()));
        for (const file of folder.files) {
          if (!existingFiles.has(file.name.toLowerCase())) {
            await this._addNode(profileId, folderNode.id, file.name, 'file', file.content);
          }
        }
      }
    }
  }

  async _addNode(profileId, parentId, name, type, content = null, attributes = {}, metadata = {}) {
    const ext = type === 'file' ? (name.includes('.') ? name.split('.').pop().toLowerCase() : 'txt') : '';
    const now = Date.now();
    const node = {
      id: this.generateId(),
      profileId,
      parentId,
      name,
      type,
      extension: ext,
      size: content ? (typeof content === 'string' ? content.length : content.byteLength || 1024) : 0,
      createdAt: now,
      updatedAt: now,
      attributes: {
        readonly: attributes.readonly || false,
        hidden: attributes.hidden || false,
        system: attributes.system || false
      },
      permissions: { owner: 'student', r: true, w: true, x: true },
      content,
      metadata: { ...metadata }
    };

    this.nodes.set(node.id, node);
    await storage.put('vfs_nodes', node);
    return node;
  }

  getNode(id) {
    return this.nodes.get(id) || null;
  }

  getNodePath(nodeId) {
    const node = this.getNode(nodeId);
    if (!node) return '';

    if (node.type === 'drive') {
      if (node.metadata && node.metadata.driveLetter) {
        return node.metadata.driveLetter;
      }
      return node.name;
    }

    const segments = [node.name];
    let curr = node;
    while (curr && curr.parentId) {
      curr = this.getNode(curr.parentId);
      if (curr) {
        if (curr.type === 'drive') {
          const prefix = curr.metadata && curr.metadata.driveLetter ? curr.metadata.driveLetter : curr.name;
          segments.unshift(prefix);
          break;
        } else {
          segments.unshift(curr.name);
        }
      }
    }
    return segments.join('\\');
  }

  resolvePath(rawPath, cwd = 'C:\\Користувачі\\Учень') {
    if (!rawPath) return null;
    const norm = this.normalizePath(rawPath, cwd);

    // Спеціальні випадки кореневих дисків
    if (norm === 'C:' || norm === 'C:\\') {
      for (const node of this.nodes.values()) {
        if (node.type === 'drive' && node.metadata && node.metadata.driveLetter === 'C:') return node;
      }
    }
    if (norm === 'D:' || norm === 'D:\\') {
      for (const node of this.nodes.values()) {
        if (node.type === 'drive' && node.metadata && node.metadata.driveLetter === 'D:') return node;
      }
    }
    if (norm === 'NET:' || norm === 'NET:\\' || norm.toLowerCase().includes('мереж')) {
      for (const node of this.nodes.values()) {
        if (node.type === 'drive' && node.metadata && node.metadata.driveLetter === 'NET:') return node;
      }
    }
    if (norm.toLowerCase().includes('кошик') || norm.toLowerCase().includes('recycle')) {
      for (const node of this.nodes.values()) {
        if (node.type === 'drive' && node.metadata && node.metadata.isRecycleBin) return node;
      }
    }

    // Поділ на сегменти
    const parts = norm.split('\\').filter(Boolean);
    if (parts.length === 0) return null;

    // Визначаємо стартовий вузол за першим сегментом
    const rootName = parts[0];
    let current = null;

    for (const node of this.nodes.values()) {
      if (node.type === 'drive') {
        if (
          (node.metadata && node.metadata.driveLetter && node.metadata.driveLetter.startsWith(rootName)) ||
          node.name.toLowerCase().includes(rootName.toLowerCase())
        ) {
          current = node;
          break;
        }
      }
    }

    if (!current) return null;

    // Спускаємося вниз по дереву
    for (let i = 1; i < parts.length; i++) {
      const partName = parts[i].toLowerCase();
      const children = this.listChildren(current.id);
      const matched = children.find((c) => 
        c.name.toLowerCase() === partName ||
        (c.metadata && c.metadata.ip && c.metadata.ip.toLowerCase() === partName) ||
        (c.metadata && c.metadata.computerName && c.metadata.computerName.toLowerCase() === partName)
      );
      if (!matched) return null;
      current = matched;
    }

    return current;
  }

  listChildren(parentId, includeHidden = true) {
    const list = [];
    for (const node of this.nodes.values()) {
      if (node.parentId === parentId) {
        if (!includeHidden && node.attributes.hidden) continue;
        list.push(node);
      }
    }
    return list.sort((a, b) => {
      // Папки завжди попереду файлів
      if (a.type !== b.type) {
        if (a.type === 'directory' || a.type === 'drive') return -1;
        if (b.type === 'directory' || b.type === 'drive') return 1;
      }
      return a.name.localeCompare(b.name, 'uk', { sensitivity: 'base' });
    });
  }

  async createDirectory(parentPathOrId, name) {
    const parent = typeof parentPathOrId === 'string' && this.nodes.has(parentPathOrId)
      ? this.getNode(parentPathOrId)
      : this.resolvePath(parentPathOrId);

    if (!parent) throw new Error('Батьківський каталог не знайдено');
    if (parent.type !== 'directory' && parent.type !== 'drive') {
      throw new Error('Неможливо створити папку у файлі');
    }

    // Перевірка на унікальність імені
    const existing = this.listChildren(parent.id).find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      throw new Error(`Об'єкт із назвою "${name}" вже існує в цьому каталозі`);
    }

    const profileId = profileManager.currentProfile ? profileManager.currentProfile.profileId : 'default';
    const newNode = await this._addNode(profileId, parent.id, name.trim(), 'directory');

    await auditLogger.log('create_directory', { path: this.getNodePath(newNode.id), name });
    eventBus.emit('vfs:change', { action: 'create', node: newNode, parentId: parent.id });
    return newNode;
  }

  async createFile(parentPathOrId, name, content = '', attributes = {}) {
    const parent = typeof parentPathOrId === 'string' && this.nodes.has(parentPathOrId)
      ? this.getNode(parentPathOrId)
      : this.resolvePath(parentPathOrId);

    if (!parent) throw new Error('Батьківський каталог не знайдено');

    const cleanName = name.trim();
    const existing = this.listChildren(parent.id).find((c) => c.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      // Оновлюємо наявний файл
      return await this.writeFile(existing.id, content);
    }

    const profileId = profileManager.currentProfile ? profileManager.currentProfile.profileId : 'default';
    const newNode = await this._addNode(profileId, parent.id, cleanName, 'file', content, attributes);

    await auditLogger.log('create_file', { path: this.getNodePath(newNode.id), name: cleanName });
    eventBus.emit('vfs:change', { action: 'create', node: newNode, parentId: parent.id });
    return newNode;
  }

  async readFile(pathOrId) {
    const node = this.nodes.has(pathOrId) ? this.getNode(pathOrId) : this.resolvePath(pathOrId);
    if (!node) throw new Error('Файл не знайдено');
    if (node.type !== 'file') throw new Error('Об\'єкт не є файлом');
    return node.content || '';
  }

  async writeFile(pathOrId, content) {
    const node = this.nodes.has(pathOrId) ? this.getNode(pathOrId) : this.resolvePath(pathOrId);
    if (!node) throw new Error('Файл не знайдено');
    if (node.attributes.readonly) {
      throw new Error('Файл захищено від запису (атрибут "Лише для читання")');
    }

    node.content = content;
    node.size = typeof content === 'string' ? content.length : (content && content.byteLength) || 0;
    node.updatedAt = Date.now();

    await storage.put('vfs_nodes', node);
    await auditLogger.log('write_file', { path: this.getNodePath(node.id) });
    eventBus.emit('vfs:change', { action: 'update', node, parentId: node.parentId });
    return node;
  }

  async deleteNode(pathOrId, permanent = false) {
    const node = this.nodes.has(pathOrId) ? this.getNode(pathOrId) : this.resolvePath(pathOrId);
    if (!node) throw new Error('Об\'єкт не знайдено');
    if (node.type === 'drive' || node.attributes.system) {
      throw new Error('Неможливо видалити системний розділ або системний файл');
    }

    const oldPath = this.getNodePath(node.id);
    const parentId = node.parentId;

    if (!permanent) {
      // Переміщення до кошика
      let trash = null;
      for (const n of this.nodes.values()) {
        if (n.type === 'drive' && n.metadata && n.metadata.isRecycleBin) {
          trash = n;
          break;
        }
      }
      if (!trash) throw new Error('Кошик не знайдено');

      node.metadata = node.metadata || {};
      node.metadata.originalParentId = node.parentId;
      node.metadata.originalPath = oldPath;
      node.metadata.deletedAt = Date.now();
      node.parentId = trash.id;
      node.updatedAt = Date.now();

      await storage.put('vfs_nodes', node);
      await auditLogger.log('delete_to_trash', { oldPath, name: node.name });
      eventBus.emit('vfs:change', { action: 'trash', node, parentId });
    } else {
      // Остаточне видалення вузла та всіх його дітей
      await this._recursiveDestroy(node.id);
      await auditLogger.log('permanent_delete', { oldPath, name: node.name });
      eventBus.emit('vfs:change', { action: 'delete', nodeId: node.id, parentId });
    }
  }

  async _recursiveDestroy(nodeId) {
    const children = this.listChildren(nodeId);
    for (const child of children) {
      await this._recursiveDestroy(child.id);
    }
    this.nodes.delete(nodeId);
    await storage.delete('vfs_nodes', nodeId);
  }

  async restoreFromTrash(nodeId) {
    const node = this.getNode(nodeId);
    if (!node || !node.metadata || !node.metadata.originalParentId) {
      throw new Error('Неможливо відновити об\'єкт з кошика');
    }

    let origParent = this.getNode(node.metadata.originalParentId);
    if (!origParent) {
      // Якщо оригінальну папку було видалено, відновлюємо на Робочий стіл
      origParent = this.resolvePath('C:\\Користувачі\\Учень\\Робочий стіл');
    }

    const prevParentId = node.parentId;
    node.parentId = origParent.id;
    const restoredPath = this.getNodePath(node.id);
    delete node.metadata.originalParentId;
    delete node.metadata.deletedAt;
    node.updatedAt = Date.now();

    await storage.put('vfs_nodes', node);
    await auditLogger.log('restore_from_trash', { path: restoredPath, name: node.name });
    eventBus.emit('vfs:change', { action: 'restore', node, parentId: prevParentId, newParentId: origParent.id });
    return node;
  }

  async emptyTrash() {
    let trash = null;
    for (const n of this.nodes.values()) {
      if (n.type === 'drive' && n.metadata && n.metadata.isRecycleBin) {
        trash = n;
        break;
      }
    }
    if (!trash) return;

    const items = this.listChildren(trash.id);
    for (const item of items) {
      await this._recursiveDestroy(item.id);
    }
    await auditLogger.log('empty_trash', { count: items.length });
    eventBus.emit('vfs:change', { action: 'empty_trash', trashId: trash.id });
  }

  async renameNode(pathOrId, newName) {
    const node = this.nodes.has(pathOrId) ? this.getNode(pathOrId) : this.resolvePath(pathOrId);
    if (!node) throw new Error('Об\'єкт не знайдено');
    if (node.type === 'drive') throw new Error('Зміна імені диска виконується через Керування дисками');

    const clean = newName.trim();
    if (!clean) throw new Error('Назва не може бути порожньою');

    const oldName = node.name;
    const siblings = this.listChildren(node.parentId);
    if (siblings.some((s) => s.id !== node.id && s.name.toLowerCase() === clean.toLowerCase())) {
      throw new Error(`Об'єкт із назвою "${clean}" уже існує в цій папці`);
    }

    node.name = clean;
    if (node.type === 'file' && clean.includes('.')) {
      node.extension = clean.split('.').pop().toLowerCase();
    }
    node.updatedAt = Date.now();

    await storage.put('vfs_nodes', node);
    await auditLogger.log('rename_node', { oldName, newName: clean, path: this.getNodePath(node.id) });
    eventBus.emit('vfs:change', { action: 'rename', node, parentId: node.parentId });
    return node;
  }

  async moveNode(srcPathOrId, destParentPathOrId) {
    const node = this.nodes.has(srcPathOrId) ? this.getNode(srcPathOrId) : this.resolvePath(srcPathOrId);
    const dest = this.nodes.has(destParentPathOrId) ? this.getNode(destParentPathOrId) : this.resolvePath(destParentPathOrId);

    if (!node) throw new Error('Вихідний об\'єкт не знайдено');
    if (!dest) throw new Error('Цільову папку не знайдено');
    if (dest.type !== 'directory' && dest.type !== 'drive') throw new Error('Ціль повинна бути каталогом або диском');

    // Перевірка: не можна перемістити папку в саму себе або в її підпапку
    let check = dest;
    while (check && check.parentId) {
      if (check.id === node.id) {
        throw new Error('Неможливо перемістити каталог усередину самого себе');
      }
      check = this.getNode(check.parentId);
    }

    const oldParentId = node.parentId;
    node.parentId = dest.id;
    node.updatedAt = Date.now();

    await storage.put('vfs_nodes', node);
    await auditLogger.log('move_node', { name: node.name, from: oldParentId, to: dest.id });
    eventBus.emit('vfs:change', { action: 'move', node, oldParentId, newParentId: dest.id });
    return node;
  }

  async copyNode(srcPathOrId, destParentPathOrId, newName = null) {
    const node = this.nodes.has(srcPathOrId) ? this.getNode(srcPathOrId) : this.resolvePath(srcPathOrId);
    const dest = this.nodes.has(destParentPathOrId) ? this.getNode(destParentPathOrId) : this.resolvePath(destParentPathOrId);

    if (!node || !dest) throw new Error('Помилка копіювання: не знайдено вихідний або цільовий вузол');

    const profileId = profileManager.currentProfile ? profileManager.currentProfile.profileId : 'default';
    const finalName = newName || node.name;

    const copyRecursive = async (currNode, targetParentId, currentName) => {
      const newNode = await this._addNode(
        profileId,
        targetParentId,
        currentName,
        currNode.type,
        currNode.content,
        currNode.attributes
      );

      if (currNode.type === 'directory') {
        const children = this.listChildren(currNode.id);
        for (const child of children) {
          await copyRecursive(child, newNode.id, child.name);
        }
      }
      return newNode;
    };

    const copied = await copyRecursive(node, dest.id, finalName);
    await auditLogger.log('copy_node', { name: node.name, targetPath: this.getNodePath(dest.id) });
    eventBus.emit('vfs:change', { action: 'copy', node: copied, parentId: dest.id });
    return copied;
  }

  async setAttributes(pathOrId, attributes = {}) {
    const node = this.nodes.has(pathOrId) ? this.getNode(pathOrId) : this.resolvePath(pathOrId);
    if (!node) throw new Error('Об\'єкт не знайдено');

    node.attributes = { ...node.attributes, ...attributes };
    node.updatedAt = Date.now();

    await storage.put('vfs_nodes', node);
    await auditLogger.log('set_attributes', { path: this.getNodePath(node.id), attributes });
    eventBus.emit('vfs:change', { action: 'attributes', node, parentId: node.parentId });
    return node;
  }

  search(query, startPath = 'C:\\') {
    const q = (query || '').toLowerCase().trim();
    if (!q) return [];

    const root = this.resolvePath(startPath) || this.resolvePath('C:\\');
    const results = [];

    const traverse = (dirId) => {
      const children = this.listChildren(dirId);
      for (const child of children) {
        if (child.name.toLowerCase().includes(q)) {
          results.push(child);
        }
        if (child.type === 'directory') {
          traverse(child.id);
        }
      }
    };

    if (root) traverse(root.id);
    return results;
  }

  async formatDisk(driveLetter = 'D:') {
    const root = this.resolvePath(driveLetter);
    if (!root || root.type !== 'drive') throw new Error(`Диск ${driveLetter} не знайдено`);

    const children = this.listChildren(root.id);
    for (const child of children) {
      await this._recursiveDestroy(child.id);
    }

    const profileId = profileManager.currentProfile ? profileManager.currentProfile.profileId : 'default';
    await this._addNode(profileId, root.id, 'Інформатика', 'directory');
    await this._addNode(profileId, root.id, 'Практичні роботи', 'directory');
    await this._addNode(profileId, root.id, 'Проєкти', 'directory');

    await auditLogger.log('format_disk', { drive: driveLetter });
    eventBus.emit('vfs:change', { action: 'format', drive: driveLetter });
  }
}

export const vfs = new VirtualFileSystem();
