# Техническое задание: Slovariken

**Версия документа:** 1.0
**Дата:** 2026-03-19
**Тип приложения:** Десктопное приложение (Windows)

---

## Содержание

1. [Общее описание](#1-общее-описание)
2. [Технический стек](#2-технический-стек)
3. [Структура файлов](#3-структура-файлов)
4. [Модель данных](#4-модель-данных)
5. [Главный процесс (main process)](#5-главный-процесс-main-process)
6. [Менеджер окон (windowManager.js)](#6-менеджер-окон-windowmanagerjs)
7. [Планировщик слов (wordScheduler.js)](#7-планировщик-слов-wordschedulerjs)
8. [Системный трей (trayManager.js)](#8-системный-трей-traymanagerjs)
9. [IPC-обработчики (ipcHandlers.js)](#9-ipc-обработчики-ipchandlersjs)
10. [Preload-скрипты](#10-preload-скрипты)
11. [Оверлей (renderer-overlay)](#11-оверлей-renderer-overlay)
12. [Главное окно (renderer-main)](#12-главное-окно-renderer-main)
13. [Интернационализация (i18n.js)](#13-интернационализация-i18njs)
14. [Конфигурация сборки](#14-конфигурация-сборки)
15. [Важные технические нюансы](#15-важные-технические-нюансы)

---

## 1. Общее описание

**Slovariken** — персональный инструмент для изучения словарного запаса. Пользователь добавляет слова с переводами и примерами предложений. Приложение отображает плавающий виджет-оверлей поверх всех окон, который циклически показывает неизученные слова через настраиваемый интервал времени. При наведении курсора на оверлей появляется кнопка «Отметить как изученное». Изученные слова можно вернуть в очередь. Приложение работает в фоне через значок в системном трее.

### Ключевые возможности

- Добавление, редактирование и удаление слов с переводом и примером
- Автоматическая ротация слов на плавающем оверлее
- Два режима оверлея: классический (карточка) и таскбар (полоса над панелью задач)
- Две темы оверлея: тёмная и светлая
- Настраиваемый интервал ротации (от 1 секунды до 24 часов)
- Импорт слов из JSON-файла
- Двуязычный интерфейс (EN/RU)
- Полностью офлайн, без внешних зависимостей

---

## 2. Технический стек

| Компонент | Технология | Версия |
|-----------|------------|--------|
| Рантайм | Electron | 34 |
| Рендерер | React | 19 |
| Сборщик | Vite | 6 |
| Интеграция Electron+Vite | vite-plugin-electron | — |
| Упаковщик | electron-builder | — |
| Хранилище | JSON-файл на диске | — |
| UI-библиотека | Нет (чистые inline React-стили) | — |
| База данных | Нет | — |
| Интернет | Не используется | — |

### Модули Node.js

- Главный процесс (main process): CommonJS (CJS), Node.js
- Рендерер: ES modules, React/JSX, Vite

### Скрипты package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

- `npm run dev` — режим разработки с горячей перезагрузкой (vite-plugin-electron обрабатывает оба процесса)
- `npm run build` — продакшн-сборка
- `npx electron-builder --dir` — упаковка в `release/win-unpacked/`

---

## 3. Структура файлов

```
slovariken/
├── package.json
├── vite.config.js
├── src/
│   ├── main/
│   │   ├── main.js             # Точка входа приложения
│   │   ├── storage.js          # Персистентность через JSON
│   │   ├── windowManager.js    # Фабрики BrowserWindow
│   │   ├── trayManager.js      # Системный трей
│   │   ├── ipcHandlers.js      # Все ipcMain-обработчики
│   │   └── wordScheduler.js    # Циклическая ротация слов
│   ├── preload/
│   │   ├── preload-main.js     # contextBridge для главного окна
│   │   └── preload-overlay.js  # contextBridge для оверлея
│   ├── renderer-main/
│   │   ├── index.html          # HTML-оболочка главного окна
│   │   ├── main.jsx            # Точка входа React
│   │   ├── App.jsx             # Корневой компонент
│   │   ├── i18n.js             # Переводы EN/RU
│   │   └── components/
│   │       ├── WordList.jsx
│   │       ├── WordForm.jsx
│   │       ├── ImportButton.jsx
│   │       └── Settings.jsx
│   └── renderer-overlay/
│       ├── index.html          # HTML-оболочка оверлея
│       ├── main.jsx            # Точка входа React
│       └── App.jsx             # Корневой компонент оверлея
```

---

## 4. Модель данных

### Файл хранилища

Путь: `{app.getPath('userData')}/words.json`

### Схема JSON

```json
{
  "version": 1,
  "words": [
    {
      "id": "uuid-v4",
      "word": "string",
      "translation": "string",
      "example": "string (необязательно, может быть пустой строкой)",
      "learned": false,
      "addedAt": 1710000000000,
      "learnedAt": null
    }
  ],
  "lastShownId": "uuid или null",
  "settings": {
    "overlayMode": "classic",
    "overlayTheme": "dark",
    "overlayInterval": 180,
    "overlayPositions": {
      "classic": { "x": 1200, "y": 900 },
      "taskbar": { "x": 800 }
    }
  }
}
```

### Поля объекта слова

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string (UUID v4) | Уникальный идентификатор |
| `word` | string | Слово (обязательно) |
| `translation` | string | Перевод (обязательно) |
| `example` | string | Пример предложения (необязательно) |
| `learned` | boolean | Флаг изученности |
| `addedAt` | number | Unix timestamp добавления (мс) |
| `learnedAt` | number \| null | Unix timestamp изучения (мс) или null |

### Поля настроек

| Поле | Тип | Значения | По умолчанию |
|------|-----|----------|-------------|
| `overlayMode` | string | `'classic'` \| `'taskbar'` | `'classic'` |
| `overlayTheme` | string | `'dark'` \| `'light'` | `'dark'` |
| `overlayInterval` | number | секунды [1..86400] | `180` |
| `overlayPositions.classic` | `{x, y}` \| null | координаты пикселей | `null` |
| `overlayPositions.taskbar` | `{x}` \| null | только X | `null` |

### Данные по умолчанию

Используются при первом запуске, когда файл `words.json` отсутствует:

```js
{
  version: 1,
  words: [],
  lastShownId: null,
  settings: {
    overlayMode: 'classic',
    overlayTheme: 'dark',
    overlayInterval: 180,
    overlayPositions: { classic: null, taskbar: null }
  }
}
```

---

## 5. Главный процесс (main process)

### 5.1. storage.js

Модуль отвечает за чтение и запись файла `words.json`. Реализует паттерн очереди записи во избежание конкурентных операций записи.

#### Внутреннее состояние

```js
let cachedData = null;       // Данные в памяти
let isWriting = false;       // Флаг активной записи
let pendingData = null;      // Данные, ожидающие записи
```

#### Паттерн очереди записи

При вызове `setData(data)`:
1. Сохранить `data` в `cachedData`
2. Если `isWriting === true` — сохранить `data` в `pendingData` и выйти
3. Установить `isWriting = true`, сбросить `pendingData = null`
4. Записать файл через `fs.writeFile` (асинхронно, не блокирует главный процесс)
5. После завершения: если `pendingData !== null` — повторить запись с `pendingData`, иначе `isWriting = false`

#### Экспортируемые функции

```js
// Загрузить данные с диска (при старте). Инициализирует cachedData.
async function loadData()

// Получить данные из кэша синхронно.
function getData()

// Сохранить данные. Использует очередь записи.
function setData(data)

// Получить объект настроек из кэша.
function getSettings()

// Сохранить обновлённые настройки.
function saveSettings(settings)

// Получить сохранённую позицию оверлея для указанного режима.
function getOverlayPosition(mode)  // mode: 'classic' | 'taskbar'

// Сохранить позицию оверлея для указанного режима.
function saveOverlayPosition(mode, pos)

// Создать новый объект слова и добавить в массив words.
// Генерирует UUID v4 для id. Устанавливает addedAt = Date.now().
function createWord(word, translation, example)
```

### 5.2. main.js

Точка входа Electron-приложения.

#### Инициализация при `app.whenReady()`

```
1. Menu.setApplicationMenu(null)          — убрать стандартное меню Electron
2. await loadData()                        — загрузить данные с диска
3. Прочитать overlayMode и overlayInterval из настроек
4. scheduler.setIntervalMs(overlayInterval * 1000)
5. registerIpcHandlers({ getMainWindow, getOverlayWindow, onModeChange })
6. overlayWindow = createOverlayWindow(overlayMode, getOverlayPosition(overlayMode))
7. scheduler.startScheduler(overlayWindow)
8. createTray({ openMainWindow })
9. startCursorPolling()
```

Вспомогательные геттеры `getMainWindow()` и `getOverlayWindow()` возвращают текущие ссылки на окна (могут быть `null`, если окно ещё не создано).

`openMainWindow()` — создаёт главное окно при первом вызове через `createMainWindow()`, при повторных — показывает и фокусирует существующее.

`onModeChange(mode)` — коллбэк для IPC-обработчика смены режима. Пересоздаёт оверлей с новым режимом через `repositionOverlay(overlayWindow, mode, getOverlayPosition(mode))`.

#### Опрос курсора (cursor polling)

Интервал: 100 мс.

Логика каждого тика:

```
1. Получить экранные координаты курсора: screen.getCursorScreenPoint()
2. Получить границы оверлея: overlayWindow.getBounds()
3. Если курсор внутри границ:
     overlayWindow.setIgnoreMouseEvents(false)
   Иначе:
     overlayWindow.setIgnoreMouseEvents(true, { forward: true })
4. Каждые 10 тиков (1 секунда):
     Если overlayMode === 'taskbar':
       overlayWindow.moveTop()    — переутверждение z-order над панелью задач
```

Функция проверки попадания курсора в границы:
```js
cursor.x >= bounds.x && cursor.x <= bounds.x + bounds.width &&
cursor.y >= bounds.y && cursor.y <= bounds.y + bounds.height
```

#### Событие `moved` на overlayWindow

```
Если overlayMode === 'taskbar':
  Вычислить корректный y через getOverlayBounds('taskbar')
  Привязать (snap) окно обратно к этому y
  Сохранить только x позицию через saveOverlayPosition('taskbar', { x: newX })

Если overlayMode === 'classic':
  Сохранить обе координаты через saveOverlayPosition('classic', { x, y })
```

#### Обработчики событий приложения

```js
app.on('window-all-closed', () => {
  // Ничего не делать — приложение живёт в трее
});

app.on('before-quit', () => {
  // Очистить интервалы, остановить планировщик,
  // удалить обработчики предотвращения закрытия окон,
  // закрыть окна, уничтожить трей
});
```

---

## 6. Менеджер окон (windowManager.js)

### 6.1. Определение позиции оверлея

#### `getOverlayBounds(mode, savedPos)`

Определяет расположение и размер окна оверлея в зависимости от режима и позиции панели задач.

**Детектирование края панели задач:**

```js
const display = screen.getPrimaryDisplay();
const wa = display.workArea;   // рабочая область (без панели задач)
const b = display.bounds;      // полный экран

const trimBottom = (b.y + b.height) - (wa.y + wa.height);
const trimTop    = wa.y - b.y;
const trimRight  = (b.x + b.width) - (wa.x + wa.width);
const trimLeft   = wa.x - b.x;

// Максимальное значение trim определяет край панели задач
```

**Расчёт позиции для taskbar-режима (пример: панель задач снизу):**

```js
height = Math.max(trimBottom, 40)
width  = Math.min(320, wa.width)
x      = savedPos
           ? clamp(savedPos.x, wa.x, wa.x + wa.width - width)
           : wa.x + Math.floor((wa.width - width) / 2)
y      = wa.y + wa.height       // прямо над панелью задач
alwaysOnTopLevel = 'screen-saver'
```

Для других краёв (top/left/right) — аналогичная логика с соответствующими осями.

**Расчёт позиции для classic-режима:**

```js
width  = 300
height = 100
x      = savedPos ? savedPos.x : wa.x + wa.width - 325
y      = savedPos ? savedPos.y : wa.y + wa.height - 100
alwaysOnTopLevel = 'floating'
```

### 6.2. Создание оверлея

#### `createOverlayWindow(mode, savedPos)`

Параметры BrowserWindow:

```js
{
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: false,
  movable: true,
  focusable: false,
  hasShadow: false,
  show: false,
  webPreferences: {
    preload: path.join(__dirname, '../preload/preload-overlay.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
}
```

После создания:
1. Вычислить bounds через `getOverlayBounds(mode, savedPos)`
2. `win.setBounds(bounds)`
3. `win.setAlwaysOnTop(true, alwaysOnTopLevel)`
4. Загрузить `renderer-overlay/index.html`
5. Перехватить событие `close`: вызывать `win.hide()` вместо уничтожения

#### `repositionOverlay(win, mode, savedPos)`

Вызывает `getOverlayBounds(mode, savedPos)`, применяет `win.setBounds()` и `win.setAlwaysOnTop(true, alwaysOnTopLevel)`.

### 6.3. Создание главного окна

#### `createMainWindow()`

Параметры BrowserWindow:

```js
{
  width: 900,
  height: 650,
  minWidth: 600,
  minHeight: 400,
  title: 'Slovariken',
  frame: false,
  webPreferences: {
    preload: path.join(__dirname, '../preload/preload-main.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false   // ОБЯЗАТЕЛЬНО false для загрузки ES-модулей
  }
}
```

После создания:
1. Загрузить `renderer-main/index.html`
2. Перехватить событие `close`: вызывать `win.hide()` вместо уничтожения

> **Почему `frame: false`:** Строка заголовка рендерится в React с кастомными кнопками управления окном.
> **Почему `sandbox: false`:** При `sandbox: true` Electron блокирует корректную загрузку ES-модулей в рендерере. `contextIsolation: true` сохраняется в любом случае для безопасности.

---

## 7. Планировщик слов (wordScheduler.js)

### Внутреннее состояние

```js
let overlayWindowRef = null;
let timerHandle = null;
let currentWord = null;
let intervalMs = 180_000;    // 3 минуты по умолчанию
```

### Алгоритм выбора следующего слова

#### `getNextWord(words, lastShownId)`

1. Отфильтровать слова: только `learned === false`
2. Если список пуст — вернуть `null`
3. Найти индекс слова с `id === lastShownId` в отфильтрованном списке
4. Взять следующий элемент по кругу (round-robin):
   - Если `lastShownId` не найден или это последний элемент — вернуть первый
   - Иначе — вернуть элемент с индексом `(foundIndex + 1) % unlearnedWords.length`

### Основные функции

#### `showNext()`

```
1. data = getData()
2. nextWord = getNextWord(data.words, data.lastShownId)
3. Если nextWord === null:
     overlayWindowRef.webContents.send('overlay:allLearned')
     overlayWindowRef.hide()
     return
4. currentWord = nextWord
5. data.lastShownId = nextWord.id
6. setData(data)        — сохранить lastShownId
7. overlayWindowRef.show()
8. overlayWindowRef.webContents.send('overlay:showWord', nextWord)
```

#### `startScheduler(overlayWindow)`

```
1. overlayWindowRef = overlayWindow
2. overlayWindow.webContents.on('did-finish-load', () => {
     showNext()
     resetTimer()
   })
```

#### `resetTimer()`

```
1. if (timerHandle) clearInterval(timerHandle)
2. timerHandle = setInterval(showNext, intervalMs)
```

#### `setIntervalMs(ms)`

```
1. intervalMs = ms
2. resetTimer()
```

#### `refreshCurrentWord()`

Если `currentWord` было отредактировано, повторно отправить его в оверлей:

```
1. data = getData()
2. updatedWord = data.words.find(w => w.id === currentWord?.id)
3. if (updatedWord && !updatedWord.learned):
     currentWord = updatedWord
     overlayWindowRef.webContents.send('overlay:showWord', updatedWord)
```

#### `stopScheduler()`

```
if (timerHandle) clearInterval(timerHandle)
timerHandle = null
```

### Экспорты

```js
module.exports = {
  startScheduler,
  stopScheduler,
  resetTimer,
  showNext,
  getCurrentWord,   // () => currentWord
  getNextWord,
  refreshCurrentWord,
  setIntervalMs
};
```

---

## 8. Системный трей (trayManager.js)

### `createTray({ openMainWindow })`

**Создание иконки трея:**

Иконка создаётся программно через `nativeImage.createFromBuffer()` с сырыми RGBA-пиксельными данными (16×16 пикселей). Это позволяет избежать проблем с путями к файлу в упакованном приложении.

```js
const icon = nativeImage.createFromBuffer(Buffer.from(rawRgbaData), {
  width: 16,
  height: 16
});
const tray = new Tray(icon);
```

**Контекстное меню трея:**

```
┌─────────────────────┐
│ Open Slovariken     │  → openMainWindow()
│─────────────────────│
│ Quit                │  → app.quit()
└─────────────────────┘
```

**Клик по иконке трея:** вызывает `openMainWindow()`.

---

## 9. IPC-обработчики (ipcHandlers.js)

### `registerIpcHandlers({ getMainWindow, getOverlayWindow, onModeChange })`

Все обработчики регистрируются в этой функции.

#### Вспомогательная функция

```js
function notifyMainWindow() {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send('words:changed');
  }
}
```

### 9.1. Управление окном (ipcMain.on — fire-and-forget)

| Канал | Действие |
|-------|----------|
| `window:minimize` | `getMainWindow().minimize()` |
| `window:hide` | `getMainWindow().hide()` |

### 9.2. Работа со словами (ipcMain.handle — возвращает Promise)

#### `words:getAll`

```
Вернуть getData().words
```

#### `words:add({ word, translation, example })`

```
1. Обрезать пробелы: word.trim(), translation.trim(), example.trim()
2. Валидация: если word или translation пустые — выбросить ошибку
3. Создать слово через createWord(word, translation, example)
4. data.words.push(newWord)
5. setData(data)
6. Если оверлей скрыт — вызвать showNext()
7. notifyMainWindow()
8. Вернуть newWord
```

#### `words:update({ id, word, translation, example })`

```
1. Обрезать пробелы
2. Валидация: если word или translation пустые — выбросить ошибку
3. Найти слово по id, обновить word/translation/example
4. setData(data)
5. scheduler.refreshCurrentWord()
6. notifyMainWindow()
7. Вернуть обновлённое слово
```

#### `words:delete(id)`

```
1. Найти слово по id
2. Удалить из data.words
3. Если удалённое слово было currentWord:
     data.lastShownId = null
     showNext()
4. setData(data)
5. notifyMainWindow()
```

#### `words:import`

```
1. Открыть системный диалог выбора файла (dialog.showOpenDialog):
     filters: [{ name: 'JSON', extensions: ['json'] }]
     properties: ['openFile']
2. Если файл не выбран — вернуть { imported: 0, skipped: 0 }
3. Прочитать файл, распарсить JSON
4. Валидировать каждую запись: должны быть непустые word и translation
5. Пропустить дубликаты (слова, которые уже есть в базе по совпадению word+translation)
6. Для каждой валидной записи: createWord(entry.word, entry.translation, entry.example || '')
7. setData(data)
8. Если оверлей скрыт — вызвать showNext()
9. notifyMainWindow()
10. Вернуть { imported: N, skipped: M }
```

#### `words:unlearn(id)`

```
1. Найти слово по id
2. word.learned = false
3. word.learnedAt = null
4. setData(data)
5. notifyMainWindow()
```

### 9.3. Оверлей (ipcMain.handle)

| Канал | Действие |
|-------|----------|
| `overlay:getCurrentWord` | Вернуть `scheduler.getCurrentWord()` |
| `overlay:markLearned(id)` | Установить `learned=true`, `learnedAt=Date.now()`, сохранить, вызвать `resetTimer()` + `showNext()`, вызвать `notifyMainWindow()` |
| `overlay:getMode` | Вернуть `settings.overlayMode` |
| `overlay:getTheme` | Вернуть `settings.overlayTheme` |

### 9.4. Настройки (ipcMain.handle)

#### `settings:get`

```
Вернуть getSettings()
```

#### `settings:setOverlayMode(mode)`

```
1. Валидация: mode должен быть 'classic' или 'taskbar'
2. settings.overlayMode = mode
3. saveSettings(settings)
4. onModeChange(mode)    — репозиционировать оверлей
5. getOverlayWindow().webContents.send('overlay:modeChanged', mode)
```

#### `settings:setOverlayTheme(theme)`

```
1. Валидация: theme должен быть 'dark' или 'light'
2. settings.overlayTheme = theme
3. saveSettings(settings)
4. getOverlayWindow().webContents.send('overlay:themeChanged', theme)
```

#### `settings:setOverlayInterval(seconds)`

```
1. s = Math.round(Math.max(1, Math.min(86400, seconds)))
2. settings.overlayInterval = s
3. saveSettings(settings)
4. scheduler.setIntervalMs(s * 1000)
```

---

## 10. Preload-скрипты

Оба файла используют `contextBridge.exposeInMainWorld` для безопасного предоставления API рендереру. `contextIsolation: true` гарантирует, что рендерер не имеет прямого доступа к Node.js.

### 10.1. preload-main.js

Предоставляет `window.api`:

```js
window.api = {
  // Слова
  getWords:    ()                      => ipcRenderer.invoke('words:getAll'),
  addWord:     (word, tr, ex)          => ipcRenderer.invoke('words:add', { word, translation: tr, example: ex }),
  updateWord:  (id, word, tr, ex)      => ipcRenderer.invoke('words:update', { id, word, translation: tr, example: ex }),
  deleteWord:  (id)                    => ipcRenderer.invoke('words:delete', id),
  importWords: ()                      => ipcRenderer.invoke('words:import'),
  unlearnWord: (id)                    => ipcRenderer.invoke('words:unlearn', id),

  // Подписка на изменения слов
  onWordsChanged: (cb) => {
    const handler = (_event) => cb();
    ipcRenderer.on('words:changed', handler);
    return () => ipcRenderer.removeListener('words:changed', handler); // функция отписки
  },

  // Настройки
  getSettings:       ()       => ipcRenderer.invoke('settings:get'),
  setOverlayMode:    (mode)   => ipcRenderer.invoke('settings:setOverlayMode', mode),
  setOverlayTheme:   (theme)  => ipcRenderer.invoke('settings:setOverlayTheme', theme),
  setOverlayInterval:(s)      => ipcRenderer.invoke('settings:setOverlayInterval', s),

  // Управление окном
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow:    () => ipcRenderer.send('window:hide'),
};
```

### 10.2. preload-overlay.js

Предоставляет `window.overlayApi`:

```js
window.overlayApi = {
  getCurrentWord: ()    => ipcRenderer.invoke('overlay:getCurrentWord'),
  markLearned:    (id)  => ipcRenderer.invoke('overlay:markLearned', id),
  getMode:        ()    => ipcRenderer.invoke('overlay:getMode'),
  getTheme:       ()    => ipcRenderer.invoke('overlay:getTheme'),

  onShowWord:     (cb) => { /* ipcRenderer.on('overlay:showWord', ...) → cb(word) */
                             return unsub; },
  onAllLearned:   (cb) => { /* ipcRenderer.on('overlay:allLearned', ...) → cb() */
                             return unsub; },
  onModeChanged:  (cb) => { /* ipcRenderer.on('overlay:modeChanged', ...) → cb(mode) */
                             return unsub; },
  onThemeChanged: (cb) => { /* ipcRenderer.on('overlay:themeChanged', ...) → cb(theme) */
                             return unsub; },
};
```

Все функции подписки возвращают функцию отписки `() => ipcRenderer.removeListener(...)`.

---

## 11. Оверлей (renderer-overlay)

### 11.1. index.html

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background: transparent;
      width: 100%;
      height: 100%;
      overflow: hidden;
      user-select: none;
    }
    #root { width: 100%; height: 100%; }

    /* Кнопка "Learned" скрыта по умолчанию, видна при наведении */
    .overlay-card .btn-learned {
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    }
    .overlay-card.hovered .btn-learned {
      opacity: 1;
      pointer-events: auto;
    }

    /* Анимация появления слова */
    .word-content {
      animation: wordSlideIn 0.25s ease;
    }
    @keyframes wordSlideIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.jsx"></script>
</body>
</html>
```

> **Важно:** Размеры тела документа — `100%`, а не фиксированные пиксели. Размер BrowserWindow меняется между режимами classic и taskbar. Фиксированные пиксели приведут к тому, что контент окажется за пределами видимой области.

### 11.2. App.jsx (оверлей)

#### Состояние компонента

```js
const [word, setWord]           = useState(null);      // текущее слово
const [allLearned, setAllLearned] = useState(false);   // все слова изучены
const [marking, setMarking]     = useState(false);     // идёт запрос markLearned
const [mode, setMode]           = useState('classic'); // 'classic' | 'taskbar'
const [theme, setTheme]         = useState('dark');    // 'dark' | 'light'
const cardRef = useRef(null);
```

#### Инициализация (useEffect на монтирование)

```
1. const [fetchedMode, fetchedTheme, fetchedWord] = await Promise.all([
     overlayApi.getMode(),
     overlayApi.getTheme(),
     overlayApi.getCurrentWord()
   ])
2. setMode(fetchedMode)
3. setTheme(fetchedTheme)
4. if (fetchedWord) setWord(fetchedWord)
5. Подписаться:
   - overlayApi.onShowWord(newWord => { setWord(newWord); setAllLearned(false); })
   - overlayApi.onAllLearned(() => setAllLearned(true))
   - overlayApi.onModeChanged(newMode => setMode(newMode))
   - overlayApi.onThemeChanged(newTheme => setTheme(newTheme))
6. В функции очистки: вызвать все функции отписки
```

#### Обработка наведения

Используется прямое манипулирование классами DOM вместо React-состояния, чтобы избежать перерендеров на каждое движение мыши:

```js
const handleMouseEnter = () => cardRef.current?.classList.add('hovered');
const handleMouseLeave = () => cardRef.current?.classList.remove('hovered');
```

#### Обработчик markLearned

```js
const handleMarkLearned = async () => {
  if (!word || marking) return;
  setMarking(true);
  try {
    await overlayApi.markLearned(word.id);
  } finally {
    setMarking(false);
  }
};
```

#### Цветовая палитра

```js
function getColors(theme) {
  if (theme === 'dark') {
    return {
      classicBg:   'rgba(20, 20, 20, 0.92)',
      word:        '#ffffff',
      translation: '#cccccc',
      example:     '#888888',
      separator:   '#555555',
      btnColor:    '#4A9EFF',
      // ... прочие цвета для drag-зоны, акцента и т.д.
    };
  }
  // theme === 'light'
  return {
    classicBg:   'rgba(248, 248, 248, 0.96)',
    word:        '#111111',
    translation: '#444444',
    example:     '#777777',
    separator:   '#aaaaaa',
    btnColor:    '#2563eb',
    // ...
  };
}
```

#### Макет: Classic-режим

Вертикальный flex-контейнер, `width: 300px`, `height: 100px`:

```
┌─────────────────────────────────┐
│ слово (20px, bold)              │  ← drag-зона
│ перевод (14px)                  │
│ пример (11px, italic, если есть)│
│                  [✓ Learned]    │  ← кнопка, видна при hover
└─────────────────────────────────┘
```

Стили контейнера:
```js
{
  width: '300px',
  height: '100px',
  borderRadius: '12px',
  background: colors.classicBg,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  padding: '12px 16px',
  WebkitAppRegion: 'drag',    // нативное перетаскивание окна
  cursor: 'grab',
}
```

Кнопка "Learned":
```js
{
  alignSelf: 'flex-end',
  WebkitAppRegion: 'no-drag',  // ОБЯЗАТЕЛЬНО, иначе кнопка не кликается
  // ... остальные стили кнопки
  className: 'btn-learned'     // управляется через CSS-класс
}
```

#### Макет: Taskbar-режим

Горизонтальный flex-бар, заполняет всю ширину окна, без border-radius:

```
┌───────────────────────────────────────────────────────────────┐
│ 2px│ слово · перевод (truncated, overflow: hidden)   │  [✓]  │
└───────────────────────────────────────────────────────────────┘
```

Стили контейнера:
```js
{
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  borderLeft: `2px solid ${colors.btnColor}`,   // цветовой акцент
  background: colors.classicBg,
  padding: '0 8px',
  WebkitAppRegion: 'drag',
}
```

Текст слова и перевода — в одну строку через " · ", `overflow: hidden`, `textOverflow: ellipsis`, `whiteSpace: nowrap`.

Кнопка "✓" — справа, `WebkitAppRegion: 'no-drag'`.

#### Рендер при allLearned === true

Показать нейтральное сообщение «All words learned!» (или «Все слова изучены!»), оверлей скрывается главным процессом автоматически.

---

## 12. Главное окно (renderer-main)

### 12.1. App.jsx

#### Состояние компонента

```js
const [words, setWords]           = useState([]);
const [activeTab, setActiveTab]   = useState('list');    // 'list' | 'add' | 'settings'
const [editingWord, setEditingWord] = useState(null);    // объект слова при редактировании
const [notification, setNotification] = useState(null); // { message, type: 'success'|'error' }
const [lang, setLang]             = useState(
  localStorage.getItem('slvk_lang') || 'en'
);
const [saving, setSaving]         = useState(false);
```

#### Инициализация

```
1. Загрузить слова: setWords(await window.api.getWords())
2. Подписаться на onWordsChanged → перезагрузить слова
3. Вернуть функцию отписки из useEffect
```

#### Функция уведомлений

```js
const showNotification = (message, type = 'success') => {
  setNotification({ message, type });
  setTimeout(() => setNotification(null), 3000);
};
```

#### Заголовок окна (Header)

Является drag-регионом для перетаскивания frameless-окна.

```
WebkitAppRegion: 'drag'  ← на всём заголовке
WebkitAppRegion: 'no-drag' ← на: headerLeft, stats, headerRight
```

Структура заголовка:
```
┌──────────────────────────────────────────────────────────────────────┐
│ [Slovariken]   Total: N  Pending: M  Learned: K   [RU]   [ ─ ] [ ✕ ]│
└──────────────────────────────────────────────────────────────────────┘
```

- **Логотип:** "Slovariken" в акцентном цвете
- **Статистика:** Total / Pending / Learned (вычисляется из `words` массива)
- **Кнопка языка:** показывает "RU" когда `lang==='en'`, "EN" когда `lang==='ru'`. При клике переключает и сохраняет в `localStorage.setItem('slvk_lang', newLang)`
- **Кнопки окна:**
  - `─` → `window.api.minimizeWindow()`
  - `✕` → `window.api.closeWindow()`
  - Ширина каждой кнопки: 46px, высота: 100% заголовка
  - Без border-radius, прямые углы как в стандартных win32-приложениях

#### Вкладки (Tabs)

```
[ All Words ]  [ Add Word / Edit Word ]  [ Settings ]        [ Import JSON ]
```

- При `editingWord !== null`: вкладка называется "Edit Word" и активна
- Кнопка "Import JSON" расположена справа в строке вкладок
- При клике "Import JSON": `window.api.importWords()` → показать уведомление с результатом

#### Уведомления (Notifications)

```
Позиция: fixed, bottom: 24px, right: 24px
z-index: 9999
Анимация: opacity transition
Цвет: зелёный при type='success', красный при type='error'
Автоскрытие: через 3 секунды
```

### 12.2. WordList.jsx

#### Фильтры (chips)

```
[ All (N) ]  [ Pending (M) ]  [ Learned (K) ]
```

Активный фильтр подсвечен. Каждый chip показывает количество слов в категории.

#### Таблица слов

Фиксированная компоновка (`table-layout: fixed`), заголовок прилипает при прокрутке (`position: sticky`).

| Колонка | Ширина | Описание |
|---------|--------|----------|
| Word | 18% | Слово |
| Translation | 20% | Перевод |
| Example | 28% | Пример предложения |
| Status | 10% | Бейдж статуса |
| Actions | 24% | Кнопки действий |

**Бейдж статуса:**
- Learned: зелёный фон
- Pending: синевато-серый фон

**Кнопки действий в строке:**
- Если `word.learned === true`: кнопка "Unlearn" → `onUnlearn(word.id)`
- Всегда: кнопка "Edit" → открыть вкладку редактирования с данными слова
- Всегда: кнопка "Del" → показать модальное подтверждение, затем `onDelete(word.id)`

### 12.3. WordForm.jsx

Форма добавления/редактирования слова.

**Поля:**
- Word (обязательное)
- Translation (обязательное)
- Example (необязательное, textarea)

**Поведение:**
- При `editingWord !== null` — предзаполнить поля данными слова
- Кнопка Submit: "Add Word" или "Save Changes" в зависимости от режима
- Кнопка Cancel (при редактировании): очистить `editingWord`, вернуться к списку
- Валидация: показать ошибку если word или translation пустые
- `setSaving(true)` на время запроса, `setSaving(false)` после

### 12.4. Settings.jsx

Прокручиваемый контейнер (`overflowY: auto`, `height: 100%`).

#### Секция 1: Режим отображения оверлея

Два кликабельных карточки с мини-превью:

**Карточка "Classic":**
```
┌──────────┐
│          │
│  [■■■■]  │  ← маленькая карточка
│  [════]  │  ← полоска панели задач
└──────────┘
```
Иллюстрация: миниатюра экрана с небольшой карточкой, плавающей над полосой панели задач.

**Карточка "Taskbar":**
```
┌──────────┐
│          │
│          │
│ [═══════]│  ← тонкая полоска в низу
└──────────┘
```
Иллюстрация: миниатюра экрана с тонкой полосой внизу.

Активная карточка: `border: 2px solid акцентный_цвет`, светлый акцентный фон.

При выборе: `window.api.setOverlayMode(mode)`.

#### Секция 2: Тема оверлея

Два кликабельных карточки:

**Карточка "Dark":**
```
┌──────────────────┐
│ word             │  ← тёмный фон, белый текст
│ translation      │
└──────────────────┘
```

**Карточка "Light":**
```
┌──────────────────┐
│ word             │  ← светлый фон, тёмный текст
│ translation      │
└──────────────────┘
```

При выборе: `window.api.setOverlayTheme(theme)`.

#### Секция 3: Интервал ротации слов

**Пресеты (chips):**
```
[ 1 min ]  [ 3 min ]  [ 5 min ]  [ 10 min ]  [ 30 min ]
```

Значения в секундах: 60, 180, 300, 600, 1800.

**Кастомный ввод:**

Chip-контейнер с полем `<input type="number">` внутри:
- `min=1`
- Placeholder: текущее значение интервала в секундах (когда активен кастомный режим)
- Применение: при `blur` или нажатии `Enter`
- Вызов: `window.api.setOverlayInterval(seconds)`

**Логика подсветки:**
- Если текущий интервал совпадает с одним из пресетов: этот chip подсвечен (акцентный фон)
- Если не совпадает ни с одним: контейнер кастомного ввода подсвечен (акцентный фон, белый текст)

---

## 13. Интернационализация (i18n.js)

### Структура модуля

```js
export const tr = {
  en: {
    // Заголовок
    appName: 'Slovariken',
    total: 'Total',
    pending: 'Pending',
    learned: 'Learned',
    langToggle: 'RU',

    // Вкладки
    tabAll: 'All Words',
    tabAdd: 'Add Word',
    tabEdit: 'Edit Word',
    tabSettings: 'Settings',
    importJson: 'Import JSON',

    // Форма
    fieldWord: 'Word',
    fieldTranslation: 'Translation',
    fieldExample: 'Example (optional)',
    btnAdd: 'Add Word',
    btnSave: 'Save Changes',
    btnCancel: 'Cancel',

    // Список
    colWord: 'Word',
    colTranslation: 'Translation',
    colExample: 'Example',
    colStatus: 'Status',
    colActions: 'Actions',
    btnEdit: 'Edit',
    btnDelete: 'Del',
    btnUnlearn: 'Unlearn',
    statusLearned: 'Learned',
    statusPending: 'Pending',
    confirmDelete: 'Delete this word?',

    // Настройки
    settingsTitle: 'Settings',
    sectionMode: 'Overlay Display Mode',
    sectionTheme: 'Overlay Theme',
    sectionInterval: 'Word Rotation Interval',
    modeClassic: 'Classic',
    modeTaskbar: 'Taskbar',
    themeDark: 'Dark',
    themeLight: 'Light',
    customInterval: 'Custom (seconds)',

    // Уведомления (строки с параметрами — через функции)
    notifWordAdded: 'Word added successfully',
    notifWordUpdated: 'Word updated',
    notifWordDeleted: 'Word deleted',
    notifImportSuccess: (imported, skipped) =>
      `Imported ${imported} word(s), skipped ${skipped}`,
    notifError: 'An error occurred',
  },
  ru: {
    appName: 'Slovariken',
    total: 'Всего',
    pending: 'Не изучено',
    learned: 'Изучено',
    langToggle: 'EN',
    tabAll: 'Все слова',
    tabAdd: 'Добавить',
    tabEdit: 'Редактировать',
    tabSettings: 'Настройки',
    importJson: 'Импорт JSON',
    fieldWord: 'Слово',
    fieldTranslation: 'Перевод',
    fieldExample: 'Пример (необязательно)',
    btnAdd: 'Добавить',
    btnSave: 'Сохранить',
    btnCancel: 'Отмена',
    colWord: 'Слово',
    colTranslation: 'Перевод',
    colExample: 'Пример',
    colStatus: 'Статус',
    colActions: 'Действия',
    btnEdit: 'Изм.',
    btnDelete: 'Удал.',
    btnUnlearn: 'Не изучено',
    statusLearned: 'Изучено',
    statusPending: 'Ожидает',
    confirmDelete: 'Удалить это слово?',
    settingsTitle: 'Настройки',
    sectionMode: 'Режим оверлея',
    sectionTheme: 'Тема оверлея',
    sectionInterval: 'Интервал ротации',
    modeClassic: 'Классический',
    modeTaskbar: 'Таскбар',
    themeDark: 'Тёмная',
    themeLight: 'Светлая',
    customInterval: 'Своё значение (сек)',
    notifWordAdded: 'Слово добавлено',
    notifWordUpdated: 'Слово обновлено',
    notifWordDeleted: 'Слово удалено',
    notifImportSuccess: (imported, skipped) =>
      `Импортировано: ${imported}, пропущено: ${skipped}`,
    notifError: 'Произошла ошибка',
  }
};
```

### Использование в компонентах

```js
// В каждом компоненте, принимающем prop lang:
const t = tr[lang] || tr.en;

// Использование:
<span>{t.tabAll}</span>
<span>{t.notifImportSuccess(3, 1)}</span>
```

### Хранение языка

- Ключ в localStorage: `'slvk_lang'`
- Значения: `'en'` | `'ru'`
- По умолчанию: `'en'`
- Переключение: в App.jsx главного окна, передаётся как prop `lang` во все дочерние компоненты

---

## 14. Конфигурация сборки

### 14.1. vite.config.js

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';

// Плагин: удаляет атрибут crossorigin из <script type="module">
// и <link rel="modulepreload"> в собранном HTML.
// НЕОБХОДИМО: Electron загружает файлы через file:// протокол,
// и Chromium блокирует модульные скрипты с атрибутом crossorigin.
function removeCrossOrigin() {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin/g, '<script type="module"')
        .replace(/<link rel="modulepreload" crossorigin/g, '<link rel="modulepreload"');
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    removeCrossOrigin(),
    electron([
      // Главный процесс: каждый файл — отдельная точка входа
      // (Rollup не инлайнит CJS require() между ними)
      {
        entry: [
          'src/main/main.js',
          'src/main/storage.js',
          'src/main/windowManager.js',
          'src/main/trayManager.js',
          'src/main/ipcHandlers.js',
          'src/main/wordScheduler.js',
        ],
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['electron'],
            }
          }
        }
      },
      // Preload-скрипты
      {
        entry: [
          'src/preload/preload-main.js',
          'src/preload/preload-overlay.js',
        ],
        vite: {
          build: {
            outDir: 'dist-electron/preload',
          }
        }
      }
    ]),
  ],
  build: {
    minify: false,   // ОБЯЗАТЕЛЬНО: минификация вызывает TDZ-ошибки с const в бандле
    rollupOptions: {
      input: {
        main:    'src/renderer-main/index.html',
        overlay: 'src/renderer-overlay/index.html',
      }
    }
  }
});
```

### 14.2. electron-builder (в package.json)

```json
{
  "build": {
    "appId": "com.slovariken.app",
    "productName": "Slovariken",
    "asar": false,
    "win": {
      "target": "dir"
    },
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "dist-electron/**/*"
    ],
    "extraMetadata": {
      "main": "dist-electron/main/main.js"
    }
  }
}
```

> **Почему `asar: false`:** electron-builder скачивает архив winCodeSign, который содержит macOS-симлинки. Windows (7-Zip) не может создавать симлинки без прав администратора / режима разработчика. При `asar: true` сборка падает. С `asar: false` этот шаг пропускается.

### 14.3. Обходное решение для winCodeSign на Windows

При первой сборке electron-builder пытается скачать и распаковать `winCodeSign-2.6.0`. Если процесс прерывается из-за симлинков:

1. Скачать архив вручную
2. Распаковать 7-Zip в `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0\`
3. 7-Zip выдаст ошибку на 2 файла `.dylib` (симлинки macOS) — это нормально, остальные файлы распакуются корректно
4. Повторно запустить `npx electron-builder --dir`

---

## 15. Важные технические нюансы

### 15.1. TDZ-ошибки при `const` в JSX

**Проблема:** esbuild и Vite могут переупорядочивать объявления в бандле, вызывая `ReferenceError: Cannot access 'X' before initialization` (Temporal Dead Zone).

**Решение:** В любом файле, где объявляются `const`-объекты, используемые в JSX или других массивах, **всегда объявлять объект ДО** массива или структуры, которая на него ссылается.

```js
// НЕПРАВИЛЬНО (может вызвать TDZ):
const MODES = [
  { key: 'classic', preview: classicPreviewStyle },
  { key: 'taskbar', preview: taskbarPreviewStyle },
];
const classicPreviewStyle = { /* ... */ };
const taskbarPreviewStyle = { /* ... */ };

// ПРАВИЛЬНО:
const classicPreviewStyle = { /* ... */ };
const taskbarPreviewStyle = { /* ... */ };
const MODES = [
  { key: 'classic', preview: classicPreviewStyle },
  { key: 'taskbar', preview: taskbarPreviewStyle },
];
```

### 15.2. Удаление атрибута `crossorigin`

**Проблема:** Vite автоматически добавляет атрибут `crossorigin` к тегам `<script type="module">` и `<link rel="modulepreload">` в собранном HTML. Electron загружает HTML через протокол `file://`, и Chromium отклоняет модульные скрипты с этим атрибутом (политика CORS).

**Решение:** Плагин `removeCrossOrigin()` в `vite.config.js` (см. раздел 14.1) обрабатывает HTML в `transformIndexHtml` хуке и удаляет атрибут через замену строк.

### 15.3. Раздельные точки входа для главного процесса

**Проблема:** vite-plugin-electron в режиме продакшн-сборки не инлайнит вызовы `require('./storage')` между файлами главного процесса. Файл `main.js` делает `require('./storage')` — если `storage.js` не является отдельной точкой входа, Rollup не создаёт файл `dist-electron/main/storage.js`, и в рантайме будет `MODULE_NOT_FOUND`.

**Решение:** Каждый из 6 файлов главного процесса (`main.js`, `storage.js`, `windowManager.js`, `trayManager.js`, `ipcHandlers.js`, `wordScheduler.js`) должен быть явно указан как отдельная точка входа в конфигурации vite-plugin-electron (см. раздел 14.1).

### 15.4. Оверлей поверх панели задач Windows

**Проблема:** Уровень `'floating'` для `setAlwaysOnTop` находится ниже панели задач Windows. В режиме taskbar оверлей должен быть над ней. Кроме того, Windows сбрасывает z-порядок при взаимодействии с панелью задач.

**Решение:**
1. Для taskbar-режима использовать: `win.setAlwaysOnTop(true, 'screen-saver')`
2. Вызывать `overlayWindow.moveTop()` каждую секунду (каждые 10 тиков опроса курсора) для переутверждения z-порядка

### 15.5. Одновременная работа drag и click-through

**Проблема:** Оверлей должен быть кликабельным для кнопки "Learned" и одновременно пропускать клики через себя, когда курсор не над ним (чтобы не мешать работе с другими окнами).

**Решение — опрос курсора с условным переключением:**

```
setIgnoreMouseEvents(true, { forward: true })
  → Оверлей прозрачен для кликов, но ПОЛУЧАЕТ события mousemove
  → Используется для определения позиции курсора

setIgnoreMouseEvents(false)
  → Оверлей принимает клики (hover, кнопка Learned, drag)
  → Устанавливается когда cursor попадает в bounds окна
```

Опрос каждые 100 мс (`setInterval`) проверяет `screen.getCursorScreenPoint()` относительно `overlayWindow.getBounds()` и переключает режим.

### 15.6. CSS оверлея: процентные размеры тела

**Проблема:** BrowserWindow меняет размер при переключении между режимами classic (300×100) и taskbar (переменная ширина × высота панели задач). Если в CSS прописаны фиксированные пиксели (`width: 300px; height: 100px`), при taskbar-режиме контент окажется за пределами видимой области.

**Решение:** Body и `#root` должны использовать `width: 100%; height: 100%`.

### 15.7. Frameless окно + ES-модули: `sandbox: false`

**Проблема:** При `sandbox: true` на главном окне Electron блокирует корректную загрузку ES-модулей рендерера. Это проявляется как ошибки загрузки скриптов в консоли.

**Решение:** Установить `sandbox: false` для главного окна. `contextIsolation: true` сохранить для изоляции контекста (безопасность не снижается).

> Для оверлея `sandbox: true` допустимо и рекомендуется.

### 15.8. Привязка оверлея к панели задач при перетаскивании

В taskbar-режиме пользователь может перетаскивать оверлей влево/вправо вдоль панели задач, но не должен иметь возможности оторвать его по вертикали. При каждом событии `moved` на оверлее:

1. Получить текущие bounds оверлея
2. Вычислить корректный Y через `getOverlayBounds('taskbar')`
3. Если текущий Y отличается от корректного — вернуть окно на правильный Y (`win.setPosition(currentX, correctY)`)
4. Сохранить только X координату через `saveOverlayPosition('taskbar', { x: currentX })`

---

## Приложение A: Поток данных

```
Пользователь добавляет слово
        ↓
window.api.addWord(word, tr, ex)   [renderer-main]
        ↓
IPC 'words:add'                    [preload-main.js]
        ↓
ipcHandlers.js                     [main process]
        ↓
storage.createWord() + setData()   [storage.js]
        ↓
scheduler.showNext()               [wordScheduler.js]
        ↓
overlayWindow.webContents
  .send('overlay:showWord', word)
        ↓
App.jsx onShowWord → setWord()     [renderer-overlay]
        ↓
Отображение нового слова           [overlay UI]
```

```
Пользователь нажимает "Learned"
        ↓
overlayApi.markLearned(id)         [renderer-overlay]
        ↓
IPC 'overlay:markLearned'          [preload-overlay.js]
        ↓
ipcHandlers.js                     [main process]
        ↓
word.learned = true + setData()    [storage.js]
        ↓
scheduler.resetTimer() + showNext()
        ↓
notifyMainWindow()
        ↓
mainWindow.webContents
  .send('words:changed')
        ↓
App.jsx onWordsChanged → reload    [renderer-main]
```

---

## Приложение B: IPC-каналы (полный список)

| Канал | Направление | Тип | Описание |
|-------|-------------|-----|----------|
| `window:minimize` | renderer → main | send | Свернуть главное окно |
| `window:hide` | renderer → main | send | Скрыть главное окно в трей |
| `words:getAll` | renderer → main | handle | Получить все слова |
| `words:add` | renderer → main | handle | Добавить слово |
| `words:update` | renderer → main | handle | Обновить слово |
| `words:delete` | renderer → main | handle | Удалить слово |
| `words:import` | renderer → main | handle | Импорт из JSON |
| `words:unlearn` | renderer → main | handle | Сбросить флаг изученности |
| `words:changed` | main → renderer | send | Уведомление об изменении слов |
| `overlay:getCurrentWord` | renderer → main | handle | Получить текущее слово |
| `overlay:markLearned` | renderer → main | handle | Отметить слово изученным |
| `overlay:getMode` | renderer → main | handle | Получить режим оверлея |
| `overlay:getTheme` | renderer → main | handle | Получить тему оверлея |
| `overlay:showWord` | main → renderer | send | Показать слово в оверлее |
| `overlay:allLearned` | main → renderer | send | Все слова изучены |
| `overlay:modeChanged` | main → renderer | send | Режим изменён |
| `overlay:themeChanged` | main → renderer | send | Тема изменена |
| `settings:get` | renderer → main | handle | Получить настройки |
| `settings:setOverlayMode` | renderer → main | handle | Установить режим |
| `settings:setOverlayTheme` | renderer → main | handle | Установить тему |
| `settings:setOverlayInterval` | renderer → main | handle | Установить интервал |
