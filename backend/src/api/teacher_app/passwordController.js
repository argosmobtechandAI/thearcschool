import { supabase, supabaseAdmin } from "../../config/supabaseClient.js";

export const changePassword = async (req, res) => {
  try {
    // Auth middleware usually attaches decoded token payload to req.user.
    // Supabase JWTs typically use `sub` for user ID, but some custom implementations use `id`.
    const userId = req.user.id || req.user.sub;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required." });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized request." });
    }

    // 1. Fetch user's email from the public.user table
    const { data: user, error: userError } = await supabase
      .from("user")
      .select("email")
      .eq("id", userId)
      .single();

    if (userError || !user || !user.email) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // 2. Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return res.status(401).json({ success: false, message: "Incorrect current password." });
    }

    // 3. Update the password using admin client
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, message: "Admin client not configured." });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      return res.status(500).json({ success: false, message: updateError.message });
    }

    return res.status(200).json({ success: true, message: "Password updated successfully." });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
