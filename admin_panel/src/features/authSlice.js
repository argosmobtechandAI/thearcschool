import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: JSON.parse(localStorage.getItem("adminUser")) || null,
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
