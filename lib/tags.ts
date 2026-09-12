import type { JoyCategory } from "./mockPins";
import { LanguageCode, normalizeLanguage } from "./languages";

export const JOY_TAGS = [
  "food", "cafe", "dessert", "nature", "park", "view", "sunset", "art", "music", "animals",
  "activity", "shopping", "wellness", "study", "social", "event", "quiet", "photo spot", "hidden gem", "free",
] as const;

export const CATEGORY_TAG: Record<JoyCategory, typeof JOY_TAGS[number]> = {
  dog: "animals",
  nature: "nature",
  cafe: "cafe",
  music: "music",
  art: "art",
  view: "view",
  food: "food",
  other: "hidden gem",
};

type JoyTag = typeof JOY_TAGS[number];

const TAG_LABELS: Record<LanguageCode, Record<JoyTag, string>> = {
  en: { food: "Food", cafe: "Cafe", dessert: "Dessert", nature: "Nature", park: "Park", view: "View", sunset: "Sunset", art: "Art", music: "Music", animals: "Animals", activity: "Activity", shopping: "Shopping", wellness: "Wellness", study: "Study", social: "Social", event: "Event", quiet: "Quiet", "photo spot": "Photo Spot", "hidden gem": "Hidden Gem", free: "Free" },
  ko: { food: "음식", cafe: "카페", dessert: "디저트", nature: "자연", park: "공원", view: "전망", sunset: "노을", art: "예술", music: "음악", animals: "동물", activity: "활동", shopping: "쇼핑", wellness: "힐링", study: "공부", social: "사교", event: "이벤트", quiet: "조용한 곳", "photo spot": "포토 스팟", "hidden gem": "숨은 명소", free: "무료" },
  es: { food: "Comida", cafe: "Café", dessert: "Postres", nature: "Naturaleza", park: "Parque", view: "Vistas", sunset: "Atardecer", art: "Arte", music: "Música", animals: "Animales", activity: "Actividad", shopping: "Compras", wellness: "Bienestar", study: "Estudio", social: "Social", event: "Evento", quiet: "Tranquilo", "photo spot": "Lugar para fotos", "hidden gem": "Lugar secreto", free: "Gratis" },
  zh: { food: "美食", cafe: "咖啡馆", dessert: "甜点", nature: "自然", park: "公园", view: "景观", sunset: "日落", art: "艺术", music: "音乐", animals: "动物", activity: "活动", shopping: "购物", wellness: "健康", study: "学习", social: "社交", event: "节日活动", quiet: "安静", "photo spot": "拍照地", "hidden gem": "隐藏宝地", free: "免费" },
  ja: { food: "グルメ", cafe: "カフェ", dessert: "デザート", nature: "自然", park: "公園", view: "景色", sunset: "夕焼け", art: "アート", music: "音楽", animals: "動物", activity: "アクティビティ", shopping: "ショッピング", wellness: "ウェルネス", study: "勉強", social: "交流", event: "イベント", quiet: "静かな場所", "photo spot": "写真スポット", "hidden gem": "穴場", free: "無料" },
};

export function tagLabel(tag: string, language?: string) {
  return TAG_LABELS[normalizeLanguage(language) as LanguageCode][tag as JoyTag] || tag;
}
