const DEVICE_KEY = "mq_device_id";
const NICK_KEY = "mq_nickname";

function fallbackUuid() {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

export function getOrCreateDeviceId() {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = globalThis.crypto?.randomUUID?.() ?? fallbackUuid();
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}

export function getNickname() {
  return localStorage.getItem(NICK_KEY) ?? "";
}

export function setNickname(value: string) {
  localStorage.setItem(NICK_KEY, value);
}

export function randomNickname() {
  const names = [
    "Искра",
    "Комета",
    "Орбита",
    "Звезда",
    "Ракета",
    "Волна",
    "Туман",
    "Луч",
    "Метеор",
    "Спутник",
    "Космос",
    "Сириус",
    "Аврора",
    "Вихрь",
    "Гроза",
    "Лава",
    "Пламя",
    "Бриз",
    "Океан",
    "Шторм",
    "Зенит",
    "Импульс",
    "Вектор",
    "Квант",
    "Спектр",
    "Неон",
    "Ритм",
    "Темп",
    "Феникс",
    "Тайфун",
  ];
  return `${names[Math.floor(Math.random() * names.length)]}${Math.floor(Math.random() * 1000)}`;
}
