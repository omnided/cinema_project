Backend платформы для совместного просмотра фильмов
Содержание
О проекте
Переменные окружения
Документация API
1. Авторизация
2. Обработка видео
3. Управление фильмами
4. Сервисный слой
Глобальная обработка ошибок
О проекте

Backend веб-сервиса для совместного просмотра фильмов: пользователи собираются в «лобби», смотрят один фильм синхронно и общаются в чате.

🚧 Статус: проект в разработке. Серверная часть (авторизация, выдача токена для Firestore, каталог фильмов, нарезка видео) в основном готова, загрузка в MinIO и клиентская часть (лобби, чат, плеер) еще не завершены.

Разделение ответственности
Область	Где реализовано
Регистрация, авторизация, JWT, выдача Firebase-токена	Backend (Express)
Каталог фильмов (CRUD)	Backend (Express)
Обработка видео: нарезка в HLS, загрузка в хранилище	Backend (FFmpeg + MinIO)
Лобби, чат, синхронизация просмотра (realtime)	Frontend + Firestore (без своего WebSocket-сервера)
Воспроизведение видео по частям	Frontend (HLS-плеер)
Стек
Backend: Node.js, Express, TypeScript, репозитории в стиле TypeORM, bcrypt, jsonwebtoken, fluent-ffmpeg, firebase-admin.
Хранилище видео: MinIO (S3-совместимое, локальный бакет).
Realtime: Cloud Firestore (подписки onSnapshot).
Формат видео: HLS (playlist.m3u8 + .ts-сегменты).
Общая архитектура
REST: auth, каталог,обработка видео
FFmpeg → HLS → загрузка
Firebase custom token
HLS: playlist.m3u8 +сегменты
подписки onSnapshot
Frontend
Backend APIExpress
БДпользователи и фильмы
MinIOHLS-бакет
Firestoreлобби и чат
Статус реализации
Компонент	Статус
Регистрация, вход, ротация refresh-токена	✅ Реализовано
Выдача Firebase custom token (firebase_token)	✅ Реализовано
CRUD фильмов	⚠️ Контроллеры готовы, маршруты в роутере нужно исправить (см. раздел 3)
Нарезка видео в HLS через FFmpeg	✅ Реализовано
Загрузка HLS в MinIO	⏳ Заглушка (uploadDirectoryToS3 закомментирована)
Лобби, чат, синхронизация просмотра (Firestore)	⏳ Не реализовано (frontend)
Плеер с подгрузкой по частям	⏳ Не реализовано (frontend)
Обработка и доставка видео

Вся тяжелая работа с видео выполняется на backend:

Загружается исходный (сырой) файл фильма.
Вызывается POST /process/:videoId: FFmpeg нарезает файл на HLS-сегменты по 10 секунд (playlist.m3u8 + .ts).
Сегменты и плейлист загружаются в бакет MinIO по пути movies/<movieId>/.
В поле video_url фильма записывается ссылка на playlist.m3u8.
Исходный файл удаляется.

Frontend не скачивает фильм целиком. HLS-плеер получает плейлист и подгружает сегменты по мере воспроизведения (и по перемотке), поэтому просмотр начинается сразу, а трафик тратится только на реально просмотренные части.

Пример подключения на клиенте (библиотека hls.js):

javascript
import Hls from 'hls.js';

const video = document.querySelector('video');

if (Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource(movie.video_url); // .../movies/<movieId>/playlist.m3u8
  hls.attachMedia(video);
} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
  video.src = movie.video_url; // Safari умеет HLS нативно
}

Что нужно учесть при работе с MinIO:

Загружать файлы можно через S3-совместимый клиент (@aws-sdk/client-s3 с endpoint MinIO и forcePathStyle: true либо официальный пакет minio).
Указывать корректные Content-Type: application/vnd.apple.mpegurl для .m3u8 и video/mp2t для .ts.
Настроить CORS на бакете, иначе плеер на другом origin не сможет загрузить сегменты.
Плейлист ссылается на сегменты относительными путями, поэтому подписанные (presigned) ссылки на каждый файл не подойдут. Для разработки достаточно публичного чтения для префикса movies/, для продакшена лучше отдавать видео через reverse-proxy (например, nginx) с проверкой доступа.
Совместный просмотр через Firestore

