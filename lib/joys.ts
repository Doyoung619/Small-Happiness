import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import { Pin } from "./mockPins";

export type Joy = Pin & {
  authorId: string;
  visibility: "public" | "group";
  groupId?: string;
  groupName?: string;
};

export function subscribeToJoys(
  onData: (joys: Joy[]) => void,
  onError: (message: string) => void,
  groupIds: string[] = [],
) {
  const latest = new Map<string, Joy & { createdAt?: { seconds: number } }>();
  const emit = () => {
    const joys = [...latest.values()].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    onData(joys);
  };
  const toJoy = (item: { id: string; data: () => Record<string, unknown> }) => {
    const data = item.data();
    return { id: item.id, ...data, label: data.title } as Joy & { createdAt?: { seconds: number } };
  };

  const queries = [query(collection(db, "joys"), where("visibility", "==", "public"), limit(100))];
  for (let index = 0; index < groupIds.length; index += 10) {
    queries.push(query(collection(db, "joys"), where("groupId", "in", groupIds.slice(index, index + 10)), limit(100)));
  }

  const unsubs = queries.map((joysQuery) => onSnapshot(
    joysQuery,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "removed") latest.delete(change.doc.id);
        else latest.set(change.doc.id, toJoy(change.doc));
      });
      emit();
    },
    (error) => onError(error.message),
  ));

  return () => unsubs.forEach((unsub) => unsub());
}

export async function createJoy({
  uid,
  text,
  emoji,
  lat,
  lng,
  photo,
  author,
  groupId,
  groupName,
}: {
  uid: string;
  text: string;
  emoji: string;
  lat: number;
  lng: number;
  photo?: File;
  author?: string | null;
  groupId?: string;
  groupName?: string;
}) {
  let imageUrl = "";
  if (photo) {
    const imageRef = ref(storage, `joys/${uid}/${crypto.randomUUID()}`);
    await uploadBytes(imageRef, photo, { contentType: photo.type });
    imageUrl = await getDownloadURL(imageRef);
  }

  return addDoc(collection(db, "joys"), {
    authorId: uid,
    author: author?.trim() || `guest-${uid.slice(0, 6)}`,
    title: text.length > 30 ? `${text.slice(0, 30)}…` : text,
    description: text,
    emoji,
    imageUrl,
    lat,
    lng,
    visibility: groupId ? "group" : "public",
    ...(groupId ? { groupId, groupName: groupName || "Group" } : {}),
    createdAt: serverTimestamp(),
    sharedAt: "just now",
  });
}
