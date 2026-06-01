import { supabase } from "@/lib/supabase";

export async function toggleTrackLike(trackId: string, userId: string) {
  try {
    // Vérifier si déjà liké
    const { data: existing } = await supabase
      .from("music_track_likes")
      .select("id")
      .eq("track_id", trackId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      // Delete
      const { error: deleteError } = await supabase
        .from("music_track_likes")
        .delete()
        .eq("id", existing.id);
      if (deleteError) throw deleteError;

      // Decrement count
      const { error: updateError } = await supabase
        .from("music_tracks")
        .update({ likes_count: supabase.rpc("decrement", { x: 1 }) })
        .eq("id", trackId);
      if (updateError) throw updateError;

      return { liked: false };
    } else {
      // Insert
      const { error: insertError } = await supabase
        .from("music_track_likes")
        .insert({ track_id: trackId, user_id: userId });
      if (insertError) throw insertError;

      // Increment count
      const { error: updateError } = await supabase
        .from("music_tracks")
        .update({ likes_count: supabase.rpc("increment", { x: 1 }) })
        .eq("id", trackId);
      if (updateError) throw updateError;

      return { liked: true };
    }
  } catch (error) {
    console.error("Like error:", error);
    throw error;
  }
}