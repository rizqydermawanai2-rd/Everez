import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

export const hasCheckedInToday = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data().role === 'ceo') {
    return true; // CEO doesn't need to check in
  }
  
  const attendanceRef = collection(db, 'attendance');
  const today = new Date().toISOString().split('T')[0];
  const q = query(attendanceRef, where('userId', '==', userId), where('date', '==', today));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

export const calculateAndUpdateAttendanceScore = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data().role === 'ceo') {
    return; // CEO doesn't need attendance score
  }

  const attendanceRef = collection(db, 'attendance');
  const q = query(attendanceRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  
  let izinCount = 0;
  let sakitCount = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.status === 'Izin') izinCount++;
    if (data.status === 'Sakit') sakitCount++;
  });
  
  let score = 100; // Base score
  if (izinCount > 2) score -= (izinCount - 2) * 5;
  if (sakitCount > 2) score -= (sakitCount - 2) * 5;
  
  await updateDoc(userRef, { attendanceScore: score });
};
