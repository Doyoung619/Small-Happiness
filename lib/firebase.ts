import { getApp, getApps, initializeApp } from "firebase/app";
import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

let app: FirebaseApp | null = null;

export function configureFirebase(options: FirebaseOptions) {
  if (!app) app = getApps().length ? getApp() : initializeApp(options);
  return app;
}

function configuredApp() {
  if (!app) throw new Error("Firebase has not been configured yet.");
  return app;
}

export function firebaseAuth() {
  return getAuth(configuredApp());
}

export function firebaseDb() {
  return getFirestore(configuredApp());
}

export function firebaseStorage() {
  return getStorage(configuredApp());
}
