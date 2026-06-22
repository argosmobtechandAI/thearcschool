import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/authSlice";
import dataReducer from "../features/dataSlice";
import dashboardReducer from "../features/dashboardSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    data: dataReducer,
    dashboard: dashboardReducer,
  },
});
