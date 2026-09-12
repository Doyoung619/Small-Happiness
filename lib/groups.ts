import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type JoyGroup = {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  memberIds: string[];
  memberNames?: Record<string, string>;
};

function displayName(name: string | null | undefined, uid: string) {
  return name?.trim() || `guest-${uid.slice(0, 6)}`;
}

function inviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function subscribeToGroups(uid: string, onData: (groups: JoyGroup[]) => void, onError: (message: string) => void) {
  const groupsQuery = query(collection(db, "groups"), where("memberIds", "array-contains", uid), limit(50));
  return onSnapshot(
    groupsQuery,
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as JoyGroup)),
    (error) => onError(error.message),
  );
}

export async function createGroup(uid: string, name: string, userName?: string | null) {
  return addDoc(collection(db, "groups"), {
    name: name.trim(),
    ownerId: uid,
    inviteCode: inviteCode(),
    memberIds: [uid],
    memberNames: { [uid]: displayName(userName, uid) },
    createdAt: serverTimestamp(),
  });
}

export async function joinGroupByCode(uid: string, code: string, userName?: string | null) {
  const groupsQuery = query(collection(db, "groups"), where("inviteCode", "==", code.trim().toUpperCase()), limit(1));
  const snapshot = await getDocs(groupsQuery);
  const group = snapshot.docs[0];
  if (!group) throw new Error("Invite code not found.");
  await updateDoc(doc(db, "groups", group.id), {
    memberIds: arrayUnion(uid),
    [`memberNames.${uid}`]: displayName(userName, uid),
  });
}
