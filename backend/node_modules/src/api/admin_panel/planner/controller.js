import { supabase } from "../../../config/supabaseClient.js";

// GET all planner events
export const getPlannerEvents = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("annual_planner")
      .select("*")
      .order("start_date", { ascending: true });

    if (error) {
      if (error.code === '42P01') {
         // table doesn't exist yet, return empty
         return res.status(200).json({ data: [] });
      }
      throw error;
    }

    res.status(200).json({ data });
  } catch (error) {
    console.error("Error fetching planner events:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper to auto-create pending consents
const createPendingConsents = async (eventId, targetClassesStrArray) => {
  try {
    let studentIds = [];
    if (!targetClassesStrArray || targetClassesStrArray.includes("All") || targetClassesStrArray.length === 0) {
      const { data: students } = await supabase.from('user').select('id').eq('type', 'student');
      if (students) studentIds = students.map(s => s.id);
    } else {
      const { data: classes } = await supabase.from('class').select('id, name, section');
      if (classes) {
         const matchingClassIds = classes.filter(c => {
           return targetClassesStrArray.some(target => {
             const lowerTarget = target.toLowerCase();
             return c.name?.toLowerCase().includes(lowerTarget) || 
                    `${c.name} ${c.section}`.toLowerCase().includes(lowerTarget);
           });
         }).map(c => c.id);

         if (matchingClassIds.length > 0) {
           const { data: classStudents } = await supabase
             .from('class_students')
             .select('student_id')
             .in('class_id', matchingClassIds);
           if (classStudents) studentIds = classStudents.map(cs => cs.student_id);
         }
      }
    }

    if (studentIds.length === 0) return;
    studentIds = [...new Set(studentIds)]; // unique

    const { data: existingConsents } = await supabase
      .from('event_consents')
      .select('student_id')
      .eq('event_id', eventId);
    
    const existingStudentIds = existingConsents ? existingConsents.map(ec => ec.student_id) : [];
    const newStudentIds = studentIds.filter(id => !existingStudentIds.includes(id));

    if (newStudentIds.length === 0) return;

    const { data: connections } = await supabase
      .from('user_connections')
      .select('student_id, parent_id')
      .in('student_id', newStudentIds);
    
    const parentMap = {};
    if (connections) {
      connections.forEach(c => { parentMap[c.student_id] = c.parent_id; });
    }

    const consentRows = newStudentIds.map(studentId => ({
      event_id: eventId,
      student_id: studentId,
      parent_id: parentMap[studentId] || null,
      status: 'pending'
    }));

    await supabase.from('event_consents').insert(consentRows);
  } catch (error) {
    console.error("Error creating pending consents:", error);
  }
};

// POST a new planner event
export const createPlannerEvent = async (req, res) => {
  try {
    const { start_date, end_date, title, description, category, target_classes, requires_consent } = req.body;
    
    if (!start_date || !title || !category) {
      return res.status(400).json({ message: "Start date, title, and category are required." });
    }

    const { data, error } = await supabase
      .from("annual_planner")
      .insert([{
        start_date,
        end_date: end_date || start_date,
        title,
        description,
        category,
        target_classes: target_classes || ["All"],
        requires_consent: requires_consent || false
      }])
      .select();

    if (error) throw error;

    if (data[0] && data[0].requires_consent) {
      await createPendingConsents(data[0].id, data[0].target_classes);
    }

    res.status(201).json({ message: "Event created successfully", data: data[0] });
  } catch (error) {
    console.error("Error creating planner event:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PUT (update) an existing planner event
export const updatePlannerEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, title, description, category, target_classes, requires_consent } = req.body;
    
    const updateObj = {};
    if (start_date !== undefined) updateObj.start_date = start_date;
    if (end_date !== undefined) updateObj.end_date = end_date;
    if (title !== undefined) updateObj.title = title;
    if (description !== undefined) updateObj.description = description;
    if (category !== undefined) updateObj.category = category;
    if (target_classes !== undefined) updateObj.target_classes = target_classes;
    if (requires_consent !== undefined) updateObj.requires_consent = requires_consent;

    const { data, error } = await supabase
      .from("annual_planner")
      .update(updateObj)
      .eq("id", id)
      .select();

    if (error) throw error;

    if (data[0] && data[0].requires_consent) {
      await createPendingConsents(data[0].id, data[0].target_classes);
    }

    res.status(200).json({ message: "Event updated successfully", data: data[0] });
  } catch (error) {
    console.error("Error updating planner event:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// DELETE a planner event
export const deletePlannerEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("annual_planner")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting planner event:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET consent report for an event
export const getConsentReport = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Fetch consents joined with student details
    const { data: consents, error } = await supabase
      .from('event_consents')
      .select(`
        id, status,
        user:student_id ( id, name )
      `)
      .eq('event_id', eventId);
      
    if (error) throw error;

    // Supabase join syntax gives us { user: { id, name } }.
    // We also want to map students to classes if possible, but let's keep it simple first
    const reportData = consents.map(c => ({
      id: c.id,
      status: c.status,
      student_id: c.user?.id,
      student_name: c.user?.name || "Unknown Student"
    }));

    res.status(200).json({ data: reportData });
  } catch (error) {
    console.error("Error fetching consent report:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST send reminders (Mock)
export const sendConsentReminders = async (req, res) => {
  try {
    const { eventId } = req.params;
    // In a real app, you would fetch all pending parents and send email/sms
    // We'll mock a success delay
    await new Promise(resolve => setTimeout(resolve, 500));
    res.status(200).json({ message: "Reminders sent successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST mock parent consent (Testing)
export const mockParentConsent = async (req, res) => {
  try {
    const { consentId } = req.params;
    const { status } = req.body; // 'approved' or 'declined'
    
    const { data, error } = await supabase
      .from('event_consents')
      .update({ status })
      .eq('id', consentId)
      .select();
      
    if (error) throw error;
    res.status(200).json({ message: `Consent updated to ${status}`, data: data[0] });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
