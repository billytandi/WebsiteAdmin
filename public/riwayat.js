    import { db } from './firebase-config.js';
    import { collection, query, where, getDocs, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
    // Ganti import XLSX
    import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx/+esm';

    // State untuk Pagination
    let currentPage = 1;
    let rowsPerPage = 20;
    let currentData = [];

    // Filter dan Render Ulang Data
    async function fetchAttendanceData(filters = {}) {
        try {
            document.getElementById("loadingSpinner").style.display = "block";

            // Fetch attendance data
            const snapshot = await getDocs(collection(db, 'attendance'));
            const attendanceData = await Promise.all(snapshot.docs.map(async (docSnap) => {
                const attendance = { id: docSnap.id, ...docSnap.data() };

                // Fetch employee data
                if (attendance.uid) {
                    const employeeDoc = await getDoc(doc(db, 'employees', attendance.uid));
                    if (employeeDoc.exists()) {
                        const employeeData = employeeDoc.data();
                        attendance.position = employeeData.position || "-";
                        attendance.departement = employeeData.departement || "-";
                    } else {
                        attendance.position = "-";
                        attendance.departement = "-";
                    }
                }

                return attendance;
            }));

            // Apply filters manually
            const filteredData = attendanceData.filter(item => {
                const startDate = filters.startDate ? new Date(filters.startDate) : null;
                const endDate = filters.endDate ? new Date(filters.endDate) : null;

                const matchesStartDate = startDate ? item.checkin.toDate() >= startDate : true;
                const matchesEndDate = endDate ? item.checkin.toDate() <= endDate : true;
                const matchesPosition = filters.position ? item.position === filters.position : true;
                const matchesDepartement = filters.departement ? item.departement === filters.departement : true;

                return matchesStartDate && matchesEndDate && matchesPosition && matchesDepartement;
            });

            renderAttendanceTable(filteredData);
        } catch (error) {
            console.error('Error fetching attendance data:', error);
        } finally {
            document.getElementById("loadingSpinner").style.display = "none";
        }
    }


    // Render Table dengan Pagination
    function renderAttendanceTable(data) {
        const tbody = document.getElementById("attendanceTableBody");
        const totalRows = data.length;
        const totalPages = Math.ceil(totalRows / rowsPerPage);
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;

        currentData = data; // Simpan data untuk navigasi
        const pageData = data.slice(start, end);

        tbody.innerHTML = pageData.length
            ? pageData.map((item, i) => `
                <tr>
                    <td>${start + i + 1}</td>
                    <td>${new Date(item.checkin.seconds * 1000).toLocaleDateString('id-ID')}</td>
                    <td>${item.employee_name}</td>
                    <td>${item.position}</td>
                    <td>${item.departement}</td>
                    <td>${item.checkin ? new Date(item.checkin.seconds * 1000).toLocaleTimeString() : "-"}</td>
                    <td>${item.checkout ? new Date(item.checkout.seconds * 1000).toLocaleTimeString() : "-"}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="7" class="text-center">Tidak ada data yang ditemukan.</td></tr>`;

        renderPaginationControls(totalPages);
    }

    // Populate Filters
    function populateFilters() {
        const departementFilter = document.getElementById("departementFilter");
        const positionFilter = document.getElementById("positionFilter");

        getDocs(collection(db, 'employees')).then(snapshot => {
            const departement = new Set();
            const position = new Set();

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.departement) departement.add(data.departement.trim());
                if (data.position) position.add(data.position.trim());
            });

            departementFilter.innerHTML = `<option value="">Semua Departemen</option>` +
                Array.from(departement).map(dep => `<option value="${dep}">${dep}</option>`).join("");

            positionFilter.innerHTML = `<option value="">Semua Posisi</option>` +
                Array.from(position).map(pos => `<option value="${pos}">${pos}</option>`).join("");
        }).catch(error => {
            console.error("Error fetching employee data:", error);
        });
    }

    // Filter Button
    document.getElementById("filterBtn").addEventListener("click", () => {
        const filters = {
            startDate: document.getElementById("startDate").value,
            endDate: document.getElementById("endDate").value,
            position: document.getElementById("positionFilter").value,
            departement: document.getElementById("departementFilter").value,
        };
        fetchAttendanceData(filters);
    });

    // Reset Filters
    function resetFilters() {
        document.getElementById("startDate").value = "";
        document.getElementById("endDate").value = "";
        document.getElementById("positionFilter").value = "";
        document.getElementById("departementFilter").value = "";
        fetchAttendanceData();
    }

    // Render Pagination Controls
    function renderPaginationControls(totalPages) {
        const paginationControls = document.getElementById("paginationControls");
        paginationControls.innerHTML = `
            <button ${currentPage === 1 ? 'disabled' : ''} id="prevPageBtn">Sebelumnya</button>
            ${Array.from({ length: totalPages }, (_, i) => `
                <button class="page-btn ${currentPage === i + 1 ? 'active' : ''}" data-page="${i + 1}">
                    ${i + 1}
                </button>
            `).join("")}
            <button ${currentPage === totalPages ? 'disabled' : ''} id="nextPageBtn">Berikutnya</button>
        `;

        // Event Listeners untuk Pagination
        document.getElementById("prevPageBtn").addEventListener("click", () => changePage(currentPage - 1));
        document.getElementById("nextPageBtn").addEventListener("click", () => changePage(currentPage + 1));
        document.querySelectorAll(".page-btn").forEach(button => {
            button.addEventListener("click", (e) => changePage(parseInt(e.target.dataset.page)));
        });
    }

    // Ganti Halaman
    function changePage(page) {
        currentPage = page;
        renderAttendanceTable(currentData);
    }
    // Event untuk Mengubah Rows Per Page
    document.getElementById("rowsPerPage").addEventListener("change", (e) => {
        rowsPerPage = parseInt(e.target.value);
        currentPage = 1; // Reset ke halaman pertama
        renderAttendanceTable(currentData);
    });


    async function downloadMonthlyReport() {
        const month = parseInt(document.getElementById("reportMonth").value, 10) + 1;
        const year = new Date().getFullYear(); // Gunakan tahun saat ini
    
        if (isNaN(month)) {
            alert("Silakan pilih bulan dengan benar.");
            return;
        }
    
        // Buat loading spinner
        let loadingSpinner = null;
    
        try {
            // Buat loading spinner
            loadingSpinner = document.createElement('div');
            loadingSpinner.id = 'reportLoadingSpinner';
            loadingSpinner.innerHTML = `
                <div class="modal fade show" tabindex="-1" style="display: block; background-color: rgba(0,0,0,0.5); z-index: 9999;">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-body text-center">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <p class="mt-2">Sedang membuat laporan...</p>
                                <small>Harap tunggu, sedang memproses laporan untuk semua karyawan</small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(loadingSpinner);
    
            // Buat tanggal awal dan akhir dengan benar
            const startDate = new Date(year, month - 1, 1, 0, 0, 0);
            const endDate = new Date(year, month, 0, 23, 59, 59);
    
            console.log("Rentang tanggal:", startDate, endDate);
    
            // Buat workbook utama untuk semua data
            const summaryWorkbook = XLSX.utils.book_new();
    
            // Ambil semua karyawan
            const employeesSnapshot = await getDocs(collection(db, 'employees'));
    
            // Siapkan data untuk sheet ringkasan
            const summaryData = [
                ["Laporan Absensi", `Bulan ${month}/${year}`],
                ["Total Karyawan", employeesSnapshot.size],
                [],
                ["Nama", "Departemen", "Total Hadir", "Total Izin", "Total Sakit", "Total Telat"]
            ];
    
            // Proses setiap karyawan
            const reportPromises = employeesSnapshot.docs.map(async (employeeDoc) => {
                const employee = { 
                    id: employeeDoc.id, 
                    ...employeeDoc.data() 
                };
    
                // Query absensi untuk karyawan ini di bulan tertentu
                const employeeAttendanceQuery = query(
                    collection(db, 'attendance'),
                    where('uid', '==', employee.id),
                    where('checkin', '>=', startDate),
                    where('checkin', '<=', endDate)
                );
    
                const attendanceSnapshot = await getDocs(employeeAttendanceQuery);
    
                // Hitung statistik kehadiran
                const employeeAttendance = attendanceSnapshot.docs.map(doc => doc.data());
                
                const statusCounts = {
                    hadir: employeeAttendance.filter(a => a.status === 'Hadir').length,
                    izin: employeeAttendance.filter(a => a.status === 'Izin' || a.status === 'Permit').length,
                    sakit: employeeAttendance.filter(a => a.status === 'Sakit' || a.status === 'Sick').length,
                    telat: employeeAttendance.filter(a => a.status === 'Late' || a.status === 'Telat').length,
                };
                
    
                // Tambahkan data ke ringkasan
                summaryData.push([
                    employee.name, 
                    employee.departement || '-', 
                    statusCounts.hadir, 
                    statusCounts.izin, 
                    statusCounts.sakit, 
                ]);
    
                // Siapkan data untuk sheet per karyawan
                const excelData = [
                    ["Nama Lengkap", employee.name],
                    ["Departemen", employee.departement],
                    ["Posisi", employee.position],
                    ["Bulan", `${month}/${year}`],
                    [],
                    ["Tanggal", "Check-in", "Check-out", "Status"]
                ];
    
                // Tambahkan detail absensi
                employeeAttendance.forEach(attendance => {
                    excelData.push([
                        attendance.checkin 
                            ? new Date(attendance.checkin.seconds * 1000).toLocaleDateString('id-ID') 
                            : "-",
                        attendance.checkin 
                            ? new Date(attendance.checkin.seconds * 1000).toLocaleTimeString('id-ID') 
                            : "-",
                        attendance.checkout 
                            ? new Date(attendance.checkout.seconds * 1000).toLocaleTimeString('id-ID') 
                            : "-",
                        attendance.status || "-"
                    ]);
                });
    
                // Tambahkan ringkasan statistik
                excelData.push(
                    [],
                    ["Total Hari Kerja", employeeAttendance.length],
                    ["Hari Hadir", statusCounts.hadir],
                    ["Hari Izin", statusCounts.izin],
                    ["Hari Sakit", statusCounts.sakit],
                    ["Hari Telat", statusCounts.telat],

                );
    
                // Tambahkan sheet ke workbook utama
                const ws = XLSX.utils.aoa_to_sheet(excelData);
                XLSX.utils.book_append_sheet(summaryWorkbook, ws, `Laporan_${employee.name.replace(/\s+/g, '_')}`);
            });
    
            // Tunggu semua proses selesai
            await Promise.all(reportPromises);
    
            // Tambahkan sheet ringkasan ke workbook utama
            const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(summaryWorkbook, summaryWorksheet, `Ringkasan_Absensi`);
    
            // Simpan file workbook
            const summaryFileName = `Laporan_Absensi_${month}_${year}.xlsx`;
            XLSX.writeFile(summaryWorkbook, summaryFileName);
    
            // Hapus loading spinner
            if (loadingSpinner && loadingSpinner.parentNode) {
                loadingSpinner.parentNode.removeChild(loadingSpinner);
            }
            
            alert("Laporan berhasil dibuat!");
    
        } catch (error) {
            // Hapus loading spinner jika ada error
            if (loadingSpinner) {
                try {
                    if (loadingSpinner.parentNode) {
                        loadingSpinner.parentNode.removeChild(loadingSpinner);
                    }
                } catch (removeError) {
                    console.error("Error removing spinner:", removeError);
                }
            }
            
            console.error("Error generating reports:", error);
            alert("Gagal membuat laporan. Silakan coba lagi.");
        }
    }
    

    document.getElementById("downloadReportBtn").addEventListener("click", downloadMonthlyReport);
    document.getElementById("resetFilterBtn").addEventListener("click", resetFilters);
    populateFilters();
    fetchAttendanceData();
