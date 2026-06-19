import { UserService } from "./service.js";
import { generateToken } from "../../../utils/helpers.js";

export const createUser = async (req, res) => {
  try {
    const { data } = req.body;
    console.log("=== INCOMING CREATE USER PAYLOAD ===");
    console.log(JSON.stringify(data, null, 2));
    if (!data) {
      return res.status(400).json({ success: false, message: "No data provided" });
    }
    const newUser = await UserService.createUser(data);
    return res.status(201).json({ success: true, message: "User created successfully", data: newUser });
  } catch (e) {
    let msg = e.message;
    if (e.__isAuthError) {
       msg = `Supabase Auth Error: The database trigger likely rejected the user type. Make sure the database ENUM supports the type you are trying to create.`;
    }
    return res.status(500).json({ success: false, message: msg || JSON.stringify(e) });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { data } = req.body;
    if (!data?.email || !data?.password) {
      return res.status(400).json({ success: false, message: "Incomplete credentials" });
    }
    const user = await UserService.loginUser(data.email, data.password);
    const token = await generateToken({ id: user.id, email: user.email }, user.type);
    return res.status(200).json({ success: true, message: "Login successful", user, token });
  } catch (e) {
    if (e.message === "User not found" || e.message === "Invalid password") {
      return res.status(401).json({ success: false, message: e.message });
    }
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { data } = req.body;
    if (!data?.id) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
    await UserService.updateUser(data);
    return res.status(200).json({ success: true, message: "User updated successfully" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await UserService.getUsers();
    if (!users || users.length === 0) {
      return res.status(200).json({ success: true, count: 0, users: [] });
    }
    return res.status(200).json({ success: true, count: users.length, users });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
    const user = await UserService.getUserById(id);
    return res.status(200).json({ success: true, user });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getMySelf = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }
    const user = await UserService.getUserById(req.user.id);
    return res.status(200).json({ success: true, message: "User fetched successfully", mySelf: user });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await UserService.deleteUser(id);
    return res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const forgetPassword = async (req, res) => {
  try {
    const { data } = req.body;
    const { email, phone, password } = data;
    await UserService.forgetPassword(email, phone, password);
    return res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const uploadBulkUser = async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !Array.isArray(data)) return res.status(400).json({ success: false, message: "Invalid data format" });
    const createdUsers = await UserService.uploadBulkUser(data);
    return res.status(200).json({ success: true, message: `${createdUsers.length} users created successfully` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};



export const updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await UserService.updateNotification(id);
    return res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getTeacherWeek = async (req, res) => {
  try {
    const teacherWeekId = await UserService.getTeacherWeek();
    return res.json({ teacherWeekId });
  } catch (e) {
    return res.status(500).json({ error: "Something went wrong" });
  }
};
