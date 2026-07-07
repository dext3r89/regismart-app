import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://jkpwhmadzeevyjtpzspn.supabase.co',
  'sb_publishable_e0bpDBnMRDkqbFebnloPhQ_qxsjVgqK'
);

export default supabase;

// =====================================================
// AUTH FUNCTIONS
// =====================================================

export async function signupParent(email, password, fullName, phone) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone_number: phone } }
    });
    if (authError) throw authError;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert([{ id: authData.user.id, full_name: fullName, role: 'parent' }])
      .select();
    if (profileError) throw profileError;

    return { success: true, user: authData.user, profile: profile[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function loginUser(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('*').eq('id', data.user.id).single();
    if (profileError) throw profileError;

    return { success: true, user: data.user, profile };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function requestPasswordRecovery(email) {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login.html'
    });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) return null;

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', data.session.user.id).single();

    return { user: data.session.user, profile };
  } catch (error) {
    console.error('Session error:', error);
    return null;
  }
}

export async function logoutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// STUDENT FUNCTIONS
// =====================================================

export async function createStudent(parentId, fullName, grade, homeAddress) {
  try {
    const { data, error } = await supabase
      .from('students')
      .insert([{ parent_id: parentId, full_name: fullName, grade, home_address: homeAddress }])
      .select();
    if (error) throw error;
    return { success: true, student: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getParentStudents(parentId) {
  try {
    const { data, error } = await supabase
      .from('students').select('*').eq('parent_id', parentId);
    if (error) throw error;
    return { success: true, students: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getStudent(studentId) {
  try {
    const { data, error } = await supabase
      .from('students').select('*').eq('id', studentId).single();
    if (error) throw error;
    return { success: true, student: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateStudent(studentId, updates) {
  try {
    const { data, error } = await supabase
      .from('students').update(updates).eq('id', studentId).select();
    if (error) throw error;
    return { success: true, student: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// FAMILY DETAILS FUNCTIONS
// =====================================================

export async function saveFamilyDetails(studentId, motherData, fatherData) {
  try {
    const { data: existing } = await supabase
      .from('family_details').select('id').eq('student_id', studentId).single();

    const payload = {
      mother_name: motherData.name, mother_email: motherData.email,
      mother_cell: motherData.cell, mother_work: motherData.work,
      mother_address: motherData.address,
      father_name: fatherData.name, father_email: fatherData.email,
      father_cell: fatherData.cell, father_work: fatherData.work,
      father_address: fatherData.address
    };

    let result;
    if (existing) {
      result = await supabase.from('family_details').update(payload)
        .eq('student_id', studentId).select();
    } else {
      result = await supabase.from('family_details')
        .insert([{ student_id: studentId, ...payload }]).select();
    }
    if (result.error) throw result.error;
    return { success: true, data: result.data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getFamilyDetails(studentId) {
  try {
    const { data, error } = await supabase
      .from('family_details').select('*').eq('student_id', studentId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return { success: true, data: data || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// MEDICAL INFO FUNCTIONS
// =====================================================

export async function saveMedicalInfo(studentId, medicalData) {
  try {
    const { data: existing } = await supabase
      .from('medical_info').select('id').eq('student_id', studentId).single();

    let result;
    if (existing) {
      result = await supabase.from('medical_info').update(medicalData)
        .eq('student_id', studentId).select();
    } else {
      result = await supabase.from('medical_info')
        .insert([{ student_id: studentId, ...medicalData }]).select();
    }
    if (result.error) throw result.error;
    return { success: true, data: result.data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getMedicalInfo(studentId) {
  try {
    const { data, error } = await supabase
      .from('medical_info').select('*').eq('student_id', studentId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return { success: true, data: data || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// TRANSPORT PROFILE FUNCTIONS
// =====================================================
/*
  ⚠️  SETUP REQUIRED – run the following SQL in your Supabase SQL editor
  before using transport features:

  CREATE TABLE IF NOT EXISTS transport_profiles (
    id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id    uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL UNIQUE,
    driver_name   text,
    driver_phone  text,
    vehicle_reg   text,
    transport_type text CHECK (transport_type IN ('Taxi','Bus','Private')),
    is_active     boolean DEFAULT false,
    created_at    timestamptz DEFAULT now(),
    updated_at    timestamptz DEFAULT now()
  );

  ALTER TABLE transport_profiles ENABLE ROW LEVEL SECURITY;

  -- Parents manage their own student's transport
  CREATE POLICY "parent_transport_all" ON transport_profiles FOR ALL
    USING (student_id IN (SELECT id FROM students WHERE parent_id = auth.uid()));

  -- Teachers & admins can read all transport profiles
  CREATE POLICY "staff_transport_select" ON transport_profiles FOR SELECT
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher','admin'));
*/

/**
 * Save or update a student's transport profile (parent-controlled).
 */
export async function saveTransportDetails(studentId, transportData) {
  try {
    const { data: existing } = await supabase
      .from('transport_profiles').select('id').eq('student_id', studentId).single();

    const payload = {
      driver_name:    transportData.driverName   || null,
      driver_phone:   transportData.driverPhone  || null,
      vehicle_reg:    transportData.vehicleReg   || null,
      transport_type: transportData.transportType || null,
      is_active:      !!transportData.isActive,
      updated_at:     new Date().toISOString()
    };

    let result;
    if (existing) {
      result = await supabase.from('transport_profiles')
        .update(payload).eq('student_id', studentId).select();
    } else {
      result = await supabase.from('transport_profiles')
        .insert([{ student_id: studentId, ...payload }]).select();
    }
    if (result.error) throw result.error;
    return { success: true, data: result.data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get the transport profile for a student.
 */
export async function getTransportDetails(studentId) {
  try {
    const { data, error } = await supabase
      .from('transport_profiles').select('*').eq('student_id', studentId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return { success: true, data: data || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// ATTENDANCE FUNCTIONS
// =====================================================

export async function recordAttendance(studentId, status, verifyCode = null) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('attendance_logs').select('id')
      .eq('student_id', studentId)
      .gte('updated_at', `${today}T00:00:00`).single();

    let result;
    if (existing) {
      result = await supabase.from('attendance_logs')
        .update({ status, verify_code: verifyCode, updated_at: new Date().toISOString() })
        .eq('id', existing.id).select();
    } else {
      result = await supabase.from('attendance_logs')
        .insert([{ student_id: studentId, status, verify_code: verifyCode }]).select();
    }
    if (result.error) throw result.error;
    return { success: true, data: result.data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getAttendanceLog(studentId) {
  try {
    const { data, error } = await supabase
      .from('attendance_logs').select('*').eq('student_id', studentId)
      .order('updated_at', { ascending: false }).limit(1).single();
    if (error && error.code !== 'PGRST116') throw error;
    return { success: true, data: data || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function checkInStudent(studentId) {
  return recordAttendance(studentId, 'At School', null);
}

/**
 * Check out a student.
 * @param {string} studentId
 * @param {'parent'|'transport'} method  - determines status set
 */
export async function checkOutStudent(studentId, method = 'parent') {
  const verifyCode = Math.floor(1000 + Math.random() * 9000);
  const status     = method === 'transport' ? 'Pending Transport' : 'Pending Pickup';
  return recordAttendance(studentId, status, verifyCode);
}

/**
 * Confirm standard parent pickup with OTP.
 */
export async function confirmPickup(studentId, enteredCode) {
  try {
    const log = await getAttendanceLog(studentId);
    if (!log.success || !log.data) return { success: false, error: 'No attendance record found' };
    if (log.data.status !== 'Pending Pickup')
      return { success: false, error: 'Student not pending parent pickup' };
    if (parseInt(enteredCode) !== log.data.verify_code)
      return { success: false, error: 'Incorrect code' };

    return recordAttendance(studentId, 'Checked Out', null);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Confirm transport pickup with OTP.
 */
export async function confirmTransportPickup(studentId, enteredCode) {
  try {
    const log = await getAttendanceLog(studentId);
    if (!log.success || !log.data) return { success: false, error: 'No attendance record found' };
    if (log.data.status !== 'Pending Transport')
      return { success: false, error: 'Student is not pending transport pickup' };
    if (parseInt(enteredCode) !== log.data.verify_code)
      return { success: false, error: 'Incorrect verification code' };

    return recordAttendance(studentId, 'Checked Out (Transport)', null);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default supabase;
