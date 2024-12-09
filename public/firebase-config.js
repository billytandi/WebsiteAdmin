import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { 
    getFirestore, 
    collection, 
    getDoc,
    getDocs, 
    setDoc, 
    deleteDoc, 
    updateDoc, 
    doc,
    query,
    where,
    serverTimestamp as timestamp,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB42FTzBVIAVz2ssUm7-8V-OhT-IOS7raQ",
  authDomain: "attendance-app-f9eae.firebaseapp.com",
  projectId: "attendance-app-f9eae",
  storageBucket: "attendance-app-f9eae.appspot.com",
  messagingSenderId: "627962989643",
  appId: "1:627962989643:web:5fe7137a24848d3b27d1ce",
  measurementId: "G-XTTF81E9BE",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

export { 
    auth, 
    db, 
    signInWithEmailAndPassword, 
    getDoc,
    doc,
    collection,
    getDocs,
    setDoc, 
    deleteDoc, 
    updateDoc, 
    query,
    where,
    timestamp,
    Timestamp,
    createUserWithEmailAndPassword,
    onAuthStateChanged
};
function authMiddleware(requiredRole = null) {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.href = 'login.html';
                reject('Tidak terautentikasi');
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'admin', user.uid));
                
                if (!userDoc.exists()) {
                    window.location.href = 'login.html';
                    reject('Pengguna tidak ditemukan');
                    return;
                }

                const userData = userDoc.data();

                // Cek role
                if (requiredRole && userData.role !== requiredRole) {
                    alert('Anda tidak memiliki izin');
                    window.location.href = 'dashboard.html';
                    reject('Akses ditolak');
                    return;
                }

                resolve(userData);
            } catch (error) {
                console.error('Autentikasi error:', error);
                window.location.href = 'login.html';
                reject(error);
            }
        });
    });
}

