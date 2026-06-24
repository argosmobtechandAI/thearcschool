import { createSlice } from '@reduxjs/toolkit';

const d = new Date();
const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);

const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const initialState = {
  activeClassId: null,
  activeClassName: '',
  availableClasses: [],
  dateRange: {
    label: 'This Month',
    startDate: formatDate(firstDay),
    endDate: formatDate(lastDay),
  },
  activeTerm: '',
  activeAcademicYear: '2024-2025',
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setAvailableClasses: (state, action) => {
      state.availableClasses = action.payload;
      if (action.payload.length > 0) {
        const stillExists = state.activeClassId && action.payload.find(c => c.classId === state.activeClassId);
        if (!stillExists) {
          state.activeClassId = action.payload[0].classId;
          state.activeClassName = action.payload[0].className + (action.payload[0].section ? ` - ${action.payload[0].section}` : '');
        }
      } else {
        state.activeClassId = null;
        state.activeClassName = '';
      }
    },
    setActiveClass: (state, action) => {
      const selectedClass = state.availableClasses.find(c => c.classId === action.payload);
      if (selectedClass) {
        state.activeClassId = selectedClass.classId;
        state.activeClassName = selectedClass.className + (selectedClass.section ? ` - ${selectedClass.section}` : '');
      }
    },
    setDateRange: (state, action) => {
      state.dateRange = action.payload;
    },
    setActiveTerm: (state, action) => {
      state.activeTerm = action.payload;
    },
    setActiveAcademicYear: (state, action) => {
      state.activeAcademicYear = action.payload;
    },
    clearAppState: (state) => {
      state.activeClassId = null;
      state.activeClassName = '';
      state.availableClasses = [];
    }
  },
});

export const { setAvailableClasses, setActiveClass, setDateRange, setActiveTerm, setActiveAcademicYear, clearAppState } = appSlice.actions;
export default appSlice.reducer;
