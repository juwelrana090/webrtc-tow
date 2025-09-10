// src/config/firebase.ts
import { getApps, initializeApp } from 'firebase/app';

// Your Firebase config object (get this from Firebase Console)
const firebaseConfig = {
  apiKey: 'AIzaSyDc_icacW3W83ynD_zooI0XiA20cXOst-I',
  authDomain: 'qawiun-fcm.firebaseapp.com',
  projectId: 'qawiun-fcm',
  storageBucket: 'qawiun-fcm.appspot.com',
  messagingSenderId: '430397943780',
  appId: '1:430397943780:android:6da28bf1b281cf4f69e1f1',
};

// Initialize Firebase only if no apps exist
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

export default firebaseConfig;
