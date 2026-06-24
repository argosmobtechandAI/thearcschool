import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as Keychain from 'react-native-keychain';
import { API_URL } from '@env';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Exams', 'Courses', 'Attendance', 'Timetable', 'Events', 'Students', 'Classes', 'Complaints', 'Grades', 'Notifications', 'Performance', 'Chats'],
  endpoints: (builder) => ({
    getTeacherClasses: builder.query({
      query: () => '/teacher_app/classes',
      providesTags: ['Classes'],
    }),
    getTeacherProfile: builder.query({
      query: () => '/teacher_app/profile',
      providesTags: ['Classes'],
    }),
    getClassStudents: builder.query({
      query: (classId) => `/teacher_app/classes/${classId}/students`,
      providesTags: ['Students'],
    }),
    getTimetable: builder.query({
      query: (classId) => `/teacher_app/timetable${classId ? `?classId=${classId}` : ''}`,
      providesTags: ['Timetable'],
    }),
    getExams: builder.query({
      query: (classId) => `/teacher_app/exams${classId ? `?classId=${classId}` : ''}`,
      providesTags: ['Exams'],
    }),
    getCourses: builder.query({
      query: (classId) => `/teacher_app/course${classId ? `?classId=${classId}` : ''}`,
      providesTags: ['Courses'],
    }),
    getEvents: builder.query({
      query: (classId) => `/teacher_app/events${classId ? `?classId=${classId}` : ''}`,
      providesTags: ['Events'],
    }),
    getAttendance: builder.query({
      query: (params) => ({
        url: '/attendance',
        params, // e.g., { startDate, endDate, classId }
      }),
      providesTags: ['Attendance'],
    }),
    submitBulkAttendance: builder.mutation({
      query: (data) => ({
        url: '/attendance/bulk',
        method: 'POST',
        body: { data },
      }),
      invalidatesTags: ['Attendance'],
    }),
    changePassword: builder.mutation({
      query: (data) => ({
        url: '/teacher_app/auth/change-password',
        method: 'POST',
        body: data,
      }),
    }),
    submitBulkGrades: builder.mutation({
      query: (grades) => ({
        url: '/teacher_app/exams/grades/bulk',
        method: 'POST',
        body: { grades },
      }),
      invalidatesTags: ['Exams'],
    }),
    getChats: builder.query({
      query: () => '/live_chat/list',
      providesTags: ['Chats'],
    }),
    getLiveChatHistory: builder.query({
      query: (userId) => `/live_chat/history/${userId}`,
      providesTags: (result, error, id) => [{ type: 'Chats', id }],
    }),
    getStudents: builder.query({
      query: () => '/live_chat/students',
    }),
    getPrincipal: builder.query({
      query: () => '/live_chat/principal',
    }),
    getComplaints: builder.query({
      query: (studentId) => `/teacher_app/complaints${studentId ? `?studentId=${studentId}` : ''}`,
      providesTags: ['Complaints'],
    }),
    getStudentGrades: builder.query({
      query: (studentId) => `/teacher_app/exams/grades?studentId=${studentId}`,
      providesTags: ['Grades'],
    }),
    getExamGrades: builder.query({
      query: (examId) => `/teacher_app/exams/grades?examId=${examId}`,
      providesTags: ['Grades'],
    }),
    getDateSheetGrades: builder.query({
      query: ({ title, classId }) => `/teacher_app/exams/datesheet/${encodeURIComponent(title)}/${classId}/grades`,
      providesTags: ['Grades'],
    }),
    registerFcmToken: builder.mutation({
      query: ({ fcm_token, device_type }) => ({
        url: '/teacher_app/notifications/register-token',
        method: 'POST',
        body: { fcm_token, device_type }
      }),
    }),
    getNotifications: builder.query({
      query: () => '/teacher_app/notifications',
      providesTags: ['Notifications'],
    }),
    getClassPerformance: builder.query({
      query: (classId) => `/teacher_app/classes/${classId}/performance`,
      providesTags: ['Performance'],
    }),
    markNotificationRead: builder.mutation({
      query: (id) => ({
        url: `/teacher_app/notifications/${id}/read`,
        method: 'PATCH'
      }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const {
  useGetTimetableQuery,
  useGetTeacherClassesQuery,
  useGetTeacherProfileQuery,
  useGetClassStudentsQuery,
  useGetExamsQuery,
  useGetCoursesQuery,
  useGetEventsQuery,
  useGetAttendanceQuery,
  useChangePasswordMutation,
  useSubmitBulkAttendanceMutation,
  useSubmitBulkGradesMutation,
  useGetChatsQuery,
  useGetComplaintsQuery,
  useGetStudentGradesQuery,
  useGetExamGradesQuery,
  useGetDateSheetGradesQuery,
  useRegisterFcmTokenMutation,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useGetClassPerformanceQuery,
  useGetLiveChatHistoryQuery,
  useGetStudentsQuery,
  useGetPrincipalQuery,
} = apiSlice;
