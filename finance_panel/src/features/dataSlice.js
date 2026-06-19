import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api, { getCommunication, getInfo } from "../services/api";

export const fetchUsers = createAsyncThunk(
  "data/fetchUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin_panel/users");
      return response.data.users;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const fetchFinanceStats = createAsyncThunk(
  "data/fetchFinanceStats",
  async ({ startDate, endDate } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const url = `/finance_panel/dashboardStats${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await api.get(url);
      return response.data.stats;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Network Error");
    }
  }
);

export const fetchClasses = createAsyncThunk(
  "data/fetchClasses",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin_panel/class/getClass");
      return response.data.classes;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const fetchFees = createAsyncThunk(
  "data/fetchFees",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/finance_panel/getFees");
      return response.data.fees;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Network Error");
    }
  }
);

export const createFee = createAsyncThunk(
  "data/createFee",
  async (feeData, { rejectWithValue }) => {
    try {
      const response = await api.post("/finance_panel/createFee", { data: feeData });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Network Error");
    }
  }
);

export const fetchFeeStructures = createAsyncThunk(
  "data/fetchFeeStructures",
  async (academicYear, { rejectWithValue }) => {
    try {
      const response = await api.get(`/finance_panel/feeStructures?academic_year=${academicYear || "2024-2025"}`);
      return response.data.structures;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Network Error");
    }
  }
);

export const updateFeeStructure = createAsyncThunk(
  "data/updateFeeStructure",
  async ({ id, amount }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/finance_panel/feeStructures/${id}`, { amount });
      return response.data.structure;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Network Error");
    }
  }
);

export const generateMonthlyFees = createAsyncThunk(
  "data/generateMonthlyFees",
  async ({ month, year }, { rejectWithValue }) => {
    try {
      const response = await api.post("/finance_panel/generateMonthlyFees", { month, year });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Network Error");
    }
  }
);

export const generateYearlyAMC = createAsyncThunk(
  "data/generateYearlyAMC",
  async ({ academicYear }, { rejectWithValue }) => {
    try {
      const response = await api.post("/finance_panel/generateYearlyAMC", { academicYear });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Network Error");
    }
  }
);

export const deleteFee = createAsyncThunk(
  "data/deleteFee",
  async (feeId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/finance_panel/deleteFee/${feeId}`);
      return feeId;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Network Error");
    }
  }
);

export const updateFee = createAsyncThunk(
  "data/updateFee",
  async ({ feeId, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/finance_panel/updateFee/${feeId}`, { data });
      return { feeId, data };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Network Error");
    }
  }
);

export const fetchExams = createAsyncThunk(
  "data/fetchExams",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/exams/getExams");
      return response.data.exams || response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Network Error");
    }
  }
);

export const fetchCourses = createAsyncThunk(
  "data/fetchCourses",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/course/getCourse");
      return response.data.courses;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Network Error");
    }
  }
);

export const fetchSubjects = createAsyncThunk(
  "data/fetchSubjects",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin_panel/subjects/getSubjects");
      return response.data.subjects;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Network Error");
    }
  }
);

export const fetchRooms = createAsyncThunk(
  "data/fetchRooms",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/rooms/getRooms");
      return response.data.rooms;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Network Error");
    }
  }
);

export const fetchNewUsers = createAsyncThunk("data/fetchNewUsers", async () => {
  const response = await api.get("/admission_panel/getAllNewUser");
  return response.data.users || response.data.data;
});

export const fetchTimeTables = createAsyncThunk("data/fetchTimeTables", async () => {
  const response = await api.get("/admin_panel/timeTable/getTimeTable");
  return response.data.timeTables || [];
});

export const fetchEvents = createAsyncThunk('data/fetchEvents', async () => {
    const response = await api.get("/admin_panel/events/getAllEvents");
    return response.data.data || response.data.events || [];
});

export const fetchCommunication = createAsyncThunk('data/fetchCommunication', async (type) => {
    const response = await getCommunication(type);
    return response.data;
});

export const fetchInfo = createAsyncThunk('data/fetchInfo', async () => {
    const response = await getInfo();
    return response.data;
});

const initialState = {
  users: [],
  classes: [],
  fees: [],
  exams: [],
  courses: [],
  subjects: [],
  rooms: [],
  newUsers: [],
  timeTables: [],
  events: [],
  chats: [],
  infoSettings: null,
  infoChampions: [],
  infoGallery: [],
  infoNewsletters: [],
  loading: false,
  loadingUsers: false,
  loadingClasses: false,
  loadingFees: false,
  loadingExams: false,
  loadingCourses: false,
  loadingSubjects: false,
  loadingRooms: false,
  loadingNewUsers: false,
  financeStats: null,
  loadingFinanceStats: false,
  feeStructures: [],
  loadingFeeStructures: false,
  globalDateRange: {
    startDate: "",
    endDate: ""
  },
  error: null,
};

