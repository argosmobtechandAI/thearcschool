import { createSlice } from "@reduxjs/toolkit";

const getCurrentAcademicYear = () => {
  const today = new Date();
  const month = today.getMonth(); // 0-indexed, 0 = Jan, 3 = April
  let year = today.getFullYear();
  if (month < 3) year -= 1;
  return `${year}-${year + 1}`;
};

const initialState = {
  academicYear: getCurrentAcademicYear(),
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setAcademicYear: (state, action) => {
      state.academicYear = action.payload;
    },
  },
});

export const { setAcademicYear } = settingsSlice.actions;
export default settingsSlice.reducer;
