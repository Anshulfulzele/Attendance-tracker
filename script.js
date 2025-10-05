// Supabase Configuration
const SUPABASE_URL = 'https://gmqlgvlgoztantflewut.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcWxndmxnb3p0YW50Zmxld3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTE3NTMsImV4cCI6MjA3MzA2Nzc1M30.0Ex2Gv8t7fN7Qlg6-HWv4_fx9PPD3D2Pw-YoKZdWh1o';

// Global Variables
let selectedClassId = null;
let currentClasses = [];
let currentStudents = [];
let currentPeriods = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('App initializing...');
    initializeApp();
    setTodayDate();
    setCurrentMonth();
});

function initializeApp() {
    loadClasses();
    showSection('manage-classes');
}

function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('attendanceDate');
    if (dateInput) dateInput.value = today;
}

function setCurrentMonth() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const monthInput = document.getElementById('reportMonth');
    if (monthInput) monthInput.value = `${year}-${month}`;
}

// Section Navigation
function showSection(sectionName) {
    console.log('Showing section:', sectionName);
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    const activeBtn = Array.from(buttons).find(btn => 
        btn.textContent.toLowerCase().includes(sectionName.replace('-', ' '))
    );
    if (activeBtn) activeBtn.classList.add('active');
    
    // Load data when switching sections
    if (sectionName === 'manage-classes') {
        loadClasses();
    } else if (sectionName === 'add-student') {
        loadClassesForDropdown('studentClass');
    } else if (sectionName === 'view-reports') {
        loadClassesForDropdown('reportClass');
    } else if (sectionName === 'mark-attendance') {
        loadClassesForDropdown('attendanceClass');
    }
}

// Supabase API Helper Functions
async function supabaseRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method: method,
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, options);
        
        if (!response.ok) {
            const error = await response.text();
            console.error('Supabase error:', error);
            throw new Error(error);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Request failed:', error);
        throw error;
    }
}

// Classes Management
async function loadClasses() {
    try {
        const classes = await supabaseRequest('classes?select=*&order=created_at.desc');
        currentClasses = classes;
        displayClasses(classes);
    } catch (error) {
        console.error('Error loading classes:', error);
        showError('Failed to load classes. Please check your database connection.');
    }
}