export const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setGlobalDateRange: (state, action) => {
      state.globalDateRange = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Users
      .addCase(fetchUsers.pending, (state) => {
        state.loadingUsers = true;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loadingUsers = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loadingUsers = false;
        state.error = action.payload;
      })
      // Finance Stats
      .addCase(fetchFinanceStats.pending, (state) => {
        state.loadingFinanceStats = true;
      })
      .addCase(fetchFinanceStats.fulfilled, (state, action) => {
        state.loadingFinanceStats = false;
        state.financeStats = action.payload;
      })
      .addCase(fetchFinanceStats.rejected, (state, action) => {
        state.loadingFinanceStats = false;
        state.error = action.payload;
      })
      // Classes
      .addCase(fetchClasses.pending, (state) => {
        state.loadingClasses = true;
      })
      .addCase(fetchClasses.fulfilled, (state, action) => {
        state.loadingClasses = false;
        state.classes = action.payload;
      })
      .addCase(fetchClasses.rejected, (state, action) => {
        state.loadingClasses = false;
        state.error = action.payload;
      })
      // Fees
      .addCase(fetchFees.pending, (state) => {
        state.loadingFees = true;
      })
      .addCase(fetchFees.fulfilled, (state, action) => {
        state.loadingFees = false;
        state.fees = action.payload;
      })
      .addCase(fetchFees.rejected, (state, action) => {
        state.loadingFees = false;
        state.error = action.payload;
      })
      .addCase(updateFee.fulfilled, (state, action) => {
        const index = state.fees.findIndex(fee => fee.id === action.payload.feeId);
        if (index !== -1) {
          state.fees[index] = { ...state.fees[index], ...action.payload.data };
        }
      })
      // Fee Structures
      .addCase(fetchFeeStructures.pending, (state) => {
        state.loadingFeeStructures = true;
      })
      .addCase(fetchFeeStructures.fulfilled, (state, action) => {
        state.loadingFeeStructures = false;
        state.feeStructures = action.payload;
      })
      .addCase(fetchFeeStructures.rejected, (state, action) => {
        state.loadingFeeStructures = false;
        state.error = action.payload;
      })
      .addCase(updateFeeStructure.fulfilled, (state, action) => {
        const index = state.feeStructures.findIndex(fs => fs.id === action.payload.id);
        if (index !== -1) {
          state.feeStructures[index] = action.payload;
        }
      })
      // Exams
      .addCase(fetchExams.pending, (state) => {
        state.loadingExams = true;
      })
      .addCase(fetchExams.fulfilled, (state, action) => {
        state.loadingExams = false;
        state.exams = action.payload;
      })
      .addCase(fetchExams.rejected, (state, action) => {
        state.loadingExams = false;
        state.error = action.payload;
      })
      // Courses
      .addCase(fetchCourses.pending, (state) => {
        state.loadingCourses = true;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.loadingCourses = false;
        state.courses = action.payload;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.loadingCourses = false;
        state.error = action.payload;
      })
      // Subjects
      .addCase(fetchSubjects.pending, (state) => {
        state.loadingSubjects = true;
      })
      .addCase(fetchSubjects.fulfilled, (state, action) => {
        state.loadingSubjects = false;
        state.subjects = action.payload;
      })
      .addCase(fetchSubjects.rejected, (state, action) => {
        state.loadingSubjects = false;
        state.error = action.payload;
      })
      // Rooms
      .addCase(fetchRooms.pending, (state) => {
        state.loadingRooms = true;
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.loadingRooms = false;
        state.rooms = action.payload;
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.loadingRooms = false;
        state.error = action.payload;
      })
      // New Users (Admissions)
      .addCase(fetchNewUsers.pending, (state) => {
        state.loadingNewUsers = true;
      })
      .addCase(fetchNewUsers.fulfilled, (state, action) => {
        state.loadingNewUsers = false;
        state.newUsers = action.payload;
      })
      .addCase(fetchNewUsers.rejected, (state, action) => {
        state.loadingNewUsers = false;
        state.error = action.payload;
      })
      .addCase(fetchTimeTables.fulfilled, (state, action) => {
        state.timeTables = action.payload;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.events = action.payload;
      })
      // Communication
      .addCase(fetchCommunication.pending, (state) => {
          state.loading = true;
      })
      .addCase(fetchCommunication.fulfilled, (state, action) => {
          state.loading = false;
          state.chats = action.payload.chats || [];
      })
      .addCase(fetchCommunication.rejected, (state, action) => {
          state.loading = false;
          state.error = action.error.message;
      })
      // Info
      .addCase(fetchInfo.pending, (state) => {
          state.loading = true;
      })
      .addCase(fetchInfo.fulfilled, (state, action) => {
          state.loading = false;
          const data = action.payload?.data || {};
          state.infoSettings = data.settings || null;
          state.infoChampions = data.champions || [];
          state.infoGallery = data.gallery || [];
          state.infoNewsletters = data.newsletters || [];
      })
      .addCase(fetchInfo.rejected, (state, action) => {
          state.loading = false;
          state.error = action.error.message;
      })
      .addCase(createFee.fulfilled, (state) => {
        // Just invalidate/refetch could be done by UI, but we don't store individual states
      })
      .addCase(deleteFee.fulfilled, (state, action) => {
        state.fees = state.fees.filter(fee => fee.id !== action.payload);
      });
  },
});

export const { clearError, setGlobalDateRange } = dataSlice.actions;
export default dataSlice.reducer;
