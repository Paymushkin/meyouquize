import { randomUuid } from "./utils/randomUuid";

const DEVICE_KEY = "mq_device_id";
const NICK_KEY = "mq_nickname";

export function getOrCreateDeviceId() {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = randomUuid();
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