Собственный WebSocket-сервер не нужен: клиенты подписываются на изменения документов Firestore (onSnapshot), а Firestore сам доставляет обновления в реальном времени.

Модель данных
lobbies/{lobbyId}
├── ownerId:   string            // создатель лобби
├── movieId:   number            // id фильма из backend
├── name:      string
├── users:     string[]          // uid участников (строки!)
├── createdAt: timestamp
├── playback:                    // состояние плеера
│   ├── isPlaying:  boolean
│   ├── position:   number       // секунды
│   ├── updatedAt:  timestamp    // serverTimestamp()
│   └── updatedBy:  string       // uid автора изменения
│
└── messages/{messageId}         // подколлекция чата
    ├── authorId:  string
    ├── text:      string
    └── createdAt: timestamp

⚠️ Сообщения чата лучше хранить в подколлекции, а не массивом внутри документа лобби: документ Firestore ограничен 1 МБ, а любое обновление массива перезаписывает и пересылает весь документ всем подписчикам.

Подписки
javascript
// 1. Список лобби, в которые добавлен пользователь
const q = query(collection(db, 'lobbies'), where('users', 'array-contains', uid));
onSnapshot(q, (snap) => { /* обновить список лобби */ });

// 2. Состояние конкретного лобби (участники, фильм, playback)
onSnapshot(doc(db, 'lobbies', lobbyId), (snap) => { /* применить состояние плеера */ });

// 3. Чат
const messagesQuery = query(
  collection(db, 'lobbies', lobbyId, 'messages'),
  orderBy('createdAt'),
  limitToLast(50),
);
onSnapshot(messagesQuery, (snap) => { /* показать новые сообщения */ });
Синхронизация воспроизведения
Любой участник при play, pause или перемотке записывает в lobbies/{id}.playback новое состояние (position, isPlaying, updatedAt: serverTimestamp(), updatedBy).
Остальные получают изменение через onSnapshot и применяют его к своему плееру.
Чтобы не было «эха», клиент игнорирует изменения, где updatedBy равен его собственному uid.
Если воспроизведение идет, ожидаемая позиция вычисляется как position + (now - updatedAt). Если реальная позиция отличается больше чем на 1–2 секунды, выполняется seek.
Правила безопасности (Firestore Rules)

Доступ к лобби и чату должен быть только у пользователей из массива users:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /lobbies/{lobbyId} {
      allow read, update: if request.auth != null
                          && request.auth.uid in resource.data.users;
      allow create: if request.auth != null
                    && request.auth.uid in request.resource.data.users;

      match /messages/{messageId} {
        allow read: if request.auth != null
          && request.auth.uid in get(/databases/$(database)/documents/lobbies/$(lobbyId)).data.users;
        allow create: if request.auth != null
          && request.resource.data.authorId == request.auth.uid
          && request.auth.uid in get(/databases/$(database)/documents/lobbies/$(lobbyId)).data.users;
      }
    }
  }
}
Связка авторизации backend и Firestore

Backend использует собственные JWT, а Firestore Rules работают только с Firebase Auth (request.auth.uid). Для связки используется Firebase custom token:

Пользователь входит через POST /login или POST /register.
Backend через Firebase Admin SDK создает custom token: createCustomToken(String(user.id)) и возвращает его в поле firebase_token.
Клиент вызывает signInWithCustomToken(getAuth(), firebase_token).
В Firestore request.auth.uid равен String(user.id), то есть совпадает с id пользователя в БД. Именно эти значения хранятся в массиве users лобби.

Клиентская часть:

typescript
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';

// после login / register
const result = await api.post('/login', { email, password });
await signInWithCustomToken(getAuth(), result.firebase_token);

// при выходе
await signOut(getAuth());

Что важно знать:

