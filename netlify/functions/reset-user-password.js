const { createClient } = require('@supabase/supabase-js');

function generateSecurePassword(length) {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*";
  const allChars = lowercase + uppercase + numbers + symbols;

  let password = "";
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password.split("").sort(() => Math.random() - 0.5).join("");
}

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Missing authorization header" })
      };
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        hasServiceKey: !!supabaseServiceKey
      });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Server configuration error" })
      };
    }

    const token = authHeader.replace("Bearer ", "");

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized" })
      };
    }

    const { data: appUser, error: appUserError } = await anonClient
      .from("app_users")
      .select("role, role_category")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (appUserError || !appUser || appUser.role_category !== "admin") {
      console.error('User role check failed:', { appUserError, appUser });
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "Unauthorized: Admin access required" })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { userId } = body;

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing userId" })
      };
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const newPassword = generateSecurePassword(16);

    const { error: updateError } = await serviceClient.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      throw updateError;
    }

    const { error: flagError } = await serviceClient
      .from("app_users")
      .update({
        first_login: true,
        password_last_changed: null
      })
      .eq("auth_user_id", userId);

    if (flagError) {
      console.error('Flag update error:', flagError);
      throw flagError;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ password: newPassword })
    };

  } catch (error) {
    console.error("Error resetting password:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Internal server error" })
    };
  }
};
