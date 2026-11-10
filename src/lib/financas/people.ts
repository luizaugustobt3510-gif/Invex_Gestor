import { supabase } from "@/integrations/supabase/client";

export type Person = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export async function fetchPeople(ownerId?: string): Promise<Person[]> {
  let q = supabase.from("personal_people").select("*").order("name", { ascending: true });
  if (ownerId) q = q.eq("user_id", ownerId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Person[];
}
