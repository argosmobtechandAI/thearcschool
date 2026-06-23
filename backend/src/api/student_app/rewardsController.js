import { supabase } from "../../config/supabaseClient.js";

const getAttendanceBadge = (percentage) => {
  if (percentage >= 100) return { level: 'perfect', label: 'Perfect Attendance', color: '#F59E0B' };
  if (percentage >= 90) return { level: 'gold', label: 'Gold Attendance', color: '#F59E0B' };
  if (percentage >= 75) return { level: 'silver', label: 'Silver Attendance', color: '#94A3B8' };
  if (percentage >= 60) return { level: 'bronze', label: 'Bronze Attendance', color: '#CD7F32' };
  return { level: 'none', label: 'Keep Going!', color: '#EF4444' };
};

const getAcademicBadge = (percentage) => {
  if (percentage >= 90) return { level: 'gold', label: 'Academic Excellence', color: '#F59E0B' };
  if (percentage >= 80) return { level: 'silver', label: 'High Achiever', color: '#94A3B8' };
  if (percentage >= 60) return { level: 'bronze', label: 'Good Progress', color: '#CD7F32' };
  return { level: 'none', label: 'Keep Learning!', color: '#EF4444' };
};

export const getRewards = async (req, res) => {
  try {
    const studentId = req.user.id;

    // 1. Fetch attendance stats
    const { data: attData, error: attError } = await supabase
      .from('attendance')
      .select('status')
      .eq('user_id', studentId);

    let attendancePercentage = 0;
    let presentDays = 0;
    let totalDays = 0;

    if (!attError && attData && attData.length > 0) {
      totalDays = attData.length;
      presentDays = attData.filter(a => a.status?.toLowerCase() === 'present').length;
      attendancePercentage = (presentDays / totalDays) * 100;
    }

    // 2. Fetch grades and compute avg
    const { data: gradesData, error: gradesError } = await supabase
      .from('grades')
      .select('marks, exams!inner(marks)')
      .eq('student_id', studentId);

    let avgGradePercentage = 0;
    if (!gradesError && gradesData && gradesData.length > 0) {
      const totalPct = gradesData.reduce((sum, g) => {
        const examMarks = g.exams?.marks || 0;
        return sum + (examMarks > 0 ? (g.marks / examMarks) * 100 : 0);
      }, 0);
      avgGradePercentage = totalPct / gradesData.length;
    }

    // 3. Find student's class to compute Student of the Week
    const { data: classData } = await supabase
      .from('class_students')
      .select('class_id')
      .eq('student_id', studentId)
      .maybeSingle();

    let studentOfWeek = null;
    if (classData?.class_id) {
      // Get all students in the same class
      const { data: classmates } = await supabase
        .from('class_students')
        .select('student_id, user:student_id(name)')
        .eq('class_id', classData.class_id);

      if (classmates && classmates.length > 0) {
        // Get a week date range (Mon-Sun of current week)
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sun
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const weekStart = monday.toISOString().split('T')[0];
        const weekEnd = sunday.toISOString().split('T')[0];

        const classmateIds = classmates.map(c => c.student_id);

        // Fetch attendance for this week for all classmates
        const { data: weekAtt } = await supabase
          .from('attendance')
          .select('user_id, status')
          .in('user_id', classmateIds)
          .gte('date', weekStart)
          .lte('date', weekEnd);

        // Fetch grades for all classmates
        const { data: weekGrades } = await supabase
          .from('grades')
          .select('student_id, marks, exams!inner(marks)')
          .in('student_id', classmateIds);

        // Score each student: attendance% * 0.5 + grade% * 0.5
        const scores = classmates.map(cm => {
          const sid = cm.student_id;
          const attRecords = (weekAtt || []).filter(a => a.user_id === sid);
          const present = attRecords.filter(a => a.status?.toLowerCase() === 'present').length;
          const attPct = attRecords.length > 0 ? (present / attRecords.length) * 100 : 0;

          const gradeRecords = (weekGrades || []).filter(g => g.student_id === sid);
          let gradePct = 0;
          if (gradeRecords.length > 0) {
            const totalG = gradeRecords.reduce((s, g) => {
              const total = g.exams?.marks || 0;
              return s + (total > 0 ? (g.marks / total) * 100 : 0);
            }, 0);
            gradePct = totalG / gradeRecords.length;
          }

          return {
            name: cm.user?.name || 'Student',
            score: attPct * 0.5 + gradePct * 0.5,
          };
        });

        scores.sort((a, b) => b.score - a.score);
        const top = scores[0];
        if (top && top.score > 0) {
          const nameParts = top.name.trim().split(' ');
          const initials = nameParts.length >= 2
            ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
            : nameParts[0].slice(0, 2).toUpperCase();

          studentOfWeek = {
            name: top.name,
            initials,
            achievements: [
              'Regular Attendance',
              'Homework Complete',
              'No Complaints',
              'Full Uniform',
              'Arrived on Time',
            ],
            weekRange: `${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
          };
        }
      }
    }

    // 4. Compute badges
    const attendanceBadge = getAttendanceBadge(attendancePercentage);
    const academicBadge = getAcademicBadge(avgGradePercentage);

    // Next milestones
    const attMilestones = [60, 75, 90, 100];
    const nextAttTarget = attMilestones.find(m => m > attendancePercentage) || 100;
    const gradeMilestones = [60, 80, 90];
    const nextGradeTarget = gradeMilestones.find(m => m > avgGradePercentage) || 90;

    return res.status(200).json({
      success: true,
      data: {
        attendance: {
          percentage: Math.round(attendancePercentage * 10) / 10,
          presentDays,
          totalDays,
          badge: attendanceBadge,
          nextMilestone: nextAttTarget,
        },
        academics: {
          percentage: Math.round(avgGradePercentage * 10) / 10,
          badge: academicBadge,
          nextMilestone: nextGradeTarget,
        },
        studentOfWeek,
      },
    });
  } catch (error) {
    console.error("Rewards error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
