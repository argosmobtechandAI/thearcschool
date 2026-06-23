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
  tagTypes: ['Dashboard', 'Academics', 'Attendance', 'Notifications', 'Chats'],
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
      query: () => '/student_app/exams',
      providesTags: ['Academics'],
    }),
    
    getAttendance: builder.query({
      query: (params) => ({
        url: '/student_app/attendance',
        params,
      }),
      providesTags: ['Attendance'],
    }),

    // Notifications
    registerFcmToken: builder.mutation({
      query: (token) => ({
        url: '/student_app/notifications/register-token',
        method: 'POST',
        body: { token },
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
  useRegisterFcmTokenMutation,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
} = apiSlice;