Custom token живет 1 час и используется один раз. После входа Firebase SDK сам хранит и обновляет сессию, в том числе после перезагрузки страницы. Поэтому Firebase-токен не нужно выдавать при каждом refresh-token. Если сессия Firebase потеряна, а JWT еще действителен, клиент запрашивает новый токен через GET /firebase-token.
uid в Firebase всегда строка, а user.id у нас number. В массиве users нужно хранить строки: [String(currentUser.id), String(friend.id)]. Иначе правило request.auth.uid in resource.data.users не сработает.
Роль пользователя можно передать как custom claim и использовать в правилах как request.auth.token.role. Роль берется из JWT и может устареть после смены роли, поэтому для критичных проверок лучше брать ее из БД.
Ограничения подхода
Стоимость: Firestore тарифицируется по чтениям и записям. Каждое сообщение читается каждым подписчиком, а частые записи playback (например, при перемотке ползунком) стоит ограничивать (debounce).
Присутствие участников (онлайн/оффлайн) в Firestore «из коробки» нет. Для этого нужен heartbeat-поле или Realtime Database с onDisconnect.
Латентность: для чата и синхронизации плеера ее достаточно, но это не подходит для сценариев, где нужны миллисекундные задержки.
Переменные окружения
Переменная	Назначение
NODE_ENV	При значении production cookie refresh_token получает флаг secure.
JWT_SECRET	Секрет подписи access-токена.
JWT_EXPIRATION	Срок жизни access-токена (например, 15m).
REFJWT_SECRET	Секрет подписи refresh-токена.
FIREBASE_PROJECT_ID	ID проекта Firebase.
FIREBASE_CLIENT_EMAIL	Email сервисного аккаунта Firebase.
FIREBASE_PRIVATE_KEY	Приватный ключ сервисного аккаунта (переносы строк записаны как \n).

⚠️ FIREBASE_PRIVATE_KEY нельзя коммитить в репозиторий и отдавать на клиент: с ним можно выпустить токен для любого uid.

Документация API: Управление фильмами, видео и авторизацией

В данном документе описаны эндпоинты, их параметры, ожидаемые тела запросов и поведение контроллеров на основе предоставленной конфигурации маршрутизаторов (routers).

1. Авторизация (AuthController)

Отвечает за регистрацию, вход и управление сессиями. Во всех успешных ответах login, register и refresh-token контроллер устанавливает cookie refresh_token со следующими параметрами:

httpOnly: true;
secure: true при NODE_ENV=production;
sameSite: 'strict';
срок жизни 7 дней.

При любой ошибке cookie refresh_token очищается, а ошибка передается в next(error).

Вход пользователя
Маршрут: POST /login
Контроллер: authController.login
Описание: Проверяет учетные данные, авторизует пользователя и сохраняет новый refresh_token в БД.

Тело запроса (JSON):

json
{
  "email": "user@example.com",
  "password": "securepassword"
}

Успешный ответ (res.customSuccess):

json
{
  "user": { "id": 1, "username": "Имя", "email": "user@example.com", "role": "User" },
  "token": "<access JWT>",
  "refresh_token": "<refresh JWT>",
  "firebase_token": "<Firebase custom token>"
}

Ответы:

Код	Описание
201 Created	Успешный вход (возвращает данные пользователя, токены и firebase_token).
400 Bad Request	Отсутствует email или password, либо неверный логин или пароль.
404 Not Found	Пользователь с таким email не найден.
Регистрация пользователя
Маршрут: POST /register
Контроллер: authController.register
Описание: Создает нового пользователя с ролью User и автоматически авторизует его.

Тело запроса (JSON):

json
{
  "username": "Имя",
  "email": "user@example.com",
  "password": "securepassword"
}

Роль в запросе не передается: UserService.register всегда создает пользователя с ролью User.

Успешный ответ: такой же, как у входа (user, token, refresh_token, firebase_token).

Ответы:

Код	Описание
201 Created	Пользователь зарегистрирован.
400 Bad Request	Не заполнены username, email или password, либо пользователь с таким email уже существует.
Обновление токена доступа
Маршрут: POST /refresh-token
Контроллер: authController.refreshToken
Описание: Проверяет refresh_token из cookie, выдает новый accessToken и ротирует refresh-токен: новый значение записывается в БД и в cookie.
Заголовки/Cookies: Ожидается наличие cookie refresh_token.

Успешный ответ:

json
{
  "accessToken": "<новый access JWT>"
}

Ответы:

Код	Описание
200 OK	Токен успешно обновлен (возвращает accessToken).
401 Unauthorized	Refresh token не предоставлен, недействителен, просрочен либо отозван.
Получение Firebase-токена
Маршрут: GET /firebase-token
Контроллер: authController.firebaseToken
Middleware: checkJwt (требуется access-токен).
Описание: Выдает новый Firebase custom token для текущего пользователя. Нужен, когда JWT еще действителен, а сессия Firebase на клиенте потеряна (например, после signOut или очистки браузера).

