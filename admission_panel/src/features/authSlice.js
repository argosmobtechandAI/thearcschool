import { createSlice } from "@reduxjs/toolkit";

const safeJsonParse = (item) => {
  try {
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.error("Error parsing adminUser from localStorage", e);
    return null;
  }
};

const initialState = {
  user: safeJsonParse(localStorage.getItem("adminUser")),
  token: localStorage.getItem("adminToken") || null,
  isAuthenticated: !!localStorage.getItem("adminToken"),
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem("adminUser", JSON.stringify(action.payload.user));
      localStorage.setItem("adminToken", action.payload.token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("adminUser");
      localStorage.removeItem("adminToken");
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
