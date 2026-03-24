import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

export const hasCheckedInToday = async (userId: string) => {
  const attendanceRef = collection(db, 'attendance');
  const today = new Date().toISOString().split('T')[0];
  const q = query(attendanceRef, where('userId', '==', userId), where('date', '==', today));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

export const calculateAndUpdateAttendanceScore = async (userId: string) => {
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
  
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { attendanceScore: score });
};
