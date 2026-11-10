import { supabase } from "@/integrations/supabase/client";

export type Share = {
  id: string;
  owner_id: string;
  viewer_email: string;
  created_at: string;
};

/** Shares I (current user) created — people who can view my data. */
export async function fetchMyShares(): Promise<Share[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("personal_account_shares")
    .select("*")
    .eq("owner_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Share[];
}

/** Shares pointing at me — accounts I can view (read-only). */
export async function fetchSharedWithMe(): Promise<Share[]> {
  const { data, error } = await supabase
    .from("personal_account_shares")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email?.toLowerCase();
  return (data ?? []).filter(
    (s) => s.viewer_email.toLowerCase() === email && s.owner_id !== userData.user?.id,
  ) as Share[];
}
