import { supabase, supabaseAdmin } from "../../config/supabaseClient.js";

// Helper to calculate exact transport distance fee
const calculateTransportFee = (distance_km, baseFee = 1100, perKmFee = 100) => {
  if (!distance_km || distance_km <= 0) return 0;
  if (distance_km <= 3) return baseFee;
  return baseFee + ((distance_km - 3) * perKmFee);
};

export class FeeGenerator {
  
  static async assignAdmissionFees(studentId) {
    if (!studentId) throw new Error("Student ID is required");

    // Fetch admission fee structures
    const { data: structures, error: structError } = await supabase
      .from("fee")
      .select("*")
      .in('fee_type', ['admission_form', 'admission_fee', 'essentials_kit', 'amc']);

    if (structError) throw new Error("Could not fetch fee structures: " + structError.message);

    if (!structures || structures.length === 0) return;

    // Check if the student already has these fees to avoid double assignment
    const { data: existingStudentFees } = await supabase
      .from("student_fees")
      .select("fee(title, category)")
      .eq("student_id", studentId);
      
    const existingCategories = existingStudentFees?.map(sf => sf.fee?.category) || [];

    const feeInserts = [];
    const studentFeeInserts = [];
    const notificationInserts = [];
    
    const d = new Date();
    // Default due date to +7 days from now
    d.setDate(d.getDate() + 7);
    const dueDate = d.toISOString().split('T')[0];

    for (const struct of structures) {
      if (existingCategories.includes(struct.fee_category)) continue;

      let title = "";
      let late_fee_applicable = false;

      if (struct.fee_category === "admission_form") title = "Admission Form";
      else if (struct.fee_category === "admission_fee") title = "Admission Fee";
      else if (struct.fee_category === "essentials_kit") title = "Student Essentials Kit";
      else if (struct.fee_category === "amc") {
        title = "Annual Maintenance Fee";
        late_fee_applicable = true;
      }

      const newFee = {
        title,
        amount: struct.amount,
        dueDate,
        type: "one-time",
        category: struct.fee_category,
        late_fee_applicable
      };

      // Create the fee master record
      const { data: insertedFee, error: feeError } = await supabase.from("fee").insert([newFee]).select().single();
      if (feeError) continue;

      // Map to student
      studentFeeInserts.push({
        student_id: studentId,
        fee_id: insertedFee.id,
        status: 'pending'
      });

      notificationInserts.push({
        user_id: studentId,
        title: "New Fee Assigned",
        message: `A new fee "${title}" of ₹${struct.amount} has been assigned to you.`,
        type: "fee",
        is_read: false
      });
    }

    if (studentFeeInserts.length > 0) {
      await supabase.from("student_fees").insert(studentFeeInserts);
    }
    if (notificationInserts.length > 0) {
      await supabase.from("notifications").insert(notificationInserts);
    }
  }

