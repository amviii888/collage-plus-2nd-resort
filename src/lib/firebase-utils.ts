import { collection, query, where, getDocs, Firestore, limit } from "firebase/firestore";

export async function generateUniqueBarcode(firestore: Firestore): Promise<string> {
  const studentsRef = collection(firestore, 'students');
  let barcode: string;
  let isUnique = false;

  while (!isUnique) {
    // Generate a 5-digit numeric string
    barcode = Math.floor(10000 + Math.random() * 90000).toString();
    const q = query(studentsRef, where("barcodeId", "==", barcode), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      isUnique = true;
    }
  }
  return barcode!;
};