Успешный ответ:

json
{
  "firebase_token": "<Firebase custom token>"
}

Ответы:

Код	Описание
200 OK	Firebase-токен создан.
401 Unauthorized	Access-токен отсутствует или недействителен.
2. Обработка видео (VideoController)

Отвечает за взаимодействие с FFmpeg и загрузку медиафайлов.

Процессинг видеофайла
Маршрут: POST /process/:videoId
Контроллер: videoController.VideoFfmpeg
Описание: Принимает путь к сырому файлу и запускает его обработку для указанного видео.

Параметры пути:

Параметр	Тип	Описание
videoId	number	Идентификатор видео.

Тело запроса (JSON):

json
{
  "rawFilePath": "/paths/to/video/file.mp4"
}

Ответы:

Код	Описание
200 OK	Видео успешно обработано и загружено.
400 Bad Request	Ошибка валидации (отсутствует rawFilePath).
3. Управление фильмами (MovieController)

CRUD-операции для работы с каталогом фильмов.

⚠️ Внимание: В предоставленном коде маршрутизатора (Router) для фильмов указаны пути /process/:videoId, которые переопределяют друг друга и конфликтуют с логикой контроллера (контроллер ожидает параметр :id, а не :videoId, и стандартные пути REST). Ниже задокументировано фактическое поведение контроллеров и DTO.

Создание нового фильма
Маршрут (из роутера): POST /process/:videoId
Контроллер: movieController.createMovie
Middleware: checkJwt (требуется авторизация).

Тело запроса (CreateMovieDto):

json
{
  "genres": [1, 2, 3],
  "title": "Название фильма",
  "description": "Описание фильма",
  "video_url": "https://link.to/video.mp4",
  "country": "США",
  "release_date": "2026-10-15T00:00:00.000Z",
  "duration_seconds": 5400,
  "poster_url": "https://link.to/poster.jpg"
}

Поля country, release_date, duration_seconds и poster_url — необязательные.

Ответы:

Код	Описание
201 Created	Фильм успешно создан.
Получение фильма по ID
Маршрут (из роутера): GET /process/:videoId
Контроллер: movieController.findMovieById
Параметры пути: Контроллер ожидает параметр id (req.params.id).

Ответы:

Код	Описание
200 OK	Данные фильма успешно получены.
Получение списка всех фильмов
Маршрут (из роутера): GET /process/:videoId
Контроллер: movieController.findAllMovies

Ответы:

Код	Описание
200 OK	Возвращает массив всех фильмов из базы данных.
Обновление фильма

(Метод доступен в контроллере)

Контроллер: movieController.updateMovie
Описание: Частичное обновление данных существующего фильма.
Параметры пути: Контроллер ожидает параметр id (req.params.id).
Тело запроса (UpdateMovieDto): Любые поля из CreateMovieDto (все поля опциональны).

Ответы:

Код	Описание
200 OK	Фильм успешно обновлен.
4. Сервисный слой
4.1. Сервис пользователей (UserService)

Содержит бизнес-логику пользователей: регистрация, вход, обновление токенов и CRUD. Работает с репозиторием Users, хеширует пароли через bcrypt (10 раундов соли) и выпускает JWT через createJwtToken (access) и createRefJwtToken (refresh). Полезная нагрузка токенов формируется приватным методом buildJwtPayload(user) и содержит id, username, email и role.

Все ошибки сервиса выбрасываются как CustomError(statusCode, type, message).

register(email, username, plainPassword)

Создает нового пользователя с ролью User.

Параметры:

Параметр	Тип	Описание
email	string	Email пользователя (должен быть уникальным).
username	string	Имя пользователя.
plainPassword	string	Пароль в открытом виде (в БД сохраняется только хеш).

Алгоритм:

Ищет пользователя с таким email. Если он найден, выбрасывает CustomError(400, 'General', 'Пользователь с таким email уже существует').
Создает сущность Users, записывает username, email и роль User.
Хеширует пароль: bcrypt.hash(plainPassword, 10) → password_hash.
Формирует JwtPayload и генерирует token (access) и refresh_token.
Записывает refresh_token в пользователя и сохраняет его в БД.
Возвращает объект без поля password_hash.

