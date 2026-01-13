import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: string;
  role_category: string;
  custom_id?: string;
  photo_url?: string;
  reporting_manager_id?: string;
  hourly_rate?: number;
  is_salary?: boolean;
  battery_pay_rates?: Record<string, number>;
  per_watt_rate?: number;
  ppw_redline?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const requestData: CreateUserRequest = await req.json();
    const { email, password, full_name, phone, role, role_category, custom_id, photo_url,
            reporting_manager_id, hourly_rate, is_salary, battery_pay_rates, per_watt_rate, ppw_redline } = requestData;

    if (!email || !password || !full_name || !role || !role_category) {
      return new Response(
        JSON.stringify({ error: "Email, password, full_name, role, and role_category are required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    let authUserId: string;
    let userAlreadyExists = false;

    const createResult = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createResult.error) {
      if (createResult.error.message.includes('already') || createResult.error.message.includes('registered')) {
        console.log('User already exists in auth, looking up existing user...');
        userAlreadyExists = true;

        const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
          console.error('Error listing users:', listError);
          return new Response(
            JSON.stringify({ error: `User already registered but could not be retrieved: ${listError.message}` }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }

        const existingUser = existingUsers.users.find(u => u.email === email);
        if (!existingUser) {
          return new Response(
            JSON.stringify({ error: "User already registered but could not be found" }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }

        authUserId = existingUser.id;
      } else {
        console.error('Error creating auth user:', createResult.error);
        return new Response(
          JSON.stringify({ error: createResult.error.message }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    } else {
      authUserId = createResult.data.user.id;
    }

    const appUserData = {
      auth_user_id: authUserId,
      email,
      full_name,
      phone: phone || null,
      role,
      role_category,
      status: 'active',
      custom_id: custom_id || null,
      photo_url: photo_url || null,
      reporting_manager_id: reporting_manager_id || null,
      hourly_rate: hourly_rate || 0,
      is_salary: is_salary || false,
      battery_pay_rates: battery_pay_rates || {},
      per_watt_rate: per_watt_rate || 0,
      ppw_redline: ppw_redline || null,
    };

    const { data: appUser, error: upsertError } = await supabaseAdmin
      .from('app_users')
      .upsert(appUserData, { onConflict: 'email' })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting app_users:', upsertError);
      return new Response(
        JSON.stringify({ error: `Failed to create user profile: ${upsertError.message}` }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: appUser,
        message: userAlreadyExists
          ? `User profile created for existing auth user ${email}`
          : `User created successfully for ${email}`,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Error in create-auth-user function:', error);
    return new Response(
      JSON.stringify({ error: "Failed to create user" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});