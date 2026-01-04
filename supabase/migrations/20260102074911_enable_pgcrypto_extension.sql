/*
  # Enable pgcrypto Extension

  1. Extensions
    - Enable pgcrypto for password hashing functions
  
  2. Purpose
    - Required for crypt() and gen_salt() functions used in user creation
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;
