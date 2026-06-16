import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

export const fetchUsers = createAsyncThunk(
  "data/fetchUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/user/getUser");
      return response.data.users;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const fetchClasses = createAsyncThunk(
  "data/fetchClasses",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/class/getClass");
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
      const response = await api.get("/fees/getFees");
      return response.data.fees;
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
      const response = await api.get("/subjects/getSubjects");
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
  const response = await api.get("/newUser/getAllNewUser");
  return response.data.users || response.data.data;
});

export const fetchTimeTables = createAsyncThunk("data/fetchTimeTables", async () => {
  const response = await api.get("/timeTable/getTimeTable");
  return response.data.timeTables || [];
});

export const fetchEvents = createAsyncThunk('data/fetchEvents', async () => {
    const response = await api.get("/events/getAllEvents");
    return response.data.data || response.data.events || [];
});

export const fetchCommunication = createAsyncThunk('data/fetchCommunication', async (type) => {
    const response = await api.getCommunication(type);
    return response.data;
});

export const fetchInfo = createAsyncThunk('data/fetchInfo', async () => {
    const response = await api.getInfo();
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
  info: [],
  loading: false,
  loadingUsers: false,
  loadingClasses: false,
  loadingFees: false,
  loadingExams: false,
  loadingCourses: false,
  loadingSubjects: false,
  loadingRooms: false,
  loadingNewUsers: false,
  error: null,
};

export const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {},
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
          state.info = action.payload.info || action.payload || [];
      })
      .addCase(fetchInfo.rejected, (state, action) => {
          state.loading = false;
          state.error = action.error.message;
      });
  },
});

export default dataSlice.reducer;
