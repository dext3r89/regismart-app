/* =======================================================
   RegiSmart – Shared Application Logic (app.js)
   Integrated with Supabase backend + Transport Pickup System
   ======================================================= */

import supabase, {
  signupParent, loginUser, requestPasswordRecovery, getCurrentSession, logoutUser,
  createStudent, getParentStudents, getStudent, updateStudent,
  saveFamilyDetails, getFamilyDetails,
  saveMedicalInfo, getMedicalInfo,
  saveTransportDetails, getTransportDetails,
  recordAttendance, getAttendanceLog, checkInStudent,
  checkOutStudent, confirmPickup, confirmTransportPickup
} from './supabase.js';

// =========================================================
// SESSION MANAGEMENT
// =========================================================

const PENDING_STUDENT_KEY = 'regismart_pending_student';

async function getSession() {
  const session = await getCurrentSession();
  if (session) await completePendingStudentRegistration(session);
  return session;
}

function cacheSessionForUI(session) {
  if (session) {
    sessionStorage.setItem('regismart_session', JSON.stringify({
      userId: session.user.id,
      email:  session.user.email,
      role:   session.profile.role,
      name:   session.profile.full_name
    }));
  } else {
    sessionStorage.removeItem('regismart_session');
  }
}

function getCachedSession() {
  const cached = sessionStorage.getItem('regismart_session');
  return cached ? JSON.parse(cached) : null;
}

function storePendingStudentRegistration(parentEmail, studentData) {
  localStorage.setItem(PENDING_STUDENT_KEY, JSON.stringify({
    parentEmail: String(parentEmail || '').trim().toLowerCase(),
    student: {
      fullName: studentData.fullName,
      grade: studentData.grade,
      homeAddress: studentData.homeAddress || ''
    }
  }));
}

