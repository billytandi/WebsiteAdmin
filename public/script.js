import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { getFirestore, collection, getDocs, setDoc, deleteDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// Firebase Configuration and Initialization
const firebaseConfig = {
  apiKey: "AIzaSyB42FTzBVIAVz2ssUm7-8V-OhT-IOS7raQ",
  authDomain: "attendance-app-f9eae.firebaseapp.com",
  projectId: "attendance-app-f9eae",
  storageBucket: "attendance-app-f9eae.appspot.com",
  messagingSenderId: "627962989643",
  appId: "1:627962989643:web:5fe7137a24848d3b27d1ce",
  measurementId: "G-XTTF81E9BE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);


// Fungsi untuk menambahkan karyawan
document.getElementById('employeeForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('employeeName').value;
  const email = document.getElementById('employeeEmail').value;
  const password = document.getElementById('employeePassword').value;
  const employeeID = document.getElementById('employeeID').value;
  const phone = document.getElementById('employeePhone').value;
  const departement = document.getElementById('employeeDepartement').value;
  const division = document.getElementById('employeeDivision').value;
  const position = document.getElementById('employeePosition').value;
  const office = document.getElementById('employeeOffice').value;
  try {
    // Buat akun di Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Simpan data karyawan di Firestore
    await setDoc(doc(db, "employees", user.uid), {
      name: name,
      email: email,
      employeeID: employeeID,
      phone: phone,
      departement: departement,
      division: division,
      position: position,
      office: office
    });

    alert("Data karyawan berhasil ditambahkan!");

    // Tambahkan data ke tabel secara langsung tanpa refresh
    const employeeTable = document.getElementById('employeeData');
    const newRow = `<tr>
                        <td>${name}</td>
                        <td>${email}</td>
                        <td>${employeeID}</td>
                        <td>${phone}</td>
                        <td>${departement}</td>
                        <td>${division}</td>
                        <td>${position}</td>
                        <td>${office}</td>
                      </tr>`;
    employeeTable.innerHTML += newRow;
    // Reset form
    document.getElementById('employeeForm').reset();

    // Tutup modal
    document.getElementById('addEmployeeForm').style.display = "none";
  } catch (error) {
    console.error("Error menambahkan karyawan: ", error);
    alert("Gagal menambahkan karyawan: " + error.message);
  }
});


async function fetchAttendances() {
  const querySnapshot = await getDocs(collection(db, "attendance"));
  const queryEmployee = await getDocs(collection(db, "employees"));

  const attendanceMap = {}; // Objek untuk menyimpan absensi terakhir per karyawan
  const employeeData = [];  // Array untuk menyimpan data karyawan

  let hadirCount = 0;
  let izinCount = 0;
  let cutiCount = 0;
  let sakitCount = 0;
  let alphaCount = 0;

  // Ambil tanggal hari ini (tanpa waktu) untuk perbandingan
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set jam ke 00:00:00 agar hanya tanggal yang diperhitungkan

  // Ambil data absensi
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const timestampInSeconds = data.timestamp.seconds;
    const attendanceDate = new Date(timestampInSeconds * 1000); // Konversi timestamp ke Date

    // Set waktu ke 00:00:00 untuk perbandingan hanya berdasarkan tanggal
    attendanceDate.setHours(0, 0, 0, 0);

    // Hanya pertimbangkan absensi untuk hari ini
    if (attendanceDate.getTime() === today.getTime()) {
      const uid = data.uid;

      // Jika sudah ada absensi untuk karyawan ini, bandingkan timestamp
      if (attendanceMap[uid]) {
        if (data.timestamp.seconds > attendanceMap[uid].timestamp.seconds) {
          attendanceMap[uid] = data;
        }
      } else {
        attendanceMap[uid] = data;
      }
    }
  });

  // Ambil data karyawan
  queryEmployee.forEach((doc) => {
    const data = doc.data();
    const uid = doc.id;

    // Default status 'Alpha' (belum hadir)
    const employee = {
      uid: uid,
      employee_name: data.name,
      employee_id: data.employeeID,
      status: 'Alpha',  // Default nilai sebelum absen
      formattedDate: '-',
      formattedClock: '-',
      location: '-',
      keterangan: 'Belum Hadir',
      departement: data.departement,
      division: data.division,
    };

    // Jika karyawan sudah absen, update statusnya
    const attendance = attendanceMap[employee.uid];
    if (attendance) {
      const qrCodeData = JSON.parse(attendance.qr_code);

      employee.formattedDate = new Date(attendance.timestamp.seconds * 1000).toLocaleDateString();
      employee.formattedClock = new Date(attendance.timestamp.seconds * 1000).toLocaleTimeString();
      employee.location = qrCodeData.location;
      employee.keterangan = qrCodeData.keterangan || '-';

      if (qrCodeData.keterangan === 'Izin') {
        employee.status = 'Izin';
        izinCount++;
      } else if (qrCodeData.keterangan === 'Cuti') {
        employee.status = 'Cuti';
        cutiCount++;
      } else if (qrCodeData.keterangan === 'Sakit') {
        employee.status = 'Sakit';
        sakitCount++;
      } else {
        employee.status = 'Hadir';
        hadirCount++;
      }
    } else {
      // Jika tidak ada data absensi untuk karyawan, status tetap 'Alpha'
      alphaCount++;
    }

    employeeData.push(employee);
  });

  // Update jumlah di widget
  document.getElementById('hadirCount').textContent = hadirCount;
  document.getElementById('izinCount').textContent = izinCount;
  document.getElementById('cutiCount').textContent = cutiCount;
  document.getElementById('sakitCount').textContent = sakitCount;
  document.getElementById('alphaCount').textContent = alphaCount;

  // Tampilkan data karyawan dengan absensi di tabel
  const attendanceTable = document.getElementById('attendanceData');
  attendanceTable.innerHTML = '';  // Kosongkan tabel sebelum menambahkan data baru

  employeeData.forEach((employee) => {
    const row = `<tr>
                    <td>${employee.employee_id}</td>
                    <td>${employee.employee_name}</td>
                    <td>${employee.formattedDate}</td>
                    <td>${employee.formattedClock}</td>
                    <td>${employee.location}</td>
                    <td>${employee.keterangan}</td>
                    <td>${employee.departement}</td>
                    <td>${employee.division}</td>
                  </tr>`;
    attendanceTable.innerHTML += row;
  });
}