  static async generateMonthlyFees(monthName, year) {
    // Determine the due date (10th of the given month/year)
    const monthIndex = new Date(`${monthName} 1, 2000`).getMonth();
    const dueDate = new Date(year, monthIndex, 10).toISOString().split('T')[0];
    const monthYearString = `${monthName} ${year}`;

    // 1. Fetch tuition structures
    const { data: tuitionStructures } = await supabase
      .from("fee_structures")
      .select("*")
      .eq("fee_category", "tuition")
      .eq("academic_year", "2024-2025");

    const tuitionMap = {}; // Map of class_name -> amount
    if (tuitionStructures) {
      tuitionStructures.forEach(t => tuitionMap[t.class_name.toUpperCase()] = t.amount);
    }

    // 2. Fetch transport structure
    const { data: transportStructures } = await supabase
      .from("fee_structures")
      .select("*")
      .in("fee_category", ["transport_base", "transport_per_km"])
      .eq("academic_year", "2024-2025");
      
    let transportBase = 1100;
    let transportPerKm = 100;
    if (transportStructures) {
      transportStructures.forEach(t => {
        if (t.fee_category === 'transport_base') transportBase = t.amount;
        if (t.fee_category === 'transport_per_km') transportPerKm = t.amount;
      });
    }

    // 3. Fetch all active non-exempted students, their class mappings, and classes separately
    const [
      { data: students, error: studentError },
      { data: classStudentsData },
      { data: classesData }
    ] = await Promise.all([
      supabase.from("user").select("id, fee_exempted, transport_required, transport_distance_km").eq("type", "student").eq("status", "active"),
      supabase.from("class_students").select("*"),
      supabase.from("class").select("id, name, section")
    ]);

    if (studentError) throw new Error("Failed to fetch students: " + studentError.message);

    // Build a lookup: student_id -> class name
    const classMap = {};
    (classesData || []).forEach(c => { classMap[c.id] = c; });
    const studentClassMap = {};
    (classStudentsData || []).forEach(cs => {
      const cls = classMap[cs.class_id];
      if (cls) studentClassMap[cs.student_id] = cls.name;
    });

    const notificationInserts = [];
    const studentFeeInserts = [];
    const feesToInsert = [];

    // Group students by what fee they need so we don't create millions of redundant "fee" rows
    // Ideally, we create ONE "Tuition Fee - Kindergarten - May 2024" fee record, and assign multiple students to it.
    
    // Group tuition students by class
    const classGroups = {}; 
    const transportStudents = [];

    for (const student of students) {
      if (student.fee_exempted) continue;
      
      const classNameStr = (studentClassMap[student.id] || "").toUpperCase() || null;
      
      // Tuition
      if (classNameStr && tuitionMap[classNameStr]) {
        if (!classGroups[classNameStr]) classGroups[classNameStr] = [];
        classGroups[classNameStr].push(student.id);
      }
      
      // Transport
      if (student.transport_required) {
        transportStudents.push({
          id: student.id,
          distance: student.transport_distance_km || 0
        });
      }
    }

    // Generate Tuition Fees
    for (const className of Object.keys(classGroups)) {
      const amount = tuitionMap[className];
      const title = `Tuition Fee - ${className} (${monthYearString})`;
      
      const { data: feeRecord, error: feeErr } = await supabase.from("fee").insert([{
        title,
        amount,
        dueDate,
        type: "recurring",
        category: "tuition",
        late_fee_applicable: true
      }]).select().single();
      
      if (!feeErr && feeRecord) {
        classGroups[className].forEach(studentId => {
          studentFeeInserts.push({ student_id: studentId, fee_id: feeRecord.id, status: 'pending' });
          notificationInserts.push({
            user_id: studentId,
            title: "New Monthly Fee",
            message: `Tuition Fee for ${monthYearString} is due on ${dueDate}.`,
            type: "fee",
            is_read: false
          });
        });
      }
    }

    // Generate Transport Fees
    // Since transport amount varies per student (based on distance), we might need unique fee records,
    // or group them by distance. Let's group by distance to optimize.
    const transportGroups = {};
    transportStudents.forEach(ts => {
      const dist = ts.distance;
      if (!transportGroups[dist]) transportGroups[dist] = [];
      transportGroups[dist].push(ts.id);
    });

    for (const distStr of Object.keys(transportGroups)) {
      const distance = parseFloat(distStr);
      const amount = calculateTransportFee(distance, transportBase, transportPerKm);
      const title = `Transport Fee - ${distance}km (${monthYearString})`;
      
      const { data: feeRecord, error: feeErr } = await supabase.from("fee").insert([{
        title,
        amount,
        dueDate,
        type: "recurring",
        category: "transport",
        late_fee_applicable: true
      }]).select().single();

      if (!feeErr && feeRecord) {
        transportGroups[distStr].forEach(studentId => {
          studentFeeInserts.push({ student_id: studentId, fee_id: feeRecord.id, status: 'pending' });
          notificationInserts.push({
            user_id: studentId,
            title: "New Transport Fee",
            message: `Transport Fee for ${monthYearString} is due on ${dueDate}.`,
            type: "fee",
            is_read: false
          });
        });
      }
    }

    // Insert student_fees in batches if needed, but for now just insert
    if (studentFeeInserts.length > 0) {
      await supabase.from("student_fees").insert(studentFeeInserts);
    }
    if (notificationInserts.length > 0) {
      await supabase.from("notifications").insert(notificationInserts);
    }

    return { success: true, count: studentFeeInserts.length };
  }

  static async generateYearlyAMC(academicYear) {
    const dueDate = new Date(`${academicYear.split("-")[0]}-04-10`).toISOString().split('T')[0]; // Typically April 10th
    const title = `Annual Maintenance Fee (${academicYear})`;

    const { data: amcStruct } = await supabase
      .from("fee_structures")
      .select("amount")
      .eq("fee_category", "amc")
      .eq("academic_year", academicYear)
      .single();

    const amount = amcStruct?.amount || 4000;

    const { data: students } = await supabase
      .from("user")
      .select("id")
      .eq("type", "student")
      .eq("status", "active")
      .eq("fee_exempted", false);

    if (!students || students.length === 0) return { success: true, count: 0 };

    const { data: feeRecord, error: feeErr } = await supabase.from("fee").insert([{
      title,
      amount,
      dueDate,
      type: "recurring",
      category: "amc",
      late_fee_applicable: true
    }]).select().single();

    if (feeErr || !feeRecord) throw new Error("Failed to create AMC master fee");

    const studentFeeInserts = students.map(s => ({
      student_id: s.id,
      fee_id: feeRecord.id,
      status: 'pending'
    }));

    const notificationInserts = students.map(s => ({
      user_id: s.id,
      title: "Annual Fee",
      message: `Annual Maintenance Fee for ${academicYear} has been generated.`,
      type: "fee",
      is_read: false
    }));

    if (studentFeeInserts.length > 0) {
      await supabase.from("student_fees").insert(studentFeeInserts);
    }
    if (notificationInserts.length > 0) {
      await supabase.from("notifications").insert(notificationInserts);
    }

    return { success: true, count: studentFeeInserts.length };
  }
}