Возвращает:

json
{
  "user": { "id": 1, "username": "Имя", "email": "user@example.com", "role": "User", "refresh_token": "<refresh JWT>" },
  "token": "<access JWT>",
  "refresh_token": "<refresh JWT>"
}

Поле firebase_token добавляется уже в контроллере (authController), сам сервис ничего не знает о Firebase.

login(email, plainPasswordFromUser)

Проверяет учетные данные и выдает токены.

Алгоритм:

Ищет пользователя по email. Если он не найден, выбрасывает CustomError(404, 'General', 'Пользователь не найден').
Сравнивает пароль с хешем через bcrypt.compare. При несовпадении выбрасывает CustomError(400, 'General', 'Неверный логин или пароль').
Формирует JwtPayload и генерирует token и refresh_token.
Обновляет refresh_token пользователя в БД.
Возвращает пользователя без password_hash и пару токенов (формат ответа такой же, как у register).
updateRefreshToken(RefreshToken)

Реализует ротацию refresh-токена: старый токен заменяется новым.

Параметры:

Параметр	Тип	Описание
RefreshToken	string	Текущий refresh-токен пользователя.

Алгоритм:

Проверяет подпись и срок действия через jwt.verify с секретом REFJWT_SECRET. При ошибке выбрасывает CustomError(401, 'Unauthorized', 'Refresh токен протух или недействителен...').
Ищет пользователя, у которого в БД сохранен именно этот refresh_token. Если не находит, выбрасывает CustomError(401, 'Unauthorized', 'Токен не найден в базе...').
Генерирует новую пару токенов.
Сохраняет новый refresh_token в БД (старый перестает работать).

Возвращает:

json
{
  "accessToken": "<новый access JWT>",
  "refreshToken": "<новый refresh JWT>"
}

Ошибки:

Ошибка	Причина
CustomError 401	Токен недействителен, просрочен, отозван или уже использован.
findAll()

Возвращает массив всех пользователей (Users[]).

findById(id)

Возвращает пользователя по id. Если пользователь не найден, выбрасывает CustomError(404, 'General', 'User with id:<id> not found.').

update(id, userData)

Частично обновляет данные пользователя.

Параметры:

Параметр	Тип	Описание
id	number	Идентификатор пользователя.
userData	object	Любые из полей: username, name, email, password, role (все необязательные).

Алгоритм: проверяет существование пользователя (404, если нет), выполняет userRepository.update, затем повторно читает и возвращает обновленного пользователя.

delete(id)

Удаляет пользователя. Если пользователь не найден, выбрасывает CustomError(404, 'General', 'User with id:<id> not found.').

4.2. Сервис видео (VideoService)

Отвечает за конвейер обработки видео: нарезку в формат HLS через FFmpeg, публикацию и обновление ссылки на видео у фильма.

processAndUploadMovie(movieId, rawFilePath)

Главный метод конвейера. Вызывается из videoController.VideoFfmpeg.

Параметры:

Параметр	Тип	Описание
movieId	number	Идентификатор фильма.
rawFilePath	string	Путь к исходному (сырому) видеофайлу.

Алгоритм:

Формирует временную директорию tmp/hls/<movieId> и создает ее, если она отсутствует.
Вызывает convertToHls, чтобы нарезать видео на HLS-сегменты.
Формирует ссылку на плейлист: http://localhost:4000/movies/<movieId>/playlist.m3u8.
Записывает ссылку в поле video_url фильма (movieRepository.update).
В блоке finally удаляет исходный файл rawFilePath (даже при ошибке).

Возвращает: string — URL плейлиста playlist.m3u8.

Ошибки: любая ошибка нарезки или обновления БД логируется в консоль и пробрасывается дальше.

⚠️ Текущее состояние: загрузка в MinIO/S3 (uploadDirectoryToS3) закомментирована, вместо нее используется заглушка с localhost:4000. Очистка временной папки HLS (hlsOutputDir) также закомментирована, поэтому сегменты остаются на диске. После подключения MinIO video_url должен указывать на адрес бакета, а временную папку нужно удалять после успешной загрузки.

convertToHls(inputPath, outputDir) (private)

