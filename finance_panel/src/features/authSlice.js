import { createSlice } from "@reduxjs/toolkit";

const safeJsonParse = (item) => {
  try {
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.error("Error parsing authUser from localStorage", e);
    return null;
  }
};

const initialState = {
  user: safeJsonParse(localStorage.getItem("financeUser")),
  token: localStorage.getItem("financeToken") || null,
  isAuthenticated: !!localStorage.getItem("financeToken"),
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem("financeUser", JSON.stringify(action.payload.user));
      localStorage.setItem("financeToken", action.payload.token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("financeUser");
      localStorage.removeItem("financeToken");
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