function displayClasses(classes) {
    const classList = document.getElementById('classList');
    
    if (!classes || classes.length === 0) {
        classList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏫</div>
                <h3>No Classes Yet</h3>
                <p>Click "Add Class" to create your first class</p>
            </div>
        `;
        return;
    }
    
    classList.innerHTML = classes.map(cls => `
        <div class="class-item">
            <h3>${cls.class_name}</h3>
            <p class="class-info">📚 Teacher: ${cls.teacher_name || 'Not assigned'}</p>
            <p class="class-info">📅 Academic Year: ${cls.academic_year}</p>
            <div class="class-actions">
                <button class="btn-view" onclick="viewPeriods('${cls.id}')">🕐 View Periods</button>
                <button class="btn-delete" onclick="deleteClass('${cls.id}')">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

async function addClass(event) {
    event.preventDefault();
    
    const className = document.getElementById('className').value;
    const academicYear = document.getElementById('academicYear').value;
    const teacherName = document.getElementById('teacherName').value || null;
    
    try {
        await supabaseRequest('classes', 'POST', {
            class_name: className,
            academic_year: academicYear,
            teacher_name: teacherName
        });
        
        closeModal('addClassModal');
        showSuccess('Class added successfully!');
        loadClasses();
        document.getElementById('className').value = '';
        document.getElementById('academicYear').value = '';
        document.getElementById('teacherName').value = '';
    } catch (error) {
        console.error('Error adding class:', error);
        showError('Failed to add class');
    }
}

async function deleteClass(classId) {
    if (!confirm('Are you sure you want to delete this class? This will also delete all associated periods, students, and attendance records.')) {
        return;
    }
    
    try {
        // Delete attendance records
        await supabaseRequest(`attendance?class_id=eq.${classId}`, 'DELETE');
        
        // Delete students
        await supabaseRequest(`students?class_id=eq.${classId}`, 'DELETE');
        
        // Delete periods
        await supabaseRequest(`periods?class_id=eq.${classId}`, 'DELETE');
        
        // Delete class
        await supabaseRequest(`classes?id=eq.${classId}`, 'DELETE');
        
        showSuccess('Class deleted successfully!');
        loadClasses();
    } catch (error) {
        console.error('Error deleting class:', error);
        showError('Failed to delete class');
    }
}

// Periods Management
async function viewPeriods(classId) {
    selectedClassId = classId;
    
    try {
        const periods = await supabaseRequest(`periods?class_id=eq.${classId}&select=*&order=start_time`);
        currentPeriods = periods;
        displayPeriods(periods);
    } catch (error) {
        console.error('Error loading periods:', error);
        showError('Failed to load periods');
    }
}

function displayPeriods(periods) {
    const periodsList = document.getElementById('periodsList');
    
    if (!periods || periods.length === 0) {
        periodsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🕐</div>
                <h3>No Periods Yet</h3>
                <p>Click "Add Period" to create periods for this class</p>
            </div>
        `;
        return;
    }
    
    periodsList.innerHTML = periods.map(period => `
        <div class="period-item">
            <h4>${period.period_name}</h4>
            <p class="period-time">🕐 ${period.start_time} - ${period.end_time}</p>
            <button class="btn-delete" onclick="deletePeriod('${period.id}')" style="margin-top: 10px;">🗑️ Delete</button>
        </div>
    `).join('');
}

async function addPeriod(event) {
    event.preventDefault();
    
    if (!selectedClassId) {
        showError('Please select a class first by clicking "View Periods"');
        return;
    }
    
    const periodName = document.getElementById('periodName').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    
    try {
        await supabaseRequest('periods', 'POST', {
            class_id: selectedClassId,
            period_name: periodName,
            start_time: startTime,
            end_time: endTime
        });
        
        closeModal('addPeriodModal');
        showSuccess('Period added successfully!');
        viewPeriods(selectedClassId);
        document.getElementById('periodName').value = '';
        document.getElementById('startTime').value = '';
        document.getElementById('endTime').value = '';
    } catch (error) {
        console.error('Error adding period:', error);
        showError('Failed to add period');
    }
}

async function deletePeriod(periodId) {
    if (!confirm('Are you sure you want to delete this period?')) {
        return;
    }
    
    try {
        // Delete attendance records for this period
        await supabaseRequest(`attendance?period_id=eq.${periodId}`, 'DELETE');
        
        // Delete period
        await supabaseRequest(`periods?id=eq.${periodId}`, 'DELETE');
        
        showSuccess('Period deleted successfully!');
        viewPeriods(selectedClassId);
    } catch (error) {
        console.error('Error deleting period:', error);
        showError('Failed to delete period');
    }
}

// Students Management
async function loadClassesForDropdown(selectId) {
    try {
        const classes = await supabaseRequest('classes?select=*&order=class_name');
        const select = document.getElementById(selectId);
        
        if (select) {
            select.innerHTML = '<option value="">Choose a class...</option>' + 
                classes.map(cls => `<option value="${cls.id}">${cls.class_name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading classes for dropdown:', error);
    }
}

async function addStudent(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('studentId').value;
    const studentName = document.getElementById('studentName').value;
    const classId = document.getElementById('studentClass').value;
    
    if (!classId) {
        showError('Please select a class');
        return;
    }
    
    try {
        // Check if student ID already exists
        const existing = await supabaseRequest(`students?student_id=eq.${studentId}`);
        if (existing.length > 0) {
            showError('Student ID already exists! Please use a unique ID.');
            return;
        }
        
        await supabaseRequest('students', 'POST', {
            student_id: studentId,
            student_name: studentName,
            class_id: classId
        });
        
        showSuccess('Student added successfully!');
        document.getElementById('addStudentForm').reset();
        loadClassesForDropdown('studentClass');
    } catch (error) {
        console.error('Error adding student:', error);
        showError('Failed to add student');
    }
}

// Mark Attendance
async function loadPeriods() {
    const classId = document.getElementById('attendanceClass').value;
    const periodSelect = document.getElementById('attendancePeriod');
    
    if (!classId) {
        periodSelect.disabled = true;
        periodSelect.innerHTML = '<option value="">Select a class first...</option>';
        return;
    }
    
    try {
        const periods = await supabaseRequest(`periods?class_id=eq.${classId}&select=*&order=start_time`);
        
        periodSelect.disabled = false;
        periodSelect.innerHTML = '<option value="">Choose a period...</option>' + 
            periods.map(p => `<option value="${p.id}">${p.period_name} (${p.start_time} - ${p.end_time})</option>`).join('');
    } catch (error) {
        console.error('Error loading periods:', error);
        showError('Failed to load periods');
    }
}

async function loadStudentsForAttendance() {
    const classId = document.getElementById('attendanceClass').value;
    const periodId = document.getElementById('attendancePeriod').value;
    const date = document.getElementById('attendanceDate').value;
    
    if (!classId || !periodId) {
        return;
    }
    
    try {
        const students = await supabaseRequest(`students?class_id=eq.${classId}&select=*&order=student_name`);
        currentStudents = students;
        
        // Check existing attendance
        const attendance = await supabaseRequest(
            `attendance?class_id=eq.${classId}&period_id=eq.${periodId}&date=eq.${date}&select=*`
        );
        
        displayStudentsForAttendance(students, attendance);
    } catch (error) {
        console.error('Error loading students:', error);
        showError('Failed to load students');
    }
}

function displayStudentsForAttendance(students, existingAttendance) {
    const container = document.getElementById('attendanceContainer');
    const list = document.getElementById('attendanceList');
    const listContent = document.getElementById('studentAttendanceList');
    
    if (!students || students.length === 0) {
        container.style.display = 'block';
        list.style.display = 'none';
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👨‍🎓</div>
                <h3>No Students Found</h3>
                <p>Please add students to this class first</p>
            </div>
        `;
        return;
    }
    
    container.style.display = 'none';
    list.style.display = 'block';
    
    listContent.innerHTML = students.map(student => {
        const record = existingAttendance.find(a => a.student_id === student.id);
        const status = record ? record.status : null;
        
        return `
            <div class="student-attendance-item" data-student-id="${student.id}">
                <div class="student-info">
                    <h4>${student.student_name}</h4>
                    <p>ID: ${student.student_id}</p>
                </div>
                <div class="attendance-toggle">
                    <button class="btn-present ${status === 'present' ? 'active' : ''}" 
                            onclick="toggleAttendance('${student.id}', 'present')">
                        ✅ Present
                    </button>
                    <button class="btn-absent ${status === 'absent' ? 'active' : ''}" 
                            onclick="toggleAttendance('${student.id}', 'absent')">
                        ❌ Absent
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function toggleAttendance(studentId, status) {
    const item = document.querySelector(`[data-student-id="${studentId}"]`);
    if (!item) return;
    
    const presentBtn = item.querySelector('.btn-present');
    const absentBtn = item.querySelector('.btn-absent');
    
    if (status === 'present') {
        presentBtn.classList.add('active');
        absentBtn.classList.remove('active');
    } else {
        absentBtn.classList.add('active');
        presentBtn.classList.remove('active');
    }
}

function markAllPresent() {
    currentStudents.forEach(student => {
        toggleAttendance(student.id, 'present');
    });
}

function markAllAbsent() {
    currentStudents.forEach(student => {
        toggleAttendance(student.id, 'absent');
    });
}

async function saveAttendance() {
    const classId = document.getElementById('attendanceClass').value;
    const periodId = document.getElementById('attendancePeriod').value;
    const date = document.getElementById('attendanceDate').value;
    
    if (!classId || !periodId || !date) {
        showError('Please select class, period, and date');
        return;
    }
    
    const items = document.querySelectorAll('.student-attendance-item');
    const attendanceRecords = [];
    
    items.forEach(item => {
        const studentId = item.dataset.studentId;
        const presentBtn = item.querySelector('.btn-present');
        const absentBtn = item.querySelector('.btn-absent');
        
        let status = null;
        if (presentBtn.classList.contains('active')) status = 'present';
        if (absentBtn.classList.contains('active')) status = 'absent';
        
        if (status) {
            attendanceRecords.push({
                class_id: classId,
                period_id: periodId,
                student_id: studentId,
                date: date,
                status: status
            });
        }
    });
    
    if (attendanceRecords.length === 0) {
        showError('Please mark attendance for at least one student');
        return;
    }
    
    try {
        // Delete existing attendance for this class, period, and date
        await supabaseRequest(
            `attendance?class_id=eq.${classId}&period_id=eq.${periodId}&date=eq.${date}`,
            'DELETE'
        );
        
        // Insert new attendance records
        await supabaseRequest('attendance', 'POST', attendanceRecords);
        
        showSuccess('Attendance saved successfully!');
    } catch (error) {
        console.error('Error saving attendance:', error);
        showError('Failed to save attendance');
    }
}

// Reports
async function loadReportStudents() {
    const classId = document.getElementById('reportClass').value;
    const monthInput = document.getElementById('reportMonth').value;
    
    if (!classId || !monthInput) {
        return;
    }
    
    const [year, month] = monthInput.split('-');
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    
    try {
        const students = await supabaseRequest(`students?class_id=eq.${classId}&select=*&order=student_name`);
        const attendance = await supabaseRequest(
            `attendance?class_id=eq.${classId}&date=gte.${startDate}&date=lte.${endDate}&select=*`
        );
        
        generateReport(students, attendance);
    } catch (error) {
        console.error('Error loading report data:', error);
        showError('Failed to load report');
    }
}

function generateReport(students, attendance) {
    const reportContainer = document.getElementById('reportContainer');
    const reportTable = document.getElementById('reportTable');
    const tbody = document.getElementById('reportTableBody');
    
    if (!students || students.length === 0) {
        reportContainer.style.display = 'block';
        reportTable.style.display = 'none';
        reportContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <h3>No Students Found</h3>
                <p>Please add students to this class first</p>
            </div>
        `;
        return;
    }
    
    reportContainer.style.display = 'none';
    reportTable.style.display = 'block';
    
    const reportData = students.map(student => {
        const studentAttendance = attendance.filter(a => a.student_id === student.id);
        const uniqueDates = [...new Set(studentAttendance.map(a => a.date))];
        const totalDays = uniqueDates.length;
        const present = studentAttendance.filter(a => a.status === 'present').length;
        const absent = studentAttendance.filter(a => a.status === 'absent').length;
        const percentage = totalDays > 0 ? ((present / totalDays) * 100).toFixed(2) : 0;
        
        return {
            studentId: student.student_id,
            studentName: student.student_name,
            totalDays,
            present,
            absent,
            percentage
        };
    });
    
    tbody.innerHTML = reportData.map(data => `
        <tr>
            <td>${data.studentId}</td>
            <td>${data.studentName}</td>
            <td>${data.totalDays}</td>
            <td style="color: #43e97b; font-weight: 600;">${data.present}</td>
            <td style="color: #ff6b6b; font-weight: 600;">${data.absent}</td>
            <td style="font-weight: 700;">${data.percentage}%</td>
        </tr>
    `).join('');
    
    // Store report data for CSV download
    window.currentReportData = reportData;
}

function downloadCSV() {
    if (!window.currentReportData || window.currentReportData.length === 0) {
        showError('Please generate a report first');
        return;
    }
    
    const headers = ['Student ID', 'Student Name', 'Total Days', 'Present', 'Absent', 'Attendance %'];
    const rows = window.currentReportData.map(d => 
        [d.studentId, d.studentName, d.totalDays, d.present, d.absent, d.percentage]
    );
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Modal Functions
function showAddClassModal() {
    document.getElementById('addClassModal').style.display = 'block';
}

function showAddPeriodModal() {
    if (!selectedClassId) {
        showError('Please select a class first by clicking "View Periods"');
        return;
    }
    document.getElementById('addPeriodModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Utility Functions
function showSuccess(message) {
    const existing = document.querySelector('.success-message');
    if (existing) existing.remove();
    
    const div = document.createElement('div');
    div.className = 'success-message';
    div.textContent = message;
    
    const container = document.querySelector('.main-content .container');
    if (container) {
        container.prepend(div);
        setTimeout(() => div.remove(), 3000);
    }
}

function showError(message) {
    const existing = document.querySelector('.error-message');
    if (existing) existing.remove();
    
    const div = document.createElement('div');
    div.className = 'error-message';
    div.textContent = message;
    
    const container = document.querySelector('.main-content .container');
    if (container) {
        container.prepend(div);
        setTimeout(() => div.remove(), 4000);
    }
}

function signOut() {
    if (confirm('Are you sure you want to sign out?')) {
        window.location.reload();
    }
}

// Log when script loads
console.log('SmartAttend Pro script loaded successfully!');