Конвертирует видео в HLS с помощью fluent-ffmpeg.

Параметры кодирования:

Параметр	Значение	Назначение
Видеокодек	libx264	H.264.
Аудиокодек	aac	AAC.
-profile:v	baseline	Максимальная совместимость с устройствами.
-level	3.0	Уровень профиля H.264.
-start_number	0	Нумерация сегментов с нуля.
-hls_time	10	Длительность одного сегмента (сек).
-hls_list_size	0	Все сегменты сохраняются в плейлисте (VOD).
-f	hls	Формат вывода.

Результат: в outputDir создаются playlist.m3u8 и файлы .ts-сегментов. Возвращает Promise<void>, который завершается по событию end и отклоняется по событию error.

4.3. Утилиты токенов
createJwtToken(payload)

Создает access JWT.

typescript
export const createJwtToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRATION,
  });
};
Подпись: JWT_SECRET, срок жизни: JWT_EXPIRATION.
createRefJwtToken(payload) работает аналогично, но использует секрет REFJWT_SECRET (им же проверяется токен в updateRefreshToken).
createFirebaseToken(userId, role?)

Создает Firebase custom token, по которому клиент входит в Firebase Auth и получает доступ к Firestore.

typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
}

export const createFirebaseToken = (userId: number, role?: string): Promise<string> => {
  // uid в Firebase обязан быть строкой (до 128 символов)
  return getAuth().createCustomToken(String(userId), role ? { role } : undefined);
};
uid равен String(userId), поэтому совпадает с id пользователя в БД.
Второй параметр (role) передается как custom claim и доступен в правилах Firestore как request.auth.token.role.
Используется модульный API firebase-admin/app и firebase-admin/auth: старый вариант import admin from 'firebase-admin' в новых версиях выдает ошибки типов (Property 'apps' does not exist ...).
4.4. Замечания к текущей реализации

Ранее найденные проблемы (refresh-токен не сохранялся, register и login выбрасывали обычный Error, role принималась от клиента, несовпадение name и username) исправлены. Что еще стоит проверить:

refresh_token в теле ответа. Сервис возвращает refresh_token и внутри user, и отдельным полем, а контроллер отдает результат клиенту целиком. Из-за этого httpOnly-cookie теряет смысл: токен доступен из JS. Рекомендуется исключить его из тела ответа: const { password_hash, refresh_token: _rt, ...safeUser } = user; и не возвращать refresh_token отдельным полем.
Утечка полей в findAll, findById, update. Эти методы возвращают сущность Users целиком, включая password_hash и refresh_token. Если контроллеры отдают результат клиенту как есть, хеш пароля и refresh-токен попадут в ответ. Нужно исключать эти поля (через select в запросе или удаление из результата).
update принимает опасные поля. userData передается в userRepository.update как есть: через него можно сменить role, а поле password (в сущности хранится password_hash) не хешируется и не соответствует колонке. Роль нужно менять только у администратора, а пароль хешировать через bcrypt.
Сообщения о входе. Разные тексты и коды для «пользователь не найден» (404) и «неверный пароль» (400) позволяют определить, зарегистрирован ли email. Лучше использовать одну общую ошибку (например, 401).
Код ответа входа. login возвращает 201 Created, хотя ничего не создается; логичнее 200 OK.
Выход из системы. Отдельного POST /logout нет. Логично добавить эндпоинт, который очищает cookie и обнуляет refresh_token в БД (и сбрасывает сессию Firebase на клиенте через signOut).
Привязка контекста. Методы AuthController, которые используют this (login, register, refreshToken), нужно привязывать при регистрации маршрутов (.bind(controller)) либо в конструкторе, иначе this будет undefined.
Глобальная обработка ошибок

Во всех контроллерах используется обертка try/catch.

В случае ошибки (включая кастомную ошибку CustomError), выброшенное исключение передается в функцию next(error) для централизованной обработки на уровне Express.

Успешные запросы возвращают структурированный ответ через метод res.customSuccess(statusCode, message, data).
В случае ошибки (включая кастомную ошибку `CustomError`), выброшенное исключение передается в функцию `next(error)` для централизованной обработки на уровне Express.

Успешные запросы возвращают структурированный ответ через метод `res.customSuccess(statusCode, message, data)`.
