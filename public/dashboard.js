    import {auth,onAuthStateChanged,db,collection,getDocs,query,where,Timestamp,doc,getDoc,} from "./firebase-config.js";

    async function fetchAttendances() {
        const loadingSpinner = document.getElementById("loadingSpinner");
        const tableBody = document.getElementById("attendanceTableBody");
    
        // Tampilkan spinner dan kosongkan tabel saat proses dimulai
        loadingSpinner.style.display = "block";
        tableBody.innerHTML = "";
    
        try {
            const querySnapshot = await getDocs(collection(db, "attendance"));
            const queryEmployee = await getDocs(collection(db, "employees"));
            const attendanceMap = {};
            const employeeData = [];
    
            let hadirCount = 0;
            let izinCount = 0;
            let telatCount = 0;
            let sakitCount = 0;
            let alphaCount = 0;
    
            const today = new Date();
            today.setHours(0, 0, 0, 0);
    
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const attendanceDate = data.checkin.toDate();
                attendanceDate.setHours(0, 0, 0, 0);
    
                if (attendanceDate.getTime() === today.getTime()) {
                    const uid = data.uid;
    
                    if (!attendanceMap[uid] || data.checkin.seconds > attendanceMap[uid].checkin.seconds) {
                        attendanceMap[uid] = data;
                    }
                }
            });
    
            queryEmployee.forEach((doc) => {
                const data = doc.data();
                const uid = doc.id;
    
                const employee = {
                    uid: uid,
                    employee_name: data.name,
                    employee_id: data.employeeID || "Tidak Diketahui",
                    status: "Alpha",
                    formattedDate: "-",
                    formattedClockIn: "-",
                    formattedClockOut: "-",
                    location: "-",
                    keterangan: "Belum Hadir",
                    departement: data.departement || "Tidak Diketahui",
                    division: data.division || "Tidak Diketahui",
                };
    
                const attendance = attendanceMap[employee.uid];
                if (attendance) {
                    let qrCodeData = {};
                    try {
                        if (attendance.qr_code && attendance.qr_code !== "-") {
                            qrCodeData = JSON.parse(attendance.qr_code.trim());
                        }
                    } catch (error) {
                        console.error("Error parsing QR code data:", error);
                    }
    
                    employee.formattedDate = attendance.checkin.toDate().toLocaleDateString();
                    employee.formattedClockIn = attendance.checkin.toDate().toLocaleTimeString();
    
                    if (attendance.checkout) {
                        employee.formattedClockOut = attendance.checkout.toDate().toLocaleTimeString();
                    }
    
                    employee.location = qrCodeData.location || "Tidak Hadir";
                    employee.keterangan = attendance.status;
    
                    switch (attendance.status) {
                        case "Izin":
                            employee.status = "Izin";
                            izinCount++;
                            break;
                        case "Telat":
                            employee.status = "Telat";
                            telatCount++;
                            break;
                        case "Sakit":
                            employee.status = "Sakit";
                            sakitCount++;
                            break;
                        default:
                            employee.status = "Hadir";
                            hadirCount++;
                    }
                } else {
                    alphaCount++;
                }
    
                employeeData.push(employee);
            });
    
            renderAttendanceTable(employeeData);
            updateAttendanceSummary({
                hadir: hadirCount,
                izin: izinCount,
                telat: telatCount,
                sakit: sakitCount,
                alpha: alphaCount,
            });
        } catch (error) {
            console.error("Error fetching attendances:", error);
        } finally {
            // Sembunyikan spinner setelah proses selesai
            loadingSpinner.style.display = "none";
        }
    }
    
    
    function renderAttendanceTable(data) {
        const tableBody = document.getElementById("attendanceTableBody");
        tableBody.innerHTML = "";
    
        data.forEach((item) => {
        const row = `
            <tr>
            <td>${item.employee_name}</td>
            <td>${item.status}</td>
            <td>${item.formattedClockIn}</td>
            <td>${item.formattedClockOut}</td>
            <td>${item.departement}</td>
            <td>${item.location}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
        });
    }
    
    function updateAttendanceSummary(summary) {
        document.getElementById("hadirCount").textContent = summary.hadir;
        document.getElementById("izinCount").textContent = summary.izin;
        document.getElementById("telatCount").textContent = summary.telat;
        document.getElementById("sakitCount").textContent = summary.sakit;
        document.getElementById("alphaCount").textContent = summary.alpha;
    }
    
    // Cek autentikasi sebelum memuat halaman
    document.addEventListener("DOMContentLoaded", () => {
        onAuthStateChanged(auth, (user) => {
        if (user) {
            // Pengguna sudah login, lanjutkan memuat dashboard
            fetchAttendances();
        } else {
            // Pengguna belum login, redirect ke halaman login
            window.location.href = "/public/login.html";
        }
        });
    });