// Definisikan fungsi delete
function deleteEmployee(uid) {
  if (confirm("Apakah kamu yakin ingin menghapus data ini?")) {
    firebase.firestore().collection("employees").doc(uid).delete()
      .then(() => {
        alert("Data karyawan berhasil dihapus.");
        location.reload(); // Refresh halaman setelah penghapusan
      })
      .catch((error) => {
        console.error("Error saat menghapus data: ", error);
        alert("Gagal menghapus data karyawan.");
      });
  }
}


// Fungsi untuk mengambil data karyawan
async function fetchEmployees() {
  const querySnapshot = await getDocs(collection(db, "employees"));
  const employeeTable = document.getElementById('employeeData');
  employeeTable.innerHTML = '';  // Kosongkan tabel sebelum menambahkan data baru
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const row = `<tr>
                    <td>${data.name}</td>
                    <td>${data.email}</td>
                    <td>${data.employeeID}</td>
                    <td>${data.phone}</td>
                    <td>${data.departement}</td>
                    <td>${data.division}</td>
                    <td>${data.office}</td>
                  </tr>`;
    employeeTable.innerHTML += row;
  });
}

// Event listener untuk membuka form tambah karyawan
document.getElementById('addEmployeeBtn').addEventListener('click', () => {
  document.getElementById('addEmployeeForm').style.display = 'block';
});

// Event listener untuk menutup form tambah karyawan saat tombol close ditekan
document.querySelector('.close').addEventListener('click', () => {
  document.getElementById('addEmployeeForm').style.display = 'none';
});

// Optional: Menutup form saat pengguna klik di luar modal
window.addEventListener('click', (e) => {
  const modal = document.getElementById('addEmployeeForm');
  if (e.target == modal) {
    modal.style.display = 'none';
  }
});

window.addEventListener('keyup', (e) => {
  if (e.target.id === 'filterName') {
    const filterValue = e.target.value.toLowerCase();
    const employeeTable = document.getElementById('employeeData');
    const rows = employeeTable.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nameCell = row.getElementsByTagName('td')[0];
      const name = nameCell.textContent.toLowerCase();

      if (name.includes(filterValue)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    }
  }
});
// Panggil fetchEmployees saat halaman dimuat
window.onload = function () {
  fetchEmployees();
  fetchAttendances();
};