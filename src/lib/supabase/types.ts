/**
 * Temporary database typing shell.
 * Replace this file with Supabase CLI-generated types after the reviewed schema
 * is applied to a real project. Do not hand-maintain a production schema here.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: { [_ in never]: never };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
