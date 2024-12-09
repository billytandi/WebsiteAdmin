// login.js
import { 
    auth, 
    db, 
    signInWithEmailAndPassword, 
    getDoc, 
    doc 
} from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const loginErrorElement = document.getElementById('loginError');
            
            // Reset error states
            loginErrorElement.textContent = '';
            emailInput.classList.remove('is-invalid');
            passwordInput.classList.remove('is-invalid');

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            // Basic validation
            if (!email || !password) {
                loginErrorElement.textContent = 'Email dan password harus diisi';
                return;
            }

            try {
                console.log('Attempting login with:', email);
                
                // Firebase Authentication
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Fetch user data from Firestore
                const userDoc = await getDoc(doc(db, 'admin', user.uid));
                
                if (!userDoc.exists()) {
                    throw new Error('Pengguna tidak ditemukan dalam database');
                }

                const userData = userDoc.data();
                console.log('User data:', userData);

                // Role-based navigation
                switch(userData.position) {
                    case 'Admin':
                        window.location.href = 'dashboard.html';
                        break;
                    case 'Karyawan':
                        window.location.href = 'dashboard-karyawan.html';
                        break;
                    default:
                        window.location.href = 'dashboard.html';
                }

            } catch (error) {
                console.error('Login error:', error);
                
                let errorMessage = 'Login gagal';
                switch(error.code) {
                    case 'auth/invalid-email':
                        errorMessage = 'Format email tidak valid';
                        emailInput.classList.add('is-invalid');
                        break;
                    case 'auth/user-not-found':
                        errorMessage = 'Pengguna tidak ditemukan';
                        emailInput.classList.add('is-invalid');
                        break;
                    case 'auth/wrong-password':
                        errorMessage = 'Password salah';
                        passwordInput.classList.add('is-invalid');
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Terlalu banyak percobaan. Silakan coba lagi nanti.';
                        break;
                    default:
                        errorMessage = error.message || 'Terjadi kesalahan saat login';
                }

                loginErrorElement.textContent = errorMessage;
            }
        });
    }
});