function getPendingStudentRegistration() {
  try {
    const raw = localStorage.getItem(PENDING_STUDENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(PENDING_STUDENT_KEY);
    return null;
  }
}

function clearPendingStudentRegistration() {
  localStorage.removeItem(PENDING_STUDENT_KEY);
}

async function completePendingStudentRegistration(session) {
  const pending = getPendingStudentRegistration();
  if (!pending || !session?.user?.email || session?.profile?.role !== 'parent') {
    return { attempted: false };
  }

  const sessionEmail = String(session.user.email || '').trim().toLowerCase();
  if (pending.parentEmail !== sessionEmail) {
    return { attempted: false };
  }

  const result = await registerStudent(
    session.user.id,
    pending.student.fullName,
    pending.student.grade,
    pending.student.homeAddress
  );

  if (!result.success) {
    return { attempted: true, success: false, message: result.message };
  }

  clearPendingStudentRegistration();
  return { attempted: true, success: true, student: result.student };
}

// =========================================================
// AUTH FUNCTIONS
// =========================================================

async function signupParentAccount(name, email, password) {
  const result = await signupParent(email, password, name);
  if (!result.success) return { success: false, message: result.error };
  return { success: true, user: result.user, profile: result.profile };
}

async function loginUserAccount(email, password) {
  const result = await loginUser(email, password);
  if (!result.success) return { success: false, message: result.error };
  const session = { user: result.user, profile: result.profile };
  cacheSessionForUI(session);
  const pendingStudent = await completePendingStudentRegistration(session);
  return {
    success: true,
    message: 'Login successful',
    session,
    pendingStudent
  };
}

async function requestPasswordRecoveryAction(email) {
  const result = await requestPasswordRecovery(email);
  if (!result.success) return { success: false, message: result.error };
  return { success: true };
}

async function logoutUserAccount() {
  await logoutUser();
  sessionStorage.removeItem('regismart_session');
  return { success: true };
}

// =========================================================
// STUDENT MANAGEMENT
// =========================================================

async function registerStudent(parentId, fullName, grade, homeAddress) {
  const result = await createStudent(parentId, fullName, grade, homeAddress);
  if (!result.success) return { success: false, message: result.error };
  return { success: true, student: result.student };
}

async function getMyStudents(parentId) {
  const result = await getParentStudents(parentId);
  if (!result.success) return { success: false, message: result.error };
  return { success: true, students: result.students };
}

/**
 * Fetch full student profile including transport data.
 */
async function getFullStudentProfile(studentId) {
  try {
    const student    = await getStudent(studentId);
    if (!student.success) throw new Error(student.error);

    const family     = await getFamilyDetails(studentId);
    const medical    = await getMedicalInfo(studentId);
    const attendance = await getAttendanceLog(studentId);
    const transport  = await getTransportDetails(studentId);

    return {
      success:    true,
      student:    student.student,
      family:     family.data,
      medical:    medical.data,
      attendance: attendance.data,
      transport:  transport.data     // ← NEW: transport profile
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function updateStudentInfo(studentId, fullName, grade, homeAddress) {
  const result = await updateStudent(studentId, { full_name: fullName, grade, home_address: homeAddress });
  if (!result.success) return { success: false, message: result.error };
  return { success: true, student: result.student };
}

// =========================================================
// FAMILY DETAILS
// =========================================================

async function saveFamilyDetailsData(studentId, motherData, fatherData) {
  const result = await saveFamilyDetails(studentId, motherData, fatherData);
  if (!result.success) return { success: false, message: result.error };
  return { success: true, data: result.data };
}

async function getFamilyDetailsData(studentId) {
  const result = await getFamilyDetails(studentId);
  if (!result.success) return { success: false, message: result.error };
  return { success: true, data: result.data };
}

// =========================================================
// MEDICAL INFO
// =========================================================

async function saveMedicalInfoData(studentId, medicalData) {
  const result = await saveMedicalInfo(studentId, medicalData);
  if (!result.success) return { success: false, message: result.error };
  return { success: true, data: result.data };
}

async function getMedicalInfoData(studentId) {
  const result = await getMedicalInfo(studentId);
  if (!result.success) return { success: false, message: result.error };
  return { success: true, data: result.data };
}

// =========================================================
// TRANSPORT DETAILS  (NEW)
// =========================================================

/**
 * Save / update a student's transport profile.
 * @param {string} studentId
 * @param {{ driverName, driverPhone, vehicleReg, transportType, isActive }} transportData
 */
async function updateTransportDetails(studentId, transportData) {
  const result = await saveTransportDetails(studentId, transportData);
  if (!result.success) return { success: false, message: result.error };
  return { success: true, data: result.data };
}

/**
 * Get transport profile for a student.
 */
async function getTransportDetailsData(studentId) {
  const result = await getTransportDetails(studentId);
  if (!result.success) return { success: false, message: result.error };
  return { success: true, data: result.data };
}

// =========================================================
// ATTENDANCE FUNCTIONS
// =========================================================

async function checkInStudentAction(studentId) {
  const result = await checkInStudent(studentId);
  if (!result.success) return { success: false, message: result.error };
  return { success: true, data: result.data };
}

/**
 * Check out a student.
 * @param {string} studentId
 * @param {'parent'|'transport'} method
 * @returns {{ success, verifyCode? }}
 */
async function checkOutStudentAction(studentId, method = 'parent') {
  const result = await checkOutStudent(studentId, method);
  if (!result.success) return { success: false, message: result.error };
  return { success: true, verifyCode: result.data.verify_code };
}

/**
 * Confirm standard parent pickup with OTP.
 */
async function confirmPickupAction(studentId, enteredCode) {
  const result = await confirmPickup(studentId, enteredCode);
  if (!result.success) return { success: false, message: result.error };
  return { success: true };
}

/**
 * Confirm transport pickup with OTP.  (NEW)
 */
async function confirmTransportPickupAction(studentId, enteredCode) {
  const result = await confirmTransportPickup(studentId, enteredCode);
  if (!result.success) return { success: false, message: result.error };
  return { success: true };
}

// =========================================================
// UI UTILITIES
// =========================================================

/**
 * Return CSS class for a status string.
 * Handles all 5 statuses including the two new transport ones.
 */
function getStatusClass(status) {
  switch (status) {
    case 'At School':              return 'status-at-school';
    case 'Pending Pickup':         return 'status-pending';
    case 'Pending Transport':      return 'status-pending-transport';
    case 'Checked Out':            return 'status-checked-out';
    case 'Checked Out (Transport)':return 'status-checked-out-transport';
    default:                       return '';
  }
}

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) { el.style.display = 'block'; el.textContent = message; }
}

function showSuccess(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) { el.style.display = 'block'; el.textContent = message; }
}

function hideEl(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.style.display = 'none';
}

function fv(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function setFv(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

function joinNameParts(name, surname) {
  return [name, surname]
    .map(part => String(part || '').trim())
    .filter(Boolean)
    .join(' ');
}

function splitFullName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name: '', surname: '' };
  if (parts.length === 1) return { name: parts[0], surname: '' };
  return {
    name: parts.slice(0, -1).join(' '),
    surname: parts[parts.length - 1]
  };
}

// =========================================================
// NAVIGATION & GUARDS
// =========================================================

async function guardPage(allowedRoles) {
  const session = getCachedSession();

  if (!session) {
    const authSession = await getSession();
    if (!authSession) { window.location.href = 'login.html'; return null; }
    cacheSessionForUI(authSession);
  }

  const cachedSession = getCachedSession();
  if (allowedRoles && !allowedRoles.includes(cachedSession.role)) {
    if      (cachedSession.role === 'teacher') window.location.href = 'teacher.html';
    else if (cachedSession.role === 'admin')   window.location.href = 'admin.html';
    else if (cachedSession.role === 'parent')  window.location.href = 'parent.html';
    else                                       window.location.href = 'login.html';
    return null;
  }

  return cachedSession;
}

function renderNavUser() {
  const session = getCachedSession();
  const el = document.getElementById('nav-user');
  if (!el || !session) return;

  el.innerHTML = `
    <span class="role-badge me-2">${session.role.toUpperCase()}</span>
    <span class="text-white fw-600" style="font-size:0.9rem;">${session.name}</span>
    <a href="login.html" class="btn btn-sm ms-3"
       style="background:rgba(255,255,255,0.15);color:#fff;border:none;font-weight:700;"
       onclick="logoutAndRedirect()">Logout</a>
  `;
}

async function logoutAndRedirect() {
  await logoutUserAccount();
  window.location.href = 'login.html';
}

// =========================================================
// PARENT SEARCH (admin use)
// =========================================================

async function searchParents(query) {
  try {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];

    const { default: supabase } = await import('./supabase.js');

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'parent')
      .ilike('full_name', `%${trimmed}%`)
      .order('full_name')
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('searchParents error:', err);
    return [];
  }
}

export {
  getSession, cacheSessionForUI, getCachedSession,
  storePendingStudentRegistration, getPendingStudentRegistration, clearPendingStudentRegistration,
  signupParentAccount, loginUserAccount, logoutUserAccount, requestPasswordRecoveryAction,
  registerStudent, getMyStudents, getFullStudentProfile, updateStudentInfo,
  saveFamilyDetailsData, getFamilyDetailsData,
  saveMedicalInfoData, getMedicalInfoData,
  // Transport (NEW)
  updateTransportDetails, getTransportDetailsData,
  // Attendance
  checkInStudentAction, checkOutStudentAction,
  confirmPickupAction, confirmTransportPickupAction,
  // UI helpers
  getStatusClass, showError, showSuccess, hideEl, fv, setFv,
  joinNameParts, splitFullName,
  guardPage, renderNavUser, logoutAndRedirect,
  searchParents
};
