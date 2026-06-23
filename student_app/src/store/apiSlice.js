import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as Keychain from 'react-native-keychain';
import { API_URL } from '@env';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: async (headers) => {
      try {
        const credentials = await Keychain.getGenericPassword();
        if (credentials && credentials.password) {
          headers.set('Authorization', `Bearer ${credentials.password}`);
        }
      } catch (error) {
        console.log('Error fetching token for headers:', error);
      }
      return headers;
    },
  }),
  tagTypes: ['Dashboard', 'Academics', 'Attendance', 'Notifications', 'Chats', 'Quote', 'Rewards', 'Timetable', 'CourseWork', 'Events', 'Fees'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation({
      query: (credentials) => ({
        url: '/user/loginUser',
        method: 'POST',
        body: { data: credentials },
      }),
    }),
    
    // Student Endpoints
    getDashboard: builder.query({
      query: () => '/student_app/dashboard',
      providesTags: ['Dashboard'],
    }),
    
    getAcademics: builder.query({
      query: (academicYear) => ({
        url: '/student_app/exams',
        params: { academic_year: academicYear },
      }),
      providesTags: ['Academics'],
    }),
    
    getAttendance: builder.query({
      query: (params) => ({
        url: '/student_app/attendance',
        params,
      }),
      providesTags: ['Attendance'],
    }),

    getTimetable: builder.query({
      query: () => '/student_app/timetable',
      providesTags: ['Timetable'],
    }),

    getCourseWork: builder.query({
      query: () => '/student_app/course',
      providesTags: ['CourseWork'],
    }),

    getQuote: builder.query({
      query: () => '/student_app/quote',
      providesTags: ['Quote'],
    }),

    getEvents: builder.query({
      query: (academicYear) => ({
        url: '/student_app/events',
        params: { academic_year: academicYear },
      }),
      providesTags: ['Events'],
    }),

    getRewards: builder.query({
      query: () => '/student_app/rewards',
      providesTags: ['Rewards'],
    }),

    getFees: builder.query({
      query: (academicYear) => ({
        url: '/student_app/fees',
        params: { academic_year: academicYear },
      }),
      providesTags: ['Fees'],
    }),

    getChats: builder.query({
      query: (type) => `/student_app/communication/getChat/${type}`,
      providesTags: ['Chats'],
    }),

    createChat: builder.mutation({
      query: (data) => ({
        url: '/student_app/communication/createChat',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Chats'],
    }),

    // Notifications
    registerFcmToken: builder.mutation({
      query: ({ fcm_token, device_type }) => ({
        url: '/student_app/notifications/register-token',
        method: 'POST',
        body: { fcm_token, device_type },
      }),
    }),
    
    getNotifications: builder.query({
      query: () => '/student_app/notifications',
      providesTags: ['Notifications'],
    }),
    
    markNotificationRead: builder.mutation({
      query: (id) => ({
        url: `/student_app/notifications/${id}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const {
  useLoginMutation,
  useGetDashboardQuery,
  useGetAcademicsQuery,
  useGetAttendanceQuery,
  useGetTimetableQuery,
  useGetCourseWorkQuery,
  useGetQuoteQuery,
  useGetEventsQuery,
  useGetRewardsQuery,
  useGetFeesQuery,
  useGetChatsQuery,
  useCreateChatMutation,
  useRegisterFcmTokenMutation,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
} = apiSlice;

