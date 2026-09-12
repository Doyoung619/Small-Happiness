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
  visibility: "public";
};

export function subscribeToJoys(
  onData: (joys: Joy[]) => void,
  onError: (message: string) => void,
) {
  const joysQuery = query(collection(db, "joys"), where("visibility", "==", "public"), limit(100));
  return onSnapshot(
    joysQuery,
    (snapshot) => {
      const joys = snapshot.docs.map((item) => {
        const data = item.data();
        return { id: item.id, ...data, label: data.title } as Joy & { createdAt?: { seconds: number } };
      });
      joys.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      onData(joys);
    },
    (error) => onError(error.message),
  );
}

export async function createJoy({
  uid,
  text,
  emoji,
  lat,
  lng,
  photo,
}: {
  uid: string;
  text: string;
  emoji: string;
  lat: number;
  lng: number;
  photo?: File;
}) {
  let imageUrl = "";
  if (photo) {
    const imageRef = ref(storage, `joys/${uid}/${crypto.randomUUID()}`);
    await uploadBytes(imageRef, photo, { contentType: photo.type });
    imageUrl = await getDownloadURL(imageRef);
  }

  return addDoc(collection(db, "joys"), {
    authorId: uid,
    author: `guest-${uid.slice(0, 6)}`,
    title: text.length > 30 ? `${text.slice(0, 30)}…` : text,
    description: text,
    emoji,
    imageUrl,
    lat,
    lng,
    visibility: "public",
    createdAt: serverTimestamp(),
    sharedAt: "just now",
  });
}
