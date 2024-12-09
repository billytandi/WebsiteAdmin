import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

async function fetchAttendanceData({ startDate, endDate, employee, department, branch }) {
    const attendanceRef = collection(db, 'attendance');
    const constraints = [];

    // Tambahkan filter jika ada
    if (startDate) constraints.push(where('checkin', '>=', new Date(startDate)));
    if (endDate) constraints.push(where('checkin', '<=', new Date(endDate)));
    if (employee) constraints.push(where('employee_name', '==', employee));
    if (department) constraints.push(where('department', '==', department));
    if (branch) constraints.push(where('location_from_qr', '==', branch));

    try {
        const q = query(attendanceRef, ...constraints);
        const querySnapshot = await getDocs(q);
        const attendanceData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderAttendanceTable(attendanceData);
    } catch (error) {
        console.error('Error fetching attendance data:', error);
    }
}

// Fungsi untuk render tabel
function renderAttendanceTable(data) {
    const tbody = document.getElementById("attendanceTableBody");
    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">Tidak ada data yang ditemukan.</td>
            </tr>
        `;
        return;
    }

    data.forEach((item, index) => {
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${new Date(item.checkin.seconds * 1000).toLocaleDateString()}</td>
                <td>${item.employee_name}</td>
                <td>${item.department || "-"}</td>
                <td>${item.checkin ? new Date(item.checkin.seconds * 1000).toLocaleTimeString() : "-"}</td>
                <td>${item.checkout ? new Date(item.checkout.seconds * 1000).toLocaleTimeString() : "-"}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Event listener untuk tombol filter
document.getElementById("filterBtn").addEventListener("click", () => {
    const filters = {
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
        employee: document.getElementById("employeeFilter").value,
        department: document.getElementById("departmentFilter").value,
        branch: document.getElementById("branchFilter").value,
    };
    fetchAttendanceData(filters);
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    fetchAttendanceData({});
});
