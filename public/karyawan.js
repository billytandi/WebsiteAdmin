import { auth, db } from "./firebase-config.js";
import { collection, addDoc, setDoc, getDocs, deleteDoc, doc, query, where, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// Inisialisasi Modal
const editEmployeeModal = new bootstrap.Modal(document.getElementById("editEmployeeModal"));
const addEmployeeModal = new bootstrap.Modal(document.getElementById('addEmployeeModal'));

// Fungsi Tambah Karyawan
document.getElementById("submit").addEventListener("click", async () => {
    const name = document.getElementById("employeeName").value;
    const email = document.getElementById("employeeEmail").value;
    const password = document.getElementById("employeePassword").value;
    const employeeID = document.getElementById("employeeID").value;
    const phone = document.getElementById("employeePhone").value;
    const departement = document.getElementById("employeeDepartement").value;
    const division = document.getElementById("employeeDivision").value;
    const position = document.getElementById("employeePosition").value;
    const office = document.getElementById("employeeOffice").value;

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

        // Tutup modal
        addEmployeeModal.hide();

        // Refresh tabel
        await fetchEmployees();

        // Reset form
        document.getElementById("addEmployeeForm").reset();
    } catch (error) {
        console.error("Error menambahkan karyawan: ", error);
        alert("Gagal menambahkan karyawan: " + error.message);
    }
});

// Fungsi Fetch Data Karyawan
async function fetchEmployees() {
    try {
        const querySnapshot = await getDocs(collection(db, "employees"));
        const employeeTableBody = document.getElementById("employeeTableBody");
        employeeTableBody.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const employee = doc.data();
            const row = `
                <tr>
                    <td>${employee.employeeID}</td>
                    <td>${employee.name}</td>
                    <td>${employee.email}</td>
                    <td>${employee.phone}</td>
                    <td>${employee.departement}</td>
                    <td>${employee.division}</td>
                    <td>${employee.position}</td>
                    <td>${employee.office}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-warning edit-employee" data-uid="${doc.id}">
                                Edit
                            </button>
                            <button class="btn btn-sm btn-danger delete-employee" data-uid="${doc.id}">
                                Hapus
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            employeeTableBody.innerHTML += row;
        });

        // Event Listener untuk tombol Edit
        document.querySelectorAll(".edit-employee").forEach((button) => {
            button.addEventListener("click", (e) => {
                const uid = e.target.dataset.uid;
                loadEmployeeForEdit(uid);
            });
        });

        // Event Listener untuk tombol Hapus
        document.querySelectorAll(".delete-employee").forEach((button) => {
            button.addEventListener("click", (e) => {
                const uid = e.target.dataset.uid;
                deleteEmployee(uid);
            });
        });
        // Tambahkan opsi departemen di dropdown filter
const departmentFilter = document.getElementById('departmentFilter');
const departments = new Set();
querySnapshot.forEach((doc) => {
    const employee = doc.data();
    departments.add(employee.departement);
});

// Reset dropdown sebelum menambahkan opsi
departmentFilter.innerHTML = '<option value="">Semua Departemen</option>';
departments.forEach((dept) => {
    const option = document.createElement('option');
    option.value = dept;
    option.textContent = dept;
    departmentFilter.appendChild(option);
});

// Event listener untuk filter departemen
document.getElementById('departmentFilter').addEventListener('change', () => {
    const selectedDepartment = document.getElementById('departmentFilter').value;
    const employeeTable = document.getElementById('employeeTableBody');
    const rows = employeeTable.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const departmentCell = row.getElementsByTagName('td')[4]; // Kolom departemen
        const department = departmentCell.textContent;

        if (selectedDepartment === '' || department === selectedDepartment) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    }
});
    } catch (error) {
        console.error("Error mengambil data karyawan:", error);
        alert("Gagal memuat data karyawan.");
    }
}

// Fungsi Memuat Data Karyawan untuk Edit
async function loadEmployeeForEdit(uid) {
    try {
        const employeeRef = doc(db, "employees", uid);
        const employeeDoc = await getDoc(employeeRef);

        if (employeeDoc.exists()) {
            const employeeData = employeeDoc.data();

            document.getElementById("editEmployeeName").value = employeeData.name;
            document.getElementById("editEmployeePhone").value = employeeData.phone;
            document.getElementById("editEmployeeDepartment").value = employeeData.departement;
            document.getElementById("editEmployeeDivision").value = employeeData.division;
            document.getElementById("editEmployeePosition").value = employeeData.position;

            document.getElementById("saveEditEmployeeBtn").dataset.uid = uid;
            editEmployeeModal.show();
        } else {
            alert("Data karyawan tidak ditemukan.");
        }
    } catch (error) {
        console.error("Error memuat data karyawan:", error);
        alert("Gagal memuat data karyawan.");
    }
}

// Fungsi Simpan Perubahan Edit Karyawan
document.getElementById("saveEditEmployeeBtn").addEventListener("click", async () => {
    const uid = document.getElementById("saveEditEmployeeBtn").dataset.uid;

    const updatedData = {
        name: document.getElementById("editEmployeeName").value,
        phone: document.getElementById("editEmployeePhone").value,
        departement: document.getElementById("editEmployeeDepartment").value,
        division: document.getElementById("editEmployeeDivision").value,
        position: document.getElementById("editEmployeePosition").value
    };

    try {
        const employeeRef = doc(db, "employees", uid);
        await updateDoc(employeeRef, updatedData);

        alert("Data karyawan berhasil diperbarui.");
        await fetchEmployees();
        editEmployeeModal.hide();
    } catch (error) {
        console.error("Error memperbarui data karyawan:", error);
        alert("Gagal memperbarui data karyawan.");
    }
});

// Fungsi Hapus Karyawan
async function deleteEmployee(uid) {
    if (confirm("Apakah Anda yakin ingin menghapus karyawan ini?")) {
        try {
            const employeeRef = doc(db, "employees", uid);
            await deleteDoc(employeeRef);

            alert("Karyawan berhasil dihapus.");
            await fetchEmployees();
        } catch (error) {
            console.error("Error menghapus karyawan:", error);
            alert("Gagal menghapus karyawan.");
        }
    }
}

// Logout Functionality
document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (error) {
        console.error("Error logging out:", error);
    }
});

// Filter Karyawan
window.addEventListener('keyup', (e) => {
    if (e.target.id === 'filterName') {
        const filterValue = e.target.value.toLowerCase();
        const employeeTable = document.getElementById('employeeTableBody');
        const rows = employeeTable.getElementsByTagName('tr');

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const nameCell = row.getElementsByTagName('td')[1];
            const name = nameCell.textContent.toLowerCase();

            if (name.includes(filterValue)) {
                row.style.display = ''; } else {
                row.style.display = 'none';
            }
        }
    }
});

// Inisialisasi Fetch Data saat Halaman Dimuat
document.addEventListener("DOMContentLoaded", () => {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = "index.html";
        } else {
            fetchEmployees();
        }
    });
});