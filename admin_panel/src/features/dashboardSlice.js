import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  stats: {
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    pendingAdmissions: 0,
    collectedFees: 0,
    pendingFees: 0,
    activeClasses: 0,
    eventsToday: 0,
    presentToday: 0,
    totalRooms: 0,
  },
  topper: null,
  loading: false,
  globalDateRange: { start: "", end: "" },
  feeStatusFilter: "All"
};

export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setDashboardLoading: (state, action) => {
      state.loading = action.payload;
    },
    setDashboardStats: (state, action) => {
      state.stats = { ...state.stats, ...action.payload };
    },
    setDashboardTopper: (state, action) => {
      state.topper = action.payload;
    },
    setGlobalDateRange: (state, action) => {
      state.globalDateRange = action.payload;
    },
    setFeeStatusFilter: (state, action) => {
      state.feeStatusFilter = action.payload;
    }
  }
});

export const { setDashboardLoading, setDashboardStats, setDashboardTopper, setGlobalDateRange, setFeeStatusFilter } = dashboardSlice.actions;
export default dashboardSlice.reducer;
