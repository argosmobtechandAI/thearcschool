import { supabaseAdmin as supabase } from "../../config/supabaseClient.js";

// Helper to determine the current academic year
export const getCurrentAcademicYear = () => {
  const today = new Date();
  const month = today.getMonth(); // 0-indexed, 0 = Jan, 3 = April
  let year = today.getFullYear();
  if (month < 3) year -= 1; // If Jan-Mar, it belongs to the previous year's session
  return `${year}-${year + 1}`;
};

// Generate virtual dues for a student
export const calculateVirtualDues = async (studentId, academicYear = getCurrentAcademicYear()) => {
  // 1. Fetch student details
  const { data: student, error: studentErr } = await supabase
    .from("user")
    .select("*")
    .eq("id", studentId)
    .single();

  if (studentErr || !student) throw new Error("Failed to fetch student details: " + (studentErr?.message || "Not found"));
  if (student.fee_exempted) return { virtualDues: [], payments: [] }; // No dues if exempted

  // Fetch class mapping separately to avoid FK relationship issues
  const { data: classMap } = await supabase
    .from("class_students")
    .select("class_id")
    .eq("student_id", studentId)
    .single();

  let className = null;
  if (classMap && classMap.class_id) {
    const { data: classObj } = await supabase
      .from("class")
      .select("name")
      .eq("id", classMap.class_id)
      .single();
    if (classObj) className = classObj.name;
  }

  // 2. Fetch fee structures for this academic year
  const { data: structures, error: structErr } = await supabase
    .from("fee_structures")
    .select("*")
    .eq("academic_year", academicYear)
    .or(`class_name.eq.${className},class_name.is.null`);

  if (structErr) throw new Error("Failed to fetch fee structures");

  const virtualDues = [];
  const sessionStartYear = parseInt(academicYear.split("-")[0]);
  
  // Create an array of months from April to current month (or March if next year)
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  let monthsPassed = 0;
  if (currentYear === sessionStartYear && currentMonth >= 3) {
    monthsPassed = currentMonth - 3 + 1; // Apr = 0+1=1, May = 1+1=2, etc.
  } else if (currentYear === sessionStartYear + 1 && currentMonth < 3) {
    monthsPassed = 9 + currentMonth + 1; // Apr-Dec (9) + Jan (1) = 10
  } else if (currentYear > sessionStartYear) {
    monthsPassed = 12; // Whole year passed
  }

  // Cap at 12 months
  if (monthsPassed > 12) monthsPassed = 12;
  if (monthsPassed < 0) monthsPassed = 0;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // 3. Generate the dues dynamically for ALL configured fee structures
  structures.forEach(struct => {
    // All configured fees are now dynamically applied every month passed
    for (let i = 0; i < monthsPassed; i++) {
      const monthIndex = (3 + i) % 12;
      const year = (3 + i) > 11 ? sessionStartYear + 1 : sessionStartYear;
      const dueDate = new Date(year, monthIndex, 10).toISOString().split('T')[0]; // 10th of the month
      
      const categoryTitle = struct.fee_category.split(/[_ ]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      virtualDues.push({
        id: `virtual-${struct.id}-${monthIndex}-${year}`, // Unique Virtual ID per structure & month
        fee: {
          title: `${categoryTitle} - ${monthNames[monthIndex]} ${year}`,
          amount: struct.amount,
          due_date: dueDate,
          fee_type: "Monthly"
        },
        status: "pending",
        total_paid_amount: 0,
        category: struct.fee_category,
        month: monthIndex,
        year: year
      });
    }
  });

  // D. Monthly Transport Fee (manually fed per student)
  if (student.bus_fee && student.bus_fee > 0) {
    for (let i = 0; i < monthsPassed; i++) {
      const monthIndex = (3 + i) % 12;
      const year = (3 + i) > 11 ? sessionStartYear + 1 : sessionStartYear;
      const dueDate = new Date(year, monthIndex, 10).toISOString().split('T')[0];
      
      virtualDues.push({
        id: `virtual-transport-${monthIndex}-${year}`,
        fee: {
          title: `Transport Fee - ${monthNames[monthIndex]} ${year}`,
          amount: student.bus_fee,
          due_date: dueDate,
          fee_type: "Monthly"
        },
        status: "pending",
        total_paid_amount: 0,
        category: 'transport',
        month: monthIndex,
        year: year
      });
    }
  }

  // 4. Match with payments
  // We need to fetch transactions to see what's paid.
  const { data: payments, error: paymentsError } = await supabase
    .from("payments_ledger")
    .select("*")
    .eq("student_id", studentId);

  if (paymentsError) throw paymentsError;

  // Distribute payments. For a pure virtual ledger, how do we link a transaction to a virtual due?
  // We can add fields to the transactions table: `fee_category`, `fee_month`, `fee_year`, `academic_year`.
  // Since we haven't modified transactions yet, we'll need to do that.
  
  return { virtualDues, payments };